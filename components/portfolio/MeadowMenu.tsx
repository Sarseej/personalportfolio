'use client';
import {useRef} from 'react';
import type {View} from './atelier-types';

export default function MeadowMenu({onNavigate,soundEnabled}:{onNavigate:(view:View)=>void;soundEnabled:boolean}){
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const close=()=>{dialog.current?.close();trigger.current?.focus();};
 const go=(view:View)=>{close();onNavigate(view);};
 return <><button ref={trigger} className="menu-toggle" onClick={()=>dialog.current?.showModal()}>Menu</button>
 <dialog ref={dialog} className="meadow-menu" aria-label="Navigation menu" onCancel={e=>{e.stopPropagation();}} onKeyDown={e=>{if(e.key==='Escape')e.stopPropagation();}}>
 <button className="menu-close" onClick={close}>Close</button>
 <nav aria-label="Mobile navigation">{(['career','projects','cv'] as const).map(v=><button key={v} onClick={()=>go(v)}>{v==='cv'?'CV':v[0].toUpperCase()+v.slice(1)}</button>)}<a href="mailto:sarseej.shrestha@selu.edu" onClick={close}>Contact</a><button onClick={()=>go('field')}>Enter the meadow</button><button onClick={()=>document.querySelector<HTMLButtonElement>('.sound-toggle')?.click()} className="menu-sound">Sound {soundEnabled?'on':'off'}</button><button className="menu-home" onClick={()=>go('home')}>Home</button></nav>
 </dialog></>;
}
