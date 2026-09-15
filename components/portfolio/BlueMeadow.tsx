'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferAttribute, DoubleSide, Group, Mesh, InstancedBufferAttribute, InstancedBufferGeometry, PlaneGeometry, ShaderMaterial } from 'three';
import { seed } from '@/lib/visual/latent-graph';
import type { RoomProps } from './atelier-types';

export function meadowHeight(x: number, z: number) {
  return .25 + Math.sin(x * .085 + z * .06) * .65 + Math.sin(z * .14) * .25;
}

const windVertex = `
attribute vec4 blade;
uniform float time;
uniform float breeze;
varying float tip;
varying float depth;
varying float variation;
void main() {
  tip = position.y;
  variation = fract(blade.x * .123 + blade.z * .173);
  vec3 p = position;
  float angle = blade.w;
  p.x *= .035 + variation * .03;
  p.y *= blade.z;
  float wave = sin(blade.x*.24 + blade.y*.13 + time*.37);
  float local = sin(blade.x*.61 - blade.y*.2 + time*.57)*.16;
  float gust = sin(time*.13 + blade.y*.04)*.13;
  float lean = (.18 + wave*.18 + local + gust + breeze*.08) * tip*tip;
  p.xz = mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*p.xz;
  p.x += lean*blade.z;
  p.z += lean*.37;
  p += vec3(blade.x, .25 + sin(blade.x*.085+blade.y*.06)*.65 + sin(blade.y*.14)*.25, blade.y);
  vec4 view = modelViewMatrix * vec4(p,1.);
  depth = -view.z;
  gl_Position = projectionMatrix * view;
}`;
const grassFragment = `
varying float tip; varying float depth; varying float variation;
void main(){
  vec3 c=mix(vec3(.018,.061,.096),vec3(.16,.30,.39),pow(tip,1.3)*(.5+variation*.5));
  float mist=1.-exp(-depth*.023);
  c=mix(c,vec3(.078,.17,.255),mist*.88);
  gl_FragColor=vec4(c,1.);
}`;

export default function BlueMeadow({ economy, reduced, visible, pointer }: RoomProps) {
  const group = useRef<Group>(null);
  const material = useRef<ShaderMaterial>(null);
  const elapsed = useRef(0);
  const grass = useMemo(() => {
    const count = economy ? 12000 : 42000;
    const geometry = new InstancedBufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array([
      -.5,0,0, .5,0,0, -.33,.48,0, .33,.48,0, -.13,.82,0, .13,.82,0, 0,1,0,
    ]),3));
    geometry.setIndex([0,1,2,1,3,2,2,3,4,3,5,4,4,5,6]);
    const data = new Float32Array(count * 4);
    for(let i=0;i<count;i++) {
      const distance = Math.pow(seed('grass-z'+i),1.7)*82;
      data.set([(seed('grass-x'+i)-.5)*(42+distance*.55),-5.3-distance,.65+seed('grass-h'+i)*1.3,seed('grass-a'+i)*6.28],i*4);
    }
    geometry.setAttribute('blade',new InstancedBufferAttribute(data,4));
    geometry.instanceCount=count;
    return geometry;
  },[economy]);
  const ground=useMemo(()=>{
    const g=new PlaneGeometry(140,100,90,70);g.rotateX(-Math.PI/2);g.translate(0,0,-54);
    const p=g.attributes.position;
    for(let i=0;i<p.count;i++)p.setY(i,meadowHeight(p.getX(i),p.getZ(i))-.03);
    g.computeVertexNormals();return g;
  },[]);
  useEffect(()=>()=>grass.dispose(),[grass]);
  useEffect(()=>()=>ground.dispose(),[ground]);
  useEffect(()=>{const scene=group.current;return()=>scene?.traverse(object=>{if(object instanceof Mesh){object.geometry.dispose();const materials=Array.isArray(object.material)?object.material:[object.material];materials.forEach(value=>value.dispose());}});},[]);
  useFrame((_,dt)=>{
    if(!visible || reduced)return;
    elapsed.current+=Math.min(dt,.05);
    if(material.current){material.current.uniforms.time.value=elapsed.current;material.current.uniforms.breeze.value=pointer.current[0];}
  });
  return <group ref={group}>
    <mesh position={[0,15,-95]}><planeGeometry args={[250,140]}/><shaderMaterial depthWrite={false}
      vertexShader="varying vec2 uvSky;void main(){uvSky=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }"
      fragmentShader="varying vec2 uvSky;void main(){float h=exp(-pow((uvSky.y-.39)*9.,2.));gl_FragColor=vec4(mix(vec3(.012,.032,.069),vec3(.09,.20,.30),h),1.);}"/></mesh>
    <mesh geometry={ground}><meshStandardMaterial color="#102e41" roughness={1}/></mesh>
    <mesh geometry={grass} frustumCulled={false}><shaderMaterial ref={material} side={DoubleSide} vertexShader={windVertex} fragmentShader={grassFragment} uniforms={useMemo(()=>({time:{value:0},breeze:{value:0}}),[])}/></mesh>
  </group>;
}
