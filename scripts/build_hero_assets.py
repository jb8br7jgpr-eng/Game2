#!/usr/bin/env python3
"""Bake miniature island and skiff into independent textured glTF binary assets.

Deterministic offline asset pipeline, requires trimesh, numpy and Pillow.
Runs in GitHub Actions before Pages deployment; no Blender runtime, heavy CDN
assets or executable geometry generation is needed on the player's iPhone.
"""
from pathlib import Path
import math
import random
import numpy as np
import trimesh
from PIL import Image, ImageDraw
from trimesh.visual.material import PBRMaterial
from trimesh.visual.texture import TextureVisuals

random.seed(2081)
PI=math.pi
OUT=Path(__file__).resolve().parent.parent/"assets"
OUT.mkdir(exist_ok=True)
COLORS={
 "stone":((162,152,134),.96),
 "sand":((238,209,151),.98),
 "grass":((97,152,91),.94),
 "wood":((148,94,57),.78),
 "thatch":((187,140,74),.97),
 "leaf":((63,130,69),.82),
 "wall":((240,219,184),.86),
 "linen":((244,224,183),.92),
 "accent":((68,141,162),.63),
 "bronze":((215,164,77),.45),
 "coral":((230,147,133),.86),
 "rock_dark":((103,108,108),.94),
 "moss":((74,131,74),.98),
 "wet_sand":((190,171,129),.84),
 "wood_dark":((101,64,42),.82),
 "rope":((193,164,118),.95),
 "thatch_light":((225,184,112),.97),
 "iron":((75,87,93),.52),
 "shell":((248,232,200),.93),
}
def make_texture(name,color):
    w=256
    array=np.zeros((w,w,3),dtype=np.uint8)
    base=np.array(color,float)
    rng=np.random.default_rng(100+sum(ord(c) for c in name))
    yy,xx=np.indices((w,w))
    coarse=np.sin(xx*.078+np.sin(yy*.054))*5
    mottling=rng.normal(0,6,(w,w))+coarse
    if name in ("wood","wood_dark","thatch","thatch_light","rope"):
        mottling+=9*np.sin(yy*.34+np.sin(xx*.044))+5*np.sin(yy*.91)
    if name in ("stone","rock_dark"):
        mottling+=7*np.sin(xx*.032+yy*.075)+4*np.sin(xx*.12-yy*.09)
    if name in ("grass","moss"):
        mottling+=7*np.sin(xx*.19)*np.cos(yy*.17)
    if name in ("sand","wet_sand"):
        mottling+=rng.uniform(-3,3,(w,w))
    for ch in range(3):
        array[:,:,ch]=np.uint8(np.clip(base[ch]+mottling*(.68+ch*.11),0,255))
    im=Image.fromarray(array,"RGB")
    if name in ("wood","wood_dark","thatch","thatch_light","rope"):
        d=ImageDraw.Draw(im,"RGBA")
        for j in range(5,w,14 if name in ("wood","wood_dark") else 7):
            tint=(70,42,22,35) if name in ("wood","wood_dark") else (255,225,148,42)
            d.line((0,j,w-1,j+(j%5)),fill=tint,width=1)
    return im
def normal_from_texture(im,strength=.095):
    gray=np.asarray(im.convert("L"),dtype=np.float32)
    dy,dx=np.gradient(gray)
    xx=-dx*strength;yy=dy*strength
    length=np.sqrt(1+xx*xx+yy*yy)
    nx=xx/length;ny=yy/length;nz=1/length
    normal=np.stack(((nx+1)*127.5,(ny+1)*127.5,(nz+1)*127.5),axis=-1)
    return Image.fromarray(np.uint8(np.clip(normal,0,255)),"RGB")
def make_roughness_metallic(im,name,roughness):
    # glTF texture convention: G roughness, B metallic.
    # The varying green channel gives timber, stone and canvas natural highlights.
    a=np.asarray(im.convert("L"),dtype=np.float32)
    ry,rx=np.gradient(a)
    rough=np.clip(roughness*255+(a-125)*.21+np.hypot(rx,ry)*.35,43,255)
    metallic=np.full(a.shape,16 if name in ("bronze","iron") else 0,dtype=np.uint8)
    out=np.empty((*a.shape,3),dtype=np.uint8)
    out[:,:,0]=255
    out[:,:,1]=rough.astype(np.uint8)
    out[:,:,2]=metallic
    return Image.fromarray(out,"RGB")
TEXTURES={name:make_texture(name,rgb) for name,(rgb,_) in COLORS.items()}
MATERIALS={
 n:PBRMaterial(name=f"V081_{n}",baseColorTexture=TEXTURES[n],
      normalTexture=normal_from_texture(TEXTURES[n],strength=.14 if n in ("wood","wood_dark","thatch","thatch_light","stone","rock_dark") else .08)
          if n not in ("bronze","iron") else None,
      metallicRoughnessTexture=make_roughness_metallic(TEXTURES[n],n,rough),
      metallicFactor=.20 if n in ("bronze","iron") else .0,roughnessFactor=1.0,
      doubleSided=True)
 for n,(rgb,rough) in COLORS.items()
}
class Asset:
    def __init__(self):self.data={}
    def add(self,mesh,kind):
        if len(mesh.faces)==0:return
        uv=np.asarray(mesh.vertices)[:,[0,2]]*.24
        uv[:,0]+=np.asarray(mesh.vertices)[:,1]*.07
        self.data.setdefault(kind,[]).append((np.asarray(mesh.vertices,dtype=np.float32),np.asarray(mesh.faces,dtype=np.int64),uv.astype(np.float32)))
    def box(self,kind,pos,extents,angles=None):
        m=trimesh.creation.box(extents=extents)
        if angles is not None:m.apply_transform(trimesh.transformations.euler_matrix(*angles))
        m.apply_translation(pos);self.add(m,kind)
    def sphere(self,kind,pos,scale,subdivisions=1):
        m=trimesh.creation.icosphere(subdivisions=subdivisions,radius=1)
        m.apply_scale(scale);m.apply_translation(pos);self.add(m,kind)
    def beam(self,kind,pa,pb,radius=0.04,sections=8):
        a,b=np.array(pa,float),np.array(pb,float);delta=b-a
        if np.linalg.norm(delta)<1e-5:return
        m=trimesh.creation.cylinder(radius=radius,height=float(np.linalg.norm(delta)),sections=sections)
        m.apply_transform(trimesh.geometry.align_vectors([0,0,1],delta))
        m.apply_translation((a+b)*.5);self.add(m,kind)
    def mesh(self,kind,vertices,faces):
        m=trimesh.Trimesh(vertices=np.asarray(vertices,dtype=float),faces=np.asarray(faces,dtype=int),process=False)
        self.add(m,kind)
    def finish(self,path):
        scene=trimesh.Scene()
        for material,parts in self.data.items():
            vertices,faces,uv=[],[],[];offset=0
            for v,f,u in parts:
                vertices.append(v);faces.append(f+offset);uv.append(u);offset+=len(v)
            v=np.concatenate(vertices,axis=0)
            m=trimesh.Trimesh(vertices=v,faces=np.concatenate(faces,axis=0),process=False)
            m.visual=TextureVisuals(uv=np.concatenate(uv,axis=0),material=MATERIALS[material])
            scene.add_geometry(m,node_name="V082_"+material)
        blob=scene.export(file_type="glb")
        path.write_bytes(blob)
        print(f"Wrote {path.name}: {len(blob)//1024} KiB, {len(scene.geometry)} textured meshes")
        assert len(blob)>15000

def outline(a):
    return 1+.073*math.sin(a*3+.54)+.035*math.sin(a*8-1.5)+.026*math.sin(a*13+.3)
def ground(a,r):
    return .54+.22*math.cos(r*.62)+.14*math.sin(a*3+1.3)*math.sin(min(1,r*.4)*PI*.9)
def radial_surface(asset,kind,rad0,rad1,nrings=9,n=96):
    v=[];faces=[]
    for layer in range(nrings+1):
        r=rad0+(rad1-rad0)*layer/nrings
        for k in range(n):
            a=2*PI*k/n
            real=r*outline(a)
            y=ground(a,r)
            if r>2.4:y=max(.28,.56-(r-2.4)*.36)
            v.append((real*math.cos(a),y,real*math.sin(a)))
    for j in range(nrings):
        for i in range(n):
            a,b,c,d=j*n+i,j*n+(i+1)%n,(j+1)*n+i,(j+1)*n+(i+1)%n
            faces.extend(((a,b,c),(b,d,c)))
    asset.mesh(kind,v,faces)
def cliff(asset):
    v=[];faces=[];n=96
    for y,r in [(.30,3.38),(-.78,2.70)]:
        for i in range(n):
            a=i*2*PI/n;rr=r*outline(a)
            v.append((rr*math.cos(a),y+.06*math.sin(a*8),rr*math.sin(a)))
    for i in range(n):
        j=(i+1)%n;faces.extend(((i,j,n+i),(j,n+j,n+i)))
    asset.mesh("stone",v,faces)
def bent_palm(asset,x,z,height,sway):
    base=np.array([x,.76,z],float)
    prev=base
    # Curved trunk with gently tapered bark, avoiding perfectly straight rods.
    for i in range(1,10):
        t=i/9
        cur=base+np.array([sway*t*t,height*t,-.18*t],float)
        asset.beam("wood",prev,cur,.098*(1-.48*t),9)
        prev=cur
    top=prev
    for j in range(9):
        angle=2*PI*j/9
        radial=np.array([math.cos(angle),0,math.sin(angle)])
        tangent=np.array([-math.sin(angle),0,math.cos(angle)])
        n=20
        length=1.04+(.22 if j%3==0 else 0)
        vertices=[];faces=[]
        for k in range(n+1):
            t=k/n
            spine=top+radial*length*t+np.array([0,.18*math.sin(t*PI)-.38*t*t,0])
            width=.24*(math.sin(t*PI)**.74)
            serration=1-(.22 if k%3==2 else 0)
            for side in [-1,1]:
                p=spine+tangent*width*serration*side
                vertices.append(p.tolist())
            if k<n:
                q=k*2
                faces.extend(((q,q+1,q+2),(q+1,q+3,q+2)))
        asset.mesh("leaf",vertices,faces)
        # Narrow independent leaflets and fine central ribs for recognizable palms.
        for k in range(2,18,2):
            t=k/20
            mid=top+radial*length*t+np.array([0,.18*math.sin(t*PI)-.38*t*t,0])
            width=.23*math.sin(t*PI)
            for side in [-1,1]:
                tip=mid+tangent*(width+.20)*side+radial*.06+np.array([0,-.085,0])
                asset.mesh("leaf",[mid.tolist(),tip.tolist(),
                    (tip+radial*.065+np.array([0,-.025,0])).tolist()],((0,1,2),))
        for k in range(8):
            t=k/8;tt=(k+1)/8
            a=top+radial*length*t+np.array([0,.18*math.sin(t*PI)-.38*t*t,0])
            b=top+radial*length*tt+np.array([0,.18*math.sin(tt*PI)-.38*tt*tt,0])
            asset.beam("leaf",a,b,.011,5)
    for i in range(3):
        asset.sphere("wood",top+[.07*(i-1),-.12,.045],(.09,.10,.083),1)

def boulder(asset,x,y,z,size,seed,moss=False):
    # Irregular, fractured and slightly asymmetric cliffs, no perfect sphere silhouettes.
    rng=np.random.default_rng(seed)
    rock=trimesh.creation.icosphere(subdivisions=1,radius=1)
    vertices=np.asarray(rock.vertices,dtype=np.float64).copy()
    vertices*=rng.uniform(.83,1.17,size=(len(vertices),1))
    vertices*=np.array([1.1,.82,.88])*size
    rot=trimesh.transformations.rotation_matrix(rng.uniform(-.5,.5),[.4,1,.2])
    rock.vertices=vertices
    rock.apply_transform(rot)
    rock.apply_translation((x,y,z))
    asset.add(rock,"rock_dark" if seed%5==0 else "stone")
    if moss:
        asset.sphere("moss",(x,y+size*.73,z),(.64*size,.095*size,.52*size),1)
def rolled_rope(asset,x,y,z,radius=.17,turns=2):
    for turn in range(turns):
        r=radius-(turn/(turns+1))*radius*.30
        samples=16
        for n in range(samples):
            a=n*2*PI/samples;b=(n+1)*2*PI/samples
            p=(x+math.cos(a)*r,y+.013*turn,z+math.sin(a)*r)
            q=(x+math.cos(b)*r,y+.013*turn,z+math.sin(b)*r)
            asset.beam("rope",p,q,.018,5)
def beach_details(asset):
    rng=random.Random(910)
    # Small shell clusters and driftwood remain on beach, away from the front stairs.
    for i in range(23):
        a=i*2.399963+.33
        r=2.71+(i%6)*.13
        x=r*math.cos(a);z=r*math.sin(a)
        if -.05<x<1.28 and z>1.1:continue
        h=.47-(r-2.50)*.18
        asset.sphere("shell",(x,h+.015,z),(.07,.025,.047),1)
        if i%4==0:
            asset.sphere("coral",(x+.075,h+.016,z-.06),(.05,.024,.044),1)
    for x,z,a in [(2.51,1.06,.6),(-1.98,2.34,-.4),(-2.8,-1.19,.14)]:
        p=(x,.37,z);q=(x+math.cos(a)*.60,.39,z+math.sin(a)*.60)
        asset.beam("wood_dark",p,q,.053,7)
    # Sculpted sea stars with five small arms, one distinctive hero detail.
    for x,z in [(2.08,2.08),(-1.25,3.02)]:
        asset.sphere("coral",(x,.46,z),(.061,.03,.055),1)
        for j in range(5):
            a=j*2*PI/5
            asset.beam("coral",(x,.47,z),
                (x+math.cos(a)*.13,.45,z+math.sin(a)*.13),.022,5)
def coastal_rocks(asset):
    # Dense rock stack on the sheltered side only; do not invade the house or pier.
    seeds=[(-2.54,-.90,.39),(-2.93,-1.20,.58),(-3.03,-.70,.46),
           (-2.45,-1.58,.48),(2.64,-1.37,.48),(2.95,-1.03,.38),
           (3.10,-.37,.30),(-2.81,.50,.35)]
    for i,(x,z,r) in enumerate(seeds):
        boulder(asset,x,.39+r*.37,z,r,710+i,moss=i%3==0)
    for j in range(32):
        a=j*2.399963
        r=2.62+(j%5)*.17
        x=r*math.cos(a);z=r*math.sin(a)
        if z>1.48 and x<-.70:continue
        boulder(asset,x,.42,z,.12+(j%5)*.057,900+j,moss=j%8==0)
def hut(asset):
    # Rebuilt pitched roof as real roof slabs, not overlapping flat boxes.
    x=.40;z=-.80
    asset.box("stone",(x,.93,z),(2.95,.21,2.65))
    asset.box("wall",(x,1.73,z-.24),(2.34,1.42,1.89))
    for bx in [x-1.17,x+1.17]:
        for bz in [z-1.15,z+.70]:
            asset.beam("wood",(bx,1.02,bz),(bx,2.45,bz),.074)
    # Roof ridgeline along z, with independently sculpted sloped planes.
    ridge=3.08;edge=2.33
    leftx=x-1.52;rightx=x+1.52
    for side in [-1,1]:
        v=[(x,ridge,z-1.35),(x,ridge,z+1.08),
            (x+side*1.52,edge,z-1.35),(x+side*1.52,edge,z+1.08)]
        asset.mesh("thatch",v,((0,2,1),(1,2,3)))
        # braided rattan rows sit *above* roof slope
        for i in range(1,11):
            t=i/11
            yy=ridge-(ridge-edge)*t+.028
            bx=x+side*1.52*t
            for j in range(9):
                zz=z-1.27+j*.275+((i%2)*.06)
                asset.beam("thatch",(bx,yy,zz),(bx+side*.084,yy-.031,zz+.16),.026,5)
    # Several loose thatch strands follow the roof eaves; no solid overlapping roof box.
    for side in (-1,1):
        for k in range(29):
            bz=z-1.29+k*.084
            swing=.042*math.sin(k*.88+side)
            bx=x+side*(1.49+swing)
            asset.beam("thatch_light",(bx,edge+.014,bz),
                (bx+side*.09,edge-.13-.032*math.sin(k*.9),bz+.045),.019,5)
    for iz in range(12):
        zz=z-1.37+iz*.21
        asset.beam("wood_dark",(x,ridge+.045,zz),(x,ridge+.045,zz+.19),.037,7)
    # A front gable with carved dark wood bracing.
    front=z+1.1
    asset.beam("wood_dark",(x-1.12,2.32,front),(x,2.96,front),.050)
    asset.beam("wood_dark",(x+1.12,2.32,front),(x,2.96,front),.050)
    asset.beam("wood_dark",(x-.12,2.70,front),(x+.12,2.70,front),.041)
    # door and trim
    asset.box("wood",(x,1.42,z+.75),(.67,1.03,.058))
    asset.sphere("bronze",(x+.20,1.38,z+.80),(.038,.043,.029))
    for wx in (x-.89,x+.89):
        asset.box("accent",(wx,1.74,z+.75),(.44,.40,.08))
        asset.beam("wall",(wx-.22,1.73,z+.82),(wx+.22,1.73,z+.82),.024)
        asset.beam("wall",(wx,1.54,z+.82),(wx,1.94,z+.82),.024)
        asset.box("wood",(wx,1.51,z+.84),(.52,.09,.15))
        for sign in (-1,1):
            asset.box("wood_dark",(wx+sign*.34,1.75,z+.835),(.17,.45,.065))
            asset.beam("bronze",(wx+sign*.35,1.70,z+.88),(wx+sign*.35,1.89,z+.88),.017,6)
    # porch handrails, steps and golden lanterns
    for bx in (x-1.27,x+1.27):
        for bz in (z+.80,z+1.2):
            asset.beam("wood",(bx,.97,bz),(bx,1.49,bz),.049)
        asset.beam("wood",(bx,1.48,z+.8),(bx,1.48,z+1.2),.033)
        asset.sphere("bronze",(bx,1.65,z+.8),(.095,.13,.09))
    for i in range(5):
        asset.box("stone",(x,.91-.09*i,z+1.45+.26*i),(1.06,.10,.31))
    for bx in (x-1.45,x+1.45):
        asset.beam("wood",(bx,1.48,z+1.10),(bx,2.24,z+1.10),.053)
        asset.sphere("bronze",(bx,2.18,z+1.10),(.11,.13,.10))
    for i in range(4):
        asset.box("wood",(x-1.27+i*.82,.99,z+1.16),(.24,.38,.20))
    # Canvas awning and its timber supports beyond the staircase.
    awning=[(x-1.46,2.25,z+.84),(x+1.46,2.25,z+.84),
            (x-1.46,2.12,z+1.29),(x+1.46,2.12,z+1.29)]
    asset.mesh("linen",awning,((0,2,1),(1,2,3)))
    for xx in [x-1.46,x+1.46]:
        asset.beam("wood",(xx,1.24,z+1.29),(xx,2.13,z+1.29),.042)
    # Independent ringed barrels sit at the back of the terrace.
    for i in range(3):
        xx=x-1.14+i*.29
        zz=z+1.12+(i%2)*.17
        asset.beam("wood_dark",(xx,1.08,zz),(xx,1.39,zz),.125,9)
        for h in [1.12,1.35]:
            asset.beam("bronze",(xx-.12,h,zz-.016),(xx+.12,h,zz-.016),.018,6)
    rolled_rope(asset,x+1.15,1.02,z+1.08,.14,3)
def pier(asset):
    for i in range(10):
        x=-2.25-i*.38
        asset.box("wood",(x,.38,1.68),(.345,.115,1.01))
        if i%2==0:
            for z in (1.15,2.19):
                asset.beam("wood",(x,-.23,z),(x,.84,z),.09)
    for j in range(10):
        x=-2.25-j*.38
        # Visible individual dowels and nails on the pier boards.
        for zz in (1.23,2.12):
            asset.sphere("iron",(x,.45,zz),(.025,.016,.025),1)
    for z in (1.15,2.19):
        for i in range(9):
            x1=-2.25-i*.38;x2=x1-.38
            asset.beam("wood",(x1,.84,z),(x2,.79+.05*math.cos(i*.4),z),.018)
def build_island():
    a=Asset()
    radial_surface(a,"grass",.015,2.50,20)
    radial_surface(a,"sand",2.50,3.48,9)
    cliff(a)
    # Removed the circular underwater sand disc: continuous seabed shader
    # now supplies the shallow sandy gradient, without a visible hard edge.
    coastal_rocks(a)
    beach_details(a)
    # Four palm silhouettes, correctly planted in grass outside the house.
    for palm in [(-1.9,-1.40,2.17,-.37),(-.62,-2.05,2.30,-.24),(2.19,-1.25,2.0,.39),(2.28,.47,1.85,.32)]:
        bent_palm(a,*palm)
    for j in range(62):
        theta=j*2.399963+.47;r=.9+(j%9)*.17
        x=r*math.cos(theta);z=r*math.sin(theta)
        if -.95<x<1.9 and -2.0<z<1.25:continue
        if z>1.55:continue
        sz=.12+(j%4)*.033
        a.sphere("leaf",(x,.77,z),(sz,sz*.78,sz),1)
    for j in range(26):
        t=j*2.4;r=1.15+(j%5)*.27
        x=r*math.cos(t);z=r*math.sin(t)
        if -.8<x<1.9 and -.9<z<1.10:continue
        a.beam("leaf",(x,.76,z),(x,.89,z),.014)
        a.sphere("coral",(x,.89,z),(.065,.040,.06),1)
    hut(a);pier(a)
    # Carved beach trail and small decor with realistic variation.
    for k in range(7):
        a.box("stone",(.42,.75-k*.058,.86+k*.37),(.50-k*.035,.043,.22))
    for j in range(10):
        theta=j*2.399963
        r=3.7+(j%4)*.32
        a.sphere("stone",(r*math.cos(theta),-.58,r*math.sin(theta)),(.16,.11,.19),1)
    a.finish(OUT/"hero-island-v081.glb")
def sail(asset):
    vertices=[];faces=[]
    N=14
    for i in range(N+1):
        u=i/N
        for j in range(N+1):
            v=j/N
            x=(u-.5)*.95
            y=.81+v*1.21
            z=-.15+.19*math.sin(u*PI)*math.sin(v*PI)
            vertices.append((x,y,z))
            if i<N and j<N:
                o=i*(N+1)+j
                faces.extend(((o,o+N+1,o+1),(o+N+1,o+N+2,o+1)))
    asset.mesh("linen",vertices,faces)
def hull(asset):
    stations=[(-1.02,.07),(-.78,.33),(-.23,.49),(.40,.46),(.78,.31),(.99,.12)]
    vertices=[];faces=[];N=16
    for z,w in stations:
        for j in range(N):
            ang=j*PI*2/N
            vertices.append((math.sin(ang)*w,.27+math.cos(ang)*.225,z))
    for i in range(len(stations)-1):
        for j in range(N):
            a,b,c,d=i*N+j,i*N+(j+1)%N,(i+1)*N+j,(i+1)*N+(j+1)%N
            faces.extend(((a,b,c),(b,d,c)))
    asset.mesh("wood",vertices,faces)
def build_ship():
    a=Asset();hull(a)
    a.sphere("wood",(0,.47,.05),(.38,.07,.69),2)
    for side in [-1,1]:
        a.beam("wood",(side*.36,.48,-.67),(side*.36,.48,.70),.055)
        a.beam("bronze",(side*.42,.54,-.60),(side*.42,.54,.58),.013)
    a.beam("wood",(-.08,.52,-.15),(-.08,2.20,-.15),.058)
    a.beam("wood",(-.54,1.98,-.15),(.53,1.98,-.15),.034)
    a.beam("wood",(-.47,.75,-.15),(.48,.75,-.15),.029)
    sail(a)
    for end in [(-.33,.59,-.65),(.39,.61,.59)]:
        a.beam("wood",(-.08,2.18,-.15),end,.016)
    for z in [-.54,.35]:
        a.beam("wood",(.14,.49,z),(.14,.80,z),.055)
        a.sphere("bronze",(.14,.80,z),(.115,.055,.11),1)
    a.sphere("bronze",(-.31,.65,.64),(.080,.12,.085),1)
    a.box("accent",(0,.72,.68),(.26,.23,.20))
    a.beam("wood",(0,1.82,.62),(0,2.37,.62),.035)
    a.sphere("bronze",(0,2.37,.62),(.08,.09,.08),1)
    a.finish(OUT/"hero-ship-v081.glb")
if __name__=="__main__":
    build_island()
    build_ship()
