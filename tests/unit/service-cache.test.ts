import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cacheProbe} from '../../src/lib/services/cache.ts';
test('failed health probes retry after five seconds and replace the stale failure',async()=>{
 let time=0,calls=0;const probe=cacheProbe(async()=>{if(++calls===1)throw new Error('offline')},()=>time);
 await assert.rejects(probe());time=4000;await assert.rejects(probe());assert.equal(calls,1);
 time=5001;await probe();assert.equal(calls,2);time=10000;await probe();assert.equal(calls,2);
});
test('concurrent health requests share the same in-flight provider probe',async()=>{let calls=0;const probe=cacheProbe(async()=>{calls++});await Promise.all([probe(),probe(),probe()]);assert.equal(calls,1)});
