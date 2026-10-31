import {test} from 'node:test';
import assert from 'node:assert/strict';
import {databaseName,connectionUri} from '../../src/lib/database/config.ts';
test('MongoDB uses crowdplay by default and rejects invalid database names',()=>{assert.equal(databaseName(undefined),'crowdplay');assert.equal(databaseName('crowdplay_test_123'),'crowdplay_test_123');for(const name of ['../other','a.b','a/b','a b','x'.repeat(64)])assert.throws(()=>databaseName(name))});
test('MongoDB URI validation keeps secrets out of error text',()=>{const uri='mongodb+srv://test:synthetic-password@example.invalid/crowdplay';assert.equal(connectionUri(uri),uri);const invalid='https://test:synthetic-password@example.invalid';assert.throws(()=>connectionUri(invalid),error=>error instanceof Error&&!error.message.includes('synthetic-password'));assert.throws(()=>connectionUri(undefined))});
