import test from 'node:test';
import assert from 'node:assert/strict';
import {loadBackpackDomain} from '../src/backpack-domain.js';

test('Backpack domain stays absent until explicitly configured by trusted startup',()=>{
 assert.equal(loadBackpackDomain({}),undefined);
});
test('partial and relative Backpack startup configuration refuses before loading code',()=>{
 for(const env of [{BACKPACK_CONFIG:'relative.json'},{MGR_BACKPACK_TOOLKIT_ROOT:'relative',BACKPACK_CONFIG:'relative',MGR_BACKPACK_BINDINGS_FILE:'relative'}])assert.throws(()=>loadBackpackDomain(env),/absolute host-owned path/);
});
