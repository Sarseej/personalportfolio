'use client';
import { useEffect, useRef, useState } from 'react';
import type { View } from './atelier-types';

type Director = { context: AudioContext; master: GainNode; detail: GainNode; nodes: AudioNode[]; sources: AudioScheduledSourceNode[] };
function createDirector(): Director {
  const context = new AudioContext();
  const master = context.createGain(); master.gain.value = 0; master.connect(context.destination);
  const detail = context.createGain(); detail.gain.value = .002; detail.connect(master);
  const nodes: AudioNode[] = [master,detail], sources: AudioScheduledSourceNode[]=[];
  [55,82.4069,110,146.8324].forEach((frequency,i)=>{
    const oscillator=context.createOscillator(), gain=context.createGain(), pan=context.createStereoPanner();
    oscillator.type='sine';oscillator.frequency.value=frequency; oscillator.detune.value=i%2 ? -3 : 2;
    gain.gain.value=[.055,.028,.012,.006][i];pan.pan.value=(i-1.5)*.4;
    oscillator.connect(gain).connect(pan).connect(master);oscillator.start();
    const lfo=context.createOscillator(), depth=context.createGain();lfo.frequency.value=.027+i*.009;depth.gain.value=.002;
    lfo.connect(depth).connect(gain.gain);lfo.start();sources.push(oscillator,lfo);nodes.push(gain,pan,depth);
  });
  const noise=context.createBuffer(1,context.sampleRate*8,context.sampleRate);let last=0;
  for(let i=0;i<noise.length;i++){last=(last+(Math.random()*2-1)*.02)/1.02;noise.getChannelData(0)[i]=last*2;}
  const texture=context.createBufferSource(),filter=context.createBiquadFilter(),textureGain=context.createGain();
  texture.buffer=noise;texture.loop=true;filter.type='lowpass';filter.frequency.value=360;filter.Q.value=.3;textureGain.gain.value=.023;
  texture.connect(filter).connect(textureGain).connect(master);texture.start();sources.push(texture);nodes.push(filter,textureGain);
  const upper=context.createOscillator(), pulse=context.createOscillator(),depth=context.createGain();
  upper.frequency.value=220; pulse.frequency.value=.3;depth.gain.value=.001;
  pulse.connect(depth).connect(detail.gain);upper.connect(detail);upper.start();pulse.start();sources.push(upper,pulse);nodes.push(depth);
  return {context,master,detail,nodes,sources};
}
export default function StudioSound({view,visible,onState}:{view:View;visible:boolean;onState?:(enabled:boolean)=>void}) {
  const [entered,setEntered]=useState(false),[enabled,setEnabled]=useState(false),[unavailable,setUnavailable]=useState(false);
  const director=useRef<Director|null>(null), intent=useRef(false), alive=useRef(true);
  useEffect(()=>onState?.(enabled),[enabled,onState]);
  useEffect(()=>{alive.current=true;try{if(localStorage.getItem('latent-sound')==='quiet')setEntered(true);}catch{}return()=>{alive.current=false; const d=director.current;if(d){d.sources.forEach(s=>s.stop());d.nodes.forEach(n=>n.disconnect());void d.context.close();director.current=null;}};},[]);
  const choose=async(sound:boolean)=>{
    setEntered(true);intent.current=sound;setUnavailable(false);
    try{localStorage.setItem('latent-sound',sound?'sound':'quiet');}catch{}
    if(!sound){setEnabled(false);const d=director.current;if(d)await d.context.suspend();return;}
    try{
      const d=director.current || (director.current=createDirector());await d.context.resume();
      if(!alive.current)return;
      if(!intent.current || document.hidden){await d.context.suspend();return;}
      d.master.gain.setTargetAtTime(.42,d.context.currentTime,.35);setEnabled(d.context.state==='running');
    }catch{if(alive.current){setEnabled(false);setUnavailable(true);}}
  };
  useEffect(()=>{const d=director.current;if(!d)return;
    d.detail.gain.setTargetAtTime(view==='projects'?.009:.002,d.context.currentTime,.3);
  },[view,enabled]);
  useEffect(()=>{const d=director.current;if(!d)return;
    if(!visible)void d.context.suspend();
    else if(intent.current)void d.context.resume().then(()=>{if(alive.current)setEnabled(d.context.state==='running');}).catch(()=>{if(alive.current){setEnabled(false);setUnavailable(true);}});
  },[visible]);
  return <>
    {!entered && <section className="sound-entry" aria-label="Choose your sound experience">
      <span className="overline">The latent studio</span>
      <p>A quiet place for interconnected work.</p>
      <div><button onClick={()=>void choose(true)}>Enter with sound <span aria-hidden="true">◌</span></button><button onClick={()=>void choose(false)}>Enter quietly <span aria-hidden="true">→</span></button></div>
    </section>}
    <button className="sound-toggle" aria-pressed={enabled} onClick={()=>void choose(!enabled)} aria-label={enabled?'Mute sound':'Unmute sound'}>
      <span aria-hidden="true">{enabled?'◒':'◌'}</span> Sound {enabled?'on':'off'}
    </button>
    {unavailable && <p className="sound-notice" role="status">Sound unavailable. The studio continues quietly.</p>}
  </>;
}
