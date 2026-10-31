import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDemo} from '../../src/lib/demo.ts';
import {aggregateViewers,needsReview} from '../../src/lib/moderation/rules.ts';
test('shared synthetic fixtures drive counts, viewer aggregates and complete labelled distributions',()=>{const data=createDemo();assert.equal(data.mode,'demo');assert.equal(data.messages.length,248);assert.equal(data.messages.filter(needsReview).length,8);assert.equal(data.messages.filter(m=>m.risk==='high').length,3);assert.equal(aggregateViewers(data.messages).reduce((s,v)=>s+v.messageCount,0),248);for(const m of data.messages)if(m.classification){assert.equal(m.classification.source,'demo');assert.equal(m.classification.model,'demo-fixture');assert.ok(Math.abs(Object.values(m.classification.probabilities).reduce((s,p)=>s+p,0)-1)<1e-9)}const second=createDemo();data.rules[0].enabled=false;assert.equal(second.rules[0].enabled,true)});
