const http = require('http');
function get(path) {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3000' + path, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}
(async () => {
  try {
    const m = await get('/api/admin/users/meta');
    console.log('META', m.status, m.body.substring(0, 400));
    const l = await get('/api/admin/users/list?limit=3');
    console.log('LIST', l.status, l.body.substring(0, 500));
  } catch (e) {
    console.error('ERR', e.message);
  }
})();
