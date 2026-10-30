import test from 'node:test';
import assert from 'node:assert/strict';
import {investigation} from '../lib/investigation.ts';
import {journalEntry} from '../lib/story.ts';

test('the wife relationship is earned from the family keepsake and does not expose the recovered letter',()=>{
 const before=investigation({notes:['wake','annex_badge']});
 assert.doesNotMatch(before.person.text??'',/아내/);
 const after=investigation({notes:['wake','archive_road']});
 assert.equal(after.person.name,'한서연');assert.match(after.person.text,/아내/);
 assert.match(after.sections.flatMap(s=>s.records).find(r=>r.id==='archive_road').text,/결혼/);
 assert.equal(after.pattern,null,'a family photograph is not proof of the missing nine seconds');
 assert.doesNotMatch(JSON.stringify(after),/경찰이.*다시방|차량에서 회수한 편지/);
});

test('old earned family records survive loading without introducing a second home for the wife',()=>{
 const result=investigation({notes:['belongings','resident_key','resident_shift','portrait','answerphone','archive_road']});
 assert.equal(result.count,6);assert.equal(result.person.name,'한서연');
 assert.doesNotMatch(JSON.stringify(result),/1704호|야간 당직/);
 assert.ok(result.sections.flatMap(s=>s.records).some(r=>r.text.includes('2803호')));
 const photo=investigation({notes:['portrait']});
 assert.match(photo.person.text,/우리 셋이/);assert.doesNotMatch(photo.person.text,/오후 두 시/);
});

test('the notebook never turns an unheard recording into a confirmed confession',()=>{
 const empty=investigation({notes:[]});assert.equal(empty.count,0);assert.equal(empty.timeline.length,0);assert.ok(!JSON.stringify(empty).includes('한서연'));
 assert.ok(!JSON.stringify(investigation({notes:['wake']}).timeline).includes('원본'),'the opening memory cannot announce an undiscovered original recording');
 const unheard=investigation({notes:['archive_call']});assert.equal(unheard.timeline.some(e=>e.id==='call'),false,'a counselling reply is not a recovered03:20 call');
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

test('V142 postal documents never grant unwatched video proof and earned mail remains readable',()=>{
 const mixed=investigation({notes:['annex_call','archive_call']});assert.equal(mixed.timeline.find(e=>e.id==='call').source,'발신측 보조 녹음');
 const result=investigation({notes:['archive_road','archive_call','archive_gate']});
 assert.equal(result.count,3);assert.equal(result.pattern,null);
 assert.equal(result.timeline.some(e=>e.confirmed),false);
 assert.doesNotMatch(JSON.stringify(result.timeline),/원본 확보/);
 assert.match(result.sections.find(s=>s.id==='archive').title,/우편/);
 for(const record of result.sections.flatMap(s=>s.records))assert.match(record.text,/수신|발송|우편/);
});
