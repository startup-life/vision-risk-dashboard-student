// Download public base weights once; never download user images or credentials.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const esbuild = require('esbuild');
async function setup() {
  const dir = path.resolve(__dirname, '../preview/vendor/tm');
  fs.mkdirSync(dir, { recursive: true });
  await esbuild.build({ entryPoints: [path.join(__dirname, 'tm-entry.js')], bundle: true, outfile: path.join(dir, 'runtime.js'), minify: true, platform: 'browser' });
  // 학습은 v2(α0.35) 기초 모델을 쓴다. TM 라이브러리가 version 2에서 받는 기본 파일과 같다.
  const base = 'https://storage.googleapis.com/teachable-machine-models/mobilenet_v2_weights_tf_dim_ordering_tf_kernels_0.35_224_no_top/';
  const baseDir = path.resolve(__dirname, '../preview/vendor/tm-v2');
  fs.mkdirSync(baseDir, { recursive: true });
  const model = await fetch(base + 'model.json').then(r => { if (!r.ok) throw Error('Base model download failed'); return r.json(); });
  const hashes = {};
  for (const group of model.weightsManifest) for (const file of group.paths) {
    if (!/^[\w.-]+$/.test(file)) throw Error('Unsafe weight filename');
    const response = await fetch(base + file);
    if (!response.ok) throw Error('Base weights download failed');
    const data = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(path.join(baseDir, file), data);
    hashes[file] = crypto.createHash('sha256').update(data).digest('hex');
  }
  fs.writeFileSync(path.join(baseDir, 'model.json'), JSON.stringify(model));
  fs.writeFileSync(path.join(baseDir, 'provenance.json'), JSON.stringify({ source: base, tfjs: '1.3.1', teachableMachine: '0.8.5', hashes }, null, 2));
  console.log('Local TM runtime and base weights ready');
}
setup().catch(e => { console.error(e.message); process.exitCode = 1; });
