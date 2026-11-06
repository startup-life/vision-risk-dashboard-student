/**
 * 비전 리스크 대시보드 - Same-Origin 로컬 서버
 *
 * 정적 파일(preview/) 및 동일 오리진 REST API(/api/*)를 제공합니다.
 * 보안: 127.0.0.1 루프백 바인드 및 상태 변경 요청 Origin 검사.
 * 이미지 검사: 1~5장, 장당 2MiB 이하, JPG/PNG 매직 바이트 검증.
 * 사건 기록과 사진은 이 컴퓨터의 로컬 저장소(preview/_synthetic_store.json)에 둔다.
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { RepositoryImages } = require('./repository-images.cjs');

const PREVIEW_ROOT = path.resolve(__dirname, '../preview');
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2 MiB
// 한 사건의 사진 합계 한도. 5회차에 판독할 때 사진을 base64로 한 요청에 모두 싣는데, 요청 본문이 4.5MB를 넘으면 거절된다.
const MAX_TOTAL_IMAGE_SIZE = 3 * 1024 * 1024; // 3 MiB
// 화면의 분류 이름. 오류 문구에 분류 코드 대신 쓴다.
const CATEGORY_LABELS = { safety: '산업안전', quality: '택배 발송 확인' };
const ALLOWED_MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8'
};

// 매직 바이트 및 MIME 엄격 일치 검사
function validateImageMagicBytes(buffer, mimeType) {
  if (!buffer || buffer.length < 8) return false;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
                buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A;
  const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;

  if (mimeType === 'image/png') {
    return isPng;
  }
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    return isJpeg;
  }
  return false;
}

// 로컬 저장소 사진 파일의 확장자와 응답 MIME.
const IMAGE_EXT_MIME = { png: 'image/png', jpg: 'image/jpeg' };
function normalizeImageMime(mimeType) {
  const mime = String(mimeType || '').toLowerCase();
  return mime === 'image/jpg' ? 'image/jpeg' : mime;
}

class SyntheticStore {
  constructor(filepath) {
    this.filepath = filepath;
    // 사진은 기록 파일 옆 폴더(<기록 파일 이름>_images/)에 한 장씩 둔다. 기록만 파일에 있고 사진이 메모리에만 있으면 서버를 다시 시작한 뒤 사진을 잃는다.
    this.imagesDir = filepath ? path.join(path.dirname(filepath), `${path.basename(filepath, '.json')}_images`) : null;
    this.data = { records: [] };
    this.images = new Map(); // key: recordId_index -> { buffer, mime }. mime이 없으면(예전 사진) 응답은 image/png다.
    this.load();
  }

  load() {
    if (this.filepath && fs.existsSync(this.filepath)) {
      try {
        const raw = fs.readFileSync(this.filepath, 'utf8');
        this.data = JSON.parse(raw);
        if (!Array.isArray(this.data.records)) this.data.records = [];
      } catch (e) {
        // fallback to empty
      }
    }
    this.loadImages();
  }

  // 기록에 있는 사건의 사진 장수 안쪽만 읽는다. 기록 파일을 지우고 다시 쓰면 같은 사건 번호가 다시 나오므로 남은 옛 사진은 쓰지 않는다.
  loadImages() {
    if (!this.imagesDir || !fs.existsSync(this.imagesDir)) return;
    const counts = new Map((this.data.records || []).map(r => [r.record_id, Number(r.image_count) || 0]));
    for (const name of fs.readdirSync(this.imagesDir)) {
      const m = name.match(/^(.+)_(\d+)\.(png|jpg|bin)$/);
      if (!m || Number(m[2]) >= (counts.get(m[1]) || 0)) continue;
      try {
        this.images.set(`${m[1]}_${m[2]}`, { buffer: fs.readFileSync(path.join(this.imagesDir, name)), mime: IMAGE_EXT_MIME[m[3]] || null });
      } catch (e) {
        // 읽지 못한 사진은 없는 사진으로 둔다(사진 주소가 404를 돌려준다).
      }
    }
  }

  // MIME은 파일 확장자로 남긴다(.png·.jpg, 모르는 형식은 .bin). 같은 번호의 다른 확장자 파일은 지워 한 장만 남긴다.
  saveImage(recordId, index, buffer, mimeType) {
    const ext = Object.keys(IMAGE_EXT_MIME).find(k => IMAGE_EXT_MIME[k] === normalizeImageMime(mimeType)) || 'bin';
    this.images.set(`${recordId}_${index}`, { buffer, mime: IMAGE_EXT_MIME[ext] || null });
    if (!this.imagesDir) return;
    try {
      fs.mkdirSync(this.imagesDir, { recursive: true });
      for (const other of ['png', 'jpg', 'bin']) {
        if (other !== ext) fs.rmSync(path.join(this.imagesDir, `${recordId}_${index}.${other}`), { force: true });
      }
      fs.writeFileSync(path.join(this.imagesDir, `${recordId}_${index}.${ext}`), buffer);
    } catch (e) {
      // save()처럼 파일 쓰기 실패는 넘긴다. 이번 실행 동안은 메모리의 사진을 보여 준다.
    }
  }

  save() {
    if (this.filepath) {
      try {
        fs.writeFileSync(this.filepath, JSON.stringify(this.data, null, 2), 'utf8');
      } catch (e) {
        // ignore
      }
    }
  }
}

// 사건 상태. 이 단계에서는 등록만 하므로 등록한 사건은 모두 검토 대기 큐에 들어간다.
function recordQueue(record) {
  return record.status === 'REGISTERED' ? 'awaiting_review' : null;
}

function computeQueueCounts(records) {
  return { awaiting_review: records.filter(r => r.queue === 'awaiting_review').length };
}

// options.log: 이미지 저장소 연결 실패 같은 시작 경고를 받을 함수(기본 console.warn). 테스트에서 끌 때 쓴다.
function createServer(options = {}) {
  const storePath = options.syntheticStorePath || path.resolve(__dirname, '../preview/_synthetic_store.json');
  const syntheticStore = new SyntheticStore(storePath);
  const repoImagesRoot = options.repositoryImagesRoot || process.env.REPOSITORY_IMAGES_ROOT;
  let repoImages = options.repoImages || null;
  if (!repoImages) {
    try {
      repoImages = new RepositoryImages({ root: repoImagesRoot, logLabel: 'server', log: options.log });
    } catch (e) {
      repoImages = null;
    }
  }

  const allowedOrigins = options.allowedOrigins || ['http://127.0.0.1:8765', 'http://localhost:8765'];

  // 사건 등록. 같은 request_id로 다시 보내면 처음 등록한 사건을 돌려준다(응답을 잃고 다시 눌러도 한 번만 저장된다).
  function createRecord(payload) {
    const d = syntheticStore.data;
    const now = new Date().toISOString();
    const reqId = payload.request_id || `req-${Date.now()}`;
    const existing = d.records.find(r => r.request_id === reqId);
    if (existing) {
      return { success: true, idempotent: true, record_id: existing.record_id, request_id: existing.request_id, status: existing.status, created_at: existing.created_at, image_count: existing.image_count, record: existing };
    }

    const recordId = `R-${d.records.length + 101}`;
    const images = payload.images || [];
    images.forEach((img, i) => {
      if (img.base64) syntheticStore.saveImage(recordId, i, Buffer.from(img.base64, 'base64'), img.mimeType);
    });

    const rec = {
      record_id: recordId,
      request_id: reqId,
      created_at: now,
      location: payload.location || '창고 A',
      category: payload.category || 'safety',
      memo: payload.memo || '',
      image_count: images.length,
      status: 'REGISTERED'
    };
    d.records.push(rec);
    syntheticStore.save();

    return { success: true, record_id: recordId, request_id: reqId, status: rec.status, created_at: now, image_count: images.length, record: rec };
  }

  // 사건 목록. 최근 등록한 사건이 앞에 온다.
  function listRecords() {
    const records = [...syntheticStore.data.records].reverse().map(rec => ({ ...rec, queue: recordQueue(rec) }));
    return { success: true, queue_counts: computeQueueCounts(records), records };
  }

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

      // Helper: JSON Body 읽기
      const readBody = async () => {

        return new Promise((resolve, reject) => {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
            if (body.length > 20 * 1024 * 1024) { // 20MB limit
              req.destroy();
              reject(new Error('Payload too large'));
            }
          });
          req.on('end', () => {
            try {
              resolve(body ? JSON.parse(body) : {});
            } catch (e) {
              reject(new Error('Invalid JSON'));
            }
          });
          req.on('error', reject);
        });
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

        // GET /api/repository-images - 정본 사진 카탈로그 목록 조회 (최소 정보만 공개)
        if (pathname === '/api/repository-images' && req.method === 'GET') {
          if (!repoImages) {
            return sendJson({ success: false, available: false, error: 'Repository images catalog not configured or initialized', total: 0, images: [] }, 503);
          }
          const listResult = typeof repoImages.list === 'function' ? repoImages.list() : { available: false, error: 'Catalog list method missing' };
          if (!listResult || !listResult.available) {
            return sendJson({
              success: false,
              available: false,
              error: listResult?.error || listResult?.reason || 'Repository images unavailable',
              total: 0,
              images: []
            }, 503);
          }

          const reqTrack = (urlObj.searchParams.get('track') || '').toLowerCase().trim();
          let allImages = listResult.images || [];
          if (reqTrack) {
            allImages = allImages.filter(img => (img.track || '').toLowerCase() === reqTrack);
          }

          const rawLimit = Number(urlObj.searchParams.get('limit'));
          const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 200) : 100;
          const rawOffset = Number(urlObj.searchParams.get('offset'));
          const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? Math.floor(rawOffset) : 0;

          const sliced = allImages.slice(offset, offset + limit).map(img => {
            const id = img.image_id || img.id;
            return {
              id,
              track: img.track,
              url: img.url || `/api/repository-images/${encodeURIComponent(id)}/file`
            };
          });

          return sendJson({
            success: true,
            available: true,
            total: allImages.length,
            offset,
            limit,
            repository: listResult.repository || null,
            commit: listResult.commit || null,
            images: sliced
          });
        }

        // GET /api/repository-images/:id/file - 허용된 정확한 원본 파일 스트리밍
        if (pathname.startsWith('/api/repository-images/') && pathname.endsWith('/file') && req.method === 'GET') {
          const parts = pathname.split('/');
          // /api/repository-images/:id/file -> parts[1]='api', parts[2]='repository-images', parts[3]=id, parts[4]='file'
          if (parts.length !== 5 || !parts[3]) {
            return sendJson({ error: 'Invalid repository image URL format' }, 400);
          }
          const imageId = decodeURIComponent(parts[3]);
          if (!repoImages) {
            return sendJson({ error: 'Repository images catalog unavailable' }, 503);
          }

          const fileData = typeof repoImages.get === 'function' ? repoImages.get(imageId) : null;
          if (!fileData || !fileData.buffer) {
            return sendJson({ error: `Repository image '${imageId}' not found in allowlist` }, 404);
          }

          res.writeHead(200, {
            'Content-Type': fileData.mimeType || 'image/png',
            'Content-Length': fileData.buffer.length,
            'Cache-Control': 'private, max-age=3600',
            'ETag': `W/"${fileData.sha256 || imageId}"`
          });
          return res.end(fileData.buffer);
        }

        // POST /api/records - 사건 등록 (직접 업로드 vs 저장소 사진 선택 상호 배타적 검증)
        if (pathname === '/api/records' && req.method === 'POST') {
          const payload = await readBody();
          const directImages = payload.images;
          const repoImageIds = payload.repository_image_ids;

          const hasDirect = Array.isArray(directImages) && directImages.length > 0;
          const hasRepo = Array.isArray(repoImageIds) && repoImageIds.length > 0;

          if (hasDirect && hasRepo) {
            return sendJson({ error: 'Cannot submit both direct upload images and repository_image_ids (mutually exclusive)' }, 400);
          }
          if (!hasDirect && !hasRepo) {
            return sendJson({ error: '사진을 1장 이상 올리거나 저장소 사진을 골라 주세요.' }, 400);
          }
          // 공백만 있는 장소는 저장하지 않는다. 여기서 먼저 거절한다.
          if (!String(payload.location ?? '').trim()) {
            return sendJson({ error: '장소를 입력해 주세요.' }, 400);
          }

          if (hasRepo) {
            // category 필수 검증: 반드시 'quality' 또는 'safety'여야 함 (자동 기본값 방지)
            if (!payload.category || !['quality', 'safety'].includes(payload.category)) {
              return sendJson({ error: '저장소 사진을 쓸 때는 분류(산업안전 또는 택배 발송 확인)를 골라 주세요.' }, 400);
            }

            if (repoImageIds.length < 1 || repoImageIds.length > 5) {
              return sendJson({ error: '저장소 사진은 1장 이상 5장 이하로 골라 주세요.' }, 400);
            }

            // 중복 ID 및 비문자열/공백 ID 검증
            for (const id of repoImageIds) {
              if (typeof id !== 'string' || !id.trim()) {
                return sendJson({ error: '저장소 사진 번호가 비어 있습니다. 사진을 다시 골라 주세요.' }, 400);
              }
            }
            const idSet = new Set(repoImageIds);
            if (idSet.size !== repoImageIds.length) {
              return sendJson({ error: '같은 저장소 사진을 두 번 골랐습니다. 한 번씩만 골라 주세요.' }, 400);
            }

            if (!repoImages) {
              return sendJson({ error: '저장소 사진을 지금 쓸 수 없습니다. 사진 파일을 직접 올려 주세요.' }, 503);
            }

            const selectedFiles = [];
            for (let i = 0; i < repoImageIds.length; i++) {
              const imgId = repoImageIds[i];
              const fileData = typeof repoImages.get === 'function' ? repoImages.get(imgId) : null;
              if (!fileData || !fileData.buffer) {
                return sendJson({ error: `저장소 사진(${imgId})을 찾지 못했거나 쓸 수 없는 사진입니다. 사진을 다시 골라 주세요.` }, 400);
              }
              if (fileData.track !== payload.category) {
                return sendJson({ error: `저장소 사진(${imgId})의 분류(${CATEGORY_LABELS[fileData.track] || fileData.track})가 사건 분류(${CATEGORY_LABELS[payload.category]})와 다릅니다. 분류를 맞춰 주세요.` }, 400);
              }
              if (fileData.buffer.length > MAX_IMAGE_SIZE) {
                return sendJson({ error: `저장소 사진(${imgId})이 2MB보다 큽니다. 다른 사진을 골라 주세요.` }, 400);
              }
              selectedFiles.push(fileData);
            }
            if (selectedFiles.reduce((sum, f) => sum + f.buffer.length, 0) > MAX_TOTAL_IMAGE_SIZE) {
              return sendJson({ error: '고른 저장소 사진의 합계가 3MB보다 큽니다. 사진 수를 줄여 합계 3MB 이하로 골라 주세요.' }, 400);
            }

            // 서버가 검증된 images 배열 구성
            payload.images = selectedFiles.map(f => ({
              filename: f.filename || `${f.image_id || f.id}.png`,
              mimeType: f.mimeType || 'image/png',
              base64: f.buffer.toString('base64')
            }));

            // 서버 주도 영구 출처(Provenance) 메모 부착 (클라이언트 출처를 신뢰하지 않음)
            // 카탈로그 값을 그대로 쓴다. RepositoryImages.get()은 저장소 이름과 검증한 40자리 커밋을 늘 함께 준다.
            const repoSlug = selectedFiles[0].repository;
            const commitSha = selectedFiles[0].commit;
            const provenanceLines = selectedFiles.map(f => `- ${f.image_id || f.id}: sha256=${f.sha256} (${f.filename || `${f.image_id || f.id}.png`})`);
            const provenanceBlock = `[Repository Images: ${repoSlug} @ ${commitSha}]\n${provenanceLines.join('\n')}`;

            payload.memo = payload.memo ? `${String(payload.memo).trim()}\n\n${provenanceBlock}` : provenanceBlock;
            delete payload.repository_image_ids;
          } else {
            // 직접 업로드 유효성 검사 (1~5장, 장당 2MiB, 합계 3MiB, 매직 바이트)
            const images = payload.images || [];
            let totalBytes = 0;
            if (images.length < 1 || images.length > 5) {
              return sendJson({ error: '사진은 1장 이상 5장 이하로 올려 주세요.' }, 400);
            }

            for (let i = 0; i < images.length; i++) {
              const img = images[i];
              if (!img.base64) {
                return sendJson({ error: `${i + 1}번째 사진 파일이 비어 있습니다. 사진을 다시 골라 주세요.` }, 400);
              }
              const buf = Buffer.from(img.base64, 'base64');
              if (buf.length > MAX_IMAGE_SIZE) {
                return sendJson({ error: `${i + 1}번째 사진이 2MB보다 큽니다. 2MB 이하 사진을 올려 주세요.` }, 400);
              }
              if (!validateImageMagicBytes(buf, img.mimeType)) {
                return sendJson({ error: `${i + 1}번째 파일은 사진 파일이 아닙니다. JPG나 PNG 사진을 올려 주세요.` }, 400);
              }
              totalBytes += buf.length;
            }
            if (totalBytes > MAX_TOTAL_IMAGE_SIZE) {
              return sendJson({ error: '사진 합계가 3MB보다 큽니다. 사진 수를 줄이거나 작은 사진으로 바꿔 합계 3MB 이하로 올려 주세요.' }, 400);
            }
          }

          const result = createRecord(payload);
          return sendJson(result, result.idempotent ? 200 : 201);
        }

        // GET /api/records - 사건 목록 조회
        if (pathname === '/api/records' && req.method === 'GET') {
          return sendJson(listRecords(), 200);
        }

        // GET /api/records/:id/images/:index - 이미지 제공 (정확한 원본만 제공, 임의 대체 엄격 금지)
        const imgMatch = pathname.match(/^\/api\/records\/([^/]+)\/images\/(\d+)$/);
        if (imgMatch && req.method === 'GET') {
          const recordId = imgMatch[1];
          const index = parseInt(imgMatch[2], 10);
          if (!syntheticStore.data.records.some(r => r.record_id === recordId)) {
            return sendJson({ error: '기록을 찾지 못했습니다. 목록에서 다시 골라 주세요.' }, 404);
          }
          const image = syntheticStore.images.get(`${recordId}_${index}`);
          if (image) {
            res.writeHead(200, { 'Content-Type': image.mime || 'image/png', 'Cache-Control': 'no-store' });
            return res.end(image.buffer);
          }
          // 사진이 없거나 인덱스가 벗어난 경우 명시적 404 반환 (다른 샘플 사진으로 대체하지 않음)
          return sendJson({ error: 'Image not found' }, 404);
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
    if (
      baseName.startsWith('.') ||
      baseName.includes('store.json') ||
      /store[^/\\]*_images[/\\]/.test(path.relative(PREVIEW_ROOT, file)) ||
      baseName.includes('.env')
    ) {
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
    syntheticStore,
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

module.exports = { createServer, validateImageMagicBytes, SyntheticStore };
