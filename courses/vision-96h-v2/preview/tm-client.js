/* Local Teachable Machine training. Never sends learning photos to Google. */
(() => {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // 서버가 남긴 ISO 일시를 app.js formatDateSimple과 같은 YYYY-MM-DD HH:mm(브라우저 시간)으로 보여 준다. 읽지 못하면 원문 그대로 둔다.
  const formatTime = ts => { const d = new Date(ts); if (!ts || isNaN(d.getTime())) return String(ts ?? ''); const pad = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const state = { project: null, catalog: null, projects: [], busy: false, training: false, message: '', trainer: null, cancel: false, parameters: {epochs:50,batchSize:16,learningRate:.001}, active:{}, splits:{}, evaluations:{}, pack:null };
  let runtimePromise;
  const models = new Map();
  const inferences = new Map();
  async function api(url, body, method) {
    // 서버에 닿지 못하면 app.js와 같은 안내를 보인다.
    const r = await fetch('/api/tm/' + url, { method: method || (body ? 'POST' : 'GET'), headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined })
      .catch(() => { throw Error('로컬 서버에 연결하지 못했습니다. 터미널에서 npm.cmd start(macOS: npm start)가 켜져 있는지 확인하세요.'); });
    const v = await r.json(); if (!r.ok) throw Error(v.error || '요청을 완료하지 못했습니다.'); return v;
  }
  function runtime() {
    if (window.tf && window.tmImage) return Promise.resolve();
    if (!runtimePromise) runtimePromise = new Promise((resolve, reject) => {
      const s = document.createElement('script'); s.src = '/vendor/tm/runtime.js';
      s.onload = () => resolve(); s.onerror = () => { runtimePromise = null; s.remove(); reject(Error('학습 파일이 없습니다. 터미널에서 npm.cmd run setup:tm(macOS: npm run setup:tm)을 실행한 뒤 페이지를 새로 고쳐 주세요.')); };
      document.head.append(s);
    });
    return runtimePromise;
  }
  const base64 = buffer => { let s = ''; for (const b of new Uint8Array(buffer)) s += String.fromCharCode(b); return btoa(s); };
  const decode = str => Uint8Array.from(atob(str), c => c.charCodeAt(0));
  function assertScores(scores,labels) { if(!Array.isArray(scores)||scores.length!==labels.length||new Set(scores.map(s=>s.className)).size!==labels.length||scores.some(s=>!labels.includes(s.className)||!Number.isFinite(s.probability)||s.probability<0||s.probability>1)||Math.abs(scores.reduce((n,s)=>n+s.probability,0)-1)>.01)throw Error('모델의 출력이 올바르지 않습니다. 이전 적용 모델을 유지합니다.'); }
  async function image(url) { const img = new Image(); img.src = url; try { await img.decode(); } catch(e) { throw Error('사진을 읽지 못했습니다. 파일 상태와 접근 권한을 확인하고 다른 JPG·PNG로 다시 선택해 주세요.'); } if (img.naturalWidth <= 1 || img.naturalHeight <= 1) throw Error('사진 내용을 확인할 수 없습니다. 다른 사진을 준비해 주세요.'); return img; }
  function inputCanvas(img) {
    const c = document.createElement('canvas'); c.width = c.height = 224;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 224, 224);
    const r = Math.min(224 / img.naturalWidth, 224 / img.naturalHeight);
    ctx.drawImage(img, (224 - img.naturalWidth*r)/2, (224 - img.naturalHeight*r)/2, img.naturalWidth*r, img.naturalHeight*r); return c;
  }
  function dispose(model) { for(const part of new Set([model?.model,model?.trainingModel,model?.truncatedModel])) if(part?.dispose) {try{part.dispose();}catch(e){if(!/already.*disposed|disposed.*already/i.test(e.message))console.warn('모델 메모리 정리:',e.message);}} }
  async function model(v) {
    await runtime();
    if (!models.has(v.id)) models.set(v.id, tmImage.load(`/api/tm/files/${v.id}/model.json`, `/api/tm/files/${v.id}/metadata.json`).catch(e => { models.delete(v.id); throw e; }));
    return models.get(v.id);
  }
  function note(text) {
    state.message = text;
    const el = document.getElementById('tm-status'); if (el) el.textContent = text;
    const small = document.getElementById('tm-home-status'); if (small && state.training) small.textContent = text;
  }
  function download(name, obj) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(obj)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  function validationView(v) {
    const m = state.evaluations[v.id] || v.validation; if (!m) return '<p class="meta">검증 기록이 없습니다.</p>';
    return `<p>${state.evaluations[v.id]?'이번에 확인한':'모델 저장 당시'} 별도 Val ${m.total}장 · 정확도 ${(100*m.accuracy).toFixed(1)}%</p>${m.missing_labels?.length ? `<p class="meta">검증 사진 없음: ${m.missing_labels.map(esc).join(', ')}. 이 유형은 평가하지 못했습니다.</p>` : ''}
      <div class="tm-table-scroll"><table><caption>행: 실제 유형 · 열: 모델 예측</caption><thead><tr><th>실제 / 예측</th>${v.labels.map(l => `<th>${esc(l)}</th>`).join('')}</tr></thead><tbody>${m.matrix.map((row, i) => `<tr><th>${esc(v.labels[i])}</th>${row.map(n => `<td>${n}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <details><summary>유형별 결과와 오분류 ${m.errors.length}건</summary>${v.labels.map((l, i) => `<p>${esc(l)}: ${m.matrix[i][i]} / ${m.matrix[i].reduce((a,b)=>a+b,0)}장</p>`).join('')}${m.errors.map(e => `<p><a href="/api/tm/images/${esc(e.sha256)}" target="_blank" rel="noopener">사진 보기</a> · 실제 ${esc(e.actual)} → 예측 ${esc(e.predicted)}</p>`).join('')}</details>`;
  }
  // 제공 사진은 유형 없이 Train·Val로만 온다. 수강생이 사진을 보고 기준과 대조해 유형을 고른다. 서버는 정본 ID 순서 대신 해시 순으로 보낸다.
  const packRows = p => state.catalog.images.filter(i => i.track === p.track && i.split === state.pack);
  function packView(p) {
    const rows = packRows(p), placed = new Map(p.samples.map(s => [s.sha256, s]));
    if (!rows.length) return `<p role="alert">${esc(state.catalog.error || '승인된 제공 사진이 없습니다.')}</p>`;
    return `<section id="tm-pack-list" data-tm-pack-list="${state.pack}"><p>사진을 보고 확인 기준과 대조해 유형을 고르세요. 유형마다 Train 사진이 2장 이상이면 학습할 수 있습니다.</p><p id="tm-pack-count">분류한 사진 ${rows.filter(x => placed.has(x.sha256)).length} / ${rows.length}장</p>
      <div class="tm-samples">${rows.map((x, i) => `<figure><img loading="lazy" src="/api/tm/images/${esc(x.sha256)}" alt="제공 사진 ${i+1}"><figcaption><label>제공 사진 ${i+1}<select id="tm-classify-${esc(x.image_id)}" data-tm-classify="${esc(x.image_id)}" ${state.busy ? 'disabled' : ''}><option value="">유형 선택</option>${p.classes.map(l => `<option value="${esc(l)}" ${placed.get(x.sha256)?.label === l ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label></figcaption></figure>`).join('')}</div></section>`;
  }
  function view() {
    const host = document.getElementById('tm-training'); if (!host) return;
    const focusId = host.contains(document.activeElement) ? document.activeElement.id : null;
    const open = [...host.querySelectorAll('details')].map(d=>d.open);
    const p = state.project;
    host.innerHTML = `<h1>모델 학습</h1><p>사진의 유형을 지정하고 학습한 뒤, 별도 사진으로 확인하세요. 사용할 모델은 직접 연결합니다.</p>
      <div class="tm-controls"><label>학습 프로젝트<select id="tm-project" ${state.busy ? 'disabled' : ''}><option value="">프로젝트 선택</option>${state.projects.map(x => `<option value="${x.id}" ${p?.id === x.id ? 'selected' : ''}>${esc(x.track==='quality' && x.name==='품질 모델' ? '택배 발송 모델' : x.name)} · ${x.id.slice(0,8)}</option>`).join('')}</select></label><button id="tm-new-quality" ${state.busy ? 'disabled' : ''}>택배 발송 프로젝트 만들기</button><button id="tm-new-safety" ${state.busy ? 'disabled' : ''}>산업안전 프로젝트 만들기</button></div>
      <p id="tm-status" role="status" aria-live="polite">${esc(state.message || '프로젝트를 선택하거나 새로 만들어 주세요.')}</p>
      ${p ? `<section><h2>1. 사진 준비</h2><p class="meta">검증된 ${esc(state.catalog.asset_version)} 독립 사진만 제공합니다. Train·Val은 분리되며 Test와 시퀀스는 학습에 쓰지 않습니다. 제공 사진에는 유형이 없으므로 직접 분류합니다.</p>${state.catalog.error ? `<p role="alert">${esc(state.catalog.error)}</p>` : ''}
        <div class="tm-controls">${['train','val'].map(split => `<button data-tm-pack="${split}" aria-expanded="${state.pack === split}" ${state.busy ? 'disabled' : ''}>제공 ${split === 'train' ? 'Train' : 'Val'} 사진 분류</button>`).join('')}</div>${state.pack ? packView(p) : ''}
        <div class="tm-class-grid">${p.classes.map(l => `<section class="tm-class"><h3>${esc(l)}</h3><p>Train ${p.samples.filter(s=>s.label===l&&s.split==='train').length}장 · Val ${p.samples.filter(s=>s.label===l&&s.split==='val').length}장</p><label>사진 용도<select data-tm-split="${esc(l)}" ${state.busy ? 'disabled' : ''}><option value="train">Train · 학습</option><option value="val">Val · 검증</option></select></label><label class="tm-upload">직접 사진 추가<input data-tm-upload="${esc(l)}" type="file" accept="image/png,image/jpeg" multiple ${state.busy ? 'disabled' : ''}></label><details><summary>사진 배치·제거</summary><div class="tm-samples">${p.samples.filter(s=>s.label===l).map(s=>`<figure><img loading="lazy" src="/api/tm/images/${s.sha256}" alt="${esc(l)}"><figcaption>${s.split}</figcaption><button data-tm-remove="${s.id}" ${state.busy ? 'disabled' : ''}>제거</button></figure>`).join('')}</div></details></section>`).join('')}</div>
      </section><section><h2>2. 학습·검증</h2><p>모든 유형에 최소 2장씩 필요합니다. 더 많은 사진과 다양한 촬영 조건을 준비하세요. 학습은 이 브라우저에서 진행됩니다.</p>
      <details><summary>고급 학습 설정</summary><div class="tm-controls"><label>학습 회차<input id="tm-epochs" type="number" min="1" max="500" value="${esc(state.parameters.epochs)}" ${state.busy?'disabled':''}></label><label>배치 크기<input id="tm-batch" type="number" min="1" max="128" value="${esc(state.parameters.batchSize)}" ${state.busy?'disabled':''}></label><label>학습률<input id="tm-rate" type="number" min="0.00001" max="0.1" step="0.00001" value="${esc(state.parameters.learningRate)}" ${state.busy?'disabled':''}></label></div></details>
      <button id="tm-train" class="primary" ${state.busy ? 'disabled' : ''}>모델 학습</button> ${state.training ? '<button id="tm-stop">학습 중단</button>' : ''}<p class="meta">다른 페이지로 이동해도 진행됩니다. 새로고침하거나 브라우저를 닫으면 중단됩니다. 저장된 이전 모델은 유지됩니다.</p><p class="meta">학습하는 동안 이 탭을 화면 앞에 두세요. 다른 탭이나 창으로 옮기면 학습이 멈추거나 아주 느려지고, 다시 돌아오면 이어집니다.</p></section>
      <section><h2>3. 모델 비교·적용</h2><p class="meta">사진을 추가하고 다시 학습하면 새 버전으로 저장합니다. 이전 모델과 예측 기록은 덮어쓰지 않습니다.</p>
      ${p.versions.map(v => `<article class="tm-version"><h3>v${v.number} · ${v.source === 'import' ? '가져온 모델' : '학습 모델'}</h3><p class="meta">${esc(formatTime(v.created_at))}${v.source === 'import' ? '' : ` · Train ${(v.samples||[]).filter(s=>s.split==='train').length}장`} · 입력 ${v.preprocessing === 'letterbox224' ? '전체 사진 여백 맞춤' : '공식 TM 중앙 자르기'}${baseModelText(v)}</p>${validationView(v)}<button data-tm-apply="${v.id}" ${state.busy ? 'disabled' : ''}>이 모델을 사건 분류에 적용</button><button data-tm-evaluate="${v.id}" ${state.busy ? 'disabled' : ''}>현재 Val로 다시 검증</button><div id="tm-validation-${v.id}"></div></article>`).join('') || '<p>저장된 모델이 없습니다.</p>'}
      ${p.versions.length>1 ? '<button id="tm-compare" '+(state.busy?'disabled':'')+'>같은 Val로 최근 두 모델 비교</button><div id="tm-comparison"></div>' : ''}</section>
      <section><h2>백업·가져오기</h2><div class="tm-controls"><button id="tm-export" ${state.busy ? 'disabled' : ''}>프로젝트 백업</button><label>프로젝트 백업 가져오기<input id="tm-backup-import" type="file" accept=".json" ${state.busy ? 'disabled' : ''}></label><label>공식 TM 모델 가져오기<input id="tm-model-import" type="file" accept=".json,.bin" multiple ${state.busy ? 'disabled' : ''}></label></div><p class="meta">공식 TM은 model.json·metadata.json·weights.bin을 함께 선택하세요. 모델 클래스 이름은 이 프로젝트의 유형과 같아야 합니다. 공식 모델의 중앙 자르기를 유지합니다. 학습 사진과 모델은 로컬에만 저장합니다.</p></section>` : ''}`;
    bind(host);
    [...host.querySelectorAll('details')].forEach((d,i)=>{if(open[i]!==undefined)d.open=open[i];});
    if(focusId){const active=document.getElementById(focusId);if(active&&!active.disabled)active.focus({preventScroll:true});}
  }
  async function refresh(id = state.project?.id) { state.projects = await api('projects'); state.active = await api('active'); state.project = state.projects.find(p=>p.id===id) || null; }
  async function run(fn) {
    if (state.busy) return;
    state.busy = true;
    const focusId = document.activeElement?.id;
    document.querySelectorAll('#tm-training button,#tm-training input,#tm-training select').forEach(el=>{el.disabled=true;});
    try { await fn(); } catch(e) { note('완료하지 못했습니다. ' + e.message); }
    finally { state.busy = false; state.training = false; state.trainer = null; try{await refresh();}catch(e){note(state.message+' 저장 상태를 다시 확인해 주세요.');} view(); if(focusId){const el=document.getElementById(focusId);if(el&&!el.disabled)el.focus({preventScroll:true});} }
  }
  async function evaluate(m, samples, labels, preprocessing = 'letterbox224') {
    const val = samples.filter(s => s.split === 'val');
    if (!val.length) throw Error('Val 사진을 먼저 준비해 주세요.');
    const matrix = labels.map(()=>labels.map(()=>0)), errors = [];
    for (let i=0; i<val.length; i++) {
      if (state.training && state.cancel) throw Error('학습·검증을 중단했습니다. 이전 모델은 유지됩니다.');
      const s = val[i], img = await image('/api/tm/images/' + s.sha256);
      const scores = await m.predict(preprocessing === 'letterbox224' ? inputCanvas(img) : img);
      assertScores(scores,labels);
      const top = [...scores].sort((a,b)=>b.probability-a.probability)[0];
      matrix[labels.indexOf(s.label)][labels.indexOf(top.className)]++;
      if (s.label !== top.className) errors.push({ sha256:s.sha256, actual:s.label, predicted:top.className, scores });
      note(`Val 확인 중 ${i+1}/${val.length}장`);
    }
    return { total: val.length, accuracy: (val.length-errors.length)/val.length, matrix, errors, val_hashes: val.map(s=>s.sha256).sort(), missing_labels: labels.filter((l,i)=>!matrix[i].some(n=>n>0)) };
  }
  // 사진이 적은 유형은 같은 사진을 반복해 넣어 유형별 학습 횟수를 가장 많은 유형에 맞춘다. 사진 순서대로 돌아가며 한 번씩 더 넣는다.
  function repeatCounts(samples, classes) {
    const sizes = classes.map(l => samples.filter(s => s.label === l).length), max = Math.max(...sizes), seen = classes.map(() => 0);
    return samples.map(s => { const i = classes.indexOf(s.label), k = seen[i]++; return Math.floor(max / sizes[i]) + (k < max % sizes[i] ? 1 : 0); });
  }
  // 학습 모델의 기초 모델을 보여 준다. 기록이 없는 예전 학습 모델은 MobileNet v1으로 학습했다. 가져온 모델은 표시하지 않는다.
  function baseModelText(v) {
    if (v.source === 'import') return '';
    return v.base_model === 'mobilenet_v2_0.35' ? ' · 기초 모델 MobileNet v2' : ' · 기초 모델 MobileNet v1(예전 방식)';
  }
  async function train(parameters) {
    const p = structuredClone(state.project);
    if (p.classes.some(l => p.samples.filter(s=>s.split==='train'&&s.label===l).length < 2)) throw Error('모든 유형에 Train 사진을 최소 2장씩 준비해 주세요.');
    if (!p.samples.some(s=>s.split==='val')) throw Error('학습에 쓰지 않은 Val 사진도 준비해 주세요.');
    state.training = true; state.cancel = false; view(); sessionStorage.setItem('tm-interrupted', p.id);
    let trainer;
    try {
      note('학습 파일을 준비하고 있어요.'); await runtime();
      trainer = await tmImage.createTeachable({ labels:p.classes }, { version:2, checkpointUrl:'/vendor/tm-v2/model.json', trainingLayer:'out_relu' }).catch(e => { throw /status code 404/.test(e.message) ? Error('학습 기초 모델 파일이 없습니다. 터미널에서 npm.cmd run setup:tm(macOS: npm run setup:tm)을 다시 실행한 뒤 페이지를 새로 고쳐 주세요.') : e; }); state.trainer = trainer; trainer.setLabels(p.classes);
      const samples = p.samples.filter(s=>s.split==='train'), repeats = repeatCounts(samples, p.classes);
      for (let i=0;i<samples.length;i++) { if(state.cancel) throw Error('학습을 중단했습니다.'); const s=samples[i]; const input=inputCanvas(await image('/api/tm/images/'+s.sha256)); for (let r=0;r<repeats[i];r++) await trainer.addExample(p.classes.indexOf(s.label),input); note(`학습 사진 준비 ${i+1}/${samples.length}장`); }
      await trainer.train({ ...parameters, denseUnits:100 }, { onEpochEnd: epoch => { note(`학습 중 ${epoch+1}/${parameters.epochs}회`); } });
      if(state.cancel) throw Error('학습을 중단했습니다. 이전 모델은 유지됩니다.');
      const validation = await evaluate(trainer,p.samples,p.classes);
      let artifacts;
      await trainer.save(tf.io.withSaveHandler(async a => { artifacts=a; return {modelArtifactsInfo:{ dateSaved:new Date(),modelTopologyType:'JSON',modelTopologyBytes:0,weightSpecsBytes:0,weightDataBytes:a.weightData.byteLength }}; }));
      note('모델을 저장하고 있어요.');
      const v = await api(`projects/${p.id}/versions`,{modelTopology:artifacts.modelTopology,weightSpecs:artifacts.weightSpecs,weights:base64(artifacts.weightData),metadata:trainer.getMetadata(),preprocessing:'letterbox224',base_model:'mobilenet_v2_0.35',parameters,validation,sample_hashes:p.samples.map(s=>s.sha256).sort(),sample_manifest:p.samples.map(({id,sha256,label,split})=>({id,sha256,label,split}))});
      const loaded=await model(v); assertScores(await loaded.predict(inputCanvas(await image('/api/tm/images/'+samples[0].sha256))),v.labels);
      await refresh(p.id); note(`v${v.number}을 저장하고 다시 불러와 확인했습니다. 사용하려면 모델을 적용해 주세요.`);
    } finally { if(trainer) dispose(trainer); sessionStorage.removeItem('tm-interrupted'); }
  }
  function bind(host) {
    host.querySelector('#tm-project').onchange = async e => { await refresh(e.target.value); view(); };
    for(const track of ['quality','safety']) host.querySelector('#tm-new-'+track).onclick = ()=>run(async()=>{ const p=await api('projects',{track}); await refresh(p.id); note('사진을 준비해 주세요.'); });
    if(!state.project) return;
    const id=state.project.id;
    host.querySelectorAll('[data-tm-split]').forEach(el=>{el.value=state.splits[el.dataset.tmSplit]||'train';el.onchange=e=>{state.splits[el.dataset.tmSplit]=e.target.value;};});
    for(const [input,key] of [['tm-epochs','epochs'],['tm-batch','batchSize'],['tm-rate','learningRate']])host.querySelector('#'+input).oninput=e=>{state.parameters[key]=Number(e.target.value);};
    // 같은 단추를 다시 누르면 닫는다. 한 번에 한 목록만 연다.
    host.querySelectorAll('[data-tm-pack]').forEach(btn=>btn.onclick=()=>{state.pack=state.pack===btn.dataset.tmPack?null:btn.dataset.tmPack;view();});
    // 유형을 바꾸면 넣어 둔 사진을 먼저 지우고 새 유형으로 다시 넣는다. 빈 값이면 지우기만 한다.
    host.querySelectorAll('[data-tm-classify]').forEach(el=>el.onchange=()=>{
      const rows=packRows(state.project), n=rows.findIndex(r=>r.image_id===el.dataset.tmClassify)+1, x=rows[n-1], label=el.value;
      run(async()=>{
        const known=state.project.samples.find(s=>s.sha256===x.sha256);
        if(known) await api(`projects/${id}/samples/${known.id}`,null,'DELETE');
        if(label) await api(`projects/${id}/samples`,{pack_id:x.image_id,label,split:x.split});
        await refresh(id); note(label?`제공 사진 ${n}을 ${label} 유형으로 넣었습니다.`:`제공 사진 ${n}을 분류에서 뺐습니다.`);
      });
    });
    host.querySelectorAll('[data-tm-upload]').forEach(el=>el.onchange=()=>{
      const label=el.dataset.tmUpload, split=[...host.querySelectorAll('[data-tm-split]')].find(x=>x.dataset.tmSplit===label).value, files=[...el.files];
      run(async()=>{ for(const f of files){if(f.size>2*1024*1024) throw Error('직접 추가하는 사진은 장당 2MB 이하로 준비해 주세요.'); const url=URL.createObjectURL(f); try{await image(url);}finally{URL.revokeObjectURL(url);} await api(`projects/${id}/samples`,{label,split,filename:f.name,base64:base64(await f.arrayBuffer())});} await refresh(id); note('사진을 추가했습니다.'); });
    });
    host.querySelectorAll('[data-tm-remove]').forEach(btn=>btn.onclick=()=>run(async()=>{await api(`projects/${id}/samples/${btn.dataset.tmRemove}`,null,'DELETE');await refresh(id);note('현재 학습 목록에서 제거했습니다. 이전 모델의 학습 사진 기록은 보존합니다.');}));
    host.querySelector('#tm-train').onclick=()=>{
      const parameters={epochs:Number(host.querySelector('#tm-epochs').value),batchSize:Number(host.querySelector('#tm-batch').value),learningRate:Number(host.querySelector('#tm-rate').value)};
      if(!Number.isInteger(parameters.epochs)||parameters.epochs<1||parameters.epochs>500||!Number.isInteger(parameters.batchSize)||parameters.batchSize<1||parameters.batchSize>128||parameters.learningRate<.00001||parameters.learningRate>.1){note('학습 설정 범위를 확인해 주세요.');return;}
      run(()=>train(parameters));
    };
    const stop=host.querySelector('#tm-stop'); if(stop) stop.onclick=()=>{state.cancel=true; if(state.trainer?.trainingModel) state.trainer.trainingModel.stopTraining=true; note('현재 회차가 끝나면 중단합니다. 모델은 적용하지 않습니다.');};
    host.querySelectorAll('[data-tm-apply]').forEach(b=>b.onclick=()=>run(async()=>{const version=state.project.versions.find(v=>v.id===b.dataset.tmApply),m=await model(version);const canvas=document.createElement('canvas');canvas.width=canvas.height=224;assertScores(await m.predict(canvas),version.labels);const v=await api('active',{id:b.dataset.tmApply});state.active[v.track]=v;note(`v${v.number}을 사건 분류 모델로 연결했습니다.`);}));
    host.querySelectorAll('[data-tm-evaluate]').forEach(b=>b.onclick=()=>run(async()=>{
      const v=state.project.versions.find(v=>v.id===b.dataset.tmEvaluate), result=await evaluate(await model(v),state.project.samples,v.labels,v.preprocessing);
      state.evaluations[v.id]=result;note(`v${v.number}: 현재 Val ${result.total}장 정확도 ${(result.accuracy*100).toFixed(1)}%. 모델 저장 당시 결과와 별도입니다.`);
    }));
    const compare=host.querySelector('#tm-compare'); if(compare) compare.onclick=()=>run(async()=>{
      const versions=state.project.versions.slice(-2), results=[];
      for(const v of versions) { const result=await evaluate(await model(v),state.project.samples,v.labels,v.preprocessing); results.push(result); state.evaluations[v.id]=result; }
      const delta=(results[1].accuracy-results[0].accuracy)*100;
      note(`같은 Val ${results[0].total}장: v${versions[0].number} ${(results[0].accuracy*100).toFixed(1)}% → v${versions[1].number} ${(results[1].accuracy*100).toFixed(1)}% (${delta>0?'+':''}${delta.toFixed(1)}%p). ${delta>0?'측정상 향상됐습니다.':'향상되지 않았습니다.'}`);
    });
    host.querySelector('#tm-export').onclick=()=>run(async()=>{
      const p=structuredClone(state.project),versions=[],samples=[];
      for(const v of p.versions){const prefix='files/'+v.id+'/';const m=await api(prefix+'model.json'),metadata=await api(prefix+'metadata.json');const r=await fetch('/api/tm/'+prefix+'weights.bin');if(!r.ok)throw Error('가중치를 불러오지 못했습니다.');versions.push({modelTopology:m.modelTopology,weightSpecs:m.weightsManifest[0].weights,weights:base64(await r.arrayBuffer()),metadata,preprocessing:v.preprocessing,parameters:v.parameters,validation:v.validation,snapshot_hashes:(v.samples||[]).map(s=>s.sha256),snapshot_samples:v.samples||[]});}
      const all=[...new Map([...p.versions.flatMap(v=>v.samples||[]),...p.samples].map(s=>[s.sha256,s])).values()];
      for(const s of all){const r=await fetch('/api/tm/images/'+s.sha256);if(!r.ok)throw Error('사진을 불러오지 못했습니다.');samples.push({...s,base64:base64(await r.arrayBuffer())});}
      download('vision-risk-'+p.track+'-'+p.id+'.json',{format:'vision-risk-tm-1',track:p.track,samples,versions,current_hashes:p.samples.map(s=>s.sha256)});note('프로젝트 사진과 모델 버전을 백업했습니다.');
    });
    host.querySelector('#tm-backup-import').onchange=e=>{const f=e.target.files[0];if(!f)return;run(async()=>{if(f.size>200*1024*1024)throw Error('백업 파일은 200MB 이하만 지원합니다.');const backup=JSON.parse(await f.text());if(backup.format!=='vision-risk-tm-1'||!Array.isArray(backup.samples)||!Array.isArray(backup.versions))throw Error('지원하는 프로젝트 백업이 아닙니다.');const p=await api('projects',{track:backup.track});for(const s of backup.samples)await api(`projects/${p.id}/samples`,{label:s.label,split:s.split,base64:s.base64});for(const v of backup.versions)await api(`projects/${p.id}/versions`,{...v,source:'import'});if(Array.isArray(backup.current_hashes)){const restored=await api('projects/'+p.id);for(const s of restored.samples)if(!backup.current_hashes.includes(s.sha256))await api(`projects/${p.id}/samples/${s.id}`,null,'DELETE');}await refresh(p.id);note('별도 프로젝트로 복원했습니다. 적용 모델은 바꾸지 않았습니다.');});};
    host.querySelector('#tm-model-import').onchange=e=>{const files=[...e.target.files];run(async()=>{
      const mf=files.find(f=>f.name==='model.json'),md=files.find(f=>f.name==='metadata.json'),wf=files.find(f=>f.name==='weights.bin');
      if(!mf||!md||!wf)throw Error('model.json·metadata.json·weights.bin을 모두 선택해 주세요.');
      if(wf.size>12*1024*1024||mf.size>2*1024*1024||md.size>100000)throw Error('모델 파일이 지원 크기를 넘었습니다.');
      const m=JSON.parse(await mf.text()),metadata=JSON.parse(await md.text());
      if(!Array.isArray(metadata.labels)||metadata.labels.length!==state.project.classes.length||!metadata.labels.every(l=>state.project.classes.includes(l)))throw Error('모델 클래스 이름을 이 프로젝트의 유형과 맞춰 주세요.');
      if(m.weightsManifest?.length!==1||m.weightsManifest[0].paths?.length!==1||m.weightsManifest[0].paths[0]!=='weights.bin')throw Error('단일 weights.bin 모델을 선택해 주세요.');
      await runtime(); const loaded=await tmImage.loadFromFiles(mf,wf,md);try{const canvas=document.createElement('canvas');canvas.width=canvas.height=224;assertScores(await loaded.predict(canvas),state.project.classes);}finally{dispose(loaded);}
      await api(`projects/${id}/versions`,{modelTopology:m.modelTopology,weightSpecs:m.weightsManifest[0].weights,weights:base64(await wf.arrayBuffer()),metadata,preprocessing:metadata.userMetadata?.preprocessing==='letterbox224'?'letterbox224':'tm-center-crop',source:'import'});await refresh(id);note('모델을 가져왔습니다. 사용할 버전을 직접 적용해 주세요.');
    });};
  }
  async function mountTraining() {
    try { if(!state.catalog) state.catalog=await api('catalog'); await refresh(); const interrupted=sessionStorage.getItem('tm-interrupted');if(interrupted&&!state.training){sessionStorage.removeItem('tm-interrupted');note('새로고침으로 이전 학습이 중단됐습니다. 저장된 프로젝트에서 다시 시작해 주세요.');} view(); }catch(e){const host=document.getElementById('tm-training');if(host)host.textContent='학습 자료를 불러오지 못했습니다. '+e.message;}
  }
  async function home() {
    const host=document.getElementById('tm-home-status');if(!host)return;
    if(state.training){host.textContent=state.message;return;}
    try{const a=await api('active');if(host.isConnected)host.textContent=['quality','safety'].map(t=>`${t==='quality'?'택배 발송':'산업안전'}: ${a[t]?'모델 연결됨':'모델 미연결'}`).join(' · ');}catch(e){if(host.isConnected)host.textContent='모델 연결 상태를 확인하지 못했습니다.';}
  }
  function predictionsView(rows, rec, currentModel, previews) {
    const current=rows.filter(r=>r.record_version===Number(rec.version||1)&&r.model_id===currentModel?.id), old=rows.filter(r=>!current.includes(r));
    const cards=current.sort((a,b)=>a.image_index-b.image_index).map(r=>{
      const sorted=[...r.scores].sort((a,b)=>b.probability-a.probability),top=sorted[0];
      return `<article class="tm-prediction"><strong>사진 ${r.image_index+1} · ${esc(top.className)}</strong><p class="meta">Teachable Machine 모델 예측 · v${r.model_number}</p>${top.probability<0.7?'<p>분류 점수가 낮습니다. 사진과 기준을 더 확인해 주세요.</p>':''}<details><summary>클래스별 점수·모델 입력 보기</summary>${sorted.map(s=>`<p>${esc(s.className)} ${(s.probability*100).toFixed(1)}%</p>`).join('')}${previews[r.image_index]?`<img class="tm-input-preview" src="${previews[r.image_index]}" alt="사진 ${r.image_index+1} 모델 입력">`:''}<p class="meta">${r.preprocessing==='letterbox224'?'전체 사진을 224×224에 여백 맞춤':'공식 TM 중앙 자르기'} · 모델 ${esc(r.model_id)}</p></details></article>`;
    }).join('');
    return '<p class="meta">모델 점수는 위험 확정·안전 인증이 아닙니다. 낮은 점수나 불명확한 사진은 추가 확인이 필요합니다.</p>'+(rec.category==='quality'?'<p class="meta">정상 예측은 발송 승인이 아닙니다. 주문·수취인·배송 주소·수량은 실제 주문 자료와 따로 대조하세요.</p>':'')+cards+(old.length?`<details><summary>이전 정보·모델의 예측 ${old.length}건</summary>${old.map(r=>`<p>사진 ${r.image_index+1} · 정보 v${r.record_version} · 모델 v${r.model_number}: ${esc([...r.scores].sort((a,b)=>b.probability-a.probability)[0].className)} (현재 결과 아님)</p>`).join('')}</details>`:'');
  }
  async function classify(rec) {
    if(!['quality','safety'].includes(rec.category))throw Error('사건의 분류를 확인하지 못했습니다. 정보 수정에서 택배 발송 확인 또는 산업안전을 선택해 주세요.');
    const active=await api('active'), v=active[rec.category==='safety'?'safety':'quality'];
    let rows=await api('predictions/'+encodeURIComponent(rec.record_id));const previews={},errors=[];
    if(!v)return{v,rows,previews,errors};
    const m=await model(v), count=Math.min(5,Number(rec.image_count)||1);
    for(let i=0;i<count;i++){
      let objectUrl;
      try{
        const r=await fetch(`/api/records/${encodeURIComponent(rec.record_id)}/images/${i}`);if(!r.ok)throw Error('사진을 불러오지 못했습니다.');
        const bytes=await r.arrayBuffer(),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
        objectUrl=URL.createObjectURL(new Blob([bytes]));const img=await image(objectUrl),c=inputCanvas(img);
        if(v.preprocessing==='letterbox224')previews[i]=c.toDataURL('image/png');
        else{const crop=document.createElement('canvas');crop.width=crop.height=224;const s=Math.min(img.width,img.height);crop.getContext('2d').drawImage(img,(img.width-s)/2,(img.height-s)/2,s,s,0,0,224,224);previews[i]=crop.toDataURL('image/png');}
        const old=rows.find(x=>x.model_id===v.id&&x.record_version===Number(rec.version||1)&&x.image_index===i&&x.image_sha256===hash);
        if(!old){const scores=await m.predict(v.preprocessing==='letterbox224'?c:img);const saved=await api('predictions',{record_id:rec.record_id,record_version:Number(rec.version||1),image_index:i,image_sha256:hash,model_id:v.id,scores});rows.push(saved);}
      }catch(e){errors.push({index:i,error:e.message});}finally{if(objectUrl)URL.revokeObjectURL(objectUrl);}
    }
    return{v,rows,previews,errors};
  }
  // Current-version predictions are ready: enable the criteria check and note it on the progress bar (the step itself moves only with the next buttons).
  // app.js calls this again after it redraws the review pane with a finished job's result.
  function markReady(){const button=document.querySelector('[data-action="check-evidence"]');if(button&&!button.dataset.off&&document.querySelector('#review-std-select')?.value){button.disabled=false;button.removeAttribute('title');if(!document.querySelector('#details-evidence .workflow-result'))button.classList.add('primary');}document.querySelector('.tm-evidence-prerequisite')?.remove();
    window.RiskWorkflow?.sync(document,{tm:true});}
  // done(rows) gets the prediction rows (saved ones included), so app.js keeps them for the review form and re-applies pending requests after markReady.
  async function detail(rec,done) {
    const host=document.getElementById('tm-record-predictions');if(!host)return;host.textContent='적용 모델과 사진을 확인하고 있어요.';
    const key=rec.record_id+':'+rec.version;
    // Same detail renders share a pending task; refresh reads durable predictions, not a repeated save.
    if(!inferences.has(key))inferences.set(key,classify(rec).finally(()=>inferences.delete(key)));
    try{const {v,rows,previews,errors}=await inferences.get(key);if(!host.isConnected){done?.(rows);return;}host.innerHTML=`<h3>Teachable Machine 모델 예측</h3>${!v?'<p>사용할 모델이 없습니다. 모델 학습에서 사용할 버전을 선택해 주세요.</p><a href="#training">모델 학습으로 이동</a>':predictionsView(rows,rec,v,previews)}${errors.map(e=>`<p role="alert">사진 ${e.index+1}: ${esc(e.error)} 페이지를 다시 열어 재시도할 수 있습니다.</p>`).join('')}<p class="meta">사진별 대표 유형을 고릅니다. 여러 위험의 위치나 사건 흐름을 자동 확정하지 않습니다.</p>`;
      if(v&&rows.some(r=>r.model_id===v.id&&r.record_version===Number(rec.version||1)))markReady();
      done?.(rows);
    }catch(e){if(host.isConnected){host.innerHTML='<p role="alert">모델 분류를 완료하지 못했습니다. '+esc(e.message)+'</p><button id="retry-tm" class="button">AI로 사진 다시 분류하기</button>';host.querySelector('#retry-tm').onclick=()=>detail(rec,done);}}
  }
  window.VisionTM={mountTraining,home,detail,markReady,train,evaluate,inputCanvas,state,api,formatTime};
  window.addEventListener('beforeunload',e=>{if(state.training){e.preventDefault();e.returnValue='';}});
})();
