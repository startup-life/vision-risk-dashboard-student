/**
 * 비전 리스크 대시보드 - Same-Origin 로컬 서버
 *
 * 정적 파일(preview/) 및 동일 오리진 REST API(/api/*)를 제공합니다.
 * 보안: 127.0.0.1 루프백 바인드 및 상태 변경 요청 Origin 검사.
 * 이미지 검사: 1~5장, 장당 2MiB 이하, JPG/PNG 매직 바이트 검증.
 * 저장: 사건·판단·조치·기준 확인 결과는 로컬 저장소(preview/_synthetic_store.json)에 둔다.
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { ImageCache } = require('./image-cache.cjs');
const { NotebookLMClient, findMcpExecutable } = require('./notebooklm-client.cjs');
const { buildReviewSummary, computeQueueCounts } = require('./review-summary.cjs');
const { JobManager, JobConflictError, JobStoreUnhealthyError } = require('./jobs.cjs');
const { describeModes, resolveModes } = require('./local-config.cjs');
const { RepositoryImages } = require('./repository-images.cjs');

const PREVIEW_ROOT = path.resolve(__dirname, '../preview');
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2 MiB
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
    this.data = { records: [], evidence_checks: [], final_reviews: [], actions: [], history: [] };
    this.images = new Map(); // key: recordId_index -> { buffer, mime }. mime이 없으면(예전 사진) 응답은 image/png다.
    this.load();
  }

  load() {
    const lists = Object.keys(this.data); // 생성자가 정한 이 회차의 목록 칸
    if (this.filepath && fs.existsSync(this.filepath)) {
      try {
        const raw = fs.readFileSync(this.filepath, 'utf8');
        this.data = JSON.parse(raw);
      } catch (e) {
        // fallback to empty
      }
    }
    this.fillMissing(lists);
    this.loadImages();
  }

  // 지난 회차 서버가 만든 기록 파일에는 이 회차에서 새로 쓰는 목록 칸이 없다. 없는 칸은 빈 목록으로 채운다.
  // 버전·마지막 수정 시각이 없는 사건(사건 정보 수정이 없던 회차에 등록한 사건)은 버전 1·등록 시각으로 본다.
  fillMissing(lists) {
    if (!this.data || typeof this.data !== 'object' || Array.isArray(this.data)) this.data = {};
    for (const key of lists) {
      if (!Array.isArray(this.data[key])) this.data[key] = [];
    }
    for (const rec of this.data.records) {
      if (!rec || typeof rec !== 'object') continue;
      if (!rec.version) rec.version = 1;
      if (!rec.updated_at) rec.updated_at = rec.created_at;
    }
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

// 연동 스위치를 정한다. notebooklmMode를 주면 그 값을 쓰고, 테스트용 syntheticMode: true는 NotebookLM을 모의로, false는 실제로 둔다.
// 아무것도 주지 않으면 환경 변수 NOTEBOOKLM_MODE를 읽는다. 허용되지 않는 값이면 LocalConfigError를 던져 포트를 잡기 전에 멈춘다.
function serverModes(options) {
  if (options.notebooklmMode) return resolveModes({ NOTEBOOKLM_MODE: options.notebooklmMode });
  if (options.syntheticMode === true) return { notebooklm: 'mock' };
  if (options.syntheticMode === false) return { notebooklm: 'live' };
  return resolveModes(process.env);
}

// 꺼진 연동을 API로 요청하면 돌려주는 오류(409).
const INTEGRATION_OFF_MESSAGES = {
  notebooklm: 'NotebookLM 연동이 꺼져 있습니다(NOTEBOOKLM_MODE=off). 관련 기준을 확인하려면 NOTEBOOKLM_MODE를 바꾸고 로컬 서버를 다시 시작하세요.'
};

// 서버 기동 때 찍는 연동 상태 줄. NotebookLM live인데 MCP 실행 파일을 찾지 못하면 첫 기준 확인 전에 알 수 있게 그 자리에 적는다.
// /api/health의 integration_status는 describeModes 그대로 둔다.
function startupModesLine(modes, findMcp = () => findMcpExecutable()) {
  const line = describeModes(modes);
  if (modes.notebooklm !== 'live' || findMcp()) return line;
  return line.replace('NotebookLM live', 'NotebookLM live(실행 파일을 찾지 못함, docs/LOCAL-SETUP.md 2절)');
}

// options.log: 이미지 저장소 연결 실패 같은 시작 경고를 받을 함수(기본 console.warn). 테스트에서 끌 때 쓴다.
function createServer(options = {}) {
  const modes = serverModes(options);
  const syntheticStorePath = options.syntheticStorePath || path.resolve(__dirname, '../preview/_synthetic_store.json');
  const syntheticStore = new SyntheticStore(syntheticStorePath);
  const mcpClient = new NotebookLMClient(options.mcpOptions || {});
  const repoImagesRoot = options.repositoryImagesRoot || process.env.REPOSITORY_IMAGES_ROOT;
  let repoImages = options.repoImages || null;
  if (!repoImages) {
    try {
      repoImages = new RepositoryImages({ root: repoImagesRoot, logLabel: 'server', log: options.log });
    } catch (e) {
      repoImages = null;
    }
  }

  const jobsDir = options.jobsDir || path.resolve(__dirname, '../preview/_synthetic_jobs');

  const imageCache = new ImageCache();
  const allowedOrigins = options.allowedOrigins || ['http://127.0.0.1:8765', 'http://localhost:8765'];

  const jobManager = new JobManager({
    jobsDir,
    reconcileFn: async (job) => {
      const res = await callStore('reconcile_job', {
        request_id: job.request_id,
        record_id: job.record_id,
        job_type: job.job_type
      });
      if (res && res.reconciled) {
        return res.check || null;
      }
      return null;
    }
  });

  // 저장소 호출 헬퍼. 동작 이름은 서버가 정한다.
  async function callStore(action, payload) {
    return handleSyntheticAction(action, { ...payload });
  }

  // 로컬 저장소 액션 핸들러
  function handleSyntheticAction(action, payload) {
    const d = syntheticStore.data;
    const now = new Date().toISOString();

    if (action === 'create_record') {
      const reqId = payload.request_id || `req-${Date.now()}`;
      const existing = d.records.find(r => r.request_id === reqId);
      if (existing) {
        // 새로 만들 때와 같은 필드로 돌려준다. 화면은 record_id로 상세로 이동한다.
        return { success: true, idempotent: true, record_id: existing.record_id, request_id: existing.request_id, status: existing.status, created_at: existing.created_at, image_count: existing.image_count, drive_file_ids: existing.drive_file_ids, record: existing };
      }

      const recordId = `R-${d.records.length + 101}`;
      const images = payload.images || [];
      const fileIds = images.map((img, i) => {
        const fid = `synth-file-${recordId}-${i + 1}`;
        if (img.base64) {
          syntheticStore.saveImage(recordId, i, Buffer.from(img.base64, 'base64'), img.mimeType);
        }
        return fid;
      });

      const rec = {
        record_id: recordId,
        request_id: reqId,
        created_at: now,
        location: payload.location || '창고 A',
        category: payload.category || 'safety',
        memo: payload.memo || '',
        image_count: images.length,
        status: 'REGISTERED',
        drive_folder_id: 'synth-folder-private',
        drive_file_ids: fileIds,
        version: 1,
        updated_at: now
      };

      d.records.push(rec);
      d.history.push({
        history_id: `HIST-${Date.now()}-1`,
        record_id: recordId,
        timestamp: now,
        phase: 'REGISTER',
        action_name: '사건 등록',
        summary: `사진 ${images.length}장 보존 완료 (${rec.location})`,
        operator: '시스템'
      });
      syntheticStore.save();

      return {
        success: true,
        record_id: recordId,
        request_id: reqId,
        status: 'REGISTERED',
        created_at: now,
        image_count: images.length,
        drive_file_ids: fileIds,
        version: 1,
        updated_at: now,
        record: rec
      };
    }

    if (action === 'update_record') {
      const rec = d.records.find(r => r.record_id === payload.record_id);
      if (!rec) return { success: false, error: '기록을 찾지 못했습니다. 목록에서 다시 골라 주세요.', error_code: 'NOT_FOUND' };

      const reqId = payload.request_id || '';
      if (reqId) {
        const existing = d.history.find(h => h.record_id === payload.record_id && h.phase === 'RECORD_UPDATE' && h.summary && h.summary.includes(`req=${reqId}`));
        if (existing) {
          return { success: true, idempotent: true, status: 'updated', record_id: rec.record_id, version: rec.version || 1, updated_at: rec.updated_at || rec.created_at, record: rec };
        }
      }

      if (payload.category !== undefined && payload.category !== 'safety' && payload.category !== 'quality') {
        return { success: false, error: '분류는 산업안전 또는 택배 발송 확인 중에서 골라 주세요.', error_code: 'BAD_REQUEST' };
      }

      const oldLoc = rec.location;
      const oldCat = rec.category;
      const oldMemo = rec.memo;
      const oldVersion = rec.version || 1;

      const newLoc = payload.location !== undefined ? String(payload.location) : oldLoc;
      const newCat = payload.category !== undefined ? String(payload.category) : oldCat;
      const newMemo = payload.memo !== undefined ? String(payload.memo) : oldMemo;
      const newVersion = oldVersion + 1;

      rec.location = newLoc;
      rec.category = newCat;
      rec.memo = newMemo;
      rec.version = newVersion;
      rec.updated_at = now;

      const summaryParts = [];
      if (oldLoc !== newLoc) summaryParts.push(`장소: ${oldLoc}->${newLoc}`);
      if (oldCat !== newCat) summaryParts.push(`분류: ${oldCat}->${newCat}`);
      if (oldMemo !== newMemo) summaryParts.push(`메모: ${oldMemo}->${newMemo}`);
      const summaryText = `수정(v${oldVersion}->v${newVersion}) [${summaryParts.join(', ') || '정보 갱신'}]${reqId ? ` (req=${reqId})` : ''}`;

      d.history.push({
        history_id: `HIST-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        record_id: rec.record_id,
        timestamp: now,
        phase: 'RECORD_UPDATE',
        action_name: '사건 정보 수정',
        summary: summaryText,
        operator: payload.operator || '현장 작업자'
      });
      syntheticStore.save();

      return {
        success: true,
        idempotent: false,
        status: 'updated',
        record_id: rec.record_id,
        version: newVersion,
        updated_at: now,
        record: rec
      };
    }

    if (action === 'get_records') {
      const records = [...d.records].reverse().map(rec => {
        const evidenceList = d.evidence_checks ? d.evidence_checks.filter(x => x.record_id === rec.record_id) : [];
        const reviewList = d.final_reviews ? d.final_reviews.filter(x => x.record_id === rec.record_id) : [];
        const actionList = d.actions ? d.actions.filter(x => x.record_id === rec.record_id) : [];
        const review_summary = buildReviewSummary(rec, evidenceList, reviewList, actionList);
        return { ...rec, review_summary };
      });
      const queue_counts = computeQueueCounts(records);
      return { success: true, queue_counts, records };
    }

    if (action === 'get_record') {
      const record = d.records.find(r => r.record_id === payload.record_id);
      if (!record) return { success: false, status: 'error', error_code: 'NOT_FOUND', error: '기록을 찾지 못했습니다. 목록에서 다시 골라 주세요.' };
      const evidence = d.evidence_checks.filter(x => x.record_id === payload.record_id);
      const reviews = d.final_reviews.filter(x => x.record_id === payload.record_id);
      const actions = d.actions.filter(x => x.record_id === payload.record_id);
      const history = d.history.filter(x => x.record_id === payload.record_id);

      return {
        success: true,
        record,
        evidence_check: evidence[evidence.length - 1] || null,
        final_review: reviews[reviews.length - 1] || null,
        actions,
        history
      };
    }

    if (action === 'save_evidence_check') {
      if (payload.test_fail_save) {
        return { success: false, error_code: 'STORAGE_FAILED', error: 'Simulated storage failure' };
      }
      if (payload.request_id) {
        const existing = d.evidence_checks.find(x => x.record_id === payload.record_id && x.request_id === payload.request_id);
        if (existing) {
          return { success: true, idempotent: true, check_id: existing.check_id, record_id: existing.record_id };
        }
      }
      const checkId = `EVID-${Date.now()}`;
      const inputVersion = Number(payload.input_version) || 1;
      d.evidence_checks.push({
        check_id: checkId,
        record_id: payload.record_id,
        request_id: payload.request_id || '',
        created_at: now,
        standard_id: payload.standard_id || 'C-01',
        notebook_id: payload.notebook_id || 'notebook-synthetic',
        source_id: payload.source_id || 'src-synthetic',
        source_name: payload.source_name || '',
        answer: payload.answer || '',
        references: payload.references || null,
        quote: payload.quote || '',
        match: payload.match ? 'TRUE' : 'FALSE',
        sufficient: payload.sufficient ? 'TRUE' : 'FALSE',
        notes: payload.notes || '',
        input_version: inputVersion
      });
      d.history.push({
        history_id: `HIST-${Date.now()}-3`,
        record_id: payload.record_id,
        timestamp: now,
        phase: 'EVIDENCE_CHECK',
        action_name: '기준 근거 대조',
        summary: `기준 ${payload.standard_id} 대조 (충족여부: ${payload.sufficient})`,
        // 로컬 저장소에도 실제 NotebookLM 결과가 저장된다(NOTEBOOKLM_MODE=live). "(Synthetic)"은 모의 결과에만 붙인다.
        operator: modes.notebooklm === 'mock' ? 'NotebookLM MCP (Synthetic)' : 'NotebookLM MCP'
      });
      syntheticStore.save();
      return { success: true, check_id: checkId, record_id: payload.record_id, input_version: inputVersion };
    }

    if (action === 'reconcile_job') {
      const reqId = payload.request_id;
      const jobType = payload.job_type || 'evidence_check';
      if (!reqId) {
        return { success: false, error_code: 'BAD_REQUEST', error: '요청 번호가 없습니다. 페이지를 새로 고친 뒤 다시 시도해 주세요.' };
      }
      if (jobType === 'evidence_check') {
        const existing = d.evidence_checks.find(x => x.record_id === payload.record_id && x.request_id === reqId);
        if (existing) {
          return { success: true, reconciled: true, job_type: 'evidence_check', check_id: existing.check_id, record_id: existing.record_id, check: existing };
        }
      }
      return { success: true, reconciled: false };
    }

    if (action === 'save_review') {
      const rec = d.records.find(r => r.record_id === payload.record_id);
      if (!rec) return { success: false, status: 'error', error_code: 'NOT_FOUND', error: '기록을 찾지 못했습니다. 목록에서 다시 골라 주세요.' };
      if (payload.request_id) {
        const existing = d.final_reviews.find(x => x.record_id === payload.record_id && x.request_id === payload.request_id);
        if (existing) {
          return { success: true, idempotent: true, review_id: existing.review_id, record_id: existing.record_id, status: rec.status };
        }
      }
      const revId = `REV-${Date.now()}`;
      const decision = payload.decision;
      d.final_reviews.push({
        review_id: revId,
        record_id: payload.record_id,
        request_id: payload.request_id || '',
        created_at: now,
        decision,
        basis: payload.basis || '',
        followup_note: payload.followup_note || '',
        reviewer: payload.reviewer || '현장 검토자'
      });
      const newStatus = decision === '판단 보류' ? 'HOLD' : 'REVIEWED';
      rec.status = newStatus;
      d.history.push({
        history_id: `HIST-${Date.now()}-4`,
        record_id: payload.record_id,
        timestamp: now,
        phase: 'HUMAN_REVIEW',
        action_name: '사람 최종 판정',
        summary: `${decision} (${payload.basis || ''})`,
        operator: payload.reviewer || '현장 검토자'
      });
      syntheticStore.save();
      return { success: true, review_id: revId, record_id: payload.record_id, status: newStatus };
    }

    if (action === 'save_action') {
      const rec = d.records.find(r => r.record_id === payload.record_id);
      if (!rec) return { success: false, status: 'error', error_code: 'NOT_FOUND', error: '기록을 찾지 못했습니다. 목록에서 다시 골라 주세요.' };
      if (payload.request_id) {
        const existing = d.actions.find(x => x.record_id === payload.record_id && x.request_id === payload.request_id);
        if (existing) {
          return { success: true, idempotent: true, action_id: existing.action_id, record_id: existing.record_id, status: rec.status };
        }
      }
      const actId = `ACT-${Date.now()}`;
      const isComplete = payload.action_type === 'COMPLETE';
      d.actions.push({
        action_id: actId,
        record_id: payload.record_id,
        request_id: payload.request_id || '',
        created_at: now,
        action_type: payload.action_type || 'REQUEST',
        description: payload.description || '',
        evidence_note: payload.evidence_note || '',
        actor: payload.actor || '현장 담당자',
        status: isComplete ? 'COMPLETED' : 'PENDING'
      });
      const newStatus = isComplete ? 'ACTION_COMPLETED' : 'ACTION_REQUESTED';
      rec.status = newStatus;
      d.history.push({
        history_id: `HIST-${Date.now()}-5`,
        record_id: payload.record_id,
        timestamp: now,
        phase: 'ACTION_TAKEN',
        action_name: isComplete ? '조치 완료' : '조치 요청',
        summary: `${payload.description || ''} (완료근거: ${payload.evidence_note || '미등록'})`,
        operator: payload.actor || '현장 담당자'
      });
      syntheticStore.save();
      return { success: true, action_id: actId, record_id: payload.record_id, status: newStatus };
    }

    return { success: false, error: 'Unknown synthetic action: ' + action };
  }

  // 포트를 잡은 뒤 jobManager.init()이 끝날 때까지 요청을 기다리게 한다.
  let jobsReady = null;

  const server = http.createServer(async (req, res) => {
    if (jobsReady) await jobsReady;
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

      const mapStoreResultToHttp = (result, defaultSuccess = 200) => {
        if (result.success) {
          return result.idempotent ? 200 : defaultSuccess;
        }
        if (result.error_code === 'NOT_FOUND') {
          return 404;
        }
        if (result.error_code === 'BAD_REQUEST') {
          return 400;
        }
        return 500;
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
          // 꺼진 NotebookLM은 MCP 서버를 띄우지 않는다.
          const mcpStatus = modes.notebooklm === 'off'
            ? { connected: false, authStatus: 'off', error: INTEGRATION_OFF_MESSAGES.notebooklm }
            : await mcpClient.getStatus();
          return sendJson({
            status: 'ok',
            mcp_status: mcpStatus,
            modes: { notebooklm: modes.notebooklm },
            integration_status: describeModes(modes)
          });
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
          // 공백만 있는 장소를 받으면 저장소가 기본 장소로 채운다. 그래서 여기서 먼저 거절한다.
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
            // 직접 업로드 유효성 검사 (1~5장, 2MiB, 매직 바이트)
            const images = payload.images || [];
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
            }
          }

          const result = await callStore('create_record', payload);
          return sendJson(result, mapStoreResultToHttp(result, 201));
        }

        // GET /api/records - 사건 목록 조회
        if (pathname === '/api/records' && req.method === 'GET') {
          const result = await callStore('get_records', {});
          if (result && result.success && Array.isArray(result.records)) {
            // 목록에 사진 파일 ID가 있으므로 홈 카드 사진이 사건을 다시 조회하지 않게 캐시에 넣는다.
            for (const r of result.records) imageCache.rememberRecord(r.record_id, { success: true, record: r });
          }
          return sendJson(result, mapStoreResultToHttp(result, 200));
        }

        // 헬퍼: recordId 존재 검증. 실패하면 null 대신 원인이 담긴 저장소 결과를 돌려준다.
        const RECORD_NOT_FOUND = { success: false, error_code: 'NOT_FOUND', error: '기록을 찾지 못했습니다. 목록에서 다시 골라 주세요.' };
        const ensureRecordExists = async (recordId) => {
          if (!recordId || typeof recordId !== 'string') return RECORD_NOT_FOUND;
          const res = await callStore('get_record', { record_id: recordId });
          if (!res || (res.success && !res.record)) return RECORD_NOT_FOUND;
          return res;
        };
        // 조회 실패 응답: 없는 기록은 기존과 같은 404 본문, 그 밖에는 mapStoreResultToHttp로 실제 원인을 쓴다.
        const sendRecordLookupFailure = (recRes) => {
          if (recRes.error_code === 'NOT_FOUND') {
            return sendJson({ error: '기록을 찾지 못했습니다. 목록에서 다시 골라 주세요.' }, 404);
          }
          const { success, status, error_code, error, interrupted } = recRes;
          return sendJson({ success, status, error_code, error, interrupted }, mapStoreResultToHttp(recRes));
        };

        // 기준별 최신 근거. 저장소 상세는 사건의 최신 근거 1건만 주므로 이 서버가 끝낸 근거 확인 작업 결과로 기준별 값을 채운다.
        // 작업은 저장이 성공해야 succeeded가 되므로 저장소의 최신 근거가 가장 나중 값이다. 그 기준은 저장소 값으로 덮어쓴다.
        const evidenceByStandard = (recordId, latest) => {
          const byStandard = {};
          let jobs = [];
          try {
            jobs = jobManager.listJobs({ record_id: recordId, job_type: 'evidence_check', status: 'succeeded' }).reverse();
          } catch (err) {
            // 작업 저장소를 읽을 수 없으면 의도적으로 저장소의 최신 근거만 쓴다. 상세 조회 자체는 막지 않는다.
            if (!(err instanceof JobStoreUnhealthyError)) throw err;
          }
          for (const job of jobs) {
            const r = job.result;
            if (!r || !r.standard_id) continue;
            byStandard[r.standard_id] = {
              request_id: job.request_id,
              standard_id: r.standard_id,
              source_id: r.source_id || '',
              source_name: r.source_name || '',
              quote: r.quote || '',
              answer: r.answer || '',
              references: r.references || null,
              match: r.match,
              sufficient: r.sufficient,
              notes: r.notes || '',
              input_version: Number(r.input_version) || job.input_version || 1,
              created_at: r.created_at || job.completed_at || job.created_at
            };
          }
          if (latest && latest.standard_id) byStandard[latest.standard_id] = latest;
          return byStandard;
        };

        // GET /api/records/:id - 사건 상세 조회
        const getMatch = pathname.match(/^\/api\/records\/([^/]+)$/);
        if (getMatch && req.method === 'GET') {
          const recordId = getMatch[1];
          const recRes = await ensureRecordExists(recordId);
          if (!recRes.success) {
            return sendRecordLookupFailure(recRes);
          }
          imageCache.rememberRecord(recordId,recRes);
          const reviewSummary = recRes.review_summary || recRes.record.review_summary || buildReviewSummary(recRes.record, recRes.evidence_check ? [recRes.evidence_check] : [], recRes.final_review ? [recRes.final_review] : [], recRes.actions || []);
          return sendJson({ ...recRes, review_summary: reviewSummary, evidence_by_standard: evidenceByStandard(recordId, recRes.evidence_check) }, 200);
        }

        // PATCH /api/records/:id - 사건 정보 수정 (화이트리스트, 멱등성, 버전 증가)
        if (getMatch && req.method === 'PATCH') {
          const recordId = getMatch[1];
          const recRes = await ensureRecordExists(recordId);
          if (!recRes.success) {
            return sendRecordLookupFailure(recRes);
          }

          const rawPayload = await readBody();
          // 필드 화이트리스트 검증: location, category, memo, request_id, operator만 허용
          // (file_ids, final_review, status 등 임의 변조 시도는 제거)
          const sanitizedPayload = {
            record_id: recordId,
            request_id: rawPayload.request_id || '',
            operator: rawPayload.operator || '현장 작업자'
          };
          if (rawPayload.location !== undefined) sanitizedPayload.location = rawPayload.location;
          if (rawPayload.category !== undefined) sanitizedPayload.category = rawPayload.category;
          if (rawPayload.memo !== undefined) sanitizedPayload.memo = rawPayload.memo;

          // 저장소 사진 출처는 등록 때 서버가 붙인 값이라 수정으로 바꾸지 못한다. 받은 메모에서는 출처 표지 앞만 쓰고
          // 저장된 출처를 글자 그대로 다시 붙인다(등록 때와 같은 형식). 출처가 없는 사건은 받은 메모를 그대로 보낸다.
          const PROVENANCE_MARK = '[Repository Images:';
          const storedMemo = String(recRes.record.memo || '');
          const markAt = storedMemo.indexOf(PROVENANCE_MARK);
          if (sanitizedPayload.memo !== undefined && markAt !== -1) {
            const storedProvenance = storedMemo.slice(markAt);
            const note = String(sanitizedPayload.memo ?? '').split(PROVENANCE_MARK)[0].trim();
            sanitizedPayload.memo = note ? `${note}\n\n${storedProvenance}` : storedProvenance;
          }

          if (sanitizedPayload.location !== undefined && !String(sanitizedPayload.location ?? '').trim()) {
            return sendJson({ error: '장소를 입력해 주세요.' }, 400);
          }
          if (sanitizedPayload.category !== undefined && sanitizedPayload.category !== 'safety' && sanitizedPayload.category !== 'quality') {
            return sendJson({ error: '분류는 산업안전 또는 택배 발송 확인 중에서 골라 주세요.' }, 400);
          }

          const result = await callStore('update_record', sanitizedPayload);
          if (result.success) imageCache.invalidate(recordId);
          return sendJson(result, mapStoreResultToHttp(result, 200));
        }

        // GET /api/records/:id/images/:index - 이미지 제공 (정확한 원본만 제공, 임의 대체 엄격 금지)
        const imgMatch = pathname.match(/^\/api\/records\/([^/]+)\/images\/(\d+)$/);
        if (imgMatch && req.method === 'GET') {
          const recordId = imgMatch[1];
          const index = parseInt(imgMatch[2], 10);

          const recRes = await imageCache.record(recordId,()=>ensureRecordExists(recordId));
          if (recRes.error_code === 'NOT_FOUND') {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: '기록을 찾지 못했습니다. 목록에서 다시 골라 주세요.' }));
          }
          if (!recRes.success) {
            return sendRecordLookupFailure(recRes);
          }

          if (syntheticStore.images.has(`${recordId}_${index}`)) {
            const image = syntheticStore.images.get(`${recordId}_${index}`);
            res.writeHead(200, { 'Content-Type': image.mime || 'image/png', 'Cache-Control': 'no-store' });
            return res.end(image.buffer);
          }

          // 원본이 없거나 인덱스가 벗어난 경우 명시적 404 반환 (다른 샘플 사진으로 대체하지 않음)
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Image not found' }));
        }

        // POST /api/records/:id/evidence-check - NotebookLM MCP 근거 확인 비동기 요청 (202 Accepted)
        const evidMatch = pathname.match(/^\/api\/records\/([^/]+)\/evidence-check$/);
        if (evidMatch && req.method === 'POST') {
          if (modes.notebooklm === 'off') {
            return sendJson({ success: false, status: 'disabled', error_code: 'INTEGRATION_OFF', error: INTEGRATION_OFF_MESSAGES.notebooklm }, 409);
          }
          const recordId = evidMatch[1];
          const recRes = await ensureRecordExists(recordId);
          if (!recRes.success) {
            return sendRecordLookupFailure(recRes);
          }

          const currentRecord = recRes.record;
          const currentVersion = Number(currentRecord.version) || 1;

          const payload = await readBody();
          const reqId = payload.request_id || ('req_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8));
          const standardId = payload.standard_id || 'C-01';

          // 질의는 등록 때 받은 사건 정보로만 만든다(클라이언트 조작 방지 및 스냅샷 고정).
          // 메모 끝의 저장소 사진 출처(서버가 붙인 sha256 목록)는 기준과 무관해 뺀다. NotebookLM은 사진을 읽지 않으므로 장수만 적는다.
          const userQuery = (payload.query || '').trim();
          const fieldMemo = String(currentRecord.memo || '').split('[Repository Images:')[0].trim();
          const imageCount = Number(currentRecord.image_count) || (Array.isArray(currentRecord.drive_file_ids) ? currentRecord.drive_file_ids.length : 0);
          const observationParts = [
            `분류: ${CATEGORY_LABELS[currentRecord.category] || currentRecord.category || '미지정'}`,
            `장소: ${currentRecord.location || '미지정'}`,
            fieldMemo ? `현장 메모: ${fieldMemo}` : '',
            imageCount ? `현장 사진 ${imageCount}장` : ''
          ].filter(Boolean).join(' | ');

          const fullQuery = userQuery
            ? `${userQuery} [현장 관찰: ${observationParts}]`
            : (observationParts || '현장 사실 대조');

          const inputSnapshot = {
            version: currentVersion,
            updated_at: currentRecord.updated_at || currentRecord.created_at,
            standard_id: standardId,
            query: fullQuery
          };

          // 모의 NotebookLM일 때만 모의 노트북·소스 ID를 채운다. 실제 NotebookLM은 로컬 저장소에서도 설정한 ID를 쓴다.
          const mockNotebook = modes.notebooklm === 'mock';
          const configuredNotebookId = process.env.NOTEBOOKLM_NOTEBOOK_ID || (mockNotebook ? 'mock-notebook' : '');
          const configuredSourceIds = process.env.NOTEBOOKLM_SOURCE_IDS
            ? process.env.NOTEBOOKLM_SOURCE_IDS.split(',').map(s => s.trim()).filter(Boolean)
            : (mockNotebook ? ['src-standards-v1'] : []);

          try {
            const { job } = jobManager.createJob({
              job_type: 'evidence_check',
              record_id: recordId,
              request_id: reqId,
              input_version: currentVersion,
              input_snapshot: inputSnapshot,
              executor: async (j) => {
                // 1. MCP 클라이언트를 통한 근거 대조
                const mcpResult = await mcpClient.checkEvidence({
                  standard_id: standardId,
                  notebook_id: configuredNotebookId,
                  source_ids: configuredSourceIds,
                  query: fullQuery,
                  synthetic: mockNotebook,
                  test_external_source: payload.test_external_source,
                  test_no_citation: payload.test_no_citation
                });

                if (!mcpResult.success) {
                  const err = new Error(mcpResult.error || 'Evidence check failed');
                  err.code = mcpResult.error_code || 'PROVIDER_ERROR';
                  throw err;
                }

                // 2. MCP 결과 즉시 원자적 디스크 저장 (저장소 저장 실패 시에도 작업 파일에 보존)
                jobManager.persistProviderResult(j.job_id, mcpResult);

                const sourceName = mcpResult.source_name || mcpResult.source_title || '';

                // 3. 대조 결과를 저장소의 evidence_checks에 기록 (모델 재호출 방지)
                const saveRes = await callStore('save_evidence_check', {
                  record_id: recordId,
                  request_id: reqId,
                  input_version: currentVersion,
                  standard_id: mcpResult.standard_id,
                  notebook_id: mcpResult.notebook_id,
                  source_id: mcpResult.source_id,
                  source_name: sourceName,
                  answer: mcpResult.answer || '',
                  references: mcpResult.references || null,
                  quote: mcpResult.quote,
                  match: mcpResult.match,
                  sufficient: mcpResult.sufficient,
                  notes: mcpResult.notes,
                  test_fail_save: payload.test_fail_save
                });

                if (!saveRes.success) {
                  const err = new Error(`기준 확인 결과를 저장소에 저장하지 못했습니다: ${saveRes.error || saveRes.status || '저장 응답에 오류 내용이 없습니다.'}`);
                  err.code = saveRes.error_code || 'STORAGE_FAILED';
                  if (saveRes.interrupted) err.interrupted = true;
                  throw err;
                }

                return {
                  ...mcpResult,
                  source_name: sourceName,
                  provider_result: mcpResult
                };
              }
            });

            return sendJson({
              success: true,
              status: job.status,
              job_id: job.job_id,
              request_id: job.request_id
            }, 202);
          } catch (err) {
            if (err instanceof JobConflictError) {
              return sendJson({ error: err.message, error_code: 'CONFLICT' }, 409);
            }
            if (err instanceof JobStoreUnhealthyError) {
              return sendJson({ error: err.message, error_code: 'SERVICE_UNAVAILABLE' }, 503);
            }
            throw err;
          }
        }

        // GET /api/jobs - 작업 목록 조회
        if (pathname === '/api/jobs' && req.method === 'GET') {
          const urlObj = new URL(req.url, 'http://127.0.0.1');
          const record_id = urlObj.searchParams.get('record_id');
          const job_type = urlObj.searchParams.get('job_type');
          const status = urlObj.searchParams.get('status');
          const jobs = jobManager.listJobs({ record_id, job_type, status });
          return sendJson({ success: true, jobs }, 200);
        }

        // GET /api/jobs/:id - 단일 작업 상세 조회
        const jobMatch = pathname.match(/^\/api\/jobs\/([^/]+)$/);
        if (jobMatch && req.method === 'GET') {
          const jobId = jobMatch[1];
          const job = jobManager.getJob(jobId);
          if (!job) {
            return sendJson({ error: 'Job not found' }, 404);
          }
          return sendJson({ success: true, job }, 200);
        }

        // POST /api/jobs/:id/ack - 지속 알림 명시적 닫음/확인
        const jobAckMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/ack$/);
        if (jobAckMatch && req.method === 'POST') {
          const jobId = jobAckMatch[1];
          const job = jobManager.ackJob(jobId);
          if (!job) {
            return sendJson({ error: 'Job not found' }, 404);
          }
          return sendJson({ success: true, job }, 200);
        }

        // POST /api/records/:id/review - 사람 최종 판정 저장 (4종 판정 및 근거 검증)
        const reviewMatch = pathname.match(/^\/api\/records\/([^/]+)\/review$/);
        // 사건이 있는지는 저장소 저장이 확인한다(없으면 NOT_FOUND).
        if (reviewMatch && req.method === 'POST') {
          const recordId = reviewMatch[1];
          const payload = await readBody();
          delete payload.record_id;

          const ALLOWED_DECISIONS = ['위험 확인', '기준 충족', '판단 보류', '해당 없음'];
          if (!payload.decision || !ALLOWED_DECISIONS.includes(payload.decision)) {
            return sendJson({ error: `판정 결과를 골라 주세요(${ALLOWED_DECISIONS.join(', ')}).` }, 400);
          }
          if (!payload.basis || typeof payload.basis !== 'string' || !payload.basis.trim()) {
            return sendJson({ error: '판단 근거를 입력해 주세요.' }, 400);
          }

          const reqId = payload.request_id || '';
          const result = await callStore('save_review', {
            ...payload,
            record_id: recordId,
            request_id: reqId
          });
          return sendJson(result, mapStoreResultToHttp(result, 200));
        }

        // POST /api/records/:id/actions - 대응 조치 기록 (유형 및 완료 근거 검증)
        const actionMatch = pathname.match(/^\/api\/records\/([^/]+)\/actions$/);
        // 사건이 있는지는 저장소 저장이 확인한다(없으면 NOT_FOUND).
        if (actionMatch && req.method === 'POST') {
          const recordId = actionMatch[1];
          const payload = await readBody();
          const reqId = payload.request_id || '';
          delete payload.record_id;

          const ALLOWED_ACTIONS = ['REQUEST', 'COMPLETE'];
          if (!payload.action_type || !ALLOWED_ACTIONS.includes(payload.action_type)) {
            return sendJson({ error: '조치 유형을 골라 주세요(조치 요청 또는 조치 완료).' }, 400);
          }
          if (!payload.description || typeof payload.description !== 'string' || !payload.description.trim()) {
            return sendJson({ error: '조치 내용을 입력해 주세요.' }, 400);
          }
          if (payload.action_type === 'COMPLETE') {
            if (!payload.evidence_note || typeof payload.evidence_note !== 'string' || !payload.evidence_note.trim()) {
              return sendJson({ error: '조치 완료를 기록하려면 완료 증빙 메모를 입력해 주세요.' }, 400);
            }
          }

          const result = await callStore('save_action', {
            ...payload,
            record_id: recordId,
            request_id: reqId
          });
          return sendJson(result, mapStoreResultToHttp(result, 200));
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
      pathname.startsWith('/_jobs') ||
      pathname.includes('/_jobs/') ||
      file.includes(`${path.sep}_jobs${path.sep}`) ||
      file.includes('_jobs') ||
      baseName.startsWith('.') ||
      baseName.includes('store.json') ||
      /store[^/\\]*_images[/\\]/.test(path.relative(PREVIEW_ROOT, file)) ||
      baseName.includes('.env') ||
      baseName.includes('.owner.lock')
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
    modes,
    mcpClient,
    syntheticStore,
    jobManager,
    // 포트를 먼저 잡아 같은 포트의 두 번째 서버를 막는다(포트가 상호 배제 역할을 한다).
    // listen이 실패하면 작업 저장소와 lock은 건드리지 않는다. 성공한 뒤에만 jobManager.init()을 부른다.
    listen: async (port = 8765, host = '127.0.0.1') => {
      let markReady;
      jobsReady = new Promise(resolve => { markReady = resolve; });
      let address;
      try {
        address = await new Promise((resolve, reject) => {
          const onError = err => reject(err);
          server.once('error', onError);
          server.listen(port, host, () => {
            server.off('error', onError);
            resolve(server.address());
          });
        });
      } catch (err) {
        markReady();
        jobsReady = null;
        throw err;
      }
      try {
        await jobManager.init();
      } finally {
        markReady();
      }
      return address;
    },
    close: async () => {
      if (jobManager) {
        try {
          await jobManager.close();
        } catch (e) {}
      }
      if (mcpClient) {
        try {
          await mcpClient.close();
        } catch (e) {}
      }
      return new Promise((resolve) => {
        if (typeof server.closeAllConnections === 'function') {
          server.closeAllConnections();
        }
        server.close(resolve);
      });
    }
  };
}

// 직접 CLI 실행 시
if (require.main === module) {
  const port = parseInt(process.env.PORT || '8765', 10);
  const host = process.env.HOST || '127.0.0.1';
  let instance;
  try {
    instance = createServer();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
  instance.listen(port, host).then(addr => {
    console.log(`Vision Risk Server running at http://${host}:${port}`);
    console.log(startupModesLine(instance.modes));
  }).catch(err => {
    console.error('Server startup failed:', err);
    process.exit(1);
  });
}

module.exports = { createServer, startupModesLine, validateImageMagicBytes, SyntheticStore };
