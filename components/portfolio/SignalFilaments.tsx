'use client';
import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {BufferGeometry,CatmullRomCurve3,Float32BufferAttribute,Group,Vector3} from 'three';
import {signalEdges,signalNodes,nodeById,worldPosition} from '@/lib/visual/signal-field';
export default function SignalFilaments({reduced,reveal}:{reduced:boolean;reveal:boolean}){
 const pulse=useRef<Group>(null),time=useRef(0);
 const curves=useMemo(()=>signalEdges.filter(e=>e.primary).map(e=>{const a=new Vector3(...worldPosition(nodeById[e.source])),b=new Vector3(...worldPosition(nodeById[e.target]));return new CatmullRomCurve3([a,a.clone().lerp(b,.5).add(new Vector3(0,.45,-.5)),b]);}),[]);
 const geometry=useMemo(()=>{const v:number[]=[];curves.forEach(c=>{const pts=c.getPoints(40);pts.slice(1).forEach((p,i)=>v.push(...pts[i].toArray(),...p.toArray()));});return new BufferGeometry().setAttribute('position',new Float32BufferAttribute(v,3));},[curves]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 useFrame((_,dt)=>{if(reduced)return;time.current+=Math.min(dt,.05);pulse.current?.children.forEach((m,i)=>{const t=((time.current+i*1.7)%11)/3;m.visible=t<1;if(m.visible)curves[i].getPoint(t,m.position);});});
 return <group><lineSegments geometry={geometry}><lineBasicMaterial color="#8fb6ff" transparent opacity={reveal?.5:.24}/></lineSegments>{signalNodes.map(n=><group key={n.id} position={worldPosition(n)}><mesh><sphereGeometry args={[n.importance*.024,12,8]}/><meshBasicMaterial color={n.type==='project'?'#65e6ff':'#8fb6ff'}/></mesh><mesh><sphereGeometry args={[n.importance*.07,12,8]}/><meshBasicMaterial color="#8fb6ff" transparent opacity={.045} depthWrite={false}/></mesh></group>)}<group ref={pulse}>{curves.map((_,i)=><mesh key={i} visible={!reduced}><sphereGeometry args={[.022,8,6]}/><meshBasicMaterial color="#65e6ff"/></mesh>)}</group></group>;
}
