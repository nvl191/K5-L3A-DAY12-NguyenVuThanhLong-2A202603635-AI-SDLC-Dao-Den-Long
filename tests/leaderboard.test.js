import test from 'node:test';
import assert from 'node:assert/strict';
import { NAME_PATTERN, rankEntries, readLeaderboard, writeLeaderboard } from '../src/leaderboard.js';

function memoryStorage(){const values=new Map();return{getItem:(key)=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};}
const entry=(name,score,minute)=>({name,score,nights_won:2,achieved_at:`2026-11-20T10:${String(minute).padStart(2,'0')}:00+07:00`,seed:7});

test('leaderboard validates names and ranks ties by earlier completion, retaining ten',()=>{
  assert.equal(NAME_PATTERN.test('May_7'),true);assert.equal(NAME_PATTERN.test('May!'),false);assert.equal(NAME_PATTERN.test('ab'),false);
  const entries=rankEntries(Array.from({length:12},(_,i)=>entry(`User${i}`,100,i)));
  assert.equal(entries.length,10);assert.equal(entries[0].name,'User0');
});

test('leaderboard survives storage round trip and rejects invalid score records',()=>{
  const storage=memoryStorage();writeLeaderboard(entry('May7',900,2),storage);writeLeaderboard(entry('Long',1000,1),storage);
  assert.deepEqual(readLeaderboard(storage).map((x)=>x.name),['Long','May7']);
  assert.throws(()=>writeLeaderboard({...entry('x',1,1),name:'x'},storage));
});
