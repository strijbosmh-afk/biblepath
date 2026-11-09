'use strict';
const assert=require('node:assert/strict'),{AtlasNavigationTrail}=require('../dist/navigation-trail.js');
async function main(){
 let current={view:'search',query:'Abraham',religions:['judaism','islam'],page:3,scroll:810},restoreCalls=[],changed=0;
 const trail=new AtlasNavigationTrail({limit:3,capture:()=>structuredClone(current),restore:async(saved,isCurrent)=>{restoreCalls.push(saved);assert(isCurrent());current=saved;},onChange:()=>changed++});
 assert.equal(await trail.back(),false);assert(trail.record());assert.equal(trail.record(),false,'Nested helpers in the same click capture one origin');await Promise.resolve();
 current={view:'profile',tradition:'judaism',id:'torah:abraham',tab:'texts',top:290};trail.record();await Promise.resolve();
 current={view:'reader',edition:'he',book:'GEN',chapter:17,verse:1,endVerse:8};assert(await trail.back());assert.equal(current.view,'profile');assert.equal(current.tab,'texts');assert.equal(current.top,290);
 assert(await trail.back());assert.deepEqual(current,{view:'search',query:'Abraham',religions:['judaism','islam'],page:3,scroll:810});assert.equal(trail.peek(),null);
 for(let i=0;i<6;i++){current={view:'timeline',camera:i};trail.record();await Promise.resolve();}assert.equal(trail.entries.length,3,'Long exploration sessions have bounded history');assert.equal(trail.peek().camera,5);
 trail.restore=async()=>{throw Error('connection');};await assert.rejects(trail.back(),/connection/);assert.equal(trail.entries.length,3,'A failed return remains retryable');assert.equal(trail.restoring,false);
 let resolve,valid;trail.restore=async(_,isCurrent)=>{await new Promise(r=>resolve=r);valid=isCurrent();};const returning=trail.back();trail.clear();resolve();assert.equal(await returning,false);assert.equal(valid,false,'A main-menu action cancels a late restoration');assert.equal(trail.entries.length,0);
 trail.restore=async(_,isCurrent)=>{valid=isCurrent;};await Promise.resolve();trail.record();await Promise.resolve();await trail.back();assert(valid());trail.record();assert.equal(valid(),false,'New exploration invalidates delayed scroll restoration');assert(changed>10);
 console.log('Navigation trail passed: one capture per click, multi-step return, independent religious identities, saved filters/paging/scroll/profile tabs, bounded memory, retry and canceled late restoration.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
