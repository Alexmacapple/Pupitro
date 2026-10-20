// Real IndexedDB; only the browser's abnormal-close event is injected.
const {launchObservedContext,assertObservations,closeObservedContext}=require('./browser.cjs');
const runtime=require(process.env.PUPITRO_PLAYWRIGHT||'playwright');
const assert=require('node:assert/strict');
const {tinyScore}=require('./fixtures.cjs');
const {expect}=require((process.env.PUPITRO_PLAYWRIGHT||'playwright')+'/test');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const base=process.env.PUPITRO_TEST_URL||'http://127.0.0.1:8770/';
const output=fs.mkdtempSync(path.join(os.tmpdir(),'pupitro-recovery-'));
(async()=>{
  const observations={errors:[],posts:[],outside:[],consoleCounts:new Map()};
  const context=await launchObservedContext(runtime[process.env.PUPITRO_ENGINE||'chromium'],path.join(output,'profile'),{headless:true},base,observations);
  try{
    const page=await context.newPage();await page.goto(new URL('credits.html',base).href);
    await expect(page.locator('head meta[name="description"]')).toHaveCount(1);
    assert.ok((await page.locator('head meta[name="description"]').getAttribute('content')).length>40);
    const title=await page.evaluate(async()=>{
      const original=indexedDB.open.bind(indexedDB);let connection;
      indexedDB.open=(...args)=>{
        const request=original(...args);
        request.addEventListener('success',()=>{connection=request.result;},{once:true});
        return request;
      };
      try{
        const api=await import('./library.js');
        await api.saveScore({id:'a'.repeat(64),title:'Partition conservée',filename:'test.mscz',importedAt:1,
          manifest:{pages:[]},source:new Blob(['original'])});
        connection.close();connection.dispatchEvent(new Event('close'));
        return (await api.getScoreInfo('a'.repeat(64))).title;
      }finally{indexedDB.open=original;}
    });
    assert.equal(title,'Partition conservée');assertObservations(observations);
    await assert.rejects(page.evaluate(async()=>{
      const api=await import('./library.js');
      await api.renameScore('a'.repeat(64),'x'.repeat(1024*1024));
    }),/capacité de sauvegarde/);
    assert.equal(await page.evaluate(async()=>{
      const api=await import('./library.js');return (await api.getScoreInfo('a'.repeat(64))).title;
    }),'Partition conservée');
    assert.equal(await page.evaluate(async()=>{
      const api=await import('./library.js'),record=await api.getScore('a'.repeat(64));
      const original=IDBDatabase.prototype.transaction,controller=new AbortController();
      IDBDatabase.prototype.transaction=function(stores,mode,...args){
        const tx=original.call(this,stores,mode,...args);
        if(mode==='readwrite')tx.addEventListener('complete',()=>controller.abort(),{once:true});
        return tx;
      };
      try{return await api.saveScore(record,{signal:controller.signal});}
      finally{IDBDatabase.prototype.transaction=original;}
    }),true,'A completed transaction remains committed after a late cancellation');
    await page.evaluate(async()=>{const api=await import('./library.js');await api.deleteScore('a'.repeat(64));});
    await page.goto(base);
    await expect(page.locator('head meta[name="description"]')).toHaveCount(1);
    await expect(page.locator('label[for="seek"]')).toBeVisible();
    await expect(page.getByLabel('Position dans le morceau',{exact:true})).toHaveAttribute('id','seek');
    await page.waitForFunction(()=>!document.getElementById('openFile').disabled);
    await page.evaluate(()=>{
      const original=crypto.subtle.digest;let count=0;
      window.restoreDigest=()=>{crypto.subtle.digest=original;window.finishDigest?.();};
      crypto.subtle.digest=function(...args){
        if(++count!==2)return original.apply(this,args);
        window.waitingDigest=true;
        return new Promise((resolve,reject)=>{window.finishDigest=()=>original.apply(this,args).then(resolve,reject);});
      };
    });
    const sourceFiles=[await tinyScore('Première'),await tinyScore('Seconde',64)];
    try{
      await page.locator('#scoreFile').setInputFiles(sourceFiles);
      await page.waitForFunction(()=>window.waitingDigest);
      await expect(page.locator('#play')).toBeDisabled();
      await expect(page.locator('#stop')).toBeDisabled();
    }finally{await page.evaluate(()=>window.restoreDigest());}
    await expect(page.locator('#status')).toContainText('2 partitions enregistrées',{timeout:90000});
    const budget=await page.evaluate(async()=>{
      const api=await import('./library.js'),{encodeBackup}=await import('./backup.js');
      const row=(await api.listScores()).find(item=>item.title==='Première'),record=await api.getScore(row.id);
      const previous=await api.getSettings(row.id),prefs={controls:{loopStart:'0'.repeat(1000)}};
      const empty={id:row.id,title:'',filename:record.filename,sourceBytes:record.source.size,importedAt:row.importedAt,settings:prefs};
      const length=1024*1024-new TextEncoder().encode(JSON.stringify(empty)).length-20;
      let rejected=false;
      try{
        await api.saveSettings(row.id,prefs);await api.renameScore(row.id,'N'.repeat(length));
        encodeBackup(await api.snapshotLibrary());
        try{await api.saveScore({...record,filename:'f'.repeat(200)+'.mscz'});}
        catch(error){rejected=error.message.includes('capacité de sauvegarde');}
        const preserved=(await api.getScore(row.id)).filename===record.filename;
        encodeBackup(await api.snapshotLibrary());
        return {rejected,preserved};
      }finally{await api.renameScore(row.id,row.title);await api.saveSettings(row.id,previous);}
    });
    assert.deepEqual(budget,{rejected:true,preserved:true});
    await page.setViewportSize({width:320,height:256});
    assert.ok((await page.locator('#transportToggle').boundingBox()).y>=0,'The dock handle must remain visible in a short viewport');
    await page.setViewportSize({width:1280,height:800});
    await page.locator('#libraryButton').click();
    await page.getByRole('button',{name:'Renommer Seconde',exact:true}).click();
    await page.getByLabel('Nom dans Pupitro',{exact:true}).fill('Nouveau nom');
    await page.getByRole('button',{name:'Enregistrer le nom',exact:true}).click();
    await expect(page.locator('#libraryAction')).toBeHidden();
    assert.equal(await page.evaluate(()=>document.activeElement?.dataset.action),'rename','Renaming must return focus to the updated library entry');
    await expect(page.locator('#libraryStatus')).toContainText('Nom enregistré');
    await page.locator('#closeLibrary').click();
    await page.locator('#scoreFile').setInputFiles(sourceFiles[1]);
    await expect(page.locator('#duplicate')).toBeVisible();
    await page.locator('#reprepareScore').focus();await page.keyboard.press('Escape');
    await expect(page.locator('#openFile')).toBeEnabled();
    assert.ok(await page.evaluate(()=>{
      const element=document.activeElement;
      return element!==document.body&&element.getClientRects().length>0&&!element.closest('dialog:not([open])');
    }),'Cancelling a duplicate must restore a visible focus target');
    // A corrupt prepared view must not save another score's settings under its id.
    await page.locator('#libraryButton').click();
    await page.evaluate(async()=>{
      const api=await import('./library.js'),rows=await api.listScores();
      const row=rows.find(item=>item.title==='Première');window.recoveryOriginal=await api.getScore(row.id);
      await api.saveScore({...window.recoveryOriginal,manifest:{...window.recoveryOriginal.manifest,channels:[null]}});
    });
    await page.getByRole('button',{name:'Première · 1 pages',exact:true}).click();
    await expect(page.locator('#title')).toHaveText('Choisir une partition');
    await expect(page.locator('#play')).toBeDisabled();
    await page.getByRole('button',{name:'Nouveau nom · 1 pages',exact:true}).click();
    await expect(page.locator('#title')).toHaveText('Nouveau nom');
    await page.evaluate(async()=>{const api=await import('./library.js');await api.saveScore(window.recoveryOriginal);delete window.recoveryOriginal;});
    await page.locator('#libraryButton').click();
    await page.getByRole('button',{name:'Supprimer Nouveau nom',exact:true}).click();
    await page.getByRole('button',{name:'Supprimer cette partition',exact:true}).click();
    await expect(page.locator('#libraryAction')).toBeHidden();
    assert.equal(await page.evaluate(()=>document.activeElement?.dataset.action),'open');
    await expect(page.locator('#libraryStatus')).toContainText('Partition supprimée');
    assertObservations(observations);
    console.log(JSON.stringify({abnormalCloseRecovered:true,oversizedNameRejected:true,lateCancellationCommitted:true,busyControls:true,shortViewport:true,renameFocus:true,deleteFocus:true,duplicateFocus:true,modalSuccessStatus:true,failedViewCleared:true,output}));
  }finally{await closeObservedContext(context,path.join(output,'profile'));}
})().catch(error=>{console.error(error);process.exitCode=1;});
