import {jevEnabled} from '../../src/lib/services/config.ts';
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {serviceHealth} from '../../src/lib/services/live.ts';
import {getMongoStore} from '../../src/lib/database/connection.ts';
const enabled=process.env.RUN_SERVICE_TESTS==='1';
const health=enabled?serviceHealth(true):Promise.resolve([]);
for(const name of ['MongoDB','Twitch','Jev'])test(`${name} live connection`,{skip:!enabled?'Live service tests require explicit opt-in':name==='Jev'&&!jevEnabled(process.env.JEV_ENABLED)?'Jev integration deferred':false},async()=>{const result=(await health).find(s=>s.name===name);assert.equal(result?.status,'connected',result?.message||'Probe did not run')});
after(async()=>{if((await health).some(s=>s.name==='MongoDB'&&s.status==='connected'))await (await getMongoStore()).client.close()});
