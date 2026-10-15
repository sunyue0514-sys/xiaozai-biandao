// Native route calls only: no HTTP requests, credentials or SDK replacements.
const nextRequire = require('node:module').createRequire(require.resolve('next/package.json'));
nextRequire('@next/env').loadEnvConfig(process.cwd());
require('tsx/cjs');
const { NextRequest } = require('next/server');
const sdk = require('coze-coding-dev-sdk');
const assert = require('node:assert/strict');
const sdkVersion = JSON.parse(require('node:fs').readFileSync('node_modules/coze-coding-dev-sdk/package.json', 'utf8')).version;
(async () => {
  const config = new sdk.Config();
  console.log(JSON.stringify({ sdkVersion, apiKeyConfigured: !!config.apiKey, baseUrlConfigured: !!config.baseUrl, modelBaseUrlConfigured: !!config.modelBaseUrl }));
  try { config.validate(); console.log('SDK validator: configuration accepted'); }
  catch (error) { console.log('SDK validator: ' + error.message); }
  const cases = [
    ['customer/list', 'GET', 401], ['product-profiles', 'GET', 401], ['llm/chat', 'POST', 401],
    ['search', 'POST', 401], ['web-search', 'POST', 401], ['creative/generate', 'POST', 401], ['agent/materials', 'GET', 401], ['agent/status', 'GET', 401],
  ];
  let failures = 0;
  for (const [name, method, expectedStatus] of cases) {
    try {
      const route = require('../src/app/api/' + name + '/route.ts');
      const request = new NextRequest('https://offline.invalid/api/' + name, { method, ...(method === 'POST' ? { headers: { 'Content-Type': 'application/json' }, body: '{}' } : {}) });
      const response = await route[method](request);
      console.log(JSON.stringify({ route: name, method, status: response.status, expectedStatus }));
      assert.equal(response.status, expectedStatus);
    } catch (error) {
      failures++;
      console.log(JSON.stringify({ route: name, method, thrown: error.name }));
    }
  }
  console.log(JSON.stringify({ localBranchFailures: failures, externalAIRequestsMade: 0, liveGenerationVerified: false }));
  return failures ? 1 : 0;
})().then(code => process.exit(code), error => { console.error(error.name); process.exit(1); });
