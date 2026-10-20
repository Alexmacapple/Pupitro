// Real browser XML APIs, exercising the production migration boundary.
module.exports=async function verifyLegacy(page){
  return page.evaluate(async()=>{
    const api=await import('./import-score.js');
    const normalize=api.normalizeLegacyScore||api.normalizeLegacyHarmony;
    const bytes=xml=>new TextEncoder().encode(xml);
    const parse=buffer=>new DOMParser().parseFromString(new TextDecoder().decode(buffer),'application/xml');
    const strings=dots=>dots.map((fret,no)=>`<string no="${no}"><dot>${fret}</dot></string>`).join('');
    const current=dots=>dots.map((fret,no)=>`<string no="${no}"><dot fret="${fret}">normal</dot></string>`).join('');
    const original=(fret,dots)=>`<museScore version="2.06"><Score><FretDiagram><strings>4</strings>${strings(dots)}<barre>${fret}</barre></FretDiagram><Harmony/></Score></museScore>`;
    const migrated=dots=>`<museScore version="3.02"><Score><FretDiagram><fretDiagram>${current(dots)}<barre start="0" end="-1">3</barre></fretDiagram>${strings(dots)}<barre>1</barre></FretDiagram><Harmony/></Score></museScore>`;
    function check(value,message){if(!value)throw new Error(message);}
    for(const [fret,dots,start]of [[1,[3,2,1,1],2],[2,[3,2,1,2],1],[4,[3,2,1,1],undefined]]){
      const source=original(fret,dots),result=parse(normalize(bytes(migrated(dots)),bytes(source)));
      const barre=result.querySelector('FretDiagram > fretDiagram > barre');
      check(start===undefined?!barre:barre?.textContent===String(fret)&&barre.getAttribute('start')===String(start),'Legacy barre moved to the wrong fret or strings');
      check(!result.querySelector('FretDiagram > string, FretDiagram > barre'),'Superseded legacy diagram data retained');
      check(result.querySelector('Harmony > play')?.textContent==='0','Legacy harmony playback changed');
    }
    let rejected=false;
    try{normalize(bytes(migrated([4,2,1,1])),bytes(original(1,[3,2,1,1])));}catch{rejected=true;}
    check(rejected,'Mismatched diagram identities silently aligned');
    const {zipSync,unzipSync}=await import('./assets/fflate.js');
    const picture=new Uint8Array([137,80,78,71,1,2,3]);
    const files={'META-INF/container.xml':bytes('<container><rootfiles><rootfile full-path="ma partition.mscx"/></rootfiles></container>'),
      'ma partition.mscx':bytes(original(1,[3,2,1,1])),'Pictures/rhythm.png':picture};
    const archive=await api.normalizeLegacyArchive(bytes(migrated([3,2,1,1])),zipSync(files).buffer);
    api.validateArchive(archive);
    const reopened=unzipSync(new Uint8Array(archive));
    check(JSON.stringify([...reopened['Pictures/rhythm.png']])===JSON.stringify([...picture]),'Embedded image lost during migration');
    check(parse(reopened['ma partition.mscx']).querySelector('fretDiagram > barre')?.textContent==='1','Wrong root score migrated');
    return {barreFret1:true,barreFret2:true,absentBarre:true,identityMismatchRejected:true,imagesPreserved:true};
  });
};
