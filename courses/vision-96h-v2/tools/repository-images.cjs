// Serve only manifest-approved, independent Train images from the canonical Git checkout.
// Public catalog deliberately omits labels, defect types, answers and filesystem paths.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const REPOSITORY = 'startup-life/vision-risk-student-images';
const MANIFEST = 'metadata/generation_manifest.csv';
const PNG_MAGIC = Buffer.from('89504e470d0a1a0a', 'hex');
const DEFAULT_ROOT = path.resolve(__dirname, '../../../../vision-risk-student-images');
// 연결 실패 원인 분류. 서버 콘솔 로그에만 쓰고 화면 문구와 API 응답은 바꾸지 않는다.
const LOAD_FAILURE_REASONS = {
  path_missing: '경로 없음',
  git_missing: 'git 미설치',
  not_git_repo: 'git 저장소가 아님',
  no_origin: 'origin 원격 없음',
  wrong_origin: 'origin이 ' + REPOSITORY + '가 아님',
  no_origin_main: 'origin/main 없음(git fetch 필요)',
  manifest_unreadable: '매니페스트(' + MANIFEST + ') 읽기 실패',
  no_readable_originals: '사진 파일이 없거나 해시가 달라 읽을 수 있는 승인 사진 0장'
};

function loadFailure(reason, cause) {
  const err = new Error(LOAD_FAILURE_REASONS[reason]);
  err.reason = reason;
  err.cause = cause;
  return err;
}

function parseCsv(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && c === ',') { row.push(cell); cell = ''; }
    else if (!quoted && (c === '\n' || c === '\r')) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); if (row.some(x => x !== '')) rows.push(row);
      row = []; cell = '';
    } else cell += c;
  }
  if (quoted) throw new Error('Malformed CSV');
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const headers = rows.shift() || [];
  if (new Set(headers).size !== headers.length) throw new Error('Duplicate CSV column');
  return rows.map(values => {
    if (values.length !== headers.length) throw new Error('Malformed CSV row');
    return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
  });
}

class RepositoryImages {
  constructor(options = {}) {
    this.root = options.root || process.env.REPOSITORY_IMAGES_ROOT || DEFAULT_ROOT;
    this.items = new Map(); this.commit = null; this.available = false;
    this.error = null; this.rejected = 0; this.failureReason = null;
    try { this.load(); } catch (err) {
      this.items.clear(); this.available = false;
      this.error = '사진 저장소를 연결하지 못했습니다. 저장소 경로와 사진 파일을 확인해 주세요.';
      this.failureReason = err && err.reason ? err.reason : 'unknown';
      // origin URL에는 토큰이 들어 있을 수 있어 분류만 적는다. 경로는 이 PC의 로컬 경로다.
      const label = options.logLabel ? '[RepositoryImages:' + options.logLabel + ']' : '[RepositoryImages]';
      const detail = err && err.reason ? err.message : '알 수 없는 오류: ' + String(err && err.message || err);
      const excluded = this.rejected ? ', 제외 ' + this.rejected + '건' : '';
      (options.log || console.warn)(label + ' 이미지 저장소를 불러오지 못했습니다: ' + detail + excluded + ' (경로: ' + this.root + ')');
    }
  }
  git(args) {
    return execFileSync('git', args, {cwd: this.root, encoding: 'utf8', timeout: 10000, maxBuffer: 8 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe']}).trim();
  }
  load() {
    try { this.root = fs.realpathSync(this.root); } catch (e) { throw loadFailure('path_missing', e); }
    try { this.git(['rev-parse', '--git-dir']); } catch (e) { throw loadFailure(e.code === 'ENOENT' ? 'git_missing' : 'not_git_repo', e); }
    let origin;
    try { origin = this.git(['remote', 'get-url', 'origin']); } catch (e) { throw loadFailure('no_origin', e); }
    if (!['https://github.com/' + REPOSITORY + '.git', 'https://github.com/' + REPOSITORY, 'git@github.com:' + REPOSITORY + '.git'].includes(origin)) throw loadFailure('wrong_origin');
    try { this.commit = this.git(['rev-parse', '--verify', '--quiet', 'refs/remotes/origin/main^{commit}']); } catch (e) { throw loadFailure('no_origin_main', e); }
    if (!/^[a-f0-9]{40}$/.test(this.commit)) throw loadFailure('no_origin_main');
    // Read the manifest from origin/main, never uncommitted producer metadata.
    let rows;
    try { rows = parseCsv(this.git(['show', this.commit + ':' + MANIFEST])); } catch (e) { throw loadFailure('manifest_unreadable', e); }
    const ids = new Set();
    for (const row of rows) {
      if (row.status !== 'accepted' || row.split !== 'train' || row.sequence_id) continue;
      try {
        if (!/^[QS]-IND-\d{3}$/.test(row.image_id) || !['quality', 'safety'].includes(row.track)) throw new Error('Invalid ID');
        if (ids.has(row.image_id)) throw new Error('Duplicate ID');
        ids.add(row.image_id);
        if (row.filename !== 'assets/dataset/images/' + row.image_id + '.png' || !/^[a-f0-9]{64}$/.test(row.sha256)) throw new Error('Invalid path/hash');
        // 사진은 일반 파일이다. readItem이 실제 파일의 SHA-256을 매니페스트 값과 대조한다.
        const item = { image_id: row.image_id, track: row.track, sha256: row.sha256, relative: row.filename };
        this.readItem(item); this.items.set(item.image_id, item);
      } catch (_) { this.rejected++; }
    }
    if (!this.items.size) throw loadFailure('no_readable_originals');
    this.available = true;
  }
  readItem(item) {
    let current = this.root;
    for (const part of item.relative.split('/')) {
      current = path.join(current, part);
      if (fs.lstatSync(current).isSymbolicLink()) throw new Error('Symlink rejected');
    }
    const stat = fs.lstatSync(current);
    if (!stat.isFile() || stat.size > 2 * 1024 * 1024) throw new Error('Invalid file size');
    const buffer = fs.readFileSync(current);
    if (!buffer.subarray(0, 8).equals(PNG_MAGIC)) throw new Error('Not PNG pixels');
    if (crypto.createHash('sha256').update(buffer).digest('hex') !== item.sha256) throw new Error('Original changed');
    return buffer;
  }
  list() {
    return {
      available: this.available, repository: REPOSITORY, commit: this.commit,
      images: [...this.items.values()].sort((a, b) => a.image_id.localeCompare(b.image_id)).map(item => ({
        image_id: item.image_id, track: item.track, url: '/api/repository-images/' + encodeURIComponent(item.image_id) + '/file'
      })),
      ...(this.error ? {error: this.error} : {}),
      ...(this.rejected ? {excluded_count: this.rejected} : {})
    };
  }
  get(id) {
    const item = this.items.get(id);
    if (!this.available || !item) return null;
    try {
      return { image_id: item.image_id, track: item.track, buffer: this.readItem(item), mimeType: 'image/png', filename: item.image_id + '.png', sha256: item.sha256, repository: REPOSITORY, commit: this.commit };
    } catch (_) { return null; }
  }
}
module.exports = { RepositoryImages, LOAD_FAILURE_REASONS };
