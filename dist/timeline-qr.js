/* Local QR rendering for the exact, already-created comparison snapshot. */
(function(root){
 'use strict';
 const TimelineQR={
  create(value,encoder=root.qrcodegen){
   const url=new URL(value);if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw Error('Ongeldige deellink');
   if(!encoder?.QrCode)throw Error('QR-generator niet beschikbaar');
   const qr=encoder.QrCode.encodeText(value,encoder.QrCode.Ecc.MEDIUM),border=4,total=qr.size+border*2,modules=Array.from({length:qr.size},(_,y)=>Array.from({length:qr.size},(_,x)=>qr.getModule(x,y)));
   const path=[];
   for(let y=0;y<qr.size;y++)for(let x=0;x<qr.size;x++)if(modules[y][x])path.push(`M${x+border},${y+border}h1v1h-1z`);
   const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${total*8}" height="${total*8}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges"><title>QR-code voor de gedeelde ReligieAtlas-vergelijking</title><rect width="${total}" height="${total}" fill="#fff"/><path d="${path.join(' ')}" fill="#000"/></svg>`;
   return {url:value,size:qr.size,border,total,modules,svg,svgUrl:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)};
  },
  png(code,document=root.document){
   const scale=Math.max(6,Math.ceil(768/code.total)),pixels=code.total*scale,canvas=document.createElement('canvas');canvas.width=pixels;canvas.height=pixels;
   const context=canvas.getContext('2d');if(!context)throw Error('PNG niet beschikbaar');
   context.fillStyle='#fff';context.fillRect(0,0,pixels,pixels);context.fillStyle='#000';
   for(let y=0;y<code.size;y++)for(let x=0;x<code.size;x++)if(code.modules[y][x])context.fillRect((x+code.border)*scale,(y+code.border)*scale,scale,scale);
   return canvas.toDataURL('image/png');
  }
 };
 root.TimelineQR=TimelineQR;if(typeof module!=='undefined'&&module.exports)module.exports=TimelineQR;
})(typeof window!=='undefined'?window:globalThis);
