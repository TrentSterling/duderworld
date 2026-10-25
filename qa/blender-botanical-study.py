"""Build an editable native .blend from the exact procedural asset meshes.
Run with Blender --background --factory-startup --python this_file.
"""
import bpy,json,math,pathlib
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parent.parent;OUT=ROOT/'evidence'/'art'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
data=json.loads((OUT/'botanical-meshes.json').read_text())
mat=bpy.data.materials.new('DuderWorld vertex-colour ceramic');mat.use_nodes=True
nodes=mat.node_tree.nodes;links=mat.node_tree.links;bsdf=nodes.get('Principled BSDF');bsdf.inputs['Roughness'].default_value=.79
attr=nodes.new('ShaderNodeVertexColor');attr.layer_name='COLOR_0';links.new(attr.outputs['Color'],bsdf.inputs['Base Color'])
for item in data:
 positions=list(zip(*[iter(item['positions'])]*3));verts=[(p[0],-p[2],p[1]) for p in positions]
 faces=list(zip(*[iter(item['indices'])]*3));mesh=bpy.data.meshes.new(item['name']);mesh.from_pydata(verts,[],faces);mesh.update()
 c=mesh.color_attributes.new(name='COLOR_0',type='FLOAT_COLOR',domain='POINT')
 for i,value in enumerate(c.data):
  rgb=[x/255 for x in item['colors'][i*3:i*3+3]];value.color=tuple(x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in rgb)+(1,)
 normals=list(zip(*[iter(item['normals'])]*3));mesh.normals_split_custom_set_from_vertices([(n[0],-n[2],n[1]) for n in normals])
 for poly in mesh.polygons:poly.use_smooth=True
 obj=bpy.data.objects.new(item['name'],mesh);bpy.context.collection.objects.link(obj);obj.location=(item['position'][0],0,0);obj.data.materials.append(mat)
 obj['source']='src/botanical-kit.mjs';obj['purpose']='Editable exact exported geometry; original procedural source remains authoritative.'
bpy.ops.mesh.primitive_plane_add(size=200);floor=bpy.context.object;floor.name='Studio floor';floorMat=bpy.data.materials.new('Warm studio paper');floorMat.diffuse_color=(.73,.68,.56,1);floor.data.materials.append(floorMat);floor.location.z=-.015
world=bpy.context.scene.world;world.use_nodes=True;world.node_tree.nodes.get('Background').inputs[0].default_value=(.65,.74,.8,1);world.node_tree.nodes.get('Background').inputs[1].default_value=.5
for name,loc,power,size in [('Key',(-4,-5,8),850,5),('Fill',(5,1,6),450,5)]:
 light=bpy.data.lights.new(name,'AREA');light.energy=power;light.shape='DISK';light.size=size;o=bpy.data.objects.new(name,light);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
camData=bpy.data.cameras.new('Plant study camera');cam=bpy.data.objects.new('Plant study camera',camData);bpy.context.collection.objects.link(cam);cam.location=(5,-9,4.2);cam.rotation_euler=(Vector((0,0,1))-cam.location).to_track_quat('-Z','Y').to_euler();camData.type='ORTHO';camData.ortho_scale=8.5
scene=bpy.context.scene;scene.camera=cam;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=1280;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/'blender-botanical-study.png')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'Duderworld-botanical-kit.blend'))
bpy.ops.render.render(write_still=True)
print('DUDERWORLD_BLENDER_STUDY_COMPLETE',flush=True)
