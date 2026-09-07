import http from 'node:http';
import fs from 'node:fs';
const srv = http.createServer((req, res) => {
  let b = '';
  req.on('data', (c) => (b += c));
  req.on('end', () => {
    fs.appendFileSync('K:/3/3/backend-new/hook-received.log', `${new Date().toISOString()} ${req.method} ${req.url}\n${b}\n---\n`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ errcode: 0, errmsg: 'ok' }));
  });
});
srv.listen(9988, () => console.log('hook-test listening 9988'));
