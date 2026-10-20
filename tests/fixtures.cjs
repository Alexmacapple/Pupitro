async function tinyScore(title,pitch=60){
  const {zipSync}=await import('../reader/assets/fflate.js');
  const encode=s=>new TextEncoder().encode(s);
  const xml=`<museScore version="3.02"><programVersion>3.6.2</programVersion><Score><Division>480</Division><metaTag name="workTitle">${title}</metaTag><Part><Staff id="1"><StaffType group="pitched"><name>stdNormal</name></StaffType></Staff><trackName>Flûte</trackName><Instrument id="flute"><Channel><program value="73"/></Channel></Instrument></Part><Staff id="1"><Measure><voice><TimeSig><sigN>4</sigN><sigD>4</sigD></TimeSig><Chord><durationType>whole</durationType><Note><pitch>${pitch}</pitch><tpc>14</tpc></Note></Chord></voice></Measure></Staff></Score></museScore>`;
  return {name:(title.trim()||'Sans titre')+'.mscz',mimeType:'application/octet-stream',buffer:Buffer.from(zipSync({
    'META-INF/container.xml':encode('<container><rootfiles><rootfile full-path="score.mscx"/></rootfiles></container>'),
    'score.mscx':encode(xml),
  },{level:0}))};
}
module.exports={tinyScore};
