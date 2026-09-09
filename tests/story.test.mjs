import test from 'node:test';
import assert from 'node:assert/strict';
import { initialStory, transition, checkpoint } from '../lib/story.ts';

test('the entrance cannot skip the investigation', () => {
  assert.deepEqual(transition(initialStory(), 'door'), initialStory());
});
test('the complete hiding and escape route is reachable in order', () => {
  let s = initialStory();
  for (const [action, stage] of [['phone','power'],['breaker','shoes'],['shoes','radio'],['radio','hide'],['closet','wait']]) {
    s = transition(s, action); assert.equal(s.stage, stage);
  }
  assert.equal(s.hidden, true);
  assert.deepEqual(transition(s, 'caught'), s, 'the wardrobe must protect the player');
  s = transition(s,'survived'); assert.equal(s.stage,'escape');
  assert.deepEqual(transition(s,'door'),s,'cannot exit the apartment while still hiding');
  s = transition(s,'closet'); assert.equal(s.hidden,false);
  s = transition(s,'door'); assert.equal(s.ending,'escaped'); assert.equal(s.stage,'ended');
});
test('leaving hiding early resumes the threat and being caught ends the run', () => {
  let s = checkpoint(); assert.equal(s.stage,'radio');
  s=transition(s,'radio'); s=transition(s,'closet'); s=transition(s,'closet');
  assert.equal(s.stage,'hide'); assert.equal(s.hidden,false);
  s=transition(s,'caught'); assert.equal(s.ending,'caught');
  assert.deepEqual(transition(s,'door'),s,'endings are terminal');
});
test('survival cannot be awarded outside the wardrobe sequence', () => {
  assert.deepEqual(transition(initialStory(),'survived'),initialStory());
});
