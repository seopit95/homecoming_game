import test from 'node:test';
import assert from 'node:assert/strict';
import {familyRecords,wifeLetter} from '../lib/family-story.ts';
import {initialStory,transition,objectiveFor,journalEntry} from '../lib/story.ts';
test('V142 unopened mail points to the shared holding point and all three letters retain the CCTV route',()=>{
 let s={...initialStory(),stage:'archive_arrival'};
 assert.match(objectiveFor(s),/우편/);assert.match(objectiveFor(s),/0\/3/);
 for(const [i,id] of ['archive_call','archive_gate','archive_road'].entries()){
  s=transition(s,id);assert.ok(journalEntry(id,s).text.includes('2803호'));
  if(i<2)assert.match(objectiveFor(s),new RegExp((i+1)+'/3'));
 }
 assert.equal(s.stage,'archive_reveal');assert.match(objectiveFor(s),/CCTV.*재생/);
 assert.equal(transition(s,'archive_play').stage,'archive_playback');
 const senders=new Set(Object.values(familyRecords).map(v=>v.sender));assert.equal(senders.size,3);
 assert.ok(wifeLetter.includes('당신을 사랑해'),'the genuine last letter remains in the ending');
});

test('V142 the notebook does not publish the replay conclusion at playback start',()=>{
 let s={...initialStory(),stage:'archive_reveal',notes:['archive_road','archive_call','archive_gate']};s=transition(s,'archive_play');
 assert.doesNotMatch(journalEntry('archive_play',s).text,/녹색 신호|살아 있는|잘못 거셨어요|네 뒤/);
 s=transition(s,'archive_finish');assert.match(journalEntry('archive_play',s).text,/살아 있는/);
});
