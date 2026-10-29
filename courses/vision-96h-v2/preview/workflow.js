(function(root){
  const steps=['사진','AI 사진 설명 (Gemini)','모델 예측 (Teachable Machine)','관련 기준 확인 (NotebookLM)','내 판단 남기기'];
  // 진행 중인 단계는 1~5 번호로, 끝난 상태는 단계 번호와 겹치지 않는 이름으로 돌려준다.
  const DONE='done',ACTION='action';
  // 진행 단계는 2, 3, 4, 5 순서다. 사진이 없으면 1, Gemini 설명이 없으면 2, 모델 예측이 없으면 3, 기준 확인이 없으면 4, 아니면 5다.
  // 꺼진 연동(geminiOff, notebookOff)의 단계는 건너뛴다. 상세 화면은 처음 그릴 때만 이 값을 쓰고, 그 뒤에는 "다음" 버튼(go)으로만 옮긴다.
  function current({photo=true,ai=false,tm=false,evidence=false,review=false,queue=null,geminiOff=false,notebookOff=false}={}) {
    if(queue==='confirmed_risk')return ACTION;
    if(review&&queue!=='additional_check')return DONE;
    return !photo?1:!ai&&!geminiOff?2:!tm?3:!evidence&&!notebookOff?4:5;
  }
  function action(state={}) {
    const n=current(state);
    return n===ACTION?'조치 기록':n===DONE?'기록 보기':state.ai||state.tm||state.evidence||state.review?'이어서 확인':'확인 시작';
  }
  // 단계(current의 값)마다 보여 줄 안내 문구.
  function guide(n) {
    return ({[DONE]:'판단이 저장됐습니다. 기록을 다시 확인할 수 있습니다.',1:'먼저 확인할 사진을 등록해 주세요.',2:'Gemini 사진 설명을 확인해 주세요.',3:'Teachable Machine 모델 예측을 확인해 주세요.',4:'AI 결과를 확인했다면, NotebookLM으로 관련 기준을 찾아 사진과 비교해 주세요.',5:'사진과 기준을 비교하고, 직접 확인한 판단을 남겨주세요.',[ACTION]:'어떤 조치를 했는지 기록해 주세요.'})[n];
  }
  // "다음" 버튼을 누르면 진행 표시와 안내 문구를 n단계로 옮긴다.
  function go(doc,n) {
    doc.querySelectorAll('.workflow-path li').forEach((li,i)=>{if(i+1===n)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');});
    const g=doc.getElementById('workflow-guidance');if(g)g.textContent=guide(n);
  }
  // 도착한 결과를 진행 표시의 data-state에 적는다. 진행 단계는 옮기지 않는다.
  function sync(doc,patch={}) {
    const path=doc.querySelector('.workflow-path');if(!path)return;
    // 읽을 수 없는 값이면 의도적으로 빈 상태에서 다시 적는다.
    let saved={};try{saved=JSON.parse(path.dataset.state||'{}');}catch{}
    path.dataset.state=JSON.stringify({...saved,...patch});
  }
  // NotebookLM 인용문이 어느 기준의 문장인지 standards.json의 기준 원문(이름, canonical_quote, notes)으로 찾는다.
  // 응답에는 기준 ID가 없어서 이 대조로 구한다. 기준 원문 하나를 통째로 담은 인용이면 그 기준을(whole),
  // 아니면 인용문을 문장 일부로 담고 있는 기준들을 돌려준다. 공백 차이는 무시한다.
  const squash=s=>String(s??'').replace(/\s+/g,' ').trim();
  function quoteStandards(quote,standards=[]) {
    const q=squash(quote);if(!q)return {ids:[],whole:false};
    const whole=standards.filter(s=>s.canonical_quote&&q.includes(squash(s.canonical_quote)));
    if(whole.length)return {ids:whole.map(s=>s.id),whole:true};
    return {ids:standards.filter(s=>squash([s.id+' '+s.name,s.canonical_quote,s.notes].join(' ')).includes(q)).map(s=>s.id),whole:false};
  }
  // NotebookLM 답변을 HTML로 바꾼다. 마크다운은 아래만 다루고 그 밖의 글은 이스케이프한다. esc는 화면의 HTML 이스케이프 함수다.
  // "# 제목"(#~######)은 굵은 한 줄로, "* "·"- " 목록 줄은 "• "로 시작하는 줄로, "**굵게**"는 <strong>으로 바꾼다.
  // 짝을 잃은 **(앞부분만 잘라 보여 줄 때 생긴다)는 지운다.
  // "> " 다음에 따옴표나 글자가 오는 줄만 인용으로 보고 <blockquote>에 넣는다. "> 5bar" 같은 비교는 인용으로 보지 않는다.
  const QUOTE_LINE=/^\s*>\s+(?=["'“‘\p{L}])/u,HEADING_LINE=/^\s*#{1,6}\s+/,LIST_LINE=/^\s*[*-]\s+/;
  const inlineHtml=(text,esc)=>esc(text).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*\*/g,'');
  function answerHtml(answer,esc) {
    const out=[];let quote=null;
    for(const line of String(answer||'').split(/\r?\n/)){
      if(QUOTE_LINE.test(line)){if(!quote){quote=[];out.push(quote);}quote.push(inlineHtml(line.replace(QUOTE_LINE,''),esc));continue;}
      quote=null;
      if(HEADING_LINE.test(line))out.push('<strong>'+inlineHtml(line.replace(HEADING_LINE,''),esc)+'</strong>');
      else out.push(inlineHtml(line.replace(LIST_LINE,'• '),esc));
    }
    return out.map(x=>Array.isArray(x)?'<blockquote>'+x.join('<br>')+'</blockquote>':x).join('<br>');
  }
  // 요약에 보이는 답변 앞부분(240자). 자른 자리에 남은 *(닫는 **의 앞 글자 등)는 지운다.
  const answerPreview=(answer,esc)=>{const s=String(answer||'');return answerHtml(s.length>240?s.slice(0,240).replace(/\*+$/,''):s,esc);};
  // 화면에 보이는 "인용한 기준" 문구. 기준 목록을 아직 못 받았으면 빈 문자열이다.
  function citedLabel(quote,standards=[]) {
    if(!standards.length)return '';
    if(!squash(quote))return '인용문 없음';
    const ids=quoteStandards(quote,standards).ids;
    return ids.length?ids.map(id=>{const s=standards.find(x=>x.id===id);return s.id+' '+s.name;}).join(', '):'등록된 기준 문장에서 찾지 못했습니다';
  }
  // NotebookLM 결과의 판정. 서버 판정(sufficient·match·source_id·quote)을 통과해도
  // 인용이 확인하려던 기준(standardId)의 문장이 아니면 found로 보지 않고 이유를 붙인다.
  // state: found | insufficient | other_standard | ambiguous | unknown_standard
  function evidenceView(evid,{standards=[],standardId='',normalizeBool=v=>v===true||v==='TRUE'}={}) {
    if(!evid)return null;
    if(!(normalizeBool(evid.sufficient)===true&&normalizeBool(evid.match)===true&&evid.source_id&&evid.quote))return {state:'insufficient',title:'근거를 충분히 찾지 못했습니다',reason:''};
    const target=standards.find(s=>s.id===standardId);
    // 기준 목록이나 확인할 기준을 모르면 대조할 수 없으므로 서버 판정을 그대로 보여 준다.
    if(!target)return {state:'found',title:'문서에서 관련 근거를 찾았습니다',reason:''};
    const {ids,whole}=quoteStandards(evid.quote,standards),label=id=>{const s=standards.find(x=>x.id===id);return s.id+' '+s.name;};
    const mine=target.id+' '+target.name;
    if(ids.includes(target.id)&&(whole||ids.length===1))return {state:'found',title:'문서에서 관련 근거를 찾았습니다',reason:''};
    if(ids.includes(target.id))return {state:'ambiguous',title:'어느 기준의 문장인지 정할 수 없습니다',reason:'인용한 문장이 여러 기준('+ids.map(label).join(', ')+')에 함께 있어 '+mine+' 기준의 근거로 확정하지 않습니다.'};
    if(ids.length)return {state:'other_standard',title:'선택한 기준과 다른 기준의 문장입니다',reason:'인용한 문장은 '+ids.map(label).join(', ')+' 기준의 문장입니다. '+mine+' 기준의 근거로 보지 않습니다.'};
    return {state:'unknown_standard',title:'등록된 기준 문장과 일치하지 않습니다',reason:'인용한 문장을 확인 기준 목록에서 찾지 못해 '+mine+' 기준의 근거로 보지 않습니다. 노트북 소스와 기준 버전이 같은지 확인해 주세요.'};
  }
  // 화면에 보일 근거를 고른다. 기준을 골랐으면 그 기준으로 확인한 최신 근거만, 아니면 사건의 최신 근거를 돌려준다.
  // evidence_by_standard가 없는 응답(이전 서버)이면 최신 근거 1건으로 만든다.
  // 기준 ID가 없는 최신 근거는 어느 기준인지 알 수 없어 그대로 돌려준다(인용 대조는 evidenceView가 한다).
  function evidenceFor({evidence_check:latest=null,evidence_by_standard:byStandard}={},standardId='') {
    if(!standardId)return latest;
    if(latest&&!latest.standard_id)return latest;
    const by=byStandard||(latest?{[latest.standard_id]:latest}:{});
    return by[standardId]||null;
  }
  const api={steps,DONE,ACTION,current,action,guide,go,sync,quoteStandards,citedLabel,answerHtml,answerPreview,evidenceView,evidenceFor};root.RiskWorkflow=api;
  if(typeof module!=='undefined')module.exports=api;
})(globalThis);
