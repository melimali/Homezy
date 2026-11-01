// dist/ klasörünü SPA yedeğiyle sunar: node scripts/store/serve.js [port]
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '../../dist'), port = +process.argv[2] || 8099;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.json': 'application/json', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };
http.createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(root, 'index.html');
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(port);
