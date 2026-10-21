'use strict';
const {toys,sequences,soundOrder,ToyGame}=TOY_DATA;
const $=id=>document.getElementById(id);
const model=new ToyGame(),audio=new ToyAudio();
const ICONS={music:'<path d="M20 8v28a9 9 0 1 1-5-8V6l30-5v29a9 9 0 1 1-5-8V10z"/>',musicOff:'<path d="M20 8v28a9 9 0 1 1-5-8V6l30-5v29a9 9 0 1 1-5-8V10z"/><path d="m5 5 42 42" fill="none" stroke="#fff" stroke-width="7"/>',home:'<path d="M3 23 25 3l22 20-5 5-4-4v21H29V31h-9v14H10V24l-3 4z"/>',sound:'<path d="M4 18h10L27 7v36L14 32H4z"/><path d="M33 15q12 10 0 20m6-28q20 18 0 36" fill="none" stroke-width="5" stroke-linecap="round"/>',muted:'<path d="M4 18h10L27 7v36L14 32H4z"/><path d="m34 18 13 14m0-14L34 32" fill="none" stroke-width="5" stroke-linecap="round"/>',replay:'<path d="M12 15A17 17 0 1 1 9 33" fill="none" stroke-width="6" stroke-linecap="round"/><path d="M1 5v19h19z"/>'};
function icon(el,name){el.innerHTML='<svg viewBox="0 0 52 52" aria-hidden="true">'+ICONS[name]+'</svg>'}
icon($('home'),'home');icon($('mute'),'sound');icon($('replay'),'replay');
let version=0,accepting=false,mode='idle',disposed=false,modalFocus=null,flashDismiss=null;
const Cancelled=class extends Error{};
function cancel(){version++;if(flashDismiss){flashDismiss();flashDismiss=null;}accepting=false;audio.cancel();$('flashcard').hidden=true;$('flyingToy').hidden=true;$('heldToy').hidden=true;$('game').classList.remove('revealing');clearHighlights();clearSequenceNumbers();updateButtons()}
async function wait(ms,v){await audio.delay(ms);guard(v)}
function guard(v){if(v!==version)throw new Cancelled()}
async function say(text,v,doll=false){$('live').textContent=text;await audio.say(text,text,doll);guard(v)}
async function effect(id,v){await audio.effect(id);guard(v)}
function run(task){const v=version;Promise.resolve().then(()=>task(v)).catch(e=>{if(!(e instanceof Cancelled)){console.error(e);accepting=false;bubble('Listen again!');$('replay').hidden=false;$('replay').disabled=false}})}
function bubble(text){$('bubble').hidden=!text;$('bubble').textContent=text||''}
const CROPS=[[37,134,309,301],[414,178,365,239],[789,104,319,378],[1191,167,312,281],[31,598,339,330],[408,638,354,252],[769,594,362,332],[1153,692,358,195]];
function sprite(el,cell){
 el.dataset.cell=cell;const [x,y,w,h]=CROPS[cell];const W=el.offsetWidth,H=el.offsetHeight;if(!W||!H)return;
 const scale=Math.min(W/w,H/h)*.97;
 // Clip the atlas to this toy before centring it; neighbouring cells cannot bleed through.
 el.innerHTML='';el.style.backgroundImage='none';
 const crop=document.createElement('span');crop.className='spriteCrop';
 crop.style.cssText=`position:absolute;left:${(W-w*scale)/2}px;top:${(H-h*scale)/2}px;width:${w*scale}px;height:${h*scale}px;background-image:url('assets/toys.png');background-size:${1536*scale}px ${1024*scale}px;background-position:${-x*scale}px ${-y*scale}px;background-repeat:no-repeat;overflow:hidden`;
 el.append(crop);
}
function refreshSprites(){document.querySelectorAll('.atlas[data-cell]').forEach(el=>sprite(el,Number(el.dataset.cell)))}
function toy(id){return toys.find(t=>t.id===id)}
function element(id){return document.querySelector('[data-toy="'+id+'"]')}
function clearHighlights(){document.querySelectorAll('.toy').forEach(el=>el.classList.remove('lit','correct','wrong'))}
function clearSequenceNumbers(){document.querySelectorAll('.sequenceNumber').forEach(el=>el.remove())}
function showSequenceNumber(id,index){const badge=document.createElement('span');badge.className='sequenceNumber';badge.textContent=String(index+1);badge.setAttribute('aria-hidden','true');const t=toy(id);badge.style.cssText=`left:${t.x}%;top:${t.y-t.h/2}%`;$('sequenceNumbers').append(badge)}
function renderToys(newId){$('toys').innerHTML='';for(const id of model.opened){const t=toy(id),b=document.createElement('button');b.className='toy'+(id===newId?' arriving':'');b.dataset.toy=id;b.setAttribute('aria-label',t.word);b.style.cssText=`left:${t.x}%;top:${t.y}%;width:${t.w}%;height:${t.h}%`;const s=document.createElement('div');s.className='atlas';sprite(s,t.cell);b.append(s);b.addEventListener('click',()=>choose(id));$('toys').append(b);sprite(s,t.cell)}updateButtons()}
function updateButtons(){document.querySelectorAll('.toy').forEach(el=>{el.disabled=!accepting;el.classList.toggle('enabled',accepting)});$('box').disabled=!(accepting&&model.phase==='opening');$('box').classList.toggle('ready',!$('box').disabled||model.phase==='intro');$('replay').disabled=mode==='feedback';$('play').hidden=model.phase!=='intro';$('replay').hidden=model.phase==='intro'||model.phase==='final';$('replay').disabled=mode==='feedback'||mode==='reveal'||mode==='flashcard'}
function setReady(value){accepting=value;updateButtons()}
function stageView(){
 $('scene').className='';$('splash').hidden=model.phase!=='intro';$('bar').hidden=model.phase==='intro';$('box').hidden=model.phase==='intro';$('stageLabel').textContent={intro:'',opening:'Open the toy box',revision:'Let’s revise!',sequence:'Listen and repeat!',sound:'Listen! What’s this?',final:''}[model.phase];$('counter').textContent='';
 if(model.phase==='intro'){bubble('');$('box').disabled=false;$('box').classList.add('ready');$('replay').hidden=true;return}
 if(model.phase==='opening')$('counter').textContent=model.opened.length+' / '+toys.length;
 if(model.phase==='revision')$('counter').textContent=(model.revisionIndex+1)+' / '+model.opened.length;
 if(model.phase==='sequence')$('counter').textContent=(model.round+1)+' / '+sequences.length;
 if(model.phase==='sound')$('counter').textContent=(model.soundIndex+1)+' / '+soundOrder.length;
 updateButtons();
}
async function transition(title,spoken,v){mode='transition';setReady(false);bubble(title);await say(spoken||title,v);await wait(550,v)}
async function openingPrompt(v){mode='opening';stageView();bubble("What’s in the box?");setReady(true)}
async function reveal(v){
 if(model.phase!=='opening')return;mode='reveal';setReady(false);$('box').classList.remove('ready');const id=model.nextToy,t=toy(id);
 $('flyingToy').hidden=false;sprite($('flyingToy'),t.cell);await Promise.all([wait(1450,v),effect('appear',v)]);$('flyingToy').hidden=true;$('game').classList.add('revealing');$('flashcard').hidden=false;$('heldToy').hidden=false;sprite($('heldToy'),t.cell);sprite($('flashToy'),t.cell);$('flashWord').textContent=t.word;bubble('It’s a '+t.word+'!');
 const dismissed=new Promise(resolve=>{flashDismiss=resolve});
 await say("It’s a "+t.word+'!',v);await wait(250,v);await effect(id,v);
 mode='flashcard';updateButtons();await dismissed;guard(v);flashDismiss=null;
 $('flashcard').hidden=true;$('heldToy').hidden=true;$('game').classList.remove('revealing');model.reveal();renderToys(id);await wait(650,v);
 if(model.phase==='revision'){await transition('Let’s revise!',null,v);await revisionPrompt(v)}else await openingPrompt(v)
}
async function revisionPrompt(v){mode='revision';setReady(false);stageView();clearHighlights();const id=model.target;const el=element(id);el?.classList.add('lit');bubble('A '+id+'.');await say('A '+id+'.',v);await wait(200,v);await effect(id,v);setReady(true)}
async function sequenceDemo(v){
 mode='sequence-demo';setReady(false);model.inputIndex=0;stageView();clearHighlights();clearSequenceNumbers();bubble('Listen!');
 await wait(500,v);
 for(const [index,id] of sequences[model.round].entries()){
  element(id)?.classList.add('lit');showSequenceNumber(id,index);
  await say('A '+id+'.',v);await wait(500,v);
 }
 await wait(650,v);clearSequenceNumbers();clearHighlights();
 bubble('Now you!');await say('Now you!',v);
 mode='sequence-input';setReady(true)
}
async function soundPrompt(v){mode='sound';setReady(false);stageView();clearHighlights();bubble('Listen! What’s this?');await wait(350,v);await effect(model.target,v);setReady(true)}
async function finish(v){mode='final';setReady(false);stageView();bubble('Good job!');sparkles(50,35);await say('Good job!',v);await wait(500,v);showDialog('<h2 id="dialogTitle">Good job!</h2><button class="pill" id="playAgain">Play again</button>');$('playAgain').onclick=restart}
async function stageStart(v,announce=false){stageView();switch(model.phase){case'intro':return;case'opening':return openingPrompt(v);case'revision':if(announce)await transition('Let’s revise!',null,v);return revisionPrompt(v);case'sequence':if(announce)await transition('Let’s play! Listen and repeat!',"Let’s play! Listen and repeat!",v);return sequenceDemo(v);case'sound':if(announce)await transition('Listen! What’s this?',null,v);return soundPrompt(v);case'final':return finish(v)}}
function choose(id){if(!accepting||$('overlay').hidden===false)return;const v=version;mode='feedback';setReady(false);run(async()=>{
 const before=model.phase;const result=model.choose(id);if(result==='ignored'){setReady(true);return}
 if(result==='wrong'){
  element(id)?.classList.add('wrong');await wait(450,v);element(id)?.classList.remove('wrong');
  if(before==='sequence'){bubble('Listen again!');await wait(450,v);return sequenceDemo(v)}
  if(before==='sound'){await wait(650,v);return soundPrompt(v)}
  mode='revision';setReady(true);return;
 }
 element(id)?.classList.remove('lit');element(id)?.classList.add('correct');
 if(before==='sequence'&&result==='step'){audio.success();await wait(220,v);element(id)?.classList.remove('correct');mode='sequence-input';stageView();setReady(true);return}
 if(before==='sound'){bubble('It’s a '+id+'!');await say('It’s a '+id+'!',v)}else audio.success();
 await wait(500,v);clearHighlights();
 if(result==='stage')return stageStart(v,model.phase!=='opening');
 if(before==='revision')return revisionPrompt(v);if(before==='sequence')return sequenceDemo(v);return soundPrompt(v)
 })}
function start(){if(model.phase!=='intro')return;cancel();audio.unlock();audio.startMusic();model.start();stageView();run(async v=>{mode='intro-audio';bubble("Look! What’s this? What’s in the box? Let’s see!");await say("Look! What’s this? What’s in the box? Let’s see!",v);await openingPrompt(v)})}
function restart(){closeDialog(false);cancel();audio.pauseMusic();model.reset();mode='idle';renderToys();stageView();$('bubble').hidden=true;updateButtons();$('box').disabled=false;$('play').focus()}
function replay(){if(!['intro','final'].includes(model.phase)){cancel();audio.unlock();run(v=>stageStart(v,false))}}
function showDialog(html){modalFocus=document.activeElement;$('dialog').innerHTML=html;$('overlay').hidden=false;requestAnimationFrame(()=>$('dialog').querySelector('button,input,select')?.focus())}
function closeDialog(resume=true){$('overlay').hidden=true;modalFocus?.focus();if(resume){audio.unlock();if(model.phase!=='intro')audio.startMusic();run(v=>stageStart(v,false))}}
function home(){if(model.phase==='intro')return;cancel();showDialog('<h2 id="dialogTitle">Back to the toy box?</h2><p>Start again from the beginning?</p><div class="dialogActions"><button class="pill secondary" id="keepPlaying">Keep playing</button><button class="pill" id="startAgain">Start again</button></div>');$('keepPlaying').onclick=()=>closeDialog();$('startAgain').onclick=restart}
function saveSettings(){try{localStorage.setItem('simons-toy-box-settings',JSON.stringify({volume:audio.volume,rate:audio.rate,muted:audio.muted,musicEnabled:audio.musicEnabled,musicVolume:audio.musicVolume}))}catch(e){}}
function restoreSettings(){try{const s=JSON.parse(localStorage.getItem('simons-toy-box-settings'));if(s){audio.volume=Math.max(0,Math.min(1,Number(s.volume)||0));audio.rate=[.75,.85,1].includes(s.rate)?s.rate:.85;audio.muted=!!s.muted;audio.musicVolume=Number.isFinite(s.musicVolume)?Math.max(0,Math.min(1,s.musicVolume)):.03;audio.musicEnabled=s.musicEnabled!==false&&audio.musicVolume>0}}catch(e){}updateMute();updateMusic();updateVolumeControls()}
function updateMute(){icon($('mute'),audio.muted?'muted':'sound');$('mute').setAttribute('aria-label',audio.muted?'Unmute sound':'Mute sound');$('mute').setAttribute('aria-pressed',String(audio.muted))}
function toggleMute(){audio.setMuted(!audio.muted);updateMute();updateVolumeControls();saveSettings()}
function updateMusic(){icon($('music'),audio.musicEnabled?'music':'musicOff');$('music').setAttribute('aria-label',audio.musicEnabled?'Turn music off':'Turn music on');$('music').setAttribute('aria-pressed',String(audio.musicEnabled))}
function toggleMusic(){audio.setMusicEnabled(!audio.musicEnabled);updateMusic();updateVolumeControls();saveSettings()}
function updateVolumeControls(){const voice=Math.round((audio.muted?0:audio.volume)*100),music=Math.round((audio.musicEnabled?audio.musicVolume:0)*100);$('voiceVolume').value=String(voice);$('voiceLevel').textContent=voice+'%';$('musicVolume').value=String(music);$('musicLevel').textContent=music+'%'}
function setVoiceVolume(){audio.setVolume(Number($('voiceVolume').value)/100);updateMute();updateVolumeControls();saveSettings()}
function setMusicVolume(){audio.setMusicVolume(Number($('musicVolume').value)/100);updateMusic();updateVolumeControls();saveSettings()}
function sparkles(x,y){for(let i=0;i<9;i++){const el=document.createElement('span');el.className='sparkle';el.textContent='✦';el.style.cssText=`left:${x+(Math.random()-.5)*25}%;top:${y+(Math.random()-.5)*18}%;animation-delay:${i*.055}s`;el.addEventListener('animationend',()=>el.remove());$('sparkles').append(el);setTimeout(()=>el.remove(),2000)}}
function fit(){const w=window.visualViewport?.width||window.innerWidth,h=window.visualViewport?.height||window.innerHeight;$('game').style.transform=`scale(${Math.min(w/1672,h/941)})`;refreshSprites()}
$('box').onclick=()=>{if(model.phase==='intro')start();else if(accepting&&model.phase==='opening')run(reveal)};$('play').onclick=start;$('home').onclick=home;$('mute').onclick=toggleMute;$('music').onclick=toggleMusic;$('voiceVolume').oninput=setVoiceVolume;$('musicVolume').oninput=setMusicVolume;$('replay').onclick=replay;
$('flashcard').onclick=()=>{if(!$('flashcard').hidden&&flashDismiss){flashDismiss();flashDismiss=null;}};
window.addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit);
document.addEventListener('keydown',e=>{if($('overlay').hidden)return;if(e.key==='Escape'){if(model.phase==='final')restart();else closeDialog()}if(e.key==='Tab'){const focusable=[...$('dialog').querySelectorAll('button,input,select')];const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)audio.pauseMusic();if(document.hidden&&model.phase!=='intro'&&$('overlay').hidden){cancel();showDialog('<h2 id="dialogTitle">Ready?</h2><button id="continue" class="pill">Continue</button>');$('continue').onclick=()=>closeDialog()}});
restoreSettings();stageView();fit();$('box').disabled=false;
