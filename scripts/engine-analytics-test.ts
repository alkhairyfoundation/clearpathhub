require('dotenv').config({ path: '.env.local' });
const path = require('path');
const Module = require('module');
const orig = Module._resolveFilename;
Module._resolveFilename = function (request: any, parent: any, isMain: any, options: any) {
  if (request.startsWith('@/')) {
    const target = path.join(__dirname.replace(/[\\/]scripts$/, ''), 'src', request.slice(2));
    return orig.call(this, target, parent, isMain, options);
  }
  return orig.call(this, request, parent, isMain, options);
};
require('ts-node/register/transpile-only');

const { runDbOp } = require('../src/lib/neon-engine');

(async () => {
  const res = await runDbOp({
    table: 'student_analytics',
    op: 'read',
    select: '*, entrance_applications!inner(first_name, last_name)',
    filters: [],
    order: [{ col: 'generated_at', asc: false }],
  });
  console.log('OK rows:', res.data.length);
  console.log(JSON.stringify(res.data[0]).slice(0, 300));
})().catch((e) => {
  console.error('FAILED:', e.message.slice(0, 600));
  process.exit(1);
});