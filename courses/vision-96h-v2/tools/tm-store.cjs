'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { RepositoryImages, parseCsv } = require('./repository-images.cjs');
const CLASSES = {
  quality: ['정상', '찌그러짐', '찢어짐', '오염', '라벨 누락', '마개 누락'],
  safety: ['안전', '보호구 미착용', '위험선 침범', '통로 적치', '미끄럼 위험']
};
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const fail = message => { const e = new Error(message); e.statusCode = 400; throw e; };
const safeId = value => { if (!/^[\w-]{1,100}$/.test(value || '')) fail('잘못된 식별자입니다.'); return value; };
function atomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.' + crypto.randomUUID() + '.tmp';
  fs.writeFileSync(tmp, data, { mode: 0o600 });
  fs.renameSync(tmp, file);
}
function encodeImage(input) {
  if (typeof input !== 'string' || input.length > 3 * 1024 * 1024) fail('사진은 JPG·PNG, 2MB 이하로 준비해 주세요.');
  const b = Buffer.from(input, 'base64');
  if (!b.length || b.length > 2 * 1024 * 1024) fail('사진 크기가 올바르지 않습니다.');
  const png = b.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
  const jpg = b[0] === 255 && b[1] === 216 && b[2] === 255;
  if (!png && !jpg) fail('JPG·PNG 사진만 사용할 수 있습니다.');
  return { b, mime: png ? 'image/png' : 'image/jpeg' };
}
class TMStore {
  constructor(options = {}) {
    this.root = options.root || path.resolve(__dirname, '../scratch/teachable');
    this.resolveRecord = options.resolveRecord;
    fs.mkdirSync(this.root, { recursive: true });
    this.catalog = options.catalog || new RepositoryImages({ root: options.repositoryImagesRoot, logLabel: 'tm-store', log: options.log });
    this.packs = [];
    this.testHashes = new Set();
    this.packError = null;
    try {
      if (!this.catalog.available) throw Error('승인된 이미지 정본을 연결하지 못했습니다.');
      const rows = parseCsv(this.catalog.git(['show', this.catalog.commit + ':metadata/generation_manifest.csv']));
      this.testHashes = new Set(rows.filter(r=>r.status==='accepted'&&r.split==='test'&&/^[a-f0-9]{64}$/.test(r.sha256)).map(r=>r.sha256));
      // 학생용 매니페스트에는 유형(subtype)이 없다. 제공 사진은 Train·Val로만 나누고 유형은 수강생이 직접 고른다.
      for (const row of rows) {
        if (row.status !== 'accepted' || row.sequence_id || !['train', 'val'].includes(row.split)) continue;
        if (!CLASSES[row.track] || !/^[QS]-IND-\d{3}$/.test(row.image_id)) continue;
        if (!/^[a-f0-9]{64}$/.test(row.sha256) || row.filename !== `assets/dataset/images/${row.image_id}.png`) continue;
        const item = { image_id: row.image_id, track: row.track, split: row.split, relative: row.filename, sha256: row.sha256, asset_version: 'v0.95', commit: this.catalog.commit };
        this.catalog.readItem(item);
        if (this.packs.some(p=>p.sha256===item.sha256)) throw Error('제공 사진의 중복 또는 분할 누수가 발견됐습니다.');
        this.packs.push(item);
      }
    } catch (e) { this.packs = []; this.packError = e.message; }
  }
  json(file, fallback) { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback; }
  project(id) { return this.json(path.join(this.root, 'projects', safeId(id) + '.json'), null); }
  projects() {
    const dir = path.join(this.root, 'projects');
    return fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => this.json(path.join(dir, f))) : [];
  }
  saveProject(p) { atomic(path.join(this.root, 'projects', safeId(p.id) + '.json'), JSON.stringify(p)); return p; }
  create(track) {
    if (!CLASSES[track]) fail('품질 또는 산업안전을 선택해 주세요.');
    return this.saveProject({ id: crypto.randomUUID(), track, name: track === 'quality' ? '품질 모델' : '산업안전 모델', classes: CLASSES[track], samples: [], versions: [], created_at: new Date().toISOString() });
  }
  sample(p, data) {
    if (!CLASSES[p.track].includes(data.label)) fail('사진의 유형을 선택해 주세요.');
    if (!['train', 'val'].includes(data.split)) fail('학습 또는 검증 용도를 선택해 주세요.');
    let bytes, mime, source;
    if (data.pack_id) {
      const item = this.packs.find(i => i.image_id === data.pack_id && i.track === p.track);
      // 유형은 수강생이 고른 값을 쓴다. 트랙과 Train/Val 분할만 제공 데이터와 대조한다.
      if (!item || item.split !== data.split) fail('제공 데이터의 분류·분할을 바꿀 수 없습니다.');
      bytes = this.catalog.readItem(item); mime = 'image/png';
      source = { id: item.image_id, commit: item.commit, asset_version: item.asset_version };
    } else {
      const decoded = encodeImage(data.base64); bytes = decoded.b; mime = decoded.mime;
      source = { uploaded: true, filename: String(data.filename || '').slice(0, 120) };
    }
    const hash = sha(bytes);
    if (this.testHashes.has(hash)) fail('제공 Test 사진은 학습·Val에 추가할 수 없습니다.');
    const canonical = this.packs.find(i=>i.sha256===hash);
    if (canonical && (canonical.track!==p.track || canonical.split!==data.split)) fail('제공 사진의 분류·Train/Val 분할을 바꿀 수 없습니다.');
    if (canonical) source = {id:canonical.image_id,commit:canonical.commit,asset_version:canonical.asset_version};
    const known = p.samples.find(s => s.sha256 === hash);
    if (known) {
      if (known.label !== data.label || known.split !== data.split) fail('같은 사진을 다른 유형이나 학습·검증에 중복 배치할 수 없습니다.');
      return known;
    }
    if (p.samples.length >= 1000) fail('프로젝트 사진은 최대 1000장입니다.');
    atomic(path.join(this.root, 'images', hash), bytes);
    const sample = { id: crypto.randomUUID(), sha256: hash, mime, label: data.label, split: data.split, source };
    p.samples.push(sample); this.saveProject(p); return sample;
  }
  version(p, input) {
    if (input.sample_hashes && JSON.stringify(input.sample_hashes) !== JSON.stringify(p.samples.map(s=>s.sha256).sort())) fail('학습 중 사진 구성이 바뀌었습니다. 프로젝트를 다시 확인해 주세요.');
    if (input.sample_manifest && JSON.stringify(input.sample_manifest) !== JSON.stringify(p.samples.map(({id,sha256,label,split})=>({id,sha256,label,split})))) fail('학습 중 사진의 라벨·용도가 바뀌었습니다. 프로젝트를 다시 확인해 주세요.');
    const labels = input.metadata?.labels;
    if (!Array.isArray(labels) || labels.length !== p.classes.length || new Set(labels).size !== labels.length || !labels.every(l => p.classes.includes(l))) fail('모델의 클래스가 프로젝트와 다릅니다.');
    if (!['letterbox224', 'tm-center-crop'].includes(input.preprocessing)) fail('모델 입력 변환을 확인해 주세요.');
    if (input.base_model !== undefined && input.base_model !== 'mobilenet_v2_0.35') fail('학습 기초 모델을 확인해 주세요.');
    let snapshots = p.samples;
    if (input.snapshot_hashes) {
      if (input.source !== 'import' || !Array.isArray(input.snapshot_hashes) || new Set(input.snapshot_hashes).size !== input.snapshot_hashes.length || input.snapshot_hashes.some(h=>!p.samples.some(s=>s.sha256===h))) fail('모델의 학습 사진 기록을 확인해 주세요.');
      snapshots = p.samples.filter(s=>input.snapshot_hashes.includes(s.sha256));
    }
    if (input.snapshot_samples) {
      if(input.source!=='import'||!Array.isArray(input.snapshot_samples))fail('모델의 사진 기록을 확인해 주세요.');
      const seen = new Set();
      snapshots = input.snapshot_samples.map(s=>{
        const original = p.samples.find(p=>p.sha256===s.sha256);
        const canonical = this.packs.find(p=>p.sha256===s.sha256);
        if(!original||seen.has(s.sha256)||!p.classes.includes(s.label)||!['train','val'].includes(s.split)||this.testHashes.has(s.sha256)||canonical&&canonical.split!==s.split)fail('모델의 사진 기록이 올바르지 않습니다.');
        seen.add(s.sha256); return {...original,label:s.label,split:s.split};
      });
    }
    if (input.validation) {
      const m = input.validation, val = snapshots.filter(s=>s.split==='val');
      if (!Number.isFinite(m.accuracy) || !Array.isArray(m.matrix) || m.matrix.length !== labels.length || m.matrix.some(row=>!Array.isArray(row)||row.length!==labels.length||row.some(n=>!Number.isInteger(n)||n<0)) || !Array.isArray(m.errors) || !Array.isArray(m.missing_labels) || !m.missing_labels.every(l=>labels.includes(l))) fail('검증 결과 형식이 올바르지 않습니다.');
      const total = m.matrix.flat().reduce((a,b)=>a+b,0), correct = m.matrix.reduce((a,row,i)=>a+row[i],0);
      if (!total || total!==m.total || total!==val.length || JSON.stringify(m.val_hashes)!==JSON.stringify(val.map(s=>s.sha256).sort()) || Math.abs(m.accuracy-correct/total)>0.00001 || m.errors.length!==total-correct || m.errors.some(e=>!val.some(s=>s.sha256===e.sha256&&s.label===e.actual)||!labels.includes(e.predicted))) fail('검증 결과와 Val 사진이 일치하지 않습니다.');
      if (new Set(m.errors.map(e=>e.sha256)).size!==m.errors.length || m.matrix.some((row,i)=>row.reduce((a,b)=>a+b,0)!==val.filter(s=>s.label===labels[i]).length || row.some((n,j)=>i!==j&&n!==m.errors.filter(e=>e.actual===labels[i]&&e.predicted===labels[j]).length))) fail('혼동행렬과 오분류 기록이 일치하지 않습니다.');
      m.missing_labels = labels.filter((l,i)=>!m.matrix[i].some(n=>n>0));
    }
    if (!input.modelTopology || typeof input.weights !== 'string' || !Array.isArray(input.weightSpecs)) fail('모델 파일이 올바르지 않습니다.');
    const weights = Buffer.from(input.weights, 'base64');
    if (!weights.length || weights.length > 12 * 1024 * 1024) fail('모델 가중치 크기가 올바르지 않습니다.');
    // Validate decoded tensor bytes and architecture without executing supplied code.
    const widths = { float32: 4, int32: 4, bool: 1 };
    let expectedBytes = 0;
    for (const s of input.weightSpecs) {
      if (!widths[s.dtype] || s.quantization || !Array.isArray(s.shape) || s.shape.some(n => !Number.isInteger(n) || n < 0 || n > 100000)) fail('지원하지 않는 가중치입니다.');
      expectedBytes += s.shape.reduce((a, b) => a * b, 1) * widths[s.dtype];
    }
    if (expectedBytes !== weights.length) fail('가중치 파일이 불완전합니다.');
    const layers = input.modelTopology?.config?.layers;
    if (!Array.isArray(layers) || !layers.length) fail('지원하지 않는 모델 구조입니다.');
    const last = layers[layers.length - 1];
    const lastLayers = last.config?.layers;
    const output = lastLayers ? lastLayers[lastLayers.length - 1] : last;
    if (output.config?.units !== labels.length || output.config?.activation !== 'softmax') fail('모델 출력과 클래스가 다릅니다.');
    const id = crypto.randomUUID();
    const v = { id, project_id: p.id, track: p.track, number: p.versions.length + 1, labels, preprocessing: input.preprocessing, created_at: new Date().toISOString(), samples: JSON.parse(JSON.stringify(snapshots)), source: input.source === 'import' ? 'import' : 'trained', parameters: input.parameters || null, validation: input.validation || null };
    // 기초 모델은 보낸 경우에만 남긴다. 가져온 모델은 보내지 않는다.
    if (input.base_model) v.base_model = input.base_model;
    const model = { modelTopology: input.modelTopology, format: 'layers-model', generatedBy: 'vision-risk-local', convertedBy: null, weightsManifest: [{ paths: ['weights.bin'], weights: input.weightSpecs }] };
    const dir = path.join(this.root, 'versions', id);
    atomic(path.join(dir, 'weights.bin'), weights);
    atomic(path.join(dir, 'model.json'), JSON.stringify(model));
    atomic(path.join(dir, 'metadata.json'), JSON.stringify({ ...input.metadata, labels, imageSize: 224, userMetadata: { preprocessing: input.preprocessing } }));
    atomic(path.join(dir, 'version.json'), JSON.stringify(v));
    p.versions.push(v); this.saveProject(p); return v;
  }
  versions() { return this.projects().flatMap(p => p.versions); }
  active() { return this.json(path.join(this.root, 'active.json'), {}); }
  activate(id) {
    const v = this.versions().find(v => v.id === id);
    if (!v) fail('저장된 모델을 찾을 수 없습니다.');
    const current = this.active(); current[v.track] = v;
    atomic(path.join(this.root, 'active.json'), JSON.stringify(current)); return v;
  }
  predictions(recordId) { return this.json(path.join(this.root, 'predictions', safeId(recordId) + '.json'), []); }
  prediction(data) {
    const v = this.versions().find(v => v.id === data.model_id);
    if (!v || !Number.isInteger(data.record_version) || data.record_version < 1 || !Number.isInteger(data.image_index) || data.image_index < 0 || data.image_index > 4 || !/^[a-f0-9]{64}$/.test(data.image_sha256)) fail('예측 연결 정보가 올바르지 않습니다.');
    if (!Array.isArray(data.scores) || data.scores.length !== v.labels.length || new Set(data.scores.map(s => s.className)).size !== v.labels.length || data.scores.some(s => !v.labels.includes(s.className) || !Number.isFinite(s.probability) || s.probability < 0 || s.probability > 1)) fail('예측 점수가 올바르지 않습니다.');
    const rows = this.predictions(data.record_id);
    if (Math.abs(data.scores.reduce((n, s) => n + s.probability, 0) - 1) > 0.01) fail('클래스별 점수의 합이 올바르지 않습니다.');
    const key = sha(JSON.stringify([data.record_id, data.record_version, data.image_index, data.image_sha256, v.id]));
    const old = rows.find(r => r.id === key); if (old) return old;
    const row = { id: key, record_id: data.record_id, record_version: data.record_version, image_index: data.image_index, image_sha256: data.image_sha256, model_id: v.id, model_number: v.number, track: v.track, preprocessing: v.preprocessing, scores: data.scores, created_at: new Date().toISOString() };
    rows.push(row); atomic(path.join(this.root, 'predictions', safeId(data.record_id) + '.json'), JSON.stringify(rows)); return row;
  }
  async handle(req, res, pathname, readBody) {
    if (!pathname.startsWith('/api/tm/')) return false;
    const send = (obj, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); return true; };
    try {
      const bits = pathname.slice(8).split('/');
      if (req.method === 'GET' && bits[0] === 'catalog') return send({ classes: CLASSES, asset_version: 'v0.95', commit: this.catalog.commit, images: this.packs.map(({ relative, size, ...i }) => i).sort((a, b) => a.sha256.localeCompare(b.sha256)), error: this.packError });
      if (bits[0] === 'active') return req.method === 'GET' ? send(this.active()) : req.method === 'POST' ? send(this.activate((await readBody()).id)) : send({ error: 'Method not allowed' }, 405);
      if (bits[0] === 'predictions') {
        if (req.method === 'GET') return send(this.predictions(bits[1]));
        if (req.method !== 'POST') return send({error:'Method not allowed'},405);
        const input = await readBody();
        if (this.resolveRecord) {
          const result = await this.resolveRecord(safeId(input.record_id));
          const record = result?.record;
          if (!result?.success || !record) return send({error:'사건을 확인하지 못했습니다.'},404);
          const v = this.versions().find(v=>v.id===input.model_id);
          if (!v || v.track !== record.category || input.record_version > Number(record.version || 1) || input.image_index >= Number(record.image_count || 1)) fail('사건과 모델·사진 연결이 올바르지 않습니다.');
        }
        return send(this.prediction(input),201);
      }
      if (req.method === 'GET' && bits[0] === 'files') {
        const id = safeId(bits[1]);
        if (!['model.json', 'metadata.json', 'weights.bin', 'version.json'].includes(bits[2]) || !this.versions().some(v => v.id === id)) return send({ error: 'Not found' }, 404);
        const file = path.join(this.root, 'versions', id, bits[2]);
        res.writeHead(200, { 'Content-Type': bits[2].endsWith('.json') ? 'application/json' : 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(fs.readFileSync(file)); return true;
      }
      if (req.method === 'GET' && bits[0] === 'images') {
        const hash = safeId(bits[1]);
        const s = this.projects().flatMap(p => [...p.samples, ...p.versions.flatMap(v => v.samples || [])]).find(s => s.sha256 === hash);
        // 분류 목록에서 아직 넣지 않은 제공 사진도 보여 준다. 정본 파일을 읽을 때 해시를 다시 대조한다.
        const pack = !s && this.packs.find(i => i.sha256 === hash);
        if (!s && !pack) return send({ error: 'Not found' }, 404);
        const bytes = s ? fs.readFileSync(path.join(this.root, 'images', hash)) : this.catalog.readItem(pack);
        res.writeHead(200, { 'Content-Type': s ? s.mime : 'image/png', 'Cache-Control': 'private, max-age=3600' }); res.end(bytes); return true;
      }
      if (bits[0] !== 'projects') return send({ error: 'Not found' }, 404);
      if (!bits[1]) return req.method === 'GET' ? send(this.projects()) : req.method === 'POST' ? send(this.create((await readBody()).track), 201) : send({ error: 'Method not allowed' }, 405);
      const p = this.project(bits[1]); if (!p) return send({ error: '프로젝트를 찾을 수 없습니다.' }, 404);
      if (req.method === 'GET' && !bits[2]) return send(p);
      if (req.method === 'POST' && bits[2] === 'samples') { const input = await readBody(); return send(this.sample(this.project(p.id), input), 201); }
      if (req.method === 'DELETE' && bits[2] === 'samples') { p.samples = p.samples.filter(s => s.id !== bits[3]); return send(this.saveProject(p)); }
      if (req.method === 'POST' && bits[2] === 'versions') { const input = await readBody(); return send(this.version(this.project(p.id), input), 201); }
      return send({ error: 'Method not allowed' }, 405);
    } catch (e) { return send({ error: e.message }, e.statusCode || 500); }
  }
}
module.exports = { TMStore, CLASSES, sha, encodeImage };
