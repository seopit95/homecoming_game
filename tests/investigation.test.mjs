import test from 'node:test';
import assert from 'node:assert/strict';
import {investigation} from '../lib/investigation.ts';
import {journalEntry} from '../lib/story.ts';

test('the notebook never turns an unheard recording into a confirmed confession',()=>{
 const empty=investigation({notes:[]});assert.equal(empty.count,0);assert.equal(empty.timeline.length,0);assert.ok(!JSON.stringify(empty).includes('한서연'));
 assert.ok(!JSON.stringify(investigation({notes:['wake']}).timeline).includes('원본'),'the opening memory cannot announce an undiscovered original recording');
 const unheard=investigation({notes:['archive_call']});assert.ok(!unheard.timeline[0].text.includes('차량 번호를 확인'),'a tape label cannot reveal the unplayed caller dialogue');
 const rawGate=investigation({notes:['archive_gate']});assert.ok(!rawGate.timeline[0].text.includes('문이 이미 닫혀'),'an unexamined gate label cannot grant skipped office CCTV observations');
 const partial=investigation({notes:['wake','annex_call','archive_call','archive_gate']});
 assert.ok(!partial.timeline.some(e=>e.id==='call'&&e.confirmed));assert.ok(!partial.timeline.some(e=>e.id==='gate'&&e.confirmed));assert.equal(partial.pattern,null);
 const confirmed=investigation({notes:['wake','archive_sequence_road','archive_sequence_call','archive_sequence_gate']});
 assert.ok(confirmed.timeline.filter(e=>e.confirmed).length>=3);assert.ok(confirmed.pattern);assert.equal(confirmed.timeline.some(e=>e.id==='voice'),false,'an optional unheard home message must stay absent');
});

test('earned records remain available once each even after chapter changes clear the review circuit',()=>{
 const notes=['annex_restore','archive_sequence_gate','wake','portrait','archive_call','archive_sequence_call','archive_sequence_road','portrait','fuse','car_search','pump'];
 const before=JSON.stringify(notes),result=investigation({notes}),records=result.sections.flatMap(s=>s.records);
 const expected=[...new Set(notes)].filter(id=>journalEntry(id,{notes}));
 assert.equal(result.count,expected.length);assert.deepEqual(records.map(r=>r.id).sort(),expected.sort());
 assert.equal(JSON.stringify(notes),before,'opening a notebook cannot mutate earned state');assert.ok(result.pattern,'confirmed notes survive leaving the archive even when circuit=[]');
 for(const r of records)assert.deepEqual({title:r.title,text:r.text},journalEntry(r.id,{notes}));
});

test('the timeline orders observed events and never reveals the safe answer or an unseen ending',()=>{
 const result=investigation({notes:['monitor','annex_badge','answerphone','wake','annex_call','archive_sequence_call','archive_sequence_road']});
 assert.deepEqual(result.timeline.map(e=>e.id),['voice','road','call','gate']);assert.equal(result.person.name,'한서연');assert.equal(result.pattern,null);
 assert.ok(!JSON.stringify(result).includes('2617'));assert.ok(!JSON.stringify(result).includes('현장에서 사망'));
 const life=investigation({notes:['portrait']});assert.equal(life.person.name,null,'a photograph without an identity record cannot grant the name');
});
