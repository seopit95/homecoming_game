import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildWorld} from '../lib/world.ts';
import {initialStory,transition} from '../lib/story.ts';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}})})};

test('the archive recording can be paused and jogged to a decisive frame without pausing the game',()=>{
 const world=buildWorld(new T.Scene(),'archive'),player=world.archiveReview;
 assert.ok(player,'the archive needs a real source recording player');
 player.operate('archive_preview_call',10);assert.equal(player.read(12).time,2);assert.equal(player.read(12).playing,true);
 player.operate('archive_record_pause',12);assert.equal(player.read(90).time,2);assert.equal(player.read(90).playing,false);
 player.operate('archive_record_forward',90);assert.equal(player.read(91).time,3);
 assert.equal(player.operate('archive_record_mark',91).mark,undefined,'an arbitrary early frame cannot be accepted');
 for(let i=0;i<20;i++)player.operate('archive_record_forward',92);
 assert.equal(player.read(93).time,12);assert.equal(player.operate('archive_record_mark',93).mark,'archive_sequence_call');
 player.operate('archive_preview_gate',100);assert.equal(player.read(101).source,'gate');assert.equal(player.read(101).time,1);
 world.reset();assert.equal(player.read(101).source,null);
});

test('marked recordings accept any investigative order and preserve existing saved conclusions',()=>{
 let story={...initialStory(),stage:'archive_edit',notes:['archive_road','archive_call','archive_gate'],circuit:['archive_sequence_road']};
 const same=transition(story,'archive_sequence_road');assert.equal(same,story,'repeat marking cannot erase accepted evidence');
 story=transition(story,'archive_sequence_gate');assert.equal(story.stage,'archive_edit');assert.ok(story.circuit.includes('archive_sequence_road'));assert.ok(story.circuit.includes('archive_sequence_gate'));
 story=transition(story,'archive_sequence_call');assert.equal(story.stage,'archive_reveal');
});
