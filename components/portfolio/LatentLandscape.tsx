'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei/web/Html';
import { BufferGeometry, Float32BufferAttribute, CatmullRomCurve3, Vector3, Group, Mesh, Points, PointLight, AdditiveBlending, MathUtils, LineBasicMaterial } from 'three';
import { seed } from '@/lib/visual/latent-graph';
import SignalFilaments from './SignalFilaments';
import { latent } from '@/lib/visual/latent-studio';
import type { RoomProps } from './atelier-types';

export default function LatentLandscape(props: RoomProps) {
  const dust = useRef<Points>(null), light = useRef<PointLight>(null), signal = useRef<Mesh>(null);
  const clock = useRef(0), response = useRef(4), prior = useRef(false);
  useEffect(()=>{if(props.station==="projects" || props.station==="field")response.current=0;},[props.station]);
  const attention = props.hovered==='projects' || props.station==='projects';
  const route = useMemo(()=>new CatmullRomCurve3([new Vector3(6,4,-9),new Vector3(2,3.8,-5),new Vector3(-2,3,-2),new Vector3(-1.06,2.14,-.23)]),[]);
  const glassRoute = useMemo(()=>new CatmullRomCurve3([new Vector3(-7,4.5,-13),new Vector3(-2,4,-9),new Vector3(0,3.7,-5)]),[]);
  const points = useMemo(()=>new Float32Array(Array.from({length:props.economy?30:110},(_,i)=>[(seed('dx'+i)-.5)*13,seed('dy'+i)*5,(seed('dz'+i)-.5)*9]).flat()),[props.economy]);
  useFrame((_,dt)=>{
    if(props.reduced)return;
    clock.current += Math.min(dt,.05);
    if(attention && !prior.current)response.current=0;
    prior.current=attention;
    response.current += Math.min(dt,.05);
    if(dust.current){dust.current.rotation.y=Math.sin(clock.current*Math.PI*2/18)*.035; dust.current.position.y=Math.sin(clock.current*Math.PI*2/14)*.12;}
    if(light.current){light.current.position.x=2+Math.sin(clock.current*Math.PI*2/24)*5;}
    if(signal.current){const duration=props.station==="projects"?.7:2.4;signal.current.visible=response.current<duration;(props.station === "field" ? glassRoute : route).getPoint(Math.min(1,response.current/duration),signal.current.position);}
  });
  return <group>
    <mesh position={[0,8,-35]}>
      <planeGeometry args={[130,60]}/>
      <shaderMaterial depthWrite={false} vertexShader={`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`} fragmentShader={`varying vec2 vUv;void main(){float haze=exp(-pow((vUv.y-.38)*9.,2.));float light=exp(-pow((vUv.x-.58)*3.,2.));vec3 c=mix(vec3(.012,.023,.048),vec3(.095,.16,.255),haze*(.4+.6*light));gl_FragColor=vec4(c,1.);}`} />
    </mesh>
    <SignalFilaments reduced={props.reduced} reveal={props.reveal || props.station === "field"}/>
    <points ref={dust}><bufferGeometry><bufferAttribute attach="attributes-position" args={[points,3]}/></bufferGeometry><pointsMaterial color={latent.paper} size={.012} transparent opacity={.2} depthWrite={false}/></points>
    <pointLight ref={light} position={[2,4,-3]} color={latent.lunar} intensity={13} distance={15}/>
    <mesh ref={signal} visible={false}><sphereGeometry args={[.055,12,8]}/><meshBasicMaterial color={latent.cyan} toneMapped={false}/></mesh>
    <mesh position={[0,.9,-18]}><planeGeometry args={[65,.025]}/><meshBasicMaterial color={latent.lunar} transparent opacity={.35}/></mesh>
  </group>;
}
