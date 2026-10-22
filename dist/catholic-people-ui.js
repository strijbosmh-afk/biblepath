(function(root){
  'use strict';
  const local=(value,lang)=>typeof value==='string'?value:value?.[lang]??value?.en??'';
  const fold=value=>String(value??'').normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase();
  class CatholicPeople {
    constructor(data,base){
      this.data=data;this.base=base;this.byId=new Map();
      const ids=new Set(base.map(person=>person.id));
      for(const profile of data.people){
        const id=profile.bibleId||profile.id;
        if(profile.bibleId&&!ids.has(profile.bibleId))throw new Error('Unknown existing Bible identity');
        if(this.byId.has(id)||(!profile.bibleId&&ids.has(id)))throw new Error('Duplicate Catholic identity');
        this.byId.set(id,profile);
      }
    }
    supplemental(person,lang){
      return {id:person.bibleId||person.id,name:local(person.names,lang),aliases:[...new Set([...Object.values(person.names),...(person.aliases||[])])],description:local(person.summary,lang),disambiguation:local(person.disambiguation,lang)||local(person.roles,lang).join(' · '),gender:person.gender||'unknown',testament:'OT',era:local(person.roles,lang).join(' · '),refs:person.refs};
    }
    entries(lang){
      const rows=this.base.map(person=>{const extra=this.byId.get(person.id);if(!extra)return person;const localized=this.supplemental(extra,lang);return {...person,aliases:[...(person.aliases||[]),...localized.aliases],catholicDescription:localized.description,refs:[...person.refs,...extra.refs]};});
      for(const profile of this.byId.values())if(!profile.bibleId)rows.push(this.supplemental(profile,lang));
      return rows;
    }
    search(query,lang,testament='all'){
      const terms=fold(query).trim().split(/\s+/).filter(Boolean);
      return this.entries(lang).filter(person=>(testament==='all'||person.testament===testament)&&terms.every(term=>fold([person.name,...(person.aliases||[]),person.description,person.catholicDescription,person.disambiguation,...person.refs.map(ref=>root.BibleI18n?.reference?.(ref.label)||ref.label)].join(' ')).includes(term)))
        .sort((a,b)=>(fold(a.name)===fold(query)?0:1)-(fold(b.name)===fold(query)?0:1)||a.name.localeCompare(b.name,lang)||a.id.localeCompare(b.id));
    }
    readerPeople(lang){return {people:this.entries(lang)};}
  }
  root.CatholicPeople=CatholicPeople;
  if(typeof module!=='undefined')module.exports={CatholicPeople};
})(typeof window!=='undefined'?window:globalThis);
