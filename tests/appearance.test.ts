import assert from 'node:assert/strict';
import {test} from 'node:test';
import {parseAppearancePreference,persistAppearancePreference,readAppearancePreference,resolveAppearance} from '../src/lib/appearance.ts';

test('appearance accepts only documented preferences and resolves Auto against the system',()=>{
  for(const value of ['auto','light','dark'] as const)assert.equal(parseAppearancePreference(value),value);
  for(const value of [null,undefined,'','LIGHT','sepia',0,{},['dark']])assert.equal(parseAppearancePreference(value),'auto');
  assert.equal(resolveAppearance('auto',false),'light');
  assert.equal(resolveAppearance('auto',true),'dark');
  for(const systemDark of [false,true]){
    assert.equal(resolveAppearance('light',systemDark),'light');
    assert.equal(resolveAppearance('dark',systemDark),'dark');
  }
});

test('a missing, corrupt or blocked saved appearance safely falls back to Auto',()=>{
  assert.equal(readAppearancePreference(null),'auto');
  assert.equal(readAppearancePreference({getItem:()=>{throw new DOMException('Storage blocked','SecurityError');}}),'auto');
  assert.equal(readAppearancePreference({getItem:()=>'{broken preference}'}),'auto');
  assert.equal(readAppearancePreference({getItem:()=>null}),'auto');
  let requestedKey='';
  assert.equal(readAppearancePreference({getItem:key=>{requestedKey=key;return 'dark';}}),'dark');
  assert.equal(requestedKey,'earth-fm-appearance');
});

test('all three explicit choices are saved without making storage availability a requirement',()=>{
  const writes:Array<[string,string]>=[];
  for(const preference of ['light','dark','auto'] as const){
    persistAppearancePreference({setItem:(key,value)=>{writes.push([key,value]);}},preference);
    assert.doesNotThrow(()=>persistAppearancePreference(null,preference));
    assert.doesNotThrow(()=>persistAppearancePreference({setItem:()=>{throw new DOMException('Storage full','QuotaExceededError');}},preference));
  }
  assert.deepEqual(writes,[['earth-fm-appearance','light'],['earth-fm-appearance','dark'],['earth-fm-appearance','auto']]);
});
