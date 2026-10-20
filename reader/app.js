"use strict";
import {importScore} from "./import-score.js";
import {saveScore,getScore,getScoreInfo,listScores,renameScore,deleteScore,snapshotLibrary,openRecord,saveSettings,getSettings,requestPersistence,storageState} from "./library.js";
import {encodeBackup,inspectBackup} from "./backup.js";
import {initializeOffline,activateUpdate} from "./offline.js";
import {positionAtPoint,tempoAtTick,countInAtTick,loopBounds,cursorScrollOptions} from "./playback.js";
const $ = id => document.getElementById(id);
const presets = {percussion:{label:"Percussions",program:0,bank:128},guitar:{label:"Guitare",program:24,bank:0},ukulele:{label:"Ukulélé",program:24,bank:0},mandolin:{label:"Mandoline",program:24,bank:0},flute:{label:"Flûte",program:73,bank:0},accordion:{label:"Accordéon",program:21,bank:0}};
let score, synth, context, node, analyser, gain, fontId, initPromise;
let previousAudioSessionType;
let activeRecord, activeUrls, importing, savingTimer, restoring=false;
let fileOperationFocus;
let recordOpening=Promise.resolve();
let playing=false, starting=false, currentTick=0, generation=0, followedSystem=null, polling=false;
const cursor=document.createElement("div");
cursor.className="playback-cursor";
cursor.setAttribute("aria-hidden","true");
const parts=new Map(), countOscillators=new Set();
function status(message){$("status").textContent=message;}
function time(seconds){const n=Math.max(0,Math.floor(seconds));return `${Math.floor(n/60)}:${String(n%60).padStart(2,"0")}`;}
function tickSeconds(tick){const t=tempoAtTick(score,tick);return t.seconds+(tick-t.tick)*t.us/score.ppq/1e6;}
function boundary(){return loopBounds(score,Number($("loopStart").value),Number($("loopEnd").value));}
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
async function initAudio(){
  if(initPromise)return initPromise;
  if(!score?.midiUrl)throw new Error("La lecture de cette partition est indisponible. Réimporte son MSCZ.");
  context=new (window.AudioContext||window.webkitAudioContext)();const resumed=context.resume();
  initPromise=(async()=>{
    await resumed;await JSSynth.waitForReady();synth=new JSSynth.Synthesizer();
    synth.init(context.sampleRate);synth.setGain(.5);node=synth.createAudioNode(context,2048);
    analyser=context.createAnalyser();analyser.fftSize=512;gain=context.createGain();
    gain.gain.value=Number($("master").value)/100;node.connect(analyser);analyser.connect(gain);gain.connect(context.destination);
    const [soundfont,midi]=await Promise.all([
      checkedFetch("assets/standalone/sounds.sf3").then(r=>r.arrayBuffer()),checkedFetch(score.midiUrl).then(r=>r.arrayBuffer()),
    ]);
    fontId=await synth.loadSFont(soundfont);await synth.addSMFDataToPlayer(midi);
    synth.hookPlayerMIDIEvents(playerHook);synth.setChannelType(score.clickChannel,true);
    synth.midiProgramSelect(score.clickChannel,fontId,128,0);refreshParts();return synth;
  })().catch(error=>{if(synth)synth.close();if(context)context.close();synth=null;initPromise=null;throw error;});
  return initPromise;
}
function cancelCount(){for(const oscillator of countOscillators){try{oscillator.stop();}catch{} }countOscillators.clear();}
function stop(reset=false){generation++;cancelCount();if(synth){if(playing)currentTick=synth.getPlayerCurrentTick();synth.stopPlayer();synth.midiAllSoundsOff();}playing=false;starting=false;endAudioSession();if(reset)currentTick=0;$("play").textContent="Écouter";$("play").disabled=Boolean(importing||restoring||!score);$("audioSignal").classList.remove("active");paint();status(reset?"Prêt à écouter.":"Lecture en pause.");}
async function precount(token){const {beats:count,secondsPerBeat}=countInAtTick(score,currentTick,Number($("speed").value));status(`Décompte : ${count} temps…`);for(let i=0;i<count;i++){const oscillator=context.createOscillator(),v=context.createGain();oscillator.type="sine";oscillator.frequency.value=i===0?1000:760;const t=context.currentTime+.05+i*secondsPerBeat;v.gain.setValueAtTime(0,t);v.gain.linearRampToValueAtTime(.15*Number($("clickVolume").value)/100,t+.002);v.gain.exponentialRampToValueAtTime(.0001,t+.07);oscillator.connect(v);v.connect(gain);oscillator.start(t);oscillator.stop(t+.08);countOscillators.add(oscillator);oscillator.onended=()=>{countOscillators.delete(oscillator);v.disconnect();};}await new Promise(resolve=>setTimeout(resolve,(.05+count*secondsPerBeat)*1000));return token===generation;}
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
      window.scrollTo(cursorScrollOptions(top,window.matchMedia("(prefers-reduced-motion: reduce)").matches));
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
function makePart(item,index){
  const part={...item,sound:item.channel===9?"percussion":"ukulele",volume:1,fileVolume:100,muted:false,solo:false};
  parts.set(item.channel,part);const row=document.createElement("section");row.className="part";
  const name=item.channel===9?"Partie de percussions":`Partie ${index+1}`,id=`part-${index}`;
  row.innerHTML=`<h3>${name}</h3>
    <label class="sound" for="${id}-sound">Instrument <select id="${id}-sound" aria-label="Instrument de ${name}">${Object.entries(presets).map(([key,p])=>`<option value="${key}">${p.label}</option>`).join("")}</select></label>
    <label for="${id}-volume">Volume <input id="${id}-volume" aria-label="Volume de ${name}" type="range" min="0" max="100" value="100"></label><span></span>
    <label for="${id}-mute"><input id="${id}-mute" type="checkbox" class="mute"> Couper cette partie</label>
    <label for="${id}-solo"><input id="${id}-solo" type="checkbox" class="solo"> Écouter seule</label>`;
  const select=row.querySelector("select");select.value=part.sound;select.onchange=()=>{part.sound=select.value;applyPart(part);};
  row.querySelector("input[type=range]").oninput=e=>{part.volume=Number(e.target.value)/100;applyPart(part);};
  row.querySelector(".mute").onchange=e=>{part.muted=e.target.checked;refreshParts();};
  row.querySelector(".solo").onchange=e=>{part.solo=e.target.checked;refreshParts();};$("parts").append(row);
}
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
  if(score.pdfUrl){$("pdfLink").href=score.pdfUrl;$("pdfLink").hidden=false;}
  else{$("pdfLink").removeAttribute("href");$("pdfLink").hidden=true;}
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
    img.draggable=false;
    img.addEventListener("click",event=>{
      if(event.button!==0||importing||restoring)return;
      const rect=img.getBoundingClientRect();
      const target=positionAtPoint(score.cursorEvents,index,(event.clientX-rect.left)/rect.width,(event.clientY-rect.top)/rect.height,currentTick);
      if(!target)return;
      if(playing||starting){stop();return;}
      const bounds=$("loop").checked?boundary():null;
      if($("loop").checked&&(!bounds||target.tick<bounds.start||target.tick>=bounds.end)){
        $("loop").checked=false;persistPreferences();
      }
      seek(target.tick);
      if(!playing)void play();
    });
    figure.append(img);
    const label=document.createElement("span");
    label.className="page-label";
    label.textContent=`${index+1} / ${score.pages.length}`;
    figure.append(label);
    $("score").append(figure);
  }
  score.channels.forEach(makePart);
  $("seek").max=String(score.totalTicks);
  $("seek").disabled=Boolean(importing||restoring);
  $("loopStart").max=$("loopEnd").max=String(score.measureCount);
  $("loopStart").value="1";
  $("loopEnd").value=String(Math.min(4,score.measureCount));
  $("play").disabled=$("stop").disabled=$("goMeasure").disabled=Boolean(importing||restoring);
  paint();
  status(`${score.pages.length} pages · ${score.channels.length} parties · prêt à écouter.`);
}
$("openFile").onclick=()=>$("scoreFile").click();
$("libraryAdd").onclick=()=>{$("library").close();$("scoreFile").click();};
function duplicateChoice(record,signal){
  if(signal.aborted)return Promise.reject(new DOMException("Ajout annulé.","AbortError"));
  return new Promise((resolve,reject)=>{
    const dialog=$("duplicate");
    const finish=choice=>{
      signal.removeEventListener("abort",abort);dialog.close();
      if(choice==="cancel")reject(new DOMException("Ajout annulé.","AbortError"));else resolve(choice);
    };
    const abort=()=>finish("cancel");
    signal.addEventListener("abort",abort,{once:true});
    $("duplicateDescription").textContent=`« ${record.title} » contient déjà exactement ce MSCZ.`;
    $("reuseScore").onclick=()=>finish("reuse");$("reprepareScore").onclick=()=>finish("prepare");
    $("cancelDuplicate").onclick=()=>finish("cancel");dialog.oncancel=event=>{event.preventDefault();finish("cancel");};
    dialog.showModal();$("reuseScore").focus();
  });
}
function fileOperationUi(busy,label="Annuler l’ajout"){
  if(busy&&!fileOperationFocus)fileOperationFocus=document.activeElement;
  for(const id of ["openFile","libraryButton","libraryAdd","exportLibrary","restoreLibrary","backupFile"])$(id).disabled=busy;
  for(const id of ["play","stop","seek","goMeasure"])$(id).disabled=busy||!score;
  $("cancelImport").hidden=$("cancelLibraryOperation").hidden=!busy;
  $("cancelImport").textContent=label;
  for(const button of $("libraryItems").querySelectorAll("button"))button.disabled=busy;
  if(!busy){
    const modal=[...document.querySelectorAll("dialog[open]")].at(-1);
    const usable=element=>element?.isConnected&&!element.matches(":disabled")&&
      element!==document.body&&element.getClientRects().length&&(!modal||modal.contains(element));
    if(!usable(document.activeElement)){
      const fallback=$("library").open?$("libraryAdd"):score?$("play"):$("openFile");
      (usable(fileOperationFocus)?fileOperationFocus:fallback).focus();
    }
    fileOperationFocus=null;
  }
}
$("scoreFile").onchange=async()=>{
  const files=[...$("scoreFile").files];
  if(!files.length||importing)return;
  if(score)stop();
  importing=new AbortController();
  fileOperationUi(true);
  status("Préparation sur cet appareil…");
  let added=0,reprepared=0,reused=0;
  const failures=[],warnings=[];
  const summary=()=>[
    added?`${added} partition${added>1?"s enregistrées":" enregistrée"} sur cet appareil.`:"",
    reprepared?`${reprepared} partition(s) repréparée(s), sans nouvel ajout.`:"",
    reused?`${reused} partition(s) existante(s) ouverte(s), sans nouvel ajout.`:"",
    failures.join(" · "),warnings.join(" · "),
  ].filter(Boolean).join(" ")||"Aucune partition ajoutée.";
  try{
    for(const [index,file]of files.entries()){
      let existing=false,preparingExisting=false;
      try{
        const record=await importScore(file,message=>status(`${index+1}/${files.length} · ${file.name} · ${message}`),importing.signal,{
          resolveExisting:async id=>{
            const found=await getScoreInfo(id);if(!found)return;
            if(await duplicateChoice(found,importing.signal)==="reuse"){
              const current=await getScore(id);if(!current)throw new Error("Cette partition n’est plus disponible.");
              existing=true;return current;
            }
            preparingExisting=true;
          },
        });
        if(importing.signal.aborted)throw new DOMException("Import annulé.","AbortError");
        if(!existing){await saveScore(record,{signal:importing.signal});if(preparingExisting)reprepared++;else added++;}else reused++;
        // Storage already committed: a display failure must not count the file as lost.
        try{await showRecord(record);}
        catch(error){warnings.push(`${file.name} est conservé, mais son ouverture a échoué : ${error.message||String(error)}`);}
      }catch(error){
        if(error.name==="AbortError"||error.name==="QuotaExceededError")throw error;
        failures.push(`${file.name} : ${error.message||String(error)}`);
      }
    }
    status(summary()+await persistenceWarning());
    if(added||reprepared||reused)window.scrollTo({top:0});
  }catch(error){
    const message=error.name==="AbortError"?"Ajout annulé. La bibliothèque est conservée.":error.name==="QuotaExceededError"?
      "Stockage insuffisant : l’ajout est arrêté. Les partitions déjà enregistrées sont conservées. Garde tes MSCZ dans Fichiers.":error.message||String(error);
    status(`${message} ${summary()}`);
  }
  finally{importing=null;fileOperationUi(false);$("scoreFile").value="";}
};
$("cancelImport").onclick=()=>importing?.abort();
$("cancelLibraryOperation").onclick=()=>importing?.abort();
$("play").onclick=play;$("stop").onclick=()=>stop(true);$("seek").onchange=e=>seek(Number(e.target.value));$("master").oninput=e=>{if(gain)gain.gain.value=Number(e.target.value)/100;};$("speed").onchange=e=>{if(synth)synth.setPlayerTempo(0,Number(e.target.value));};$("goMeasure").onclick=()=>{const bounds=boundary();if(bounds)seek(bounds.start);else status("Vérifie les mesures de la boucle.");};$("metronome").onchange=()=>{if(synth)synth.midiAllSoundsOff(score.clickChannel);};$("follow").onchange=()=>{followedSystem=null;paint();};$("zoom").onchange=e=>{for(const figure of document.querySelectorAll(".paper")){figure.style.width=`${e.target.value}%`;figure.style.maxWidth="none";}followedSystem=null;paint();};$("mixerButton").onclick=()=>$("mixer").showModal();$("closeMixer").onclick=()=>$("mixer").close();
// A suspended page can return from Safari's back/forward cache. Keep its
// synthesizer reusable; unloading the document releases its audio resources.
window.addEventListener("pagehide",()=>{if(score)stop();persistPreferences();if(context&&context.state!=="closed")context.suspend();});
setInterval(poll,40);

const preferenceIds=["zoom","speed","master","metronome","clickVolume","precount","follow","loop","loopStart","loopEnd"];
function currentPreferences(){
  const controls=Object.fromEntries(preferenceIds.map(id=>[id,$(id).type==="checkbox"?$(id).checked:$(id).value]));
  return {controls,parts:[...parts.values()].map(({channel,sound,volume,muted,solo})=>({channel,sound,volume,muted,solo}))};
}
function persistPreferences(){
  if(!activeRecord||restoring)return;
  clearTimeout(savingTimer);
  saveSettings(activeRecord.id,currentPreferences()).catch(()=>status("Les derniers réglages n’ont pas pu être enregistrés."));
}
document.addEventListener("change",()=>{if(!restoring){clearTimeout(savingTimer);savingTimer=setTimeout(persistPreferences,200);}});
async function persistenceWarning(){
  try{await requestPersistence();return "";}
  catch{return " La protection du stockage n’a pas pu être demandée. Garde une sauvegarde dans Fichiers.";}
}

function queueRecord(action){
  // One opening owns the displayed pages, preferences and last-score write
  // until it completes. A failed opening must not block the next selection.
  const opened=recordOpening.then(action);
  recordOpening=opened.catch(()=>{});
  return opened;
}
function showRecord(record){
  return queueRecord(async()=>{
    const current=await getScore(record.id);
    if(!current)throw new Error("Cette partition n’est plus disponible.");
    await restoreRecord(current);
  });
}
async function restoreRecord(record){
  if(score)stop();
  persistPreferences();
  restoring=true;
  let nextUrls,replacing=false;
  try{
    const prefs=await getSettings(record.id);
    nextUrls=openRecord(record);replacing=true;
    // No preferences may be written under the old identity once its view is replaced.
    activeRecord=null;
    await load(nextUrls.manifest);
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
    activeUrls?.release();activeUrls=nextUrls;activeRecord=record;
    $("exportSource").hidden=false;
    $("sourceNote").textContent="Clique ou touche une note pour écouter à partir de là ; pendant la lecture, un clic met en pause. Rendu web : la mise en page peut différer de MuseScore 2. Partition et lecture conservées sur cet appareil.";
    history.replaceState(null,"",`?score=${record.id}`);
    await saveSettings("last-score",record.id);
  }catch(error){
    if(replacing){score=undefined;await clearRecord();}
    if(activeUrls!==nextUrls)nextUrls?.release();
    throw error;
  }
  finally{restoring=false;fileOperationUi(Boolean(importing));}
}
const downloads=new Map();
function downloadFile(kind,blob,filename){
  // Keep the last prepared URL until another explicit download or document exit.
  // A save sheet can remain open longer than any fixed timeout on iOS.
  if(downloads.has(kind))URL.revokeObjectURL(downloads.get(kind));
  const url=URL.createObjectURL(blob),link=document.createElement("a");downloads.set(kind,url);
  link.href=url;link.download=filename;link.click();
}
window.addEventListener("pagehide",event=>{if(!event.persisted){for(const url of downloads.values())URL.revokeObjectURL(url);downloads.clear();}});
$("exportSource").onclick=()=>{
  if(!activeRecord)return;
  downloadFile("source",activeRecord.source,activeRecord.filename);
};
let libraryAction, libraryActionBusy=false;
async function clearRecord(){
  if(score)stop();
  clearTimeout(savingTimer);activeRecord=null;
  await releaseAudio();
  activeUrls?.release();activeUrls=null;score=undefined;parts.clear();cursor.remove();
  $("score").replaceChildren();$("parts").replaceChildren();
  $("title").textContent="Choisir une partition";document.title="Pupitro";
  $("pdfLink").removeAttribute("href");$("pdfLink").hidden=$("exportSource").hidden=true;
  $("play").disabled=$("stop").disabled=$("seek").disabled=$("goMeasure").disabled=true;
  $("seek").value="0";$("clock").textContent="0:00 / 0:00";$("measure").textContent="Mesure 1";
  $("sourceNote").textContent="Import et lecture sur cet appareil. Tes partitions ne sont envoyées à aucun serveur.";
  const url=new URL(location.href);url.searchParams.delete("score");history.replaceState(null,"",url);
}
function askLibraryAction(kind,item){
  const index=[...$("libraryItems").children].findIndex(row=>row.dataset.id===item.id);
  libraryAction={kind,id:item.id,index};$("libraryActionError").textContent="";
  const deleting=kind==="delete";
  $("libraryActionTitle").textContent=deleting?`Supprimer « ${item.title} » ?`:"Renommer la partition";
  $("libraryActionDescription").textContent=deleting?
    "La partition et ses réglages seront retirés de cet appareil. Ton MSCZ dans Fichiers reste conservé.":
    "Le nom change dans Pupitro. Le fichier MSCZ d’origine reste intact.";
  $("libraryNameLabel").hidden=deleting;$("libraryName").disabled=deleting;$("libraryName").value=item.title;
  $("confirmLibraryAction").textContent=deleting?"Supprimer cette partition":"Enregistrer le nom";
  $("libraryAction").showModal();
  if(deleting)$("cancelLibraryAction").focus();else{$("libraryName").focus();$("libraryName").select();}
}
async function refreshLibrary(){
  const records=await listScores();$("libraryItems").replaceChildren();
  $("libraryStatus").textContent=`${records.length} partition${records.length===1?"":"s"} sur cet appareil.`;
  if(!records.length)$("libraryStatus").textContent+=" Aucune partition ici. Utilise « Ouvrir un fichier .mscz ».";
  for(const item of records){
    const row=document.createElement("li");row.className="library-item";row.dataset.id=item.id;
    const button=document.createElement("button");button.dataset.action="open";
    button.textContent=`${item.title} · ${item.pages} pages`;
    button.onclick=async()=>{try{await showRecord(item);$("library").close();}catch(error){$("libraryStatus").textContent=error.message;}};
    const rename=document.createElement("button");rename.textContent="Renommer";rename.dataset.action="rename";
    rename.setAttribute("aria-label",`Renommer ${item.title}`);
    rename.onclick=()=>askLibraryAction("rename",item);
    const remove=document.createElement("button");remove.textContent="Supprimer";remove.dataset.action="delete";
    remove.setAttribute("aria-label",`Supprimer ${item.title}`);remove.onclick=()=>askLibraryAction("delete",item);
    row.append(button,rename,remove);$("libraryItems").append(row);
  }
}
$("libraryActionForm").onsubmit=async event=>{
  event.preventDefault();if(libraryActionBusy)return;
  libraryActionBusy=true;$("confirmLibraryAction").disabled=$("cancelLibraryAction").disabled=true;
  try{
    const {kind,id,index}=libraryAction;
    await queueRecord(async()=>{
      if(kind==="delete"){
        await deleteScore(id);
        if(activeRecord?.id===id)await clearRecord();
      }else{
        const item=await renameScore(id,$("libraryName").value);
        if(activeRecord?.id===item.id){
          activeRecord.title=score.title=item.title;$("title").textContent=item.title;document.title=`Pupitro · ${item.title}`;
          document.querySelectorAll(".paper img").forEach((img,index)=>{img.alt=`${item.title}, page ${index+1} sur ${score.pages.length}`;});
        }
      }
    });
    const message=kind==="delete"?"Partition supprimée de cet appareil. Le fichier d’origine est conservé.":"Nom enregistré dans Pupitro.";
    $("libraryAction").close();status(message);
    try{
      await refreshLibrary();
      $("libraryStatus").textContent=`${message} ${$("libraryStatus").textContent}`;
      const rows=[...$("libraryItems").children];
      const row=kind==="rename"?rows.find(item=>item.dataset.id===id):rows[Math.min(index,rows.length-1)];
      (row?.querySelector(kind==="rename"?'[data-action="rename"]':'[data-action="open"]')||$("libraryAdd")).focus();
    }
    catch(error){$("libraryStatus").textContent=`${message} La liste n’a pas pu être actualisée : ${error.message}`;status($("libraryStatus").textContent);$("libraryAdd").focus();}
  }catch(error){$("libraryActionError").textContent=error.message;status(error.message);}
  finally{libraryActionBusy=false;$("confirmLibraryAction").disabled=$("cancelLibraryAction").disabled=false;}
};
$("cancelLibraryAction").onclick=()=>$("libraryAction").close();
$("libraryAction").addEventListener("cancel",event=>{if(libraryActionBusy)event.preventDefault();});
$("libraryButton").onclick=async()=>{
  try{
    await refreshLibrary();
    $("library").showModal();
  }catch(error){status(error.message||"Bibliothèque locale indisponible.");}
};
$("closeLibrary").onclick=()=>{importing?.abort();$("library").close();};
$("library").addEventListener("cancel",()=>importing?.abort());
$("exportLibrary").onclick=async()=>{
  if(importing)return;
  if(score)stop();importing=new AbortController();fileOperationUi(true,"Annuler la sauvegarde");
  try{
    const snapshot=await queueRecord(async()=>{
      clearTimeout(savingTimer);
      if(activeRecord)await saveSettings(activeRecord.id,currentPreferences());
      return snapshotLibrary({signal:importing.signal});
    });
    if(importing.signal.aborted)throw new DOMException("Sauvegarde annulée.","AbortError");
    const blob=encodeBackup(snapshot);
    await inspectBackup(blob,message=>{$("libraryStatus").textContent=message;status(message);},importing.signal);
    downloadFile("library",blob,`Pupitro-${new Date().toISOString().slice(0,10)}.pupitro`);
    $("libraryStatus").textContent=`Sauvegarde prête : ${snapshot.records.length} partition(s). Enregistre le fichier .pupitro dans Fichiers.`;status($("libraryStatus").textContent);
  }catch(error){$("libraryStatus").textContent=error.name==="AbortError"?"Sauvegarde annulée. La bibliothèque est conservée.":error.message||"La sauvegarde n’a pas pu être préparée.";status($("libraryStatus").textContent);}
  finally{importing=null;fileOperationUi(false);}
};
let pendingBackup;
$("restoreLibrary").onclick=()=>$("backupFile").click();
$("backupFile").onchange=async()=>{
  const file=$("backupFile").files[0];if(!file||importing)return;
  if(score)stop();importing=new AbortController();fileOperationUi(true,"Annuler la vérification");
  try{
    pendingBackup=await inspectBackup(file,message=>{$("libraryStatus").textContent=message;status(message);},importing.signal);
    const existing=new Set((await listScores()).map(item=>item.id));
    if(importing.signal.aborted)throw new DOMException("Vérification annulée.","AbortError");
    const kept=pendingBackup.entries.filter(item=>existing.has(item.id)).length;
    $("libraryStatus").textContent=`Sauvegarde vérifiée : ${pendingBackup.entries.length} partition(s).`;
    $("restoreSummary").textContent=`${pendingBackup.entries.length-kept} partition(s) à ajouter ; ${kept} déjà présente(s), conservée(s) sans remplacement.`;
    $("restorePreview").showModal();$("cancelRestore").focus();
  }catch(error){
    pendingBackup=null;const message=error.name==="AbortError"?"Vérification annulée. La bibliothèque est conservée.":error.message;
    $("libraryStatus").textContent=message;status(message);
  }
  finally{importing=null;fileOperationUi(false);$("backupFile").value="";}
};
$("cancelRestore").onclick=()=>{pendingBackup=null;$("restorePreview").close();};
$("restorePreview").addEventListener("cancel",()=>{pendingBackup=null;});
$("confirmRestore").onclick=async()=>{
  const backup=pendingBackup;if(!backup||importing)return;
  pendingBackup=null;$("restorePreview").close();$("library").close();
  importing=new AbortController();fileOperationUi(true,"Annuler la restauration");
  let added=0,skipped=0,currentEntry;
  try{
    for(const [index,entry]of backup.entries.entries()){
      currentEntry=entry;
      if(importing.signal.aborted)throw new DOMException("Restauration annulée.","AbortError");
      if(await getScoreInfo(entry.id)){skipped++;continue;}
      const record=await importScore(entry.source,message=>status(`Restauration ${index+1}/${backup.entries.length} · ${message}`),importing.signal);
      if(record.id!==entry.id)throw new Error("Le MSCZ a changé depuis la vérification. Relance la restauration depuis sa sauvegarde d’origine.");
      record.importedAt=entry.importedAt;
      const saved=await saveScore(record,{ifAbsent:true,title:entry.title,settings:entry.settings,signal:importing.signal});
      if(saved)added++;else skipped++;
    }
    currentEntry=null;
    let openingWarning="";
    if(!activeRecord&&backup.entries.length){
      try{
        const id=backup.lastScore||backup.entries[0].id,record=await getScore(id);
        if(record)await showRecord(record);
      }catch(error){openingWarning=` Les partitions sont conservées, mais l’ouverture a échoué : ${error.message}`;}
    }
    status(`Restauration terminée : ${added} restaurées, ${skipped} déjà présentes et conservées.${openingWarning}${await persistenceWarning()}`);
  }catch(error){
    const reason=error.name==="AbortError"?"Restauration annulée.":error.name==="QuotaExceededError"?"Stockage insuffisant : restauration arrêtée.":error.message;
    status(`${currentEntry?currentEntry.filename+" : ":""}${reason} ${added} restaurées, ${skipped} déjà présentes ; ${backup.entries.length-added-skipped} non ajoutées. Les partitions déjà présentes sont conservées.`);
  }finally{importing=null;fileOperationUi(false);}
};
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
    const id=/^[a-f0-9]{64}$/.test(requested||"")?requested:null;
    let record=id?await getScore(id):null;
    if(!record){const last=await getSettings("last-score");if(last&&last!==id)record=await getScore(last);}
    if(record)await showRecord(record);
    else status("Ouvre un fichier .mscz pour commencer. Il sera préparé et enregistré sur cet appareil.");
  }catch(error){status(error.message||"La bibliothèque locale n’a pas pu être ouverte.");}
  finally{$("openFile").disabled=$("libraryButton").disabled=false;}
})();
