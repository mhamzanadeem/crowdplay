import {jevEnabled} from '../../src/lib/services/config.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkServices,ServiceCheckError} from '../../src/lib/services/checks.ts';
import {mongoDiagnostic} from '../../src/lib/database/diagnostics.ts';
test('each dependency failure is reported separately without hiding healthy services',async()=>{
 for(const failed of ['MongoDB','Twitch','Jev']){const probes=Object.fromEntries(['MongoDB','Twitch','Jev'].map(name=>[name,async()=>{if(name===failed)throw new ServiceCheckError('Unavailable')}])) as Parameters<typeof checkServices>[0];const result=await checkServices(probes);assert.equal(result.filter(s=>s.status==='unavailable').length,1);assert.equal(result.find(s=>s.name===failed)?.message,'Unavailable')}
});
test('untrusted provider errors never leak credentials',async()=>{
 const fail=async()=>{throw new Error('mongodb://user:secret@private-host')};const results=await checkServices({MongoDB:fail,Twitch:async()=>{},Jev:async()=>{}});assert.ok(!JSON.stringify(results).includes('secret'));assert.equal(results[1].status,'connected');
});
test('MongoDB diagnostics distinguish authentication, permissions and DNS safely',()=>{
 assert.match(mongoDiagnostic({code:18,message:'secret'}),/authentication/i);assert.match(mongoDiagnostic({code:13}),/permissions/i);assert.match(mongoDiagnostic({message:'querySrv ENOTFOUND secret'}),/DNS/);assert.match(mongoDiagnostic({name:'MongoServerSelectionError'}),/network/);assert.ok(!mongoDiagnostic({message:'secret'}).includes('secret'));
});

test('MongoDB reports DNS timeouts separately from nonexistent cluster records',()=>{
 assert.match(mongoDiagnostic({code:'ETIMEOUT',syscall:'querySrv'}),/timed out/);
 assert.match(mongoDiagnostic({code:'ENOTFOUND',syscall:'querySrv'}),/record was not found/);
});

test('Jev is deferred unless explicitly enabled',()=>{for(const value of [undefined,'','false','1'])assert.equal(jevEnabled(value),false);assert.equal(jevEnabled('true'),true)});
