import assert from 'node:assert/strict';
import {test} from 'node:test';
import {ARTICULATION_KEY, FlowVoice, getArticulation, resetArticulationCache, setArticulation, subscribeArticulation} from '../src/lib/articulation.ts';

function storage(initial: Record<string, string> = {}, blocked = false) {
  const data = {...initial};
  (globalThis as unknown as {localStorage: unknown}).localStorage = {
    getItem: (k: string) => { if (blocked) throw new Error('blocked'); return data[k] ?? null; },
    setItem: (k: string, v: string) => { if (blocked) throw new Error('blocked'); data[k] = v; },
  };
  resetArticulationCache();
  return data;
}

test('the Sound setting defaults to Note by note, persists Continuous and tells listeners', () => {
  const data = storage();
  assert.equal(getArticulation(), 'notes');
  let calls = 0; const off = subscribeArticulation(() => calls++);
  setArticulation('flow');
  assert.equal(getArticulation(), 'flow'); assert.equal(data[ARTICULATION_KEY], 'flow'); assert.equal(calls, 1);
  setArticulation('bogus' as 'flow'); assert.equal(getArticulation(), 'flow', 'unknown values are ignored');
  off(); storage({[ARTICULATION_KEY]: 'flow'}); assert.equal(getArticulation(), 'flow', 'read back from storage');
  storage({[ARTICULATION_KEY]: 'nonsense'}); assert.equal(getArticulation(), 'notes');
});

test('blocked storage keeps the choice for the visit without throwing', () => {
  storage({}, true);
  assert.equal(getArticulation(), 'notes');
  setArticulation('flow'); assert.equal(getArticulation(), 'flow');
});

// A minimal recording stand-in for Web Audio: enough to see what FlowVoice schedules.
type Call = [string, number, number];
function param(log: Call[], name: string) {
  return {value: 0, setValueAtTime: (v: number, t: number) => log.push([`${name}=`, v, t]), setTargetAtTime: (v: number, t: number) => log.push([`${name}~`, v, t]), cancelScheduledValues: () => undefined};
}
function fakeContext() {
  const log: Call[] = []; let n = 0;
  const node = () => ({connect: () => undefined});
  const ctx = {
    createGain: () => ({...node(), gain: param(log, `gain${n++}`)}),
    createOscillator: () => { const id = n++; return {...node(), type: 'sine', detune: {value: 0}, frequency: param(log, `osc${id}`), start: () => undefined, stop: () => undefined}; },
    createBiquadFilter: () => ({...node(), type: 'lowpass', frequency: {value: 0}}),
    createStereoPanner: () => ({...node(), pan: param(log, 'pan')}),
  };
  return {ctx: ctx as unknown as BaseAudioContext, log};
}

test('Continuous keeps every mapped pitch exact: the first note jumps, later notes glide to hz × ratio', () => {
  const {ctx, log} = fakeContext();
  const voice = new FlowVoice(ctx, {} as AudioNode, {partials: [{ratio: 1, weight: 1}, {ratio: 2, weight: 0.3}]}, 0);
  log.length = 0;
  voice.note(196, 1, 0.3, {holdUntil: 2.05});
  voice.note(261.6255653, 2, 0.3, {holdUntil: 3.05});
  const freq = log.filter(([k]) => k.startsWith('osc'));
  assert.deepEqual(freq.slice(0, 2).map(([k, v, t]) => [k.endsWith('='), v, t]), [[true, 196, 1], [true, 392, 1]]);
  assert.deepEqual(freq.slice(2).map(([k, v, t]) => [k.endsWith('~'), v, t]), [[true, 261.6255653, 2], [true, 523.2511306, 2]]);
  voice.rest(3); log.length = 0;
  voice.note(330, 4, 0.3);
  assert.ok(log.filter(([k]) => k.startsWith('osc')).every(([k]) => k.endsWith('=')), 'after a rest the next note starts cleanly, without a glide');
});
