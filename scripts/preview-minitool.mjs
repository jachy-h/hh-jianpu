import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const directory = path.resolve('apps/minitool/dist');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
  const file = path.resolve(directory, `.${decodeURIComponent(pathname === '/' ? '/index.html' : pathname)}`);
  if (!file.startsWith(directory + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { response.writeHead(404); response.end('Not found'); return; }
  response.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'; worker-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'");
  response.setHeader('Content-Type', types[path.extname(file)] ?? 'application/octet-stream');
  response.end(fs.readFileSync(file));
}).listen(5175, '127.0.0.1', () => console.log('Static CSP preview: http://127.0.0.1:5175'));
