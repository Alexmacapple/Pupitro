"use strict";
import {importScore} from "./import-score.js";
import {saveScore,getScore,listScores,openRecord,saveSettings,getSettings,requestPersistence,storageState} from "./library.js";
import {initializeOffline,activateUpdate} from "./offline.js";
const $ = id => document.getElementById(id);
const presets = {percussion:{label:"Percussions",program:0,bank:128},guitar:{label:"Guitare",program:24,bank:0},ukulele:{label:"Ukulélé",program:24,bank:0},mandolin:{label:"Mandoline",program:24,bank:0},flute:{label:"Flûte",program:73,bank:0},accordion:{label:"Accordéon",program:21,bank:0}};
let score, synth, context, node, analyser, gain, fontId, initPromise;
let previousAudioSessionType;
let activeRecord, activeUrls, importing, savingTimer, restoring=false;
let recordOpening=Promise.resolve();
let playing=false, starting=false, currentTick=0, generation=0, followedSystem=null, polling=false;
const cursor=document.createElement("div");
cursor.className="playback-cursor";
cursor.setAttribute("aria-hidden","true");
const parts=new Map(), countOscillators=new Set();
function status(message){$("status").textContent=message;}
function time(seconds){const n=Math.max(0,Math.floor(seconds));return `${Math.floor(n/60)}:${String(n%60).padStart(2,"0")}`;}
function tempoAtTick(tick){let result=score.tempo[0];for(const item of score.tempo){if(item.tick>tick)break;result=item;}return result;}
function tickSeconds(tick){const t=tempoAtTick(tick);return t.seconds+(tick-t.tick)*t.us/score.ppq/1e6;}
function atMeasure(number){return score.measureEvents.find(e=>e.id===number-1);}
function boundary(){const a=atMeasure(Number($("loopStart").value)), end=Number($("loopEnd").value);const b=score.measureEvents.find(e=>e.id===end);return a&&end>=Number($("loopStart").value)?{start:a.tick,end:b?b.tick:score.totalTicks}:null;}
function enabled(part){const anySolo=[...parts.values()].some(p=>p.solo);return !part.muted&&(!anySolo||part.solo);}
function applyPart(part){if(!synth)return;const preset=presets[part.sound];synth.setChannelType(part.channel,part.sound==="percussion");synth.midiProgramSelect(part.channel,fontId,preset.bank,preset.program);synth.midiControl(part.channel,7,Math.round(part.fileVolume*part.volume));if(!enabled(part))synth.midiAllSoundsOff(part.channel);}
function refreshParts(){for(const part of parts.values())applyPart(part);}
function playerHook(_s,type,event){const ch=event.getChannel();if(ch===score.clickChannel){if(type===144&&event.getVelocity()>0){if(!$("metronome").checked)return true;event.setVelocity(Math.round(event.getVelocity()*Number($("clickVolume").value)/100));}return false;}const part=parts.get(ch);if(!part)return false;if(type===192){applyPart(part);return true;}if(type===176){if(event.getControl()===0||event.getControl()===32)return true;if(event.getControl()===7){part.fileVolume=event.getValue();event.setValue(Math.round(part.fileVolume*part.volume));}}if(type===144&&event.getVelocity()>0&&!enabled(part))return true;return false;}
async function checkedFetch(url){const response=await fetch(url);if(!response.ok){const error=new Error(`Chargement impossible (${response.status}) : ${url}`);error.status=response.status;throw error;}return response;}
function beginAudioSession(){
  // WebKit otherwise treats Web Audio as ambient sound, muted by the
  // iPhone Ring/Silent switch. Declare music playback only after a tap.
  const session=navigator.audioSession;
  if(!session)return;
  try{
    if(previousAudioSessionType===undefined)previousAudioSessionType=session.type;
    session.type="playback";
  }catch{/* Older browsers keep their normal audio behavior. */}
}
function endAudioSession(){
  if(previousAudioSessionType===undefined)return;
  try{
    if(navigator.audioSession?.type==="playback")navigator.audioSession.type=previousAudioSessionType;
  }catch{}
  previousAudioSessionType=undefined;
}
async function initAudio(){if(initPromise)return initPromise;context=new (window.AudioContext||window.webkitAudioContext)();const resumed=context.resume();initPromise=(async()=>{await resumed;await JSSynth.waitForReady();synth=new JSSynth.Synthesizer();synth.init(context.sampleRate);synth.setGain(.5);node=synth.createAudioNode(context,2048);analyser=context.createAnalyser();analyser.fftSize=512;gain=context.createGain();gain.gain.value=Number($("master").value)/100;node.connect(analyser);analyser.connect(gain);gain.connect(context.destination);const [soundfont,midi]=await Promise.all([checkedFetch("assets/standalone/sounds.sf3").then(r=>r.arrayBuffer()),checkedFetch(score.midiUrl||"assets/score.mid").then(r=>r.arrayBuffer())]);fontId=await synth.loadSFont(soundfont);await synth.addSMFDataToPlayer(midi);synth.hookPlayerMIDIEvents(playerHook);synth.setChannelType(score.clickChannel,true);synth.midiProgramSelect(score.clickChannel,fontId,128,0);refreshParts();return synth;})().catch(error=>{if(synth)synth.close();if(context)context.close();synth=null;initPromise=null;throw error;});return initPromise;}
function cancelCount(){for(const oscillator of countOscillators){try{oscillator.stop();}catch{} }countOscillators.clear();}
function stop(reset=false){generation++;cancelCount();if(synth){if(playing)currentTick=synth.getPlayerCurrentTick();synth.stopPlayer();synth.midiAllSoundsOff();}playing=false;starting=false;endAudioSession();if(reset)currentTick=0;$("play").textContent="Écouter";$("play").disabled=false;$("audioSignal").classList.remove("active");paint();status(reset?"Prêt à écouter.":"Lecture en pause.");}
async function precount(token){const count=score.firstMeter[0],secondsPerBeat=tempoAtTick(currentTick).us/1e6/Number($("speed").value)*4/score.firstMeter[1];status(`Décompte : ${count} temps…`);for(let i=0;i<count;i++){const oscillator=context.createOscillator(),v=context.createGain();oscillator.type="sine";oscillator.frequency.value=i===0?1000:760;const t=context.currentTime+.05+i*secondsPerBeat;v.gain.setValueAtTime(0,t);v.gain.linearRampToValueAtTime(.15*Number($("clickVolume").value)/100,t+.002);v.gain.exponentialRampToValueAtTime(.0001,t+.07);oscillator.connect(v);v.connect(gain);oscillator.start(t);oscillator.stop(t+.08);countOscillators.add(oscillator);oscillator.onended=()=>{countOscillators.delete(oscillator);v.disconnect();};}await new Promise(resolve=>setTimeout(resolve,(.05+count*secondsPerBeat)*1000));return token===generation;}
async function play(){if(playing||starting){stop();return;}starting=true;const token=++generation;$("play").textContent="Annuler";status("Préparation des sons…");try{beginAudioSession();await initAudio();if(token!==generation)return;await context.resume();if(currentTick>=score.totalTicks)currentTick=0;if($("loop").checked){const bounds=boundary();if(!bounds)throw new Error("Vérifie les mesures de la boucle.");if(currentTick<bounds.start||currentTick>=bounds.end)currentTick=bounds.start;}if($("precount").checked&&!(await precount(token)))return;if(token!==generation)return;synth.seekPlayer(currentTick);synth.setPlayerTempo(0,Number($("speed").value));refreshParts();await synth.playPlayer();if(token!==generation){synth.stopPlayer();return;}starting=false;playing=true;$("play").textContent="Pause";status("Lecture en cours.");}catch(error){if(token!==generation)return;stop();status(error.message||String(error));}}
function seek(tick){currentTick=Math.max(0,Math.min(score.totalTicks,Math.round(tick)));if(synth){synth.midiAllSoundsOff();synth.seekPlayer(currentTick);refreshParts();}paint();}
function updateTransportLayout(){
  const height=$("readerDock").getBoundingClientRect().height;
  document.documentElement.style.setProperty("--dock-height",`${height}px`);
  followedSystem=null;
  paint();
}
$("transportToggle").onclick=()=>{
  const hidden=!$("transport").hidden;
  $("transport").hidden=hidden;
  $("transportToggle").setAttribute("aria-expanded",String(!hidden));
  $("transportToggle").textContent=hidden?"Afficher les commandes":"Masquer les commandes";
  updateTransportLayout();
};
new ResizeObserver(updateTransportLayout).observe($("readerDock"));
window.addEventListener("resize",updateTransportLayout);
updateTransportLayout();
function paintCursor(){
  const events=score.cursorEvents;
  if(!events||!events.length){cursor.hidden=true;return;}
  let low=0,high=events.length;
  while(low<high){const mid=(low+high)>>>1;if(events[mid].tick<=currentTick)low=mid+1;else high=mid;}
  const event=events[Math.max(0,low-1)],paper=$("score").children[event.page];
  if(!paper){cursor.hidden=true;return;}
  cursor.hidden=false;
  if(cursor.parentNode!==paper)paper.append(cursor);
  cursor.style.left=`${event.x*100}%`;
  cursor.style.top=`${event.y*100}%`;
  cursor.style.height=`${event.height*100}%`;
  const system=`${event.page}:${event.y}`;
  if($("follow").checked&&currentTick>0&&system!==followedSystem){
    followedSystem=system;
    const bounds=cursor.getBoundingClientRect();
    const bottom=$("readerDock").getBoundingClientRect().top;
    if(bounds.top<12||bounds.bottom>bottom-12){
      // Leave the current staff above the fixed playback controls.
      const top=window.scrollY+bounds.top-Math.max(12,(bottom-bounds.height)/2);
      window.scrollTo({top:Math.max(0,top),behavior:"smooth"});
    }
  }
}
function paint(){
  if(!score)return;
  const position=tickSeconds(currentTick);
  $("clock").textContent=`${time(position)} / ${time(score.duration)}`;
  $("seek").value=String(currentTick);
  let measure=score.measureEvents[0];
  for(const event of score.measureEvents){if(event.tick>currentTick)break;measure=event;}
  $("measure").textContent=`Mesure ${measure.id+1}`;
  paintCursor();
}
async function poll(){
  if(!score||!synth||polling)return;
  polling=true;
  try{
    if(playing){
      currentTick=synth.getPlayerCurrentTick();
      const bounds=$("loop").checked?boundary():null;
      if(bounds&&(currentTick>=bounds.end||!synth.isPlayerPlaying())){
        seek(bounds.start);
        if(!synth.isPlayerPlaying())await synth.playPlayer();
        currentTick=bounds.start;
      }else if(!synth.isPlayerPlaying()){
        playing=false;
        endAudioSession();
        currentTick=score.totalTicks;
        $("play").textContent="Réécouter";
        status("Fin du morceau.");
      }
      paint();
    }
    if(analyser){
      const buffer=new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(buffer);
      const peak=buffer.reduce((a,b)=>Math.max(a,Math.abs(b)),0);
      $("audioSignal").classList.toggle("active",peak>.001);
      $("audioSignal").title=peak>.001?"Signal audio détecté":"Pas de signal audio";
    }
  }catch(error){stop();status(error.message||String(error));}
  finally{polling=false;}
}
function makePart(item,index){const part={...item,sound:item.channel===9?"percussion":"ukulele",volume:1,fileVolume:100,muted:false,solo:false};parts.set(item.channel,part);const row=document.createElement("section");row.className="part";const name=item.channel===9?"Partie de percussions":`Partie ${index+1}`;row.innerHTML=`<h3>${name}</h3><label class="sound">Instrument <select aria-label="Instrument de ${name}">${Object.entries(presets).map(([id,p])=>`<option value="${id}">${p.label}</option>`).join("")}</select></label><label>Volume <input aria-label="Volume de ${name}" type="range" min="0" max="100" value="100"></label><span></span><label><input type="checkbox" class="mute"> Couper cette partie</label><label><input type="checkbox" class="solo"> Écouter seule</label>`;const select=row.querySelector("select");select.value=part.sound;select.onchange=()=>{part.sound=select.value;applyPart(part);};row.querySelector("input[type=range]").oninput=e=>{part.volume=Number(e.target.value)/100;applyPart(part);};row.querySelector(".mute").onchange=e=>{part.muted=e.target.checked;refreshParts();};row.querySelector(".solo").onchange=e=>{part.solo=e.target.checked;refreshParts();};$("parts").append(row);}
async function releaseAudio(){
  if(initPromise)await initPromise.catch(()=>{});
  if(synth)synth.close();
  if(node)node.disconnect();
  if(context&&context.state!=="closed")await context.close();
  synth=context=node=analyser=gain=fontId=initPromise=null;
}
async function load(next){
  await releaseAudio();
  score=next;
  currentTick=0;
  followedSystem=null;
  parts.clear();
  $("score").replaceChildren();
  $("parts").replaceChildren();
  $("title").textContent=score.title;
  document.title=`Pupitro · ${score.title}`;
  $("pdfLink").href=score.pdfUrl||"assets/partition.pdf";
  $("pdfLink").hidden=false;
  for(const [index,page]of score.pages.entries()){
    const figure=document.createElement("figure");
    figure.className="paper";
    figure.style.width=`${$("zoom").value}%`;
    if($("zoom").value!=="100")figure.style.maxWidth="none";
    const img=document.createElement("img");
    img.src=page.src;
    img.alt=`${score.title}, page ${index+1} sur ${score.pages.length}`;
    img.width=Math.round(page.width);
    img.height=Math.round(page.height);
    img.loading=index===0?"eager":"lazy";
    figure.append(img);
    const label=document.createElement("span");
    label.className="page-label";
    label.textContent=`${index+1} / ${score.pages.length}`;
    figure.append(label);
    $("score").append(figure);
  }
  score.channels.forEach(makePart);
  $("seek").max=String(score.totalTicks);
  $("seek").disabled=false;
  $("loopStart").max=$("loopEnd").max=String(score.measureCount);
  $("loopStart").value="1";
  $("loopEnd").value=String(Math.min(4,score.measureCount));
  $("play").disabled=$("stop").disabled=false;
  paint();
  status(`${score.pages.length} pages · ${score.channels.length} parties · prêt à écouter.`);
}
$("openFile").onclick=()=>$("scoreFile").click();
$("scoreFile").onchange=async()=>{
  const file=$("scoreFile").files[0];
  if(!file)return;
  if(score)stop();
  importing=new AbortController();
  $("openFile").disabled=$("play").disabled=$("libraryButton").disabled=true;
  $("cancelImport").hidden=false;
  status("Préparation sur cet appareil…");
  try{
    const record=await importScore(file,status,importing.signal);
    await saveScore(record);
    await showRecord(record);
    requestPersistence().catch(()=>{});
    status(`${score.pages.length} pages · ${score.channels.length} parties · partition enregistrée sur cet appareil.`);
    window.scrollTo({top:0});
  }catch(error){status(error.name==="AbortError"?"Import annulé. La bibliothèque est conservée.":error.name==="QuotaExceededError"?"Stockage insuffisant : la partition n’a pas été enregistrée. Garde ton fichier MSCZ.":error.message||String(error));}
  finally{importing=null;$("cancelImport").hidden=true;$("openFile").disabled=$("libraryButton").disabled=false;$("play").disabled=!score;$("scoreFile").value="";}
};
$("cancelImport").onclick=()=>importing?.abort();
$("play").onclick=play;$("stop").onclick=()=>stop(true);$("seek").onchange=e=>seek(Number(e.target.value));$("master").oninput=e=>{if(gain)gain.gain.value=Number(e.target.value)/100;};$("speed").onchange=e=>{if(synth)synth.setPlayerTempo(0,Number(e.target.value));};$("goMeasure").onclick=()=>{const bounds=boundary();if(bounds)seek(bounds.start);else status("Vérifie les mesures de la boucle.");};$("metronome").onchange=()=>{if(synth)synth.midiAllSoundsOff(score.clickChannel);};$("follow").onchange=()=>{followedSystem=null;paint();};$("zoom").onchange=e=>{for(const figure of document.querySelectorAll(".paper")){figure.style.width=`${e.target.value}%`;figure.style.maxWidth="none";}followedSystem=null;paint();};$("mixerButton").onclick=()=>$("mixer").showModal();$("closeMixer").onclick=()=>$("mixer").close();
// A suspended page can return from Safari's back/forward cache. Keep its
// synthesizer reusable; unloading the document releases its audio resources.
window.addEventListener("pagehide",()=>{if(score)stop();persistPreferences();if(context&&context.state!=="closed")context.suspend();});
setInterval(poll,40);

const preferenceIds=["zoom","speed","master","metronome","clickVolume","precount","follow","loop","loopStart","loopEnd"];
function persistPreferences(){
  if(!activeRecord||restoring)return;
  clearTimeout(savingTimer);
  const controls=Object.fromEntries(preferenceIds.map(id=>[id,$(id).type==="checkbox"?$(id).checked:$(id).value]));
  saveSettings(activeRecord.id,{controls,parts:[...parts.values()].map(({channel,sound,volume,muted,solo})=>({channel,sound,volume,muted,solo}))}).catch(()=>status("Les derniers réglages n’ont pas pu être enregistrés."));
}
document.addEventListener("change",()=>{if(!restoring&&!importing)savingTimer=setTimeout(persistPreferences,200);});

function showRecord(record){
  // One opening owns the displayed pages, preferences and last-score write
  // until it completes. A failed opening must not block the next selection.
  const opened=recordOpening.then(()=>restoreRecord(record));
  recordOpening=opened.catch(()=>{});
  return opened;
}
async function restoreRecord(record){
  if(score)stop();
  persistPreferences();
  restoring=true;
  const nextUrls=openRecord(record);
  try{
    await load(nextUrls.manifest);
    activeUrls?.release();activeUrls=nextUrls;activeRecord=record;
    const prefs=await getSettings(record.id);
    // Start a newly imported score from neutral controls; never inherit a loop.
    for(const id of preferenceIds){
      const el=$(id),value=prefs?.controls?.[id];
      if(value!==undefined){if(el.type==="checkbox")el.checked=Boolean(value);else el.value=String(value);}
      else if(el.type==="checkbox")el.checked=id==="follow";
      else if(["zoom","speed","master","clickVolume"].includes(id))el.value=({zoom:"100",speed:"1",master:"75",clickVolume:"65"})[id];
    }
    for(const item of prefs?.parts||[]){
      const part=parts.get(item.channel);if(!part||!presets[item.sound])continue;
      Object.assign(part,item);
      const row=$("parts").children[[...parts.keys()].indexOf(item.channel)];
      row.querySelector("select").value=part.sound;
      row.querySelector("input[type=range]").value=String(Math.round(part.volume*100));
      row.querySelector(".mute").checked=part.muted;row.querySelector(".solo").checked=part.solo;
    }
    $("zoom").dispatchEvent(new Event("change"));
    $("exportSource").hidden=false;
    $("sourceNote").textContent="Rendu web : la mise en page peut différer de MuseScore 2. Partition et lecture conservées sur cet appareil.";
    history.replaceState(null,"",`?score=${record.id}`);
    await saveSettings("last-score",record.id);
  }catch(error){if(activeUrls!==nextUrls)nextUrls.release();throw error;}
  finally{restoring=false;}
}
$("exportSource").onclick=()=>{
  if(!activeRecord)return;
  const url=URL.createObjectURL(activeRecord.source),link=document.createElement("a");
  link.href=url;link.download=activeRecord.filename;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
};
$("libraryButton").onclick=async()=>{
  try{
    const records=await listScores();$("libraryItems").replaceChildren();
    if(!records.length)$("libraryItems").textContent="Aucune partition ici. Utilise « Ouvrir un fichier .mscz ».";
    for(const item of records){
      const button=document.createElement("button");
      button.textContent=`${item.title} · ${item.pages} pages`;
      button.onclick=async()=>{try{const record=await getScore(item.id);if(!record)throw new Error("Cette partition n’est plus disponible.");await showRecord(record);$("library").close();}catch(error){status(error.message);}};
      $("libraryItems").append(button);
    }
    $("library").showModal();
  }catch(error){status(error.message||"Bibliothèque locale indisponible.");}
};
$("closeLibrary").onclick=()=>$("library").close();
$("installButton").onclick=async()=>{
  $("installation").showModal();
  try{const state=await storageState();$("storageStatus").textContent=state.persistent?"Stockage persistant accordé par le navigateur. Garde aussi tes fichiers d’origine.":"Le navigateur peut effacer les données locales. Garde aussi tes fichiers d’origine dans Fichiers.";}
  catch{$("storageStatus").textContent="L’espace disponible n’a pas pu être vérifié.";}
};
$("closeInstallation").onclick=()=>$("installation").close();
$("updateButton").onclick=()=>{if(playing||starting||importing){status("Arrête la lecture ou l’import avant de mettre à jour.");return;}persistPreferences();activateUpdate();};
initializeOffline(message=>$("offlineStatus").textContent=message,()=>$("updateButton").hidden=false);
$("openFile").disabled=$("libraryButton").disabled=true;
(async()=>{
  try{
    const requested=new URLSearchParams(location.search).get("score");
    const id=/^[a-f0-9]{64}$/.test(requested||"")?requested:await getSettings("last-score");
    const record=id?await getScore(id):null;
    if(record)await showRecord(record);
    else status("Ouvre un fichier .mscz pour commencer. Il sera préparé et enregistré sur cet appareil.");
  }catch(error){status(error.message||"La bibliothèque locale n’a pas pu être ouverte.");}
  finally{$("openFile").disabled=$("libraryButton").disabled=false;}
})();
