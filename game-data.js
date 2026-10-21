'use strict';
(function(root){
 const toys=[
 {id:'doll',word:'doll',cell:2,x:47.8,y:83,w:11.8,h:27},
 {id:'car',word:'car',cell:1,x:32,y:88,w:16,h:17},
 {id:'ball',word:'ball',cell:0,x:73.5,y:72.5,w:13,h:19},
 {id:'train',word:'train',cell:7,x:79.5,y:91,w:26,h:17},
 {id:'bike',word:'bike',cell:6,x:90.5,y:70,w:17,h:25},
 {id:'drum',word:'drum',cell:3,x:60,y:83,w:12,h:21},
 {id:'computer',word:'computer',cell:4,x:34.5,y:66,w:14,h:25}
 ];
 const sequences=[['doll','train','ball'],['car','bike','drum'],['computer','ball','train'],['drum','doll','car']];
 const soundOrder=['ball','bike','car','doll','drum','train','computer'];
 class ToyGame{
  constructor(){this.reset()}
  reset(){this.phase='intro';this.opened=[];this.revisionIndex=0;this.round=0;this.inputIndex=0;this.soundIndex=0;return this}
  start(){if(this.phase==='intro')this.phase='opening'}
  get nextToy(){return toys[this.opened.length]?.id}
  get target(){if(this.phase==='revision')return this.opened[this.revisionIndex];if(this.phase==='sequence')return sequences[this.round]?.[this.inputIndex];if(this.phase==='sound')return soundOrder[this.soundIndex];return null}
  reveal(){if(this.phase!=='opening'||!this.nextToy)return false;this.opened.push(this.nextToy);if([2,4,toys.length].includes(this.opened.length)){this.phase='revision';this.revisionIndex=0}return true}
  choose(id){
   if(!['revision','sequence','sound'].includes(this.phase)||!this.opened.includes(id))return 'ignored';
   if(id!==this.target){if(this.phase==='sequence')this.inputIndex=0;return 'wrong'}
   if(this.phase==='revision'){
    this.revisionIndex++;
    if(this.revisionIndex===this.opened.length){if(this.opened.length===toys.length){this.phase='sequence';this.round=0;this.inputIndex=0}else this.phase='opening';return 'stage'}
    return 'next';
   }
   if(this.phase==='sequence'){
    this.inputIndex++;
    if(this.inputIndex===3){this.inputIndex=0;this.round++;if(this.round===sequences.length){this.phase='sound';this.soundIndex=0;return 'stage'}return 'round'}
    return 'step';
   }
   this.soundIndex++;
   if(this.soundIndex===soundOrder.length){this.phase='final';return 'stage'}
   return 'next';
  }
 }
 root.TOY_DATA={toys,sequences,soundOrder,ToyGame};
})(typeof window!=='undefined'?window:globalThis);
