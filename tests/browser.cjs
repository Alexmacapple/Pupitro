// Real static app, real user-selected score; no server-side conversion endpoint.
const playwright = process.env.PUPITRO_PLAYWRIGHT || 'playwright';
let browserType,expect;
if(require.main===module){
  browserType=require(playwright)[process.env.PUPITRO_ENGINE || 'chromium'];
  ({expect}=require(playwright + '/test'));
}
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const scoreFile = process.argv[2];
if (require.main===module&&!scoreFile) throw new Error('Usage: node tests/browser.cjs /path/to/example.mscz');
const base = process.env.PUPITRO_TEST_URL || 'http://127.0.0.1:8770/';
const output = require.main===module?fs.mkdtempSync(path.join(os.tmpdir(), 'pupitro-browser-')):null;
const profile = output?path.join(output, 'profile'):null;
const options = {headless:true,viewport:{width:428,height:926},isMobile:true,hasTouch:true};
let context;
async function launchObservedContext(browser,profile,options,base,observations){
  const context=await browser.launchPersistentContext(profile,options);
  const attached=new WeakSet();
  const attach=page=>{
    if(attached.has(page))return;
    attached.add(page);
    page.on('pageerror',error=>observations.errors.push(error.message));
    page.on('console',message=>{
      if(message.type()!=='error')return;
      const text=message.text(),counts=observations.consoleCounts;
      counts.set(text,(counts.get(text)||0)+1);
      if(counts.size<=3&&counts.get(text)===1)console.error('browser:',text);
    });
    page.on('crash',()=>observations.errors.push('PAGE_CRASH'));
  };
  context.on('page',attach);
  for(const page of context.pages())attach(page);
  // Context requests include requests initiated by workers as well as pages.
  context.on('request',request=>{
    const url=request.url();
    if(request.method()==='POST')observations.posts.push(url);
    if(/^https?:/.test(url)&&!url.startsWith(base))observations.outside.push(url);
  });
  return context;
}
function assertObservations({posts,outside,errors}){
  assert.deepEqual(posts,[]);assert.deepEqual(outside,[]);assert.deepEqual(errors,[]);
}
module.exports={launchObservedContext,assertObservations};
async function pressNote(page,method,offset){
  const target=await page.evaluate(async offset=>{
    const library=await import('./library.js');
    const record=await library.getScore(new URL(location.href).searchParams.get('score'));
    const events=record.manifest.cursorEvents.filter(event=>event.page===0&&event.tick>record.manifest.ppq*2);
    const event=events[Math.min(offset,events.length-1)]||record.manifest.cursorEvents[0];
    return {...event,ppq:record.manifest.ppq};
  },offset);
  const image=page.locator('.paper img').nth(target.page);
  const size=await image.evaluate(img=>({width:img.getBoundingClientRect().width,height:img.getBoundingClientRect().height}));
  await image[method]({position:{x:(target.x+(target.width||0)/2)*size.width,y:(target.y+target.height*.5)*size.height}});
  return target;
}
async function selectNote(page,method,offset){
  const target=await pressNote(page,method,offset);
  await expect.poll(async()=>{
    const tick=Number(await page.locator('#seek').inputValue());
    return tick>=target.tick-2&&tick<target.tick+target.ppq*8;
  },{timeout:15000}).toBe(true);
  await expect(page.locator('#play')).toHaveText('Pause',{timeout:15000});
  await expect(page.locator('#audioSignal')).toHaveClass(/active/,{timeout:15000});
  return target.tick;
}
async function pauseOnNote(page,method,offset){
  await pressNote(page,method,offset);
  await expect(page.locator('#play')).toHaveText('Écouter');
  const tick=await page.locator('#seek').inputValue();
  await expect(page.locator('#audioSignal')).not.toHaveClass(/active/);
  await page.waitForTimeout(200);
  await expect(page.locator('#seek')).toHaveValue(tick);
  return Number(tick);
}
if(require.main===module)(async()=>{
  const observations={errors:[],posts:[],outside:[],consoleCounts:new Map()};
  const {errors,posts,outside,consoleCounts}=observations;
  context = await launchObservedContext(browserType,profile,options,base,observations);
  let page = await context.newPage();
  await page.goto(base);
  const legacy=await require('./legacy.cjs')(page);
  await expect(page.locator('#status')).toContainText('Ouvre un fichier');
  await expect(page.locator('#goMeasure')).toBeDisabled();
  await expect(page.locator('#offlineStatus')).toContainText('Application prête hors ligne',{timeout:90000});
  console.log('offline assets ready');
  await page.locator('#scoreFile').setInputFiles(scoreFile);
  await expect(page.locator('#status')).toContainText('partition enregistrée',{timeout:90000});
  await expect(page.locator('#goMeasure')).toBeEnabled();
  await expect(page.locator('#pdfLink')).toBeVisible();
  const pdf=await page.locator('#pdfLink').evaluate(async link=>{
    if(!link.href.startsWith('blob:'))throw new Error('The PDF must come from the local score');
    const response=await fetch(link.href),blob=await response.blob();
    return {ok:response.ok,type:blob.type,size:blob.size};
  });
  assert.equal(pdf.ok,true);assert.equal(pdf.type,'application/pdf');assert.ok(pdf.size>0);
  console.log('local import ready');
  const pages=await page.locator('.paper').count();
  const partCount=await page.locator('#parts .part').count();
  if(process.env.PUPITRO_EXPECT_PARTS)assert.equal(partCount,Number(process.env.PUPITRO_EXPECT_PARTS));
  assert.ok(pages>0);
  await page.locator('.paper img').first().evaluate(img=>img.decode());
  await page.screenshot({path:path.join(output,'mobile.png'),fullPage:false});
  await page.setViewportSize({width:1440,height:1000});
  const clickedTick=await selectNote(page,'click',0);
  for(const img of await page.locator('.paper img').all()){
    await img.scrollIntoViewIfNeeded();
    await expect(img).toHaveJSProperty('complete',true);
    assert.ok(await img.evaluate(element=>element.naturalWidth>0));
  }
  await page.locator('#openFile').scrollIntoViewIfNeeded();
  await expect(page.locator('#clock')).not.toHaveText(/^0:00 /,{timeout:20000});
  await expect(page.locator('#audioSignal')).toHaveClass(/active/,{timeout:15000});
  const mousePauseTick=await pauseOnNote(page,'click',0);
  const resumedTick=await selectNote(page,'click',4);
  await page.setViewportSize({width:428,height:926});
  const touchPauseTick=await pauseOnNote(page,'tap',8);
  const tappedTick=await selectNote(page,'tap',8);
  await page.locator('#transportToggle').click();
  await expect(page.locator('#transport')).toBeHidden();
  await page.locator('#transportToggle').click();
  await expect(page.locator('#transport')).toBeVisible();
  await page.locator('#play').click();
  await page.locator('.paper img').first().click({position:{x:15,y:15}});
  await expect(page.locator('#play')).toHaveText('Écouter');
  if(pages>=5)await page.locator('.paper img').nth(4).screenshot({path:path.join(output,'page-5.png')});
  await page.locator('#mixerButton').click();
  const selects=page.locator('#parts select');
  for(const preset of ['percussion','guitar','ukulele','mandolin','flute','accordion']){
    await selects.first().selectOption(preset);
    await page.locator('#closeMixer').click();
    await page.locator('#stop').click();
    await page.locator('#play').click();
    await expect(page.locator('#audioSignal')).toHaveClass(/active/,{timeout:10000});
    await page.locator('#play').click();
    await page.locator('#mixerButton').click();
  }
  for(const checkbox of await page.locator('#parts .mute').all())await checkbox.check();
  await page.locator('#closeMixer').click();
  await page.locator('#metronome').check();
  await page.locator('#play').click();
  await expect(page.locator('#audioSignal')).toHaveClass(/active/,{timeout:10000});
  await page.locator('#play').click();
  await page.locator('#speed').selectOption('0.75');
  await page.locator('#loopStart').fill('1');await page.locator('#loopEnd').fill('2');await page.locator('#loop').check();
  await page.locator('#goMeasure').click();
  await page.locator('#play').click();
  await expect(page.locator('#clock')).not.toHaveText(/^0:00 /,{timeout:15000});
  let previousTick=0,looped=false;
  await expect.poll(async()=>{
    const tick=Number(await page.locator('#seek').inputValue());
    if(previousTick>tick+100)looped=true;
    previousTick=tick;return looped;
  },{timeout:15000}).toBe(true);
  await page.locator('#play').click();
  // Network disabled: a fresh file import still has to execute the WASM engine.
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.paper')).toHaveCount(pages,{timeout:20000});
  await expect(page.locator('#speed')).toHaveValue('0.75');
  const original=fs.readFileSync(scoreFile),end=original.lastIndexOf(Buffer.from([80,75,5,6]));
  assert.ok(end>=0);
  const comment=Buffer.from('Pupitro offline import test');
  const offlineFile=Buffer.concat([original,comment]);
  offlineFile.writeUInt16LE(original.readUInt16LE(end+20)+comment.length,end+20);
  await page.locator('#scoreFile').setInputFiles({name:'offline.mscz',mimeType:'application/octet-stream',buffer:offlineFile});
  await expect(page.locator('#status')).toContainText('partition enregistrée',{timeout:90000});
  await page.locator('#play').click();
  await expect(page.locator('#audioSignal')).toHaveClass(/active/,{timeout:15000});
  await page.locator('#play').click();
  await page.locator('#scoreFile').setInputFiles({name:'invalid.mscz',mimeType:'application/octet-stream',buffer:Buffer.from('invalid')});
  await expect(page.locator('#status')).toContainText('valide');
  await expect(page.locator('.paper')).toHaveCount(pages);
  assertObservations(observations);
  const id=new URL(page.url()).searchParams.get('score');
  await context.close();
  // A browser restart must retain both the app and its IndexedDB library.
  context=await launchObservedContext(browserType,profile,options,base,observations);
  await context.setOffline(true);page=await context.newPage();
  await page.goto(base);
  await expect(page.locator('.paper')).toHaveCount(pages,{timeout:20000});
  await page.locator('#play').click();
  await expect(page.locator('#audioSignal')).toHaveClass(/active/,{timeout:15000});
  await page.locator('#play').click();
  await page.locator('#libraryButton').click();
  await expect(page.locator('#libraryItems button')).toHaveCount(2);
  const selected=await page.evaluate(async()=>{
    const library=await import('./library.js');
    const records=await library.listScores();
    await library.saveSettings(records[0].id,{controls:{speed:'1.25'}});
    await library.saveSettings(records[1].id,{controls:{speed:'0.5'}});
    // Delay one real IndexedDB completion to exercise overlapping selections.
    const delayed=new WeakSet(),get=IDBObjectStore.prototype.get;
    window.storageTestDelayed=window.storageTestCompleted=false;
    const complete=Object.getOwnPropertyDescriptor(IDBTransaction.prototype,'oncomplete');
    IDBObjectStore.prototype.get=function(key){
      if(this.name==='settings'&&key===records[0].id)delayed.add(this.transaction);
      return get.call(this,key);
    };
    Object.defineProperty(IDBTransaction.prototype,'oncomplete',{...complete,set(callback){
      complete.set.call(this,typeof callback==='function'?function(event){
        if(delayed.has(this)){
          window.storageTestDelayed=true;
          setTimeout(()=>{callback.call(this,event);window.storageTestCompleted=true;},250);
        }
        else callback.call(this,event);
      }:callback);
    }});
    window.restoreStorageTest=()=>{
      IDBObjectStore.prototype.get=get;
      Object.defineProperty(IDBTransaction.prototype,'oncomplete',complete);
    };
    const buttons=document.querySelectorAll('#libraryItems button');
    buttons[0].click();buttons[1].click();
    return records[1].id;
  });
  await expect.poll(()=>page.evaluate(()=>window.storageTestDelayed)).toBe(true);
  await expect.poll(()=>page.evaluate(()=>window.storageTestCompleted)).toBe(true);
  await expect(page.locator('#speed')).toHaveValue('0.5');
  await expect.poll(()=>new URL(page.url()).searchParams.get('score')).toBe(selected);
  await expect.poll(()=>page.evaluate(async()=>{
    const library=await import('./library.js');return library.getSettings('last-score');
  })).toBe(selected);
  await page.evaluate(()=>window.restoreStorageTest());
  await page.setViewportSize({width:1440,height:1000});
  await page.screenshot({path:path.join(output,'desktop.png'),fullPage:false});
  assertObservations(observations);
  console.log(JSON.stringify({pages,parts:partCount,id,posts:posts.length,externalRequests:outside.length,errors,consoleCounts:[...consoleCounts],legacy,noteSelection:{clickedTick,mousePauseTick,resumedTick,touchPauseTick,tappedTick},offlineImport:true,restartOffline:true,concurrentOpen:true,output}));
})().catch(async error=>{console.error(error);if(context){const page=context.pages().at(-1);if(page){console.error(await page.locator('body').innerText().catch(()=>''));await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});console.error('Artifacts:',output);}}process.exitCode=1;}).finally(async()=>{if(context)await context.close();});
