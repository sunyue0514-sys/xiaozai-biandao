const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers/runtime.cjs');

test('database retry backs off between failures and stops immediately on success', async () => {
  const delays=[];
  const api=load('src/lib/db-retry.ts', {__setTimeout(callback,delay){delays.push(delay);callback();}});
  let attempts=0;
  const value=await api.withRetry(async()=>{if(++attempts<4)throw Error('temporarily unavailable');return 'saved';},{maxRetries:4,retryDelay:100});
  assert.equal(value,'saved');
  assert.equal(attempts,4);
  assert.deepEqual(delays,[100,150,225]);
});

test('database retry propagates final failure without an extra delay', async () => {
  const delays=[];
  const api=load('src/lib/db-retry.ts', {__setTimeout(callback,delay){delays.push(delay);callback();}});
  let attempts=0;
  await assert.rejects(api.withRetry(async()=>{attempts++;throw Error('database unavailable');},{maxRetries:3,retryDelay:100}),/database unavailable/);
  assert.equal(attempts,3);
  assert.deepEqual(delays,[100,150]);
});
