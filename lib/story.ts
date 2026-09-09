export type Stage = 'phone' | 'power' | 'shoes' | 'radio' | 'hide' | 'wait' | 'escape' | 'ended';
export type Story = { stage: Stage; hidden: boolean; ending: 'escaped' | 'caught' | null };
export type Action = 'phone' | 'breaker' | 'shoes' | 'radio' | 'closet' | 'survived' | 'door' | 'caught';
export function initialStory(): Story { return { stage: 'phone', hidden: false, ending: null }; }
export function transition(state: Story, action: Action): Story {
  if (state.stage === 'ended') return state;
  if (action === 'caught' && state.stage === 'hide' && !state.hidden) return { ...state, stage: 'ended', ending: 'caught' };
  if (action === 'closet') {
    if (state.stage === 'hide') return { ...state, stage: 'wait', hidden: true };
    if (state.stage === 'wait') return { ...state, stage: 'hide', hidden: false };
    if (state.stage === 'escape') return { ...state, hidden: !state.hidden };
  }
  if (state.stage === 'wait' && state.hidden && action === 'survived') return { ...state, stage: 'escape' };
  if (state.stage === 'escape' && !state.hidden && action === 'door') return { ...state, stage: 'ended', ending: 'escaped' };
  const steps: Partial<Record<Stage, [Action, Stage]>> = {
    phone: ['phone', 'power'], power: ['breaker', 'shoes'], shoes: ['shoes', 'radio'], radio: ['radio', 'hide'],
  };
  const next = steps[state.stage];
  return next?.[0] === action ? { ...state, stage: next[1] } : state;
}
export function checkpoint(): Story { return { stage: 'radio', hidden: false, ending: null }; }

export const objectives: Record<Stage, string> = {
  phone: '거실 탁자에서 휴대전화를 확인하세요',
  power: '복도 끝 왼쪽 다용도실에서 차단기를 올리세요',
  shoes: '현관에서 들린 소리를 확인하세요',
  radio: '침실에서 켜진 라디오를 확인하세요',
  hide: '침실의 옷장에 숨으세요',
  wait: '발소리가 멎을 때까지 기다리세요',
  escape: '현관으로 나가세요. 뒤돌아보지 마세요.',
  ended: '',
};
