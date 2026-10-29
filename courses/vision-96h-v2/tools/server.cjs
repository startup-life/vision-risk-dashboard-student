/**
 * 비전 리스크 대시보드 - Same-Origin 로컬 서버
 *
 * 정적 파일(preview/) 및 동일 오리진 REST API(/api/*)를 제공합니다.
 * 보안: 127.0.0.1 루프백 바인드 및 상태 변경 요청 Origin 검사.
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PREVIEW_ROOT = path.resolve(__dirname, '../preview');

const ALLOWED_MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8'
};

function createServer(options = {}) {
  const allowedOrigins = options.allowedOrigins || ['http://127.0.0.1:8765', 'http://localhost:8765'];

  const server = http.createServer(async (req, res) => {
    // 1. Origin 검사 (보안)
    const origin = req.headers['origin'];
    if (origin && !allowedOrigins.includes(origin) && !origin.startsWith('http://127.0.0.1:') && !origin.startsWith('http://localhost:')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Forbidden: invalid origin' }));
    }

    let urlObj;
    try {
      urlObj = new URL(req.url, 'http://127.0.0.1:8765');
    } catch {
      res.writeHead(400);
      return res.end('Bad URL');
    }

    let pathname;
    try {
      pathname = decodeURIComponent(urlObj.pathname);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Malformed URI encoding' }));
    }

    // ==================== REST API 핸들러 ==================== //
    if (pathname.startsWith('/api/')) {
      const sendJson = (data, statusCode = 200) => {
        res.writeHead(statusCode, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store'
        });
        res.end(JSON.stringify(data));
      };

      try {
        // GET /api/health
        if (pathname === '/api/health' && req.method === 'GET') {
          return sendJson({ status: 'ok' });
        }

        // GET /api/standards
        if (pathname === '/api/standards' && req.method === 'GET') {
          const stdPath = path.join(PREVIEW_ROOT, 'standards.json');
          if (fs.existsSync(stdPath)) {
            return sendJson(JSON.parse(fs.readFileSync(stdPath, 'utf8')));
          }
          return sendJson({ standards: [] });
        }

        return sendJson({ error: 'Endpoint not found' }, 404);
      } catch (err) {
        return sendJson({ error: String(err.message || err) }, 500);
      }
    }

    // ==================== 정적 파일 서빙 ==================== //
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405);
      return res.end();
    }

    const relPath = pathname === '/' ? '/index.html' : pathname;
    const file = path.resolve(PREVIEW_ROOT, '.' + relPath);

    if (!file.startsWith(PREVIEW_ROOT + path.sep)) {
      res.writeHead(403);
      return res.end();
    }

    const baseName = path.basename(file);
    if (baseName.startsWith('.') || baseName.includes('.env')) {
      res.writeHead(403);
      return res.end('Forbidden');
    }

    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404);
      return res.end('Not found');
    }

    const ext = path.extname(file);
    res.writeHead(200, {
      'Content-Type': ALLOWED_MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });

    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });

  return {
    server,
    // 포트를 먼저 잡아 같은 포트의 두 번째 서버를 막는다.
    listen: (port = 8765, host = '127.0.0.1') => new Promise((resolve, reject) => {
      const onError = err => reject(err);
      server.once('error', onError);
      server.listen(port, host, () => {
        server.off('error', onError);
        resolve(server.address());
      });
    }),
    close: () => new Promise((resolve) => {
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }
      server.close(resolve);
    })
  };
}

// 직접 CLI 실행 시
if (require.main === module) {
  const port = parseInt(process.env.PORT || '8765', 10);
  const host = process.env.HOST || '127.0.0.1';
  const instance = createServer();
  instance.listen(port, host).then(() => {
    console.log(`Vision Risk Server running at http://${host}:${port}`);
  }).catch(err => {
    console.error('Server startup failed:', err);
    process.exit(1);
  });
}

module.exports = { createServer };
