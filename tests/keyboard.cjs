// Real keyboard events and audio; fresh synthetic score and isolated browser data.
const {launchObservedContext,assertObservations,closeObservedContext}=require('./browser.cjs');
const runtime=require(process.env.PUPITRO_PLAYWRIGHT||'playwright');
const {expect}=require((process.env.PUPITRO_PLAYWRIGHT||'playwright')+'/test');
const {tinyScore}=require('./fixtures.cjs');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const assert=require('node:assert/strict');
const base=process.env.PUPITRO_TEST_URL||'http://127.0.0.1:8770/';
const output=fs.mkdtempSync(path.join(os.tmpdir(),'pupitro-keyboard-'));
const observations={errors:[],posts:[],outside:[],consoleCounts:new Map()};
async function focusPage(page){await page.evaluate(()=>document.activeElement?.blur());}
async function space(page){await focusPage(page);await page.keyboard.press('Space');}
(async()=>{
  const context=await launchObservedContext(runtime[process.env.PUPITRO_ENGINE||'chromium'],path.join(output,'profile'),
    {headless:true,viewport:{width:1100,height:700},hasTouch:true,serviceWorkers:'block'},base,observations);
  try{
    const page=await context.newPage();await page.goto(base);
    await page.waitForFunction(()=>!document.getElementById('openFile').disabled);
    const initial=await page.locator('#status').textContent();
    await space(page);await expect(page.locator('#status')).toHaveText(initial);
    const {zipSync,unzipSync}=await import('../reader/assets/fflate.js');
    const file=await tinyScore('Clavier');const files=unzipSync(file.buffer);
    let xml=new TextDecoder().decode(files['score.mscx']);
    xml=xml.replace(/<Measure>.*?<\/Measure>/s,measure=>measure.repeat(16));
    files['score.mscx']=new TextEncoder().encode(xml);file.buffer=Buffer.from(zipSync(files));
    fs.writeFileSync(path.join(output,'keyboard.mscz'),file.buffer);
    await page.locator('#scoreFile').setInputFiles(file);
    await expect(page.locator('#play')).toBeEnabled({timeout:90000});
    await expect(page.locator('#status')).toContainText('partition enregistrée',{timeout:90000});

    // Hold audio preparation to verify cancellation and key repeats before first sound.
    let releaseFont;const fontGate=new Promise(resolve=>releaseFont=resolve);
    await page.route('**/sounds.sf3',async route=>{await fontGate;await route.continue();});
    try{
      await focusPage(page);await page.keyboard.down('Space');
      await expect(page.locator('#play')).toHaveText('Annuler');
      await page.keyboard.down('Space');
      await expect(page.locator('#play')).toHaveText('Annuler');
      await page.keyboard.up('Space');await space(page);
      await expect(page.locator('#play')).toHaveText('Écouter');
    }finally{releaseFont();}
    await space(page);await expect(page.locator('#play')).toHaveText('Pause',{timeout:30000});
    await expect(page.locator('#audioSignal')).toHaveClass(/active/,{timeout:15000});
    await expect.poll(async()=>Number(await page.locator('#seek').inputValue())).toBeGreaterThan(100);
    await space(page);await expect(page.locator('#play')).toHaveText('Écouter');
    const paused=Number(await page.locator('#seek').inputValue());
    assert.ok(paused>0);await page.waitForTimeout(150);
    assert.equal(Number(await page.locator('#seek').inputValue()),paused);
    await space(page);await expect(page.locator('#play')).toHaveText('Pause');
    assert.ok(Number(await page.locator('#seek').inputValue())>=paused);
    await space(page);

    await page.locator('#follow').uncheck();await focusPage(page);
    await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
    await page.waitForTimeout(200);
    const scroll=await page.evaluate(()=>window.scrollY);
    await page.keyboard.down('Space');await expect(page.locator('#play')).toHaveText('Pause');
    for(let i=0;i<5;i++)await page.keyboard.down('Space');
    await page.waitForTimeout(2000);await expect(page.locator('#play')).toHaveText('Pause');
    assert.equal(await page.evaluate(()=>window.scrollY),scroll);await page.keyboard.up('Space');
    await space(page);

    await page.locator('#play').focus();await page.keyboard.press('Space');
    await expect(page.locator('#play')).toHaveText('Pause');
    await page.keyboard.press('Space');await expect(page.locator('#play')).toHaveText('Écouter');
    await page.locator('#metronome').focus();await page.keyboard.press('Space');
    await expect(page.locator('#metronome')).toBeChecked();
    await expect(page.locator('#play')).toHaveText('Écouter');
    await page.locator('#metronome').uncheck();
    for(const id of ['speed','loopStart','seek','pdfLink']){
      await page.locator('#'+id).focus();await page.keyboard.press('Space');await page.keyboard.press('Escape');
      await expect(page.locator('#play')).toHaveText('Écouter');
    }
    for(const id of ['mixer','library','restorePreview','duplicate','libraryAction','installation']){
      await page.evaluate(id=>document.getElementById(id).showModal(),id);await space(page);
      await expect(page.locator('#play')).toHaveText('Écouter');
      if(id==='libraryAction'){
        await page.locator('#libraryName').fill('Deux');await page.keyboard.press('Space');
        await page.keyboard.type('mots');await expect(page.locator('#libraryName')).toHaveValue('Deux mots');
      }
      await page.evaluate(id=>document.getElementById(id).close(),id);
    }
    await page.locator('#transportToggle').click();
    // WebKit does not necessarily focus a button on a pointer click.
    await page.locator('#transportToggle').focus();await page.keyboard.press('Space');
    await expect(page.locator('#transport')).toBeVisible();
    await expect(page.locator('#play')).toHaveText('Écouter');
    await page.locator('#transportToggle').click();await space(page);
    await expect(page.locator('#play')).toHaveText('Pause');await space(page);
    await page.locator('#transportToggle').click();
    await page.locator('#precount').check();await space(page);
    await expect(page.locator('#status')).toContainText('Décompte');await space(page);
    await expect(page.locator('#play')).toHaveText('Écouter');
    await page.waitForTimeout(2500);await expect(page.locator('#play')).toHaveText('Écouter');
    await page.locator('#precount').uncheck();
    for(const key of ['Shift+Space','Alt+Space','Control+Space','Meta+Space']){
      await focusPage(page);await page.keyboard.press(key);await expect(page.locator('#play')).toHaveText('Écouter');
    }
    await focusPage(page);
    const ignored=await page.evaluate(()=>{
      return [true,false].map(composing=>{
        const event=new KeyboardEvent('keydown',{key:' ',bubbles:true,cancelable:true,isComposing:composing});
        if(!composing)event.preventDefault();document.body.dispatchEvent(event);return event.defaultPrevented;
      });
    });
    assert.deepEqual(ignored,[false,true]);await expect(page.locator('#play')).toHaveText('Écouter');
    await page.evaluate(()=>{
      const seek=document.getElementById('seek');seek.value=Number(seek.max)-240;seek.dispatchEvent(new Event('change'));
    });
    await space(page);await expect(page.locator('#play')).toHaveText('Réécouter',{timeout:10000});
    const endTick=Number(await page.locator('#seek').inputValue());
    await space(page);await expect(page.locator('#play')).toHaveText('Pause');
    const immediateTick=Number(await page.locator('#seek').inputValue());
    // The transport label changes before poll() refreshes the position control.
    await expect.poll(async()=>Number(await page.locator('#seek').inputValue())).toBeLessThan(1000);
    console.log(JSON.stringify({endReplay:{endTick,immediateTick,restartedTick:Number(await page.locator('#seek').inputValue())}}));
    await space(page);
    await page.locator('#loopStart').fill('1');await page.locator('#loopEnd').fill('2');
    await page.locator('#loop').check();await space(page);
    await expect(page.locator('#play')).toHaveText('Pause');await space(page);
    await expect(page.locator('#loop')).toBeChecked();await page.locator('#loop').uncheck();
    await focusPage(page);await page.keyboard.down('Space');
    await expect(page.locator('#play')).toHaveText('Pause');
    await page.evaluate(()=>{window.dispatchEvent(new Event('blur'));document.dispatchEvent(new Event('visibilitychange'));});
    await page.keyboard.up('Space');await space(page);
    await expect(page.locator('#play')).toHaveText('Écouter');
    // Delay the settings transaction notification while restoreRecord owns the view.
    await page.locator('#libraryButton').click();
    await page.evaluate(()=>{
      const original=IDBDatabase.prototype.transaction;let pending;
      IDBDatabase.prototype.transaction=function(stores,mode,...args){
        const tx=original.call(this,stores,mode,...args);
        if(mode==='readonly'&&[...tx.objectStoreNames].join(',')==='settings'&&!pending){
          pending=tx;tx.addEventListener('complete',event=>{
            event.stopImmediatePropagation();window.settingsPaused=true;
          });
        }
        return tx;
      };
      window.releaseSettings=()=>{IDBDatabase.prototype.transaction=original;pending?.oncomplete?.(new Event('complete'));};
    });
    try{
      await page.locator('[data-action="open"]').first().click();
      await page.waitForFunction(()=>window.settingsPaused);
      await page.evaluate(()=>document.getElementById('library').close());
      await expect(page.locator('#play')).toBeEnabled();
      await space(page);await expect(page.locator('#play')).toHaveText('Écouter');
    }finally{await page.evaluate(()=>window.releaseSettings());}
    await page.waitForFunction(()=>!document.getElementById('play').disabled);
    // Import stays inactive even when keyboard input arrives outside the controls.
    await page.evaluate(()=>{
      const digest=crypto.subtle.digest.bind(crypto.subtle);
      crypto.subtle.digest=(...args)=>{
        window.digestPaused=true;
        return new Promise((resolve,reject)=>{window.releaseDigest=()=>{
          crypto.subtle.digest=digest;digest(...args).then(resolve,reject);
        };});
      };
    });
    try{
      await page.locator('#scoreFile').setInputFiles(await tinyScore('Import occupé',64));
      await page.waitForFunction(()=>window.digestPaused);
      await expect(page.locator('#play')).toBeDisabled();await space(page);
      await expect(page.locator('#play')).toHaveText('Écouter');
    }finally{await page.evaluate(()=>window.releaseDigest());}
    await expect(page.locator('#status')).toContainText('partition enregistrée',{timeout:90000});
    await page.screenshot({path:path.join(output,'keyboard.png')});
    assertObservations(observations);
    console.log(JSON.stringify({engine:process.env.PUPITRO_ENGINE||'chromium',output,result:'PASS'}));
  }finally{await closeObservedContext(context,path.join(output,'profile'));}
})().catch(error=>{console.error(error);process.exitCode=1;});
