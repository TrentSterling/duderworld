#!/usr/bin/env python3
"""Visual QA: rasterize baked GLB via Mesa software OpenGL ES3, no web browser.

This uses a simple untextured, diffuse shader for inspection. It is *not* a
browser screenshot and does not match Three.js lighting/shadows. It confirms
the baked topology, color and camera compositions under a real GPU pipeline.
"""
from __future__ import annotations
import argparse
import base64
import importlib.util
import json
import math
from pathlib import Path
import struct
import sys
import numpy as np

renderer_file=Path(__file__).resolve().with_name('render-capture.py')
loader=importlib.util.spec_from_file_location('capture',renderer_file)
capture=importlib.util.module_from_spec(loader)
sys.modules['capture']=capture
loader.loader.exec_module(capture)

VS="""#version 300 es
precision highp float;
layout(location=0) in vec3 position;
layout(location=1) in vec3 normal;
layout(location=2) in vec3 color;
uniform mat4 uMVP;
out vec3 vColor;
out vec3 vNormal;
void main(){
    gl_Position=uMVP*vec4(position,1.0);
    vColor=color;
    vNormal=normal;
}
"""
FS="""#version 300 es
precision highp float;
in vec3 vColor;
in vec3 vNormal;
out vec4 fragColor;
void main(){
    vec3 normal=normalize(vNormal);
    float sun=max(0.0,dot(normal,normalize(vec3(-0.48,0.91,0.32))));
    float shade=0.58+0.42*sun;
    vec3 linear=clamp(vColor*shade+vec3(0.05),vec3(0.0),vec3(1.0));
    vec3 srgb=pow(linear,vec3(1.0/2.2));
    fragColor=vec4(srgb,1.0);
}
"""
def normalized(a):
    return a/(np.linalg.norm(a)+1e-12)

def lookat(eye,target,up):
    eye=np.array(eye,dtype=np.float64)
    f=normalized(np.array(target,dtype=np.float64)-eye)
    s=normalized(np.cross(f,np.array(up,dtype=np.float64)))
    u=np.cross(s,f)
    return np.array([
        [*s,-np.dot(s,eye)],
        [*u,-np.dot(u,eye)],
        [*-f,np.dot(f,eye)],
        [0,0,0,1]
    ])
def projection(fov,aspect,znear=.1,zfar=800):
    f=1/math.tan(math.radians(fov)/2)
    return np.array([
        [f/aspect,0,0,0],[0,f,0,0],
        [0,0,(zfar+znear)/(znear-zfar),2*zfar*znear/(znear-zfar)],
        [0,0,-1,0]],dtype=np.float64)
def ortho(bounds,aspect,znear=.1,zfar=800):
    b=bounds;left,right=-b*aspect,b*aspect;bottom,top=-b,b
    return np.array([
        [2/(right-left),0,0,-(right+left)/(right-left)],
        [0,2/(top-bottom),0,-(top+bottom)/(top-bottom)],
        [0,0,-2/(zfar-znear),-(zfar+znear)/(zfar-znear)],
        [0,0,0,1]],dtype=np.float64)

def extract(path):
    blob=Path(path).read_bytes()
    if blob[:4]!=b'glTF':raise ValueError('Not GLB')
    json_len=struct.unpack_from('<I',blob,12)[0]
    info=json.loads(blob[20:20+json_len])
    offset=20+json_len
    bin_len=struct.unpack_from('<I',blob,offset)[0]
    payload=blob[offset+8:offset+8+bin_len]
    def accessor(index):
        acc=info['accessors'][index]
        view=info['bufferViews'][acc['bufferView']]
        length=acc['count']*{'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[acc['type']]
        item={5126:4,5125:4,5123:2,5121:1}[acc['componentType']]
        start=view.get('byteOffset',0)+acc.get('byteOffset',0)
        return payload[start:start+length*item]
    primitives=[]
    for mesh in info['meshes']:
        for p in mesh['primitives']:
            primitives.append((p,accessor))
    return primitives

def preview(glb,out,angle,size):
    w,h=size
    if angle=='overhead':
        view=lookat([0,210,.001],[0,-1,0],[0,0,-1])
        proj=ortho(86,w/h)
    elif angle=='skate':
        view=lookat([34,29,36],[0,0,0],[0,1,0])
        proj=projection(56,w/h)
    else:
        view=lookat([108,123,139],[0,-1,0],[0,1,0])
        proj=projection(47,w/h)
    mvp=proj@view
    mvp_array=list(np.asarray(mvp.T,dtype=np.float32).ravel())
    glb_data=extract(glb)
    draws=[]
    for p,get in glb_data:
        attrs=[]
        for name,loc in [('POSITION',0),('NORMAL',1),('COLOR_0',2)]:
            raw=get(p['attributes'][name])
            attrs.append({'loc':loc,'size':3,'type':5126,
                          'data':base64.b64encode(raw).decode('ascii')})
        raw=get(p['indices'])
        draws.append({'vs':VS,'fs':FS,'attributes':attrs,
            'count':len(raw)//4,'method':'drawElements',
            'indices':{'data':base64.b64encode(raw).decode('ascii'),'type':5125},
            'uniforms':{'uMVP':{'type':'Matrix4fv','transpose':False,'value':mvp_array}},
            'state':{'viewport':[0,0,w,h],'depthTest':True,'depthMask':True,
                     'cullFaceEnabled':False,'blend':False}})
    trace={'clear':{'color':[.64,.85,.91,1]},'draws':draws}
    renderer=capture.EGLRenderer(w,h)
    try:
        report=renderer.render(trace,out)
        report['verification_scope']='Baked GLB position, normal and COLOR_0 rendered with simple QA GLSL by Mesa GLES3; not a browser screenshot.'
        report_file=Path(out).with_suffix('.json')
        report_file.write_text(json.dumps({
            key:value for key,value in report.items() if key not in ['draws','shader_validation']
        },indent=2)+'\n')
        print('Wrote',out,'triangles',report['triangles'],'renderer',report['renderer']['renderer'])
    finally:renderer.close()

if __name__=='__main__':
    ap=argparse.ArgumentParser()
    ap.add_argument('model',type=Path)
    ap.add_argument('image',type=Path)
    ap.add_argument('--angle',choices=['overhead','oblique','skate'],default='oblique')
    ap.add_argument('--width',type=int,default=1460)
    ap.add_argument('--height',type=int,default=1020)
    args=ap.parse_args()
    args.image.parent.mkdir(parents=True,exist_ok=True)
    preview(args.model,args.image,args.angle,(args.width,args.height))
