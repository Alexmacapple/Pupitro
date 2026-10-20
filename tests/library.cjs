// Real IndexedDB and UI; legacy data is seeded before loading the application.
const playwright=process.env.PUPITRO_PLAYWRIGHT||'playwright';
const {expect}=require(playwright+'/test');
const browserType=require(playwright)[process.env.PUPITRO_ENGINE||'chromium'];
const assert=require('node:assert/strict');
const {launchObservedContext,assertObservations,normalizeBase,restoreTestPatches,closeObservedContext}=require('./browser.cjs');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const base=normalizeBase(process.env.PUPITRO_TEST_URL||'http://127.0.0.1:8770/');
const output=fs.mkdtempSync(path.join(os.tmpdir(),'pupitro-library-'));
let context;
const observations={errors:[],posts:[],outside:[],consoleCounts:new Map()};
const launch=()=>launchObservedContext(browserType,path.join(output,'profile'),
  {headless:true,viewport:{width:428,height:926},isMobile:true,hasTouch:true},base,observations);
async function tinyScore(title,pitch){
  const {zipSync}=await import('../reader/assets/fflate.js');
  const xml=`<?xml version="1.0" encoding="UTF-8"?><museScore version="3.02"><programVersion>3.6.2</programVersion><Score><Division>480</Division><metaTag name="workTitle">${title}</metaTag><Part><Staff id="1"><StaffType group="pitched"><name>stdNormal</name></StaffType></Staff><trackName>Flûte</trackName><Instrument id="flute"><longName>Flûte</longName><shortName>Fl.</shortName><trackName>Flûte</trackName><Channel><program value="73"/></Channel></Instrument></Part><Staff id="1"><Measure><voice><TimeSig><sigN>4</sigN><sigD>4</sigD></TimeSig><Chord><durationType>whole</durationType><Note><pitch>${pitch}</pitch><tpc>14</tpc></Note></Chord></voice></Measure></Staff></Score></museScore>`;
  const encode=s=>new TextEncoder().encode(s);
  return {name:title+'.mscz',mimeType:'application/octet-stream',buffer:Buffer.from(zipSync({
    'META-INF/container.xml':encode('<container><rootfiles><rootfile full-path="score.mscx"/></rootfiles></container>'),
    'score.mscx':encode(xml),
  },{level:0}))};
}
async function records(page){
  return page.evaluate(async()=>{
    const api=await import('./library.js'),items=await api.listScores(),result=[];
    for(const item of items){
      const record=await api.getScore(item.id);
      result.push({id:item.id,title:item.title,filename:record.filename,
        source:Array.from(new Uint8Array(await record.source.arrayBuffer())),
        manifestTitle:record.manifest.title});
    }
    return result;
  });
}
(async()=>{
  context=await launch();
  let page=await context.newPage();await page.goto(base+'credits.html');
  const legacy=await page.evaluate(async()=>{
    const {preparePlayback}=await import('./playback.js');
    const raw=new Uint8Array([77,84,104,100,0,0,0,6,0,1,0,1,1,224,77,84,114,107,0,0,0,13,0,144,60,100,0xcb,0,128,60,0,0,255,47,0]);
    const {midi,secondsTick,...timing}=preparePlayback(raw);
    const {zipSync}=await import('./assets/fflate.js');
    const bytes=new TextEncoder().encode('<museScore version="3.02"><Score/></museScore>');
    const source=zipSync({'score.mscx':bytes},{level:0});
    const id=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',source)),x=>x.toString(16).padStart(2,'0')).join('');
    const manifest={title:'Étude initiale',...timing,pages:[{width:300,height:200}],measureCount:1,
      measureEvents:[{id:0,tick:0}],cursorEvents:[{page:0,x:.1,y:.2,width:.1,height:.1,tick:0}]};
    delete manifest.meterEvents;
    const record={id,title:manifest.title,filename:'etude.mscz',source:new File([source],'etude.mscz'),
      importedAt:1,manifest,midi:midi.buffer,pdf:new Blob(['%PDF-test'],{type:'application/pdf'}),
      pages:[new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><path d="M0 50h300" stroke="black"/></svg>'],{type:'image/svg+xml'})]};
    await new Promise((resolve,reject)=>{
      const request=indexedDB.open('pupitro',1);
      request.onupgradeneeded=()=>{request.result.createObjectStore('scores',{keyPath:'id'});request.result.createObjectStore('settings');};
      request.onerror=()=>reject(request.error);
      request.onsuccess=()=>{
        const db=request.result,tx=db.transaction(['scores','settings'],'readwrite');
        tx.objectStore('scores').put(record);tx.objectStore('settings').put(id,'last-score');
        tx.objectStore('settings').put({controls:{speed:'0.75'}},id);
        tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>reject(tx.error);
      };
    });
    return {id,source:Array.from(source)};
  });
  await page.goto(base);
  await expect(page.locator('#title')).toHaveText('Étude initiale');
  await expect(page.locator('#speed')).toHaveValue('0.75');
  await page.locator('#libraryButton').click();
  await page.getByRole('button',{name:'Renommer Étude initiale',exact:true}).click({timeout:5000});
  await page.getByLabel('Nom dans Pupitro',{exact:true}).fill('Mon étude renommée');
  await page.getByRole('button',{name:'Enregistrer le nom',exact:true}).click();
  await expect(page.locator('#title')).toHaveText('Mon étude renommée');
  const current=await records(page);
  assert.deepEqual(current,[{id:legacy.id,title:'Mon étude renommée',filename:'etude.mscz',source:legacy.source,manifestTitle:'Étude initiale'}]);
  await page.reload();await expect(page.locator('#title')).toHaveText('Mon étude renommée');
  await expect(page.locator('#speed')).toHaveValue('0.75');
  await page.locator('#libraryButton').click();
  await page.getByRole('button',{name:'Renommer Mon étude renommée',exact:true}).click();
  await page.getByLabel('Nom dans Pupitro',{exact:true}).fill('Nom abandonné');
  await page.getByRole('button',{name:'Annuler',exact:true}).click();
  await expect(page.locator('#title')).toHaveText('Mon étude renommée');
  await page.getByRole('button',{name:'Supprimer Mon étude renommée',exact:true}).click({timeout:5000});
  await expect(page.locator('#libraryActionDescription')).toContainText('Fichiers');
  await expect(page.getByLabel('Nom dans Pupitro',{exact:true})).toBeHidden();
  await page.getByRole('button',{name:'Annuler',exact:true}).click();
  assert.equal((await records(page)).length,1);
  // Fail at the actual storage boundary, after the first delete was enqueued.
  await page.evaluate(()=>{
    const original=IDBObjectStore.prototype.delete;
    window.restoreDelete=()=>{IDBObjectStore.prototype.delete=original;};
    IDBObjectStore.prototype.delete=function(key){
      const request=original.call(this,key);
      if(this.name==='settings'&&key!=='last-score')throw new DOMException('Suppression de test interrompue','AbortError');
      return request;
    };
  });
  await page.getByRole('button',{name:'Supprimer Mon étude renommée',exact:true}).click();
  await page.getByRole('button',{name:'Supprimer cette partition',exact:true}).click();
  await expect(page.locator('#libraryActionError')).toContainText('interrompue');
  assert.equal((await records(page)).length,1);
  const rollbackState=await page.evaluate(async id=>{
    const api=await import('./library.js');return [await api.getSettings(id),await api.getSettings('last-score')];
  },legacy.id);
  assert.equal(rollbackState[0].controls.speed,'0.75');assert.equal(rollbackState[1],legacy.id);
  await expect(page.locator('#title')).toHaveText('Mon étude renommée');
  await page.evaluate(()=>window.restoreDelete());
  await page.getByRole('button',{name:'Annuler',exact:true}).click();
  await page.locator('#closeLibrary').click();
  await page.locator('#metronome').check();
  await page.locator('#play').click();
  await expect(page.locator('#audioSignal')).toHaveClass(/active/,{timeout:15000});
  await page.locator('#libraryButton').click();
  await page.getByRole('button',{name:'Supprimer Mon étude renommée',exact:true}).click();
  await page.getByRole('button',{name:'Supprimer cette partition',exact:true}).click();
  await expect(page.locator('#play')).toBeDisabled();
  await expect(page.locator('.paper')).toHaveCount(0);
  await expect(page.locator('#pdfLink')).toBeHidden();
  await expect(page.locator('#exportSource')).toBeHidden();
  assert.equal(new URL(page.url()).searchParams.has('score'),false);
  assert.deepEqual(await records(page),[]);
  const removed=await page.evaluate(async id=>{
    const api=await import('./library.js');
    // A late preferences write must not resurrect a deleted partition's state.
    await api.saveSettings(id,{controls:{speed:'2'}});
    return [await api.getScore(id),await api.getSettings(id),await api.getSettings('last-score')];
  },legacy.id);
  assert.deepEqual(removed,[undefined,undefined,undefined]);
  await page.reload();await expect(page.locator('#play')).toBeDisabled();
  await expect(page.locator('#title')).toHaveText('Choisir une partition');
  await expect(page.locator('#offlineStatus')).toContainText('Application prête hors ligne',{timeout:90000});
  await context.setOffline(true);
  await page.locator('#libraryButton').click();
  const chooser=page.waitForEvent('filechooser');
  chooser.catch(()=>{});
  await page.getByRole('button',{name:'Ajouter des MSCZ',exact:true}).click({timeout:5000});
  const files=[await tinyScore('Exercice un',60),await tinyScore('Exercice deux',64)];
  await (await chooser).setFiles(files);
  await expect(page.locator('#status')).toContainText('2 partitions enregistrées',{timeout:90000});
  const imported=await records(page);
  assert.equal(imported.length,2);
  assert.deepEqual(imported.map(r=>r.title).sort(),['Exercice deux','Exercice un']);
  await page.locator('#libraryButton').click();
  await page.getByRole('button',{name:'Renommer Exercice un',exact:true}).click();
  await page.getByLabel('Nom dans Pupitro',{exact:true}).fill('Mes exercices');
  await page.getByRole('button',{name:'Enregistrer le nom',exact:true}).click();
  await page.locator('#closeLibrary').click();
  await page.locator('#scoreFile').setInputFiles(files[0]);
  await expect(page.locator('#duplicate')).toBeVisible({timeout:10000});
  await page.getByRole('button',{name:'Ouvrir la partition existante',exact:true}).click();
  await expect(page.locator('#title')).toHaveText('Mes exercices');
  assert.equal((await records(page)).length,2);
  await page.locator('#scoreFile').setInputFiles(files[0]);
  await expect(page.locator('#duplicate')).toBeVisible();
  await page.getByRole('button',{name:'Repréparer le MSCZ',exact:true}).click();
  await expect(page.locator('#status')).toContainText('repréparée',{timeout:90000});
  await expect(page.locator('#title')).toHaveText('Mes exercices');
  assert.equal((await records(page)).length,2);
  await page.locator('#scoreFile').setInputFiles(files[1]);
  await expect(page.locator('#duplicate')).toBeVisible();
  await page.getByRole('button',{name:'Annuler le lot',exact:true}).click();
  await expect(page.locator('#status')).toContainText('annulé');
  await expect(page.locator('#title')).toHaveText('Mes exercices');
  await page.locator('#speed').selectOption('1.25');
  await page.locator('#metronome').check();await page.locator('#loop').check();
  await expect.poll(()=>page.evaluate(async()=>{
    const api=await import('./library.js'),prefs=await api.getSettings(new URL(location.href).searchParams.get('score'));
    return prefs?.controls?.speed==='1.25'&&prefs.controls.metronome&&prefs.controls.loop;
  })).toBe(true);
  const beforeBackup=await records(page);
  const beforePreferences=await page.evaluate(async()=>{
    const api=await import('./library.js'),rows=await api.listScores();
    return Promise.all(rows.map(async r=>[r.id,await api.getSettings(r.id)]));
  });
  await page.locator('#libraryButton').click();
  const downloading=page.waitForEvent('download');downloading.catch(()=>{});
  await page.getByRole('button',{name:'Exporter la bibliothèque',exact:true}).click({timeout:5000});
  const download=await downloading,backupPath=path.join(output,'bibliotheque.pupitro');
  await download.saveAs(backupPath);
  assert.ok(fs.statSync(backupPath).size>files[0].buffer.length);
  // Decode the public format independently from the production encoder/inspector.
  const bytes=fs.readFileSync(backupPath),magic=Buffer.from('PUPITRO-LIBRARY\n1\n');
  assert.deepEqual(bytes.subarray(0,magic.length),magic);let offset=magic.length;
  const frame=()=>{const size=bytes.readUInt32BE(offset);offset+=4;if(!size)return null;const value=JSON.parse(bytes.subarray(offset,offset+size));offset+=size;return value;};
  const header=frame(),decoded=[];assert.equal(header.count,2);
  for(let n=0;n<header.count;n++){
    const entry=frame();const original=bytes.subarray(offset,offset+entry.sourceBytes);offset+=entry.sourceBytes;
    assert.equal(require('node:crypto').createHash('sha256').update(original).digest('hex'),entry.id);
    decoded.push({id:entry.id,title:entry.title,filename:entry.filename,source:Array.from(original),settings:entry.settings});
  }
  assert.equal(frame(),null);assert.equal(offset,bytes.length);
  assert.deepEqual(decoded.map(({settings,...row})=>row).sort((a,b)=>a.id.localeCompare(b.id)),
    beforeBackup.map(({manifestTitle,...row})=>row).sort((a,b)=>a.id.localeCompare(b.id)));
  assert.deepEqual(decoded.map(row=>[row.id,row.settings]).sort(),[...beforePreferences].sort());
  // Delay the actual catalog transaction completion after backup inspection.
  await page.evaluate(()=>{
    const original=IDBDatabase.prototype.transaction;let delayed=false;
    window.catalogWaiting=false;
    window.restoreTransaction=()=>{IDBDatabase.prototype.transaction=original;window.completeCatalog?.();};
    IDBDatabase.prototype.transaction=function(stores,mode,...args){
      const tx=original.call(this,stores,mode,...args);
      if(!delayed&&Array.isArray(stores)&&stores.length===1&&stores[0]==='catalog'&&mode==='readonly'){
        delayed=true;
        Object.defineProperty(tx,'oncomplete',{set(handle){tx.addEventListener('complete',event=>{
          window.catalogWaiting=true;window.completeCatalog=()=>{window.completeCatalog=null;handle(event);};
        },{once:true});}});
      }
      return tx;
    };
  });
  await page.locator('#backupFile').setInputFiles(backupPath);
  await expect.poll(()=>page.evaluate(()=>window.catalogWaiting)).toBe(true);
  await page.locator('#cancelLibraryOperation').click();
  await page.evaluate(()=>window.restoreTransaction());
  await expect(page.locator('#libraryStatus')).toContainText('Vérification annulée');
  await expect(page.locator('#restorePreview')).toBeHidden();
  assert.deepEqual(await records(page),beforeBackup);
  await page.getByRole('button',{name:'Renommer Mes exercices',exact:true}).click();
  await page.getByLabel('Nom dans Pupitro',{exact:true}).fill('Nom local prioritaire');
  await page.getByRole('button',{name:'Enregistrer le nom',exact:true}).click();
  await page.locator('#closeLibrary').click();await page.locator('#speed').selectOption('0.5');
  await expect.poll(()=>page.evaluate(async()=>{
    const api=await import('./library.js');return (await api.getSettings(new URL(location.href).searchParams.get('score')))?.controls?.speed;
  })).toBe('0.5');
  await page.locator('#libraryButton').click();
  await page.locator('#backupFile').setInputFiles(backupPath);
  await expect(page.locator('#restorePreview')).toBeVisible();
  await page.getByRole('button',{name:'Annuler la restauration',exact:true}).click();
  assert.ok((await records(page)).some(r=>r.title==='Nom local prioritaire'));
  await page.locator('#backupFile').setInputFiles(backupPath);
  await expect(page.locator('#restorePreview')).toBeVisible();
  await page.getByRole('button',{name:'Restaurer les partitions absentes',exact:true}).click();
  await expect(page.locator('#status')).toContainText('2 déjà présentes',{timeout:10000});
  assert.ok((await records(page)).some(r=>r.title==='Nom local prioritaire'));
  await page.locator('#libraryButton').click();
  await expect(page.locator('#speed')).toHaveValue('0.5');
  assert.equal(await page.evaluate(async()=>{
    const api=await import('./library.js');return (await api.getSettings(new URL(location.href).searchParams.get('score'))).controls.speed;
  }),'0.5');
  for(const row of await records(page)){
    await page.getByRole('button',{name:'Supprimer '+row.title,exact:true}).click();
    await page.getByRole('button',{name:'Supprimer cette partition',exact:true}).click();
    await expect(page.locator('#libraryAction')).toBeHidden();
  }
  assert.deepEqual(await records(page),[]);
  await page.locator('#backupFile').setInputFiles(backupPath);
  await expect(page.locator('#restorePreview')).toBeVisible();
  await page.getByRole('button',{name:'Restaurer les partitions absentes',exact:true}).click();
  await expect(page.locator('#status')).toContainText('2 restaurées',{timeout:90000});
  assert.deepEqual(await records(page),beforeBackup);
  const restoredPreferences=await page.evaluate(async()=>{
    const api=await import('./library.js'),rows=await api.listScores();
    return Promise.all(rows.map(async r=>[r.id,await api.getSettings(r.id)]));
  });
  assert.deepEqual(restoredPreferences,beforePreferences);
  await page.reload();
  await expect(page.locator('#title')).toHaveText('Mes exercices');
  assert.deepEqual(await records(page),beforeBackup);
  await expect(page.locator('#speed')).toHaveValue('1.25');
  await page.locator('#play').click();
  await expect(page.locator('#audioSignal')).toHaveClass(/active/,{timeout:15000});
  await page.locator('#play').click();
  const preserved=await records(page);
  await page.evaluate(()=>{
    const original=IDBObjectStore.prototype.put;
    window.restorePut=()=>{IDBObjectStore.prototype.put=original;};
    IDBObjectStore.prototype.put=function(...args){
      if(this.name==='catalog')throw new DOMException('Stockage de test plein','QuotaExceededError');
      return original.apply(this,args);
    };
  });
  await page.locator('#scoreFile').setInputFiles(await tinyScore('Exercice trois',67));
  await expect(page.locator('#status')).toContainText('Stockage insuffisant',{timeout:15000});
  await page.evaluate(()=>window.restorePut());
  assert.deepEqual(await records(page),preserved);
  await expect(page.locator('#title')).toHaveText('Mes exercices');
  await page.locator('#libraryButton').click();
  await page.locator('#backupFile').setInputFiles({name:'incomplete.pupitro',mimeType:'application/octet-stream',buffer:fs.readFileSync(backupPath).subarray(0,-1)});
  await expect(page.locator('#libraryStatus')).toContainText('invalide');
  assert.deepEqual(await records(page),preserved);
  // A third source exists only in the backup; restore must remain additive.
  const third=await tinyScore('Exercice trois',67);
  const extra=await page.evaluate(async bytes=>{
    const api=await import('./library.js'),{encodeBackup}=await import('./backup.js');
    const data=new Uint8Array(bytes),id=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),x=>x.toString(16).padStart(2,'0')).join('');
    const snapshot=await api.snapshotLibrary();
    snapshot.records.push({id,title:'Troisième restaurée',filename:'Exercice trois.mscz',source:new File([data],'Exercice trois.mscz'),importedAt:3,settings:{controls:{speed:'0.5'}}});
    return {id,bytes:Array.from(new Uint8Array(await encodeBackup(snapshot).arrayBuffer()))};
  },Array.from(third.buffer));
  const extraFile={name:'trois.pupitro',mimeType:'application/octet-stream',buffer:Buffer.from(extra.bytes)};
  await page.locator('#backupFile').setInputFiles(extraFile);
  await expect(page.locator('#restorePreview')).toBeVisible();
  await page.evaluate(id=>{
    const original=IDBObjectStore.prototype.put;
    window.restorePut=()=>{IDBObjectStore.prototype.put=original;};
    IDBObjectStore.prototype.put=function(value,key){
      if(this.name==='settings'&&key===id)throw new DOMException('Stockage de test plein','QuotaExceededError');
      return original.call(this,value,key);
    };
  },extra.id);
  await page.getByRole('button',{name:'Restaurer les partitions absentes',exact:true}).click();
  await expect(page.locator('#status')).toContainText('Stockage insuffisant',{timeout:15000});
  await page.evaluate(()=>window.restorePut());
  assert.deepEqual(await records(page),preserved);
  await page.locator('#libraryButton').click();
  await page.locator('#backupFile').setInputFiles(extraFile);
  await expect(page.locator('#restorePreview')).toBeVisible();
  await page.evaluate(()=>{
    const original=crypto.subtle.digest;let delayed=false;
    window.digestWaiting=false;
    window.restoreDigest=()=>{crypto.subtle.digest=original;window.completeDigest?.();};
    crypto.subtle.digest=function(...args){
      if(delayed)return original.apply(this,args);delayed=true;
      window.digestWaiting=true;
      return new Promise((resolve,reject)=>{window.completeDigest=()=>{window.completeDigest=null;original.apply(this,args).then(resolve,reject);};});
    };
  });
  await page.getByRole('button',{name:'Restaurer les partitions absentes',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.digestWaiting)).toBe(true);
  await page.locator('#cancelImport').click();await page.evaluate(()=>window.completeDigest());
  await expect(page.locator('#status')).toContainText('Restauration annulée');
  await page.evaluate(()=>window.restoreDigest());
  assert.deepEqual(await records(page),preserved);
  // Complete the same mixed restore: absent source added, local sources/settings kept.
  await page.locator('#libraryButton').click();await page.locator('#backupFile').setInputFiles(extraFile);
  await expect(page.locator('#restorePreview')).toBeVisible();
  await page.getByRole('button',{name:'Restaurer les partitions absentes',exact:true}).click();
  await expect(page.locator('#status')).toContainText('1 restaurées, 2 déjà présentes',{timeout:90000});
  const mixed=await records(page);
  assert.deepEqual(mixed.filter(row=>row.id!==extra.id),preserved);
  assert.deepEqual(mixed.find(row=>row.id===extra.id).source,Array.from(third.buffer));
  assert.equal(await page.evaluate(async id=>{
    const api=await import('./library.js');return (await api.getSettings(id)).controls.speed;
  },extra.id),'0.5');
  const large=await page.evaluate(async()=>{
    const api=await import('./library.js'),rows=await api.listScores(),record=await api.getScore(rows[0].id);
    const source=new Uint8Array(await record.source.arrayBuffer());
    for(let n=4;n<=75;n++){
      const comment=new TextEncoder().encode('library capacity '+n),bytes=new Uint8Array(source.length+comment.length);
      bytes.set(source);bytes.set(comment,source.length);new DataView(bytes.buffer).setUint16(source.length-2,comment.length,true);
      const id=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
      await api.saveScore({...record,id,title:'Étude '+n,filename:'etude-'+n+'.mscz',source:new File([bytes],'etude-'+n+'.mscz'),importedAt:Date.now()+n});
    }
    const reads=[],original={};
    for(const prototype of [IDBObjectStore.prototype,IDBIndex.prototype]){
      for(const name of ['get','getAll','getKey','getAllKeys','count','openCursor','openKeyCursor']){
        const method=prototype[name];if(typeof method!=='function')continue;
        original[Object.keys(original).length]=()=>{prototype[name]=method;};
        prototype[name]=function(...args){if((this.objectStore?.name||this.name)==='scores')reads.push(name);return method.apply(this,args);};
      }
    }
    window.rawScoreReads=reads;window.restoreReads=()=>{for(const restore of Object.values(original))restore();};
    return {count:(await api.listScores()).length,rawScoreReads:reads};
  });
  assert.deepEqual(large,{count:75,rawScoreReads:[]});
  await page.locator('#libraryButton').click();
  await expect(page.locator('#libraryItems [data-action="open"]')).toHaveCount(75);
  assert.deepEqual(await page.evaluate(()=>window.rawScoreReads),[]);
  await page.evaluate(()=>window.restoreReads());
  assert.ok(await page.locator('#library').evaluate(el=>el.scrollWidth<=el.clientWidth));
  await page.screenshot({path:path.join(output,'library-mobile.png')});
  await page.setViewportSize({width:1440,height:1000});
  const openButton=page.locator('#libraryItems [data-action="open"]').first();
  assert.ok(await openButton.evaluate(el=>el.clientWidth>150),'Desktop score names need readable width');
  await page.screenshot({path:path.join(output,'library-desktop.png')});
  await context.close();context=await launch();await context.setOffline(true);
  page=await context.newPage();await page.goto(base);
  await expect(page.locator('#title')).toHaveText('Mes exercices');
  await expect(page.locator('#speed')).toHaveValue('1.25');
  await page.locator('#libraryButton').click();
  await expect(page.locator('#libraryItems [data-action="open"]')).toHaveCount(75);
  assertObservations(observations);
  console.log(JSON.stringify({legacyMigration:true,rename:true,sourcePreserved:true,cancel:true,deleteActive:true,deleteRollback:true,lateSettingsIgnored:true,multiImportOffline:true,duplicateChoices:true,backupRoundTripOffline:true,restoreKeepsExisting:true,settingsRestored:true,quotaRollback:true,restoreQuotaRollback:true,restoreCancelled:true,lateInspectionCancelled:true,invalidBackupPreservesLibrary:true,catalogRecords:large.count,rawScoreReadsForListing:large.rawScoreReads.length,restartOffline:true,errors:observations.errors,posts:observations.posts.length,externalRequests:observations.outside.length,output}));
})().catch(async e=>{console.error(e);const page=context?.pages().at(-1);await restoreTestPatches(page).catch(()=>{});if(page)await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});console.error('Artifacts:',output);process.exitCode=1;}).finally(async()=>{await closeObservedContext(context,path.join(output,'profile'));}).catch(error=>{console.error('Cleanup failed:',error);process.exitCode=1;});
