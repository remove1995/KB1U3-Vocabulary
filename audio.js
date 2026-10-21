'use strict';
/* User recordings are loaded by recordings.js; missing lines use device speech. */
window.TOY_AUDIO_FILES=window.TOY_AUDIO_FILES||{lines:{},effects:{}};
class ToyAudio{
 constructor(){this.context=null;this.volume=.75;this.muted=false;this.rate=.85;this.musicEnabled=true;this.musicVolume=.03;this.music=null;this.musicStarted=false;this.pending=new Set();this.playingFiles=new Set();this.nodes=new Set();this.voices=[];this.refreshVoices();if(window.speechSynthesis)window.speechSynthesis.addEventListener('voiceschanged',()=>this.refreshVoices())}
 refreshVoices(){this.voices=window.speechSynthesis?.getVoices()||[]}
 unlock(){const AC=window.AudioContext||window.webkitAudioContext;if(AC&&!this.context)this.context=new AC();if(this.context?.state==='suspended')this.context.resume().catch(()=>{})}
 startMusic(){this.musicStarted=true;if(!this.music){this.music=new Audio('audio/theme.mp3');this.music.loop=true;this.music.preload='auto';}this.music.volume=this.musicVolume;this.music.playbackRate=1;if(this.musicEnabled)this.music.play().catch(()=>{});else this.music.pause()}
 pauseMusic(){this.musicStarted=false;this.music?.pause()}
 setMusicEnabled(enabled){this.musicEnabled=!!enabled;if(this.musicEnabled&&this.musicVolume===0)this.musicVolume=.03;if(this.musicStarted)this.startMusic();else this.music?.pause()}
 setVolume(value){this.volume=Math.max(0,Math.min(1,Number(value)||0));this.muted=this.volume===0;this.refreshFileVolumes()}
 setMuted(muted){this.muted=!!muted;if(!this.muted&&this.volume===0)this.volume=.75;this.refreshFileVolumes()}
 refreshFileVolumes(){for(const a of this.playingFiles)a.volume=this.muted?0:this.volume}
 setMusicVolume(value){this.musicVolume=Math.max(0,Math.min(1,Number(value)||0));this.musicEnabled=this.musicVolume>0;if(this.music)this.music.volume=this.musicVolume;if(this.musicStarted)this.startMusic()}
 cancel(){for(const stop of [...this.pending])stop();window.speechSynthesis?.cancel();for(const n of this.nodes){try{n.stop()}catch(e){}}this.nodes.clear()}
 delay(ms){return new Promise(resolve=>{let timer;const done=()=>{clearTimeout(timer);this.pending.delete(done);resolve()};this.pending.add(done);timer=setTimeout(done,ms)})}
 async file(url,speech=false){return new Promise(resolve=>{const a=new Audio(url);let timer,settled=false;const done=(ok)=>{if(settled)return;settled=true;clearTimeout(timer);a.pause();a.onended=null;a.onerror=null;this.pending.delete(cancel);this.playingFiles.delete(a);resolve(ok)};const cancel=()=>done(true);this.pending.add(cancel);this.playingFiles.add(a);a.volume=this.muted?0:this.volume;a.playbackRate=speech?this.rate/.85:1;a.onended=()=>done(true);a.onerror=()=>done(false);timer=setTimeout(()=>done(false),15000);a.play().catch(()=>done(false))})}
 async say(text,key=text,doll=false){
  if(TOY_AUDIO_FILES.lines[key]&&await this.file(TOY_AUDIO_FILES.lines[key],true))return;
  if(this.muted)return this.delay(Math.max(700,text.length*45));
  this.refreshVoices();if(!window.speechSynthesis)return this.delay(Math.max(1000,text.length*65));
  return new Promise(resolve=>{const u=new SpeechSynthesisUtterance(text);u.lang='en-GB';u.rate=this.rate;u.pitch=doll?1.65:1.15;u.volume=this.volume;u.voice=this.voices.find(v=>v.lang==='en-GB'&&/Daniel|Oliver|Arthur|George/i.test(v.name))||this.voices.find(v=>v.lang==='en-GB')||this.voices.find(v=>/^en/.test(v.lang));let timer;const done=()=>{clearTimeout(timer);this.pending.delete(cancel);resolve()};const cancel=()=>{window.speechSynthesis.cancel();done()};u.onend=done;u.onerror=done;this.pending.add(cancel);timer=setTimeout(()=>{window.speechSynthesis.cancel();done()},Math.max(6000,text.length*220));window.speechSynthesis.speak(u)})
 }
 tone(freq,duration,offset=0,type='sine',volume=.3,endFreq=freq){const c=this.context;if(!c)return;const t=c.currentTime+offset;const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),t+duration);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,volume*this.volume),t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+duration+.03);this.nodes.add(o);o.onended=()=>{this.nodes.delete(o);o.disconnect();g.disconnect()}}
 noise(duration,offset=0,volume=.2,frequency=2000){const c=this.context;if(!c)return;const t=c.currentTime+offset;const b=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate);const d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;const n=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter();n.buffer=b;f.type='lowpass';f.frequency.value=frequency;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,volume*this.volume),t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+duration);n.connect(f);f.connect(g);g.connect(c.destination);n.start(t);this.nodes.add(n);n.onended=()=>{this.nodes.delete(n);n.disconnect();g.disconnect()}}
 async effect(id){
  if(TOY_AUDIO_FILES.effects[id]&&await this.file(TOY_AUDIO_FILES.effects[id]))return;
  if(id==='doll')return this.say('Hello! How are you?','doll-greeting',true);
  const durations={ball:1100,bike:1400,car:1900,drum:1400,train:1900,computer:1500};
  if(!this.muted){this.unlock();
   if(id==='ball'){[0,.5].forEach(t=>{this.tone(155,.22,t,'sine',.6,48);this.noise(.06,t,.16,550)})}
   if(id==='bike'){[0,.32].forEach(t=>{this.tone(1450,.85,t,'sine',.28);this.tone(2130,.65,t,'sine',.1)})}
   if(id==='car'){[0,.27].forEach(t=>{this.tone(470,.19,t,'square',.09);this.tone(585,.19,t,'sine',.18)});this.tone(70,1.1,.65,'sawtooth',.17,170);this.noise(1.1,.65,.1,600)}
   if(id==='drum'){[0,.22,.48,.72,1].forEach(t=>{this.tone(165,.18,t,'sine',.55,55);this.noise(.14,t,.3,3400)})}
   if(id==='train'){[0,.26,.52,.78,1.02,1.24,1.44,1.62].forEach((t,i)=>{this.noise(.15,t,.3,700+i*70);this.tone(95,.08,t,'sine',.24,50)});this.tone(650,.5,1.15,'sine',.1,650)}
   if(id==='computer'){[0,.11,.23,.4,.49,.7,.83,1,1.12,1.27].forEach(t=>{this.noise(.035,t,.22,3800);this.tone(480,.025,t,'square',.025,190)})}
  }
  return this.delay(durations[id]||1000)
 }
 success(){if(!this.muted){this.tone(660,.18);this.tone(880,.28,.12)}}
}
window.ToyAudio=ToyAudio;
