'use client';
import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {AdditiveBlending,BufferGeometry,Float32BufferAttribute,Group,LineBasicMaterial,PlaneGeometry,ShaderMaterial,Vector3} from 'three';
import {signalEdges,signalNodes,nodeById,worldPosition} from '@/lib/visual/signal-field';
import type {RoomProps} from './atelier-types';

export default function MeadowFireflies(props:RoomProps){
 const groups=useRef<(Group|null)[]>([]),time=useRef(0),mix=useRef(0);
 const pulses=useRef<(Group|null)[]>([]);
 const projected=useMemo(()=>new Vector3(),[]);
 const resources=useMemo(()=>({
   geometry:new PlaneGeometry(1,1),
   materials:signalNodes.map(()=>new ShaderMaterial({transparent:true,depthWrite:false,blending:AdditiveBlending,
     uniforms:{strength:{value:1}},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
     fragmentShader:'varying vec2 v;uniform float strength;void main(){float d=length(v-.5);float halo=exp(-d*d*38.)*.33;float core=exp(-d*d*1900.);gl_FragColor=vec4(mix(vec3(1.,.66,.16),vec3(1.,.96,.69),core), (halo+core)*strength);}' })),
   lines:signalEdges.map(()=>new BufferGeometry().setAttribute('position',new Float32BufferAttribute(new Float32Array(144),3))),
   lineMaterials:signalEdges.map(()=>new LineBasicMaterial({color:'#ffd36a',transparent:true,opacity:0,depthWrite:false})),
   positions:signalNodes.map(()=>new Vector3()),
   times:signalNodes.map(()=>0),
 }),[]);
 useEffect(()=>()=>{resources.geometry.dispose();resources.materials.forEach(m=>m.dispose());resources.lines.forEach(g=>g.dispose());resources.lineMaterials.forEach(m=>m.dispose());},[resources]);
 useFrame(({camera,size},dt)=>{
   if(!props.visible)return;
   if(!props.reduced)time.current+=Math.min(dt,.05);
   const target=props.station==='field'?1:0;
   mix.current=props.reduced?target:mix.current+(target-mix.current)*(1-Math.exp(-Math.min(dt,.05)*5));
   if(Math.abs(mix.current-target)<.001)mix.current=target;
   const active=props.fieldActive;
   const related=(id:string)=>!active||id===active||signalEdges.some(e=>(e.source===active&&e.target===id)||(e.target===active&&e.source===id));
   signalNodes.forEach((n,i)=>{
     const home=worldPosition(n),g=groups.current[i],p=resources.positions[i];
     const x=(n.position[0]-50)*(props.mobile?.041:.10),y=5.65-n.position[1]*(props.mobile?.052:.047),z=-13-(i%3)*.3;
     if(!props.reduced&&active!==n.id)resources.times[i]+=Math.min(dt,.05);
     const t=resources.times[i],phase=i*2.399;
     p.set(home[0]*(1-mix.current)+x*mix.current,home[1]*(1-mix.current)+y*mix.current,home[2]*(1-mix.current)+z*mix.current);
     if(!props.reduced){p.x+=Math.sin(t*.19+phase)*.10+Math.sin(t*.087+phase)*.04;p.y+=Math.sin(t*.23+phase)*Math.cos(t*.071+phase)*.085;}
     const matches=!props.fieldFilter||props.fieldFilter==='all'||props.fieldFilter===n.type;
     resources.materials[i].uniforms.strength.value=(active?(related(n.id)?1.45:.27):1)*(matches?1:.2)*(1+Math.sin(t*.31+phase)*.17);
     if(g){g.position.copy(p);g.quaternion.copy(camera.quaternion);g.scale.setScalar(n.type==='project'?.38:n.type==='contribution'?.32:.24);}
     if(props.station==='field'){
       projected.copy(p).project(camera);
       const el=document.getElementById('firefly-'+n.id);
       if(el){el.style.left=`${(projected.x*.5+.5)*size.width}px`;el.style.top=`${(-projected.y*.5+.5)*size.height}px`;}
     }
   });
   signalEdges.forEach((e,i)=>{
     const show=props.station==='field' ? active?(e.source===active||e.target===active):props.reveal&&e.primary : props.reveal&&e.primary;
     const phase=((time.current+i*2.31)%17)/3;
     const pulse=pulses.current[i];
     const pulseVisible=!props.reduced&&phase<1&&(show||props.station==='home'&&e.primary&&i%7===0);
     if(pulse)pulse.visible=pulseVisible;
     resources.lineMaterials[i].opacity=props.reduced?(show?.38:0):resources.lineMaterials[i].opacity+((show?.38:0)-resources.lineMaterials[i].opacity)*(1-Math.exp(-dt*7));
     if(!show&&!pulseVisible&&resources.lineMaterials[i].opacity<.005)return;
     const a=resources.positions[signalNodes.indexOf(nodeById[e.source])],b=resources.positions[signalNodes.indexOf(nodeById[e.target])];
     if(pulse&&pulseVisible){pulse.position.copy(a).lerp(b,phase);pulse.position.y+=Math.sin(phase*Math.PI)*.24;pulse.quaternion.copy(camera.quaternion);pulse.scale.setScalar(.10);}
     const array=resources.lines[i].attributes.position.array as Float32Array;
     for(let j=0;j<48;j++){const t=(Math.floor(j/2)+(j%2))/24;array[j*3]=a.x+(b.x-a.x)*t;array[j*3+1]=a.y+(b.y-a.y)*t+Math.sin(t*Math.PI)*.24;array[j*3+2]=a.z+(b.z-a.z)*t;}
     resources.lines[i].attributes.position.needsUpdate=true;
   });
 });
 return <group>{signalEdges.map((e,i)=><group key={e.source+e.target}><lineSegments geometry={resources.lines[i]} material={resources.lineMaterials[i]} frustumCulled={false}/><group ref={g=>{pulses.current[i]=g;}} visible={false}><mesh geometry={resources.geometry} material={resources.materials[0]}/></group></group>)}{signalNodes.map((n,i)=><group ref={g=>{groups.current[i]=g;}} key={n.id}><mesh geometry={resources.geometry} material={resources.materials[i]}/></group>)}</group>;
}
