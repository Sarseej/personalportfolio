'use client';
import {useEffect,useRef,useState} from 'react';
import {connections,nodeById,signalEdges,signalNodes,type NodeType} from '@/lib/visual/signal-field';
export default function SignalField({ready,fallback,onBack,onProject,onActive,onMode,onFilter}:{ready:boolean;fallback:boolean;onBack:()=>void;onProject:(id:string)=>void;onActive:(id:string|null)=>void;onMode:(mode:boolean)=>void;onFilter:(filter:string)=>void}){
 const [selected,setSelected]=useState<string|null>(null),[focused,setFocused]=useState<string|null>(null),[mode,setMode]=useState(false),[filter,setFilter]=useState<NodeType|'all'>('all');
 const heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{if(ready)heading.current?.focus({preventScroll:true});},[ready]);
 useEffect(()=>{const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.stopImmediatePropagation();if(selected)setSelected(null);else onBack();}};window.addEventListener('keydown',escape,true);return()=>window.removeEventListener('keydown',escape,true);},[selected,onBack]);
 const active=focused||selected, adjacent=active?connections(active):[];
 useEffect(()=>onActive(active),[active,onActive]);
 useEffect(()=>onMode(mode),[mode,onMode]);
 useEffect(()=>onFilter(filter),[filter,onFilter]);
 const lit=(id:string)=>!active||id===active||adjacent.some(e=>e.source===id||e.target===id);
 const visible=(id:string)=>filter==='all'||nodeById[id].type===filter;
 const n=selected?nodeById[selected]:null;
 return <section className={`signal-field ${ready?'is-ready':''} ${n?'has-selection':''} ${fallback?'meadow-fallback':''}`} aria-label="The meadow" aria-hidden={!ready} style={!ready?{visibility:'hidden'}:undefined}>
 <div className="field-heading"><h1 className="sr-only" ref={heading} tabIndex={-1}>The meadow</h1><p>Every light belongs to a project, concept, or contribution.</p></div>
 <button className="field-back" onClick={onBack}>← Back to studio</button>
 <div className="field-controls"><button aria-pressed={mode} onClick={()=>setMode(!mode)}>Connections</button>{mode&&<div role="group" aria-label="Filter nodes">{(['all','project','concept','technology','contribution'] as const).map(t=><button key={t} aria-pressed={filter===t} onClick={()=>{setFilter(t);setSelected(null);setFocused(null);}}>{t==='all'?'All':t==='technology'?'Technologies':t[0].toUpperCase()+t.slice(1)+'s'}</button>)}</div>}</div>
 <div className="field-art" onClick={()=>setSelected(null)}>
 <svg viewBox="0 0 1000 800" preserveAspectRatio="none" aria-hidden="true"><defs><radialGradient id="field-haze"><stop stopColor="#8fb6ff" stopOpacity=".11"/><stop offset="1" stopColor="#05070d" stopOpacity="0"/></radialGradient></defs><ellipse cx="520" cy="440" rx="490" ry="260" fill="url(#field-haze)"/>{signalEdges.map((e,i)=>{const a=nodeById[e.source].position,b=nodeById[e.target].position,highlight=!!active&&(e.source===active||e.target===active);return <path key={e.source+e.target} className={`${highlight?'selected-path':''} ${e.verification==='documented-protocol'?'protocol-path':''}`} d={`M${a[0]*10},${a[1]*8} Q${(a[0]+b[0])*5},${(a[1]+b[1])*4-35-i%3*10} ${b[0]*10},${b[1]*8}`} fill="none" stroke={highlight?'#a8d7f6':'#8fb6ff'} strokeWidth={highlight?1.5:.8} opacity={highlight?.85:active?.045:!e.primary&&!mode?.025:.2}><title>{e.label}</title></path>;})}</svg>
 <ul className="field-node-list" aria-label="Projects and their factual relationships">{signalNodes.map(node=><li key={node.id} id={'firefly-'+node.id} style={{left:`${node.position[0]}%`,top:`${node.position[1]}%`,opacity:visible(node.id)&&lit(node.id)?1:.2}}><button className={`field-node node-${node.type}`} aria-pressed={selected===node.id} aria-label={`${node.name}, ${node.type}`} aria-describedby={`relations-${node.id}`} onClick={e=>{e.stopPropagation();setSelected(node.id);setFocused(null);}} onMouseEnter={()=>setFocused(node.id)} onMouseLeave={()=>setFocused(null)} onFocus={()=>setFocused(node.id)} onBlur={()=>setFocused(null)}><i aria-hidden="true"/>{(node.id===active||(mode&&!!active&&lit(node.id)))&&<span>{node.name}</span>}<span id={`relations-${node.id}`} className="sr-only">{connections(node.id).map(e=>`${nodeById[e.source].name} ${e.label}: ${nodeById[e.target].name}`).join(". ")}</span></button></li>)}</ul>
 </div>
 {n&&<aside className="field-detail" aria-label={`${n.name} details`}><button className="field-close" onClick={()=>setSelected(null)} aria-label="Clear selection">×</button><span className="field-kicker">{n.type}</span><h2>{n.name}</h2><p>{n.description}</p><ul>{connections(n.id).map(e=>{const other=nodeById[e.source===n.id?e.target:e.source];return <li key={e.source+e.target}><button onClick={()=>setSelected(other.id)}>{other.name}</button><span>{e.label}{e.verification==='documented-protocol'?' · protocol':''}</span><a href={e.evidence} target="_blank" rel="noreferrer" aria-label={`Evidence: ${e.label}`}>↗</a></li>;})}</ul><div className="field-detail-links"><a href={n.repository} target="_blank" rel="noreferrer">Repository ↗</a>{n.destination&&<button onClick={()=>onProject(n.destination!)}>View project →</button>}</div></aside>}
 </section>;
}
