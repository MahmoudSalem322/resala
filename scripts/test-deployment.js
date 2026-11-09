const assert = require('node:assert/strict');
process.env.NODE_ENV = 'production';
process.env.FRONTEND_URL = 'https://resala-frontend-sigma.vercel.app';
const app = require('../src/app');
const pool = require('../src/config/db');
async function main() {
 const server=app.listen(0,'127.0.0.1');
 await new Promise(resolve=>server.once('listening',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 try {
  const health=await fetch(base+'/health'); assert.equal(health.status,200); assert.deepEqual(await health.json(),{status:'ok'});
  const origin=process.env.FRONTEND_URL;
  const approved=await fetch(base+'/api/auth/logout',{method:'POST',headers:{Origin:origin,'Sec-Fetch-Site':'cross-site'}});
  assert.equal(approved.status,200); assert.equal(approved.headers.get('access-control-allow-origin'),origin);
  assert.ok(approved.headers.getSetCookie().every(value=>value.includes('SameSite=None')&&value.includes('Secure')));
  const denied=await fetch(base+'/api/auth/logout',{method:'POST',headers:{Origin:'https://attacker.example','Sec-Fetch-Site':'cross-site'}});
  assert.equal(denied.status,403);
  assert.notEqual(denied.headers.get('access-control-allow-origin'),'https://attacker.example');
  console.log('Deployment checks passed: database readiness, production origin, cross-site CSRF rejection, Secure SameSite=None cookies.');
 } finally {await new Promise(resolve=>server.close(resolve)); await pool.end();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
