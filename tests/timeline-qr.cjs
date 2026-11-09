'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),crypto=require('node:crypto'),zlib=require('node:zlib'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),vendor=fs.readFileSync(path.join(root,'dist/vendor/qrcodegen/qrcodegen.js'));
assert.equal(crypto.createHash('sha256').update(vendor.toString().replace(/\r\n/g,'\n')).digest('hex'),'6a1116192ed1dd67fa1bf31e77f5817103d71c23bbac24c382e698b7668bdd01');
const context={};vm.runInNewContext(vendor.toString(),context);const QR=require('../dist/timeline-qr.js'),{TimelineShare,AtlasExplore}=require('../dist/explore-features.js');
const state={start:1452,end:1552,linkReligions:['judaism','islam'],linkType:'shared-context',kind:'all',showConnections:true,connection:'iberia-1492',selected:'judaism:spain-expulsion',filter:'1492'};
const urls=[TimelineShare.encode(state,'https://www.religieatlas.com/'),TimelineShare.encode({...state,start:-600,end:-500,filter:'Vrede & éénheid / دراسة'},'https://www.religieatlas.com/'),TimelineShare.encode({...state,filter:'漢'.repeat(160)},'https://www.religieatlas.com/')];
// A minimal test canvas writes actual grayscale PNG pixels; ZXing independently reads the result.
function crc(buffer){let n=0xffffffff;for(const b of buffer){n^=b;for(let k=0;k<8;k++)n=(n>>>1)^((n&1)?0xedb88320:0);}return (n^0xffffffff)>>>0;}
function chunk(name,bytes){const type=Buffer.from(name),length=Buffer.alloc(4),checksum=Buffer.alloc(4);length.writeUInt32BE(bytes.length);checksum.writeUInt32BE(crc(Buffer.concat([type,bytes])));return Buffer.concat([length,type,bytes,checksum]);}
function canvas(){const c={width:0,height:0};let pixels;
 c.getContext=()=>{pixels=Buffer.alloc(c.width*c.height,255);return {fillStyle:'#fff',fillRect(x,y,w,h){const value=this.fillStyle==='#000'?0:255;for(let row=y;row<y+h;row++)pixels.fill(value,row*c.width+x,row*c.width+x+w);}};};
 c.toDataURL=type=>{assert.equal(type,'image/png');const header=Buffer.alloc(13);header.writeUInt32BE(c.width,0);header.writeUInt32BE(c.height,4);header[8]=8;const rows=Buffer.alloc((c.width+1)*c.height);for(let y=0;y<c.height;y++)pixels.copy(rows,y*(c.width+1)+1,y*c.width,(y+1)*c.width);return 'data:image/png;base64,'+Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]).toString('base64');};return c;
}
const document={createElement:tag=>{assert.equal(tag,'canvas');return canvas();}},dir=fs.mkdtempSync(path.join(os.tmpdir(),'religieatlas-qr-')),manifest=[];
for(const [i,url] of urls.entries()){
 const code=QR.create(url,context.qrcodegen);assert.equal(code.url,url);assert.equal(code.border,4);assert.equal(code.total,code.size+8);assert(code.modules.every(row=>row.length===code.size));assert(!code.svg.includes('<script')&&!code.svg.includes('<image'));assert.equal(decodeURIComponent(code.svgUrl.split(',').slice(1).join(',')),code.svg);
 const svg=path.join(dir,`${i}.svg`),png=path.join(dir,`${i}.png`);fs.writeFileSync(svg,code.svg);const data=QR.png(code,document);assert(data.startsWith('data:image/png;base64,'));fs.writeFileSync(png,Buffer.from(data.split(',')[1],'base64'));
 manifest.push({path:svg,url,preview:i<2},{path:png,url,preview:i<2});
}
assert.throws(()=>QR.create('javascript:alert(1)',context.qrcodegen));assert.throws(()=>QR.create('https://user:password@example.org',context.qrcodegen));assert.throws(()=>QR.create(urls[0],null));assert.throws(()=>QR.png(QR.create(urls[0],context.qrcodegen),{createElement:()=>({getContext:()=>null})}));
const manifestPath=path.join(dir,'manifest.json');fs.writeFileSync(manifestPath,JSON.stringify(manifest));
const bundled=path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'),python=process.env.PYTHON||(fs.existsSync(bundled)?bundled:process.platform==='win32'?'python':'python3');
const decoded=spawnSync(python,[path.join(root,'scripts/verify-timeline-qr.py'),manifestPath],{encoding:'utf8'});assert.equal(decoded.status,0,decoded.stderr||decoded.stdout);process.stdout.write(decoded.stdout);
// Preview and both downloads are replaced together for a new snapshot; failures never leave stale QR links.
const descriptor=Object.getOwnPropertyDescriptor(globalThis,'TimelineQR'),nodes=new Map();
const view=Object.create(AtlasExplore.prototype);view.el={querySelector(s){if(!nodes.has(s))nodes.set(s,{hidden:false,src:'',href:'',textContent:'',removeAttribute(name){this[name]=''}});return nodes.get(s)}};
globalThis.TimelineQR={create:url=>QR.create(url,context.qrcodegen),png:code=>QR.png(code,document)};
view.renderShareQR(urls[0]);const first=nodes.get('#timeline-qr-png').href;assert(!nodes.get('#timeline-qr').hidden);assert(nodes.get('#timeline-qr-image').src===nodes.get('#timeline-qr-svg').href);
view.renderShareQR(urls[1]);assert.notEqual(nodes.get('#timeline-qr-png').href,first);
globalThis.TimelineQR.png=()=>{throw Error('No canvas')};view.renderShareQR(urls[0]);assert(nodes.get('#timeline-qr-png').hidden);assert(!nodes.get('#timeline-qr').hidden);assert(nodes.get('#timeline-qr-status').textContent.includes('SVG'));
globalThis.TimelineQR.create=()=>{throw Error('Unavailable')};view.renderShareQR(urls[0]);assert(nodes.get('#timeline-qr').hidden);assert.equal(nodes.get('#timeline-qr-png').href,'');assert.equal(nodes.get('#timeline-qr-svg').href,'');assert(nodes.get('#timeline-qr-status').textContent.includes('kopiëren'));
if(descriptor)Object.defineProperty(globalThis,'TimelineQR',descriptor);else delete globalThis.TimelineQR;
console.log('Timeline QR passed: pinned local encoder, exact URLs decoded independently from SVG/PNG and256px previews, BCE/Unicode/long snapshots, quiet zones, high resolution, synchronized refresh and safe generation/PNG fallback.');
