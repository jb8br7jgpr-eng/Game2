#!/usr/bin/env python3
"""Verify that the prebuilt art is portable and has textured PBR meshes."""
from pathlib import Path
import trimesh
import io

root=Path(__file__).resolve().parent.parent/"assets"
for filename in ("hero-island-v081.glb","hero-ship-v081.glb"):
    path=root/filename
    assert path.exists(),f"Missing authored asset {path}"
    size=path.stat().st_size
    assert 15000<size<12_000_000,(filename,size)
    with path.open("rb") as fh:
        scene=trimesh.load_scene(fh,file_type="glb",process=False)
    assert len(scene.geometry)>=4,(filename,len(scene.geometry))
    triangles=sum(len(mesh.faces) for mesh in scene.geometry.values())
    assert triangles>=1200,(filename,triangles)
    textured=[mesh for mesh in scene.geometry.values() if
              getattr(getattr(mesh.visual,"material",None),"baseColorTexture",None) is not None]
    assert len(textured)>=3,(filename,len(textured))
    b=scene.bounds
    assert b is not None
    print(f"PASS {filename} {size//1024}KiB, {len(scene.geometry)} meshes, {triangles} faces, {len(textured)} textured mats, bounds {b.round(2).tolist()}")
