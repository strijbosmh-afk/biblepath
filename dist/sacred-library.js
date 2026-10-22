/* Edition-aware Tanakh and Qur'an reading. No DOM or network access. */
(() => {
  'use strict';
  const fold=value=>String(value??'').normalize('NFD').replace(/\p{M}/gu,'').replace(/ٱ/g,'ا').replace(/ـ/g,'').toLocaleLowerCase().replace(/[’']/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  class SacredLibrary {
    constructor(tradition,data){
      if(!['judaism','islam'].includes(tradition))throw new Error('Unknown tradition');
      this.tradition=tradition;this.data=data;this.editions=data.editions;this.cache=new Map();
      if(!Object.keys(this.editions||{}).length)throw new Error('Missing editions');
    }
    edition(id){const edition=this.editions[id];return edition?.meta||edition;}
    defaultEdition(locale){return this.editions[locale]?locale:this.editions.en?'en':Object.keys(this.editions)[0];}
    units(locale='nl'){
      if(this.tradition==='islam')return this.data.surahs.map(s=>({id:String(s.number),name:`${s.number}. ${s.transliteration||s.name}`,nativeName:s.name,group:'surahs',aliases:[s.transliteration,s.name,...Object.values(s.translations||{})].filter(Boolean)}));
      return this.data.books.map(b=>({id:b.id,name:b.names?.[locale]||b.name||b.id,nativeName:b.names?.he,group:b.group,canonicalBook:b.canonicalBook,aliases:[b.name,...Object.values(b.names||{}),...(b.aliases||[]),...(b.id==='PSA'?['Psalm','Psaume','Tehillim']:[]),...(b.id==='GEN'?['Bereshit','Bereishit']:[])].filter(Boolean)}));
    }
    chapters(edition,id){
      if(!this.editions[edition])return [];
      if(this.tradition==='islam')return this.data.surahs.some(s=>String(s.number)===id)?[1]:[];
      return (this.editions[edition]?.books.find(b=>b.id===id)?.chapters||[]).map(c=>c.number);
    }
    verses(edition,id,chapter=1){
      if(!this.editions[edition]||(this.tradition==='islam'&&Number(chapter)!==1))return [];
      if(this.tradition==='islam')return (this.data.surahs.find(s=>String(s.number)===id)?.ayahs||[]).map(v=>({number:v.number,text:edition==='ar'?v.arabic:v.translations[edition],original:edition==='ar'?null:v.arabic,notes:v.notes?.[edition]||[]}));
      return this.editions[edition]?.books.find(b=>b.id===id)?.chapters.find(c=>c.number===Number(chapter))?.verses||[];
    }
    headings(edition,id,chapter){return this.tradition==='judaism'?this.editions[edition]?.books.find(b=>b.id===id)?.chapters.find(c=>c.number===Number(chapter))?.headings||[]:[];}
    reference(value,edition,locale='nl'){
      const input=String(value).trim();let unit,chapter,verse,endVerse;
      if(this.tradition==='islam'){
        const match=input.match(/^(?:Qur[’']?an\s+|Koran\s+|Coran\s+)?(\d+)\s*:\s*(\d+)(?:\s*[-–]\s*(\d+))?$/i);
        if(!match)return null;
        unit=String(Number(match[1]));chapter=1;verse=Number(match[2]);endVerse=Number(match[3]||verse);
      }else{
        const match=input.match(/^(.*?)\s+(\d+)(?:\s*:\s*(\d+)(?:\s*[-–]\s*(\d+))?)?$/);
        if(!match)return null;
        const key=fold(match[1]);const found=this.units(locale).find(u=>[u.id,u.name,...u.aliases].some(n=>fold(n)===key));
        if(!found)return null;
        unit=found.id;chapter=Number(match[2]);verse=Number(match[3]||1);endVerse=Number(match[4]||verse);
      }
      const verses=this.verses(edition,unit,chapter);
      return endVerse>=verse&&verses.some(v=>v.number===verse)&&verses.some(v=>v.number===endVerse)?{unit,chapter,verse,endVerse}:null;
    }
    location(edition,state={}){
      if(!state||typeof state!=='object')state={};
      const units=this.units();const unit=units.some(u=>u.id===state.unit)?state.unit:units[0].id;
      const chapters=this.chapters(edition,unit);const chapter=chapters.includes(Number(state.chapter))?Number(state.chapter):chapters[0];
      const verses=this.verses(edition,unit,chapter),verse=verses.some(v=>v.number===Number(state.verse))?Number(state.verse):null;
      const location={unit,chapter,verse};
      if(verse&&Number(state.endVerse)>verse&&verses.some(v=>v.number===Number(state.endVerse)))location.endVerse=Number(state.endVerse);
      return location;
    }
    move(edition,location,delta){
      if(!this.editions[edition]||![-1,1].includes(delta))return null;
      const units=this.units(),i=units.findIndex(u=>u.id===location.unit),chapters=this.chapters(edition,location.unit),c=chapters.indexOf(location.chapter)+delta;
      if(c>=0&&c<chapters.length)return {unit:location.unit,chapter:chapters[c],verse:null};
      const next=units[i+delta];if(!next)return null;
      const target=this.chapters(edition,next.id);return {unit:next.id,chapter:delta>0?target[0]:target.at(-1),verse:null};
    }
    search(query,edition,{unit=null,offset=0,limit=40}={}){
      const needle=fold(query);if(!needle||!this.editions[edition])return {total:0,results:[]};
      if(!this.cache.has(edition)){
        const rows=[];
        for(const u of this.units())for(const chapter of this.chapters(edition,u.id))for(const verse of this.verses(edition,u.id,chapter))rows.push({unit:u.id,chapter,verse:verse.number,text:verse.text,key:fold(verse.text)});
        this.cache.set(edition,rows);
      }
      const all=this.cache.get(edition).filter(v=>(!unit||v.unit===unit)&&v.key.includes(needle));
      return {total:all.length,results:all.slice(Math.max(0,offset),Math.max(0,offset)+limit).map(({key,...v})=>v)};
    }
  }
  window.SacredLibrary=SacredLibrary;
})();
