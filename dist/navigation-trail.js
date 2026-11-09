/* An in-memory exploration trail. Only compact UI snapshots are retained. */
(function(root){
 'use strict';
 const rows=[['Places','Plaatsen','Lieux'],['Reflection challenge','Reflectie','Réflexion'],['Compare timelines','Tijdslijnen vergelijken','Comparer les chronologies'],['← Back to {place}','← Terug naar {place}','← Retour à {place}'],['Search results','zoekresultaten','résultats de recherche'],['Person profile','persoonsprofiel','profil'],['Reading','de lezer','la lecture'],['People index','Personenindex','Index des personnes'],['Places map','Plaatsen','Lieux'],['Cities explorer','Plaatsen','Lieux'],['Relationship map','Familiekaart','Carte familiale']];
 root.BibleI18n?.registerRows(rows);
 class AtlasNavigationTrail{
  constructor({capture,restore,onChange=()=>{},limit=40}){Object.assign(this,{capture,restore,onChange,limit});this.entries=[];this.restoring=false;this.generation=0;this.blocked=false;}
  record(){
   if(this.restoring||this.blocked)return false;
   const snapshot=this.capture();if(!snapshot)return false;
   this.generation++;
   this.entries.push(snapshot);if(this.entries.length>this.limit)this.entries.shift();
   this.blocked=true;Promise.resolve().then(()=>{this.blocked=false;});this.onChange();return true;
  }
  peek(){return this.entries.at(-1)||null;}
  clear(){this.generation++;this.entries=[];this.restoring=false;this.onChange();}
  async back(){
   if(this.restoring||!this.entries.length)return false;
   const snapshot=this.entries.pop(),generation=++this.generation;this.restoring=true;this.onChange();
   try{await this.restore(snapshot,()=>generation===this.generation);return generation===this.generation;}
   catch(error){if(generation===this.generation)this.entries.push(snapshot);throw error;}
   finally{if(generation===this.generation){this.restoring=false;this.onChange();}}
  }
 }
 root.AtlasNavigationTrail=AtlasNavigationTrail;
 if(typeof module!=='undefined')module.exports={AtlasNavigationTrail};
})(typeof window!=='undefined'?window:globalThis);
