(function(){
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  window.RiskLiveDetail=function({rec,evid:latestEvid,evidenceByStandard,rev,actions,summary,context,standards,selectedStandardId,inlineStatus,normalizeBool,integrations,step:shown}){
    // 꺼진 연동(NOTEBOOKLM_MODE=off)은 버튼을 끄고 이유를 적는다. 상태를 아직 모르면 켜 둔다(서버가 다시 막는다).
    const notebookOff=integrations?.notebooklm==='off';
    const matching=standards.filter(s=>s.category===rec.category),curStd=matching.find(s=>s.id===selectedStandardId)||matching[0];
    // 고른 기준으로 확인한 근거만 보여 준다. 다른 기준의 이전 근거는 보이지 않는다.
    const evid=RiskWorkflow.evidenceFor({evidence_check:latestEvid,evidence_by_standard:evidenceByStandard},curStd?.id);
    const freshEvidence=evid&&Number(evid.input_version||1)===Number(rec.version||1)&&!context.after_evidence;
    const freshReview=rev&&!context.after_review&&!context.version_time_unknown;
    const photoCount=Number(rec.image_count)||(rec.drive_file_ids?rec.drive_file_ids.length:1);
    const workflowState={photo:photoCount>0,evidence:!!freshEvidence,review:!!freshReview,queue:summary?.queue||null};
    // 처음 그릴 때는 순서상 끝나지 않은 첫 단계를 쓰고, 그 뒤에는 화면이 기억한 단계(shown)를 쓴다. 판단을 저장한 사건(완료·조치)은 저장 상태를 따른다.
    const auto=RiskWorkflow.current({...workflowState,notebookOff});
    const step=typeof auto==='number'&&shown?shown:auto,next=(id,n,label)=>'<button class="link workflow-next" data-workflow-step="'+id+'" data-step="'+n+'">다음: '+label+' →</button>',url='#records/'+encodeURIComponent(rec.record_id);
    const stdLabel=id=>{const s=standards.find(x=>x.id===id);return s?s.id+' '+s.name:id;};
    const latestAction=actions.at(-1),warning='<p class="error">수정 전 결과입니다. 현재 사진과 내용을 다시 확인해 주세요.</p>';
    // 끝난 작업의 표시는 지금 보는 정보 버전과 기준의 것만 보인다.
    const status=(kind)=>inlineStatus(rec.record_id,kind,{version:rec.version??null,standardId:kind==='evidence_check'?curStd?.id||'':''}),citedStd=evid?RiskWorkflow.citedLabel(evid.quote,standards):'';
    const view=RiskWorkflow.evidenceView(evid,{standards,standardId:curStd?.id,normalizeBool});
    const intro='<p class="workflow-intro">이 사진에서 확인할 점을 살펴보고, 처리할 내용을 남겨주세요.</p><ol class="workflow-path" aria-label="확인 순서">'+RiskWorkflow.steps.map((label,i)=>'<li '+(step===i+1?'aria-current="step"':'')+'>'+(i+1)+'. '+label+'</li>').join('')+'</ol><p class="workflow-guide" id="workflow-guidance">'+RiskWorkflow.guide(step)+'</p>';
    const pane='<div class="review-pane">'+
      '<section class="workflow-step" id="details-evidence" data-current-evidence="'+Boolean(freshEvidence)+'"><h2>2. 관련 기준 확인 (NotebookLM)</h2><p class="hint">확인할 항목을 고르면 NotebookLM이 등록된 문서에서 근거를 찾습니다.</p><div id="evidence-inline-job-status">'+status('evidence_check')+'</div>'+
      '<label class="field"><span>무엇을 확인할까요?</span><select id="review-std-select">'+matching.map(s=>'<option value="'+esc(s.id)+'" '+(s.id===curStd?.id?'selected':'')+'>'+esc(s.name)+'</option>').join('')+'</select></label>'+
      (curStd?'<p><b>확인할 점:</b> '+esc(curStd.hazard_condition)+'</p><details><summary>미리 읽어볼 기준</summary><blockquote>'+esc(curStd.canonical_quote)+'</blockquote><p>'+esc(curStd.hold_condition)+'</p></details>':'<p role="status">확인 기준을 불러오고 있어요.</p>')+
      '<button class="button '+(!freshEvidence?'primary':'')+'" data-action="check-evidence" data-record-id="'+esc(rec.record_id)+'" '+(notebookOff?'data-off="true" ':'')+(!curStd||notebookOff?'disabled':'')+'>관련 기준 찾기</button>'+(notebookOff?'<p class="meta">NotebookLM 연동이 꺼져 있습니다(NOTEBOOKLM_MODE=off).</p>':'')+'<p class="meta">사건 정보(분류·장소·메모·사진 장수)로 질문합니다.</p>'+
      (evid?(!freshEvidence?warning:'')+'<div class="workflow-result" data-evidence-state="'+esc(view.state)+'"><strong>'+esc(view.title)+'</strong>'+(view.reason?'<p><b>확인 필요:</b> '+esc(view.reason)+'</p>':'')+'<div class="evidence-answer">'+(evid.answer?RiskWorkflow.answerPreview(evid.answer,esc):esc((evid.notes||'').slice(0,240)))+'</div><p class="hint">'+(citedStd?'인용한 기준: '+esc(citedStd)+' · ':'')+'소스 ID: '+esc(evid.source_id||'없음')+'</p><blockquote>'+esc(evid.quote||'인용 없음')+'</blockquote><details><summary>전체 답변</summary><div class="evidence-answer">'+RiskWorkflow.answerHtml(evid.answer||'',esc)+'</div></details></div>':curStd?'<p class="hint" data-evidence-state="not_checked">이 기준으로는 아직 확인하지 않았습니다.'+(latestEvid?.standard_id&&latestEvid.standard_id!==curStd.id?' 가장 최근 확인은 '+esc(stdLabel(latestEvid.standard_id))+' 기준입니다.':'')+'</p>':'')+
      next('details-human',3,'내 판단 남기기')+'</section>'+
      '<section class="workflow-step" id="details-human"><h2>3. 내 판단 남기기</h2><p class="hint">사진과 기준을 참고해, 직접 확인한 판단을 기록하세요.</p>'+
      (rev?(!freshReview?warning:'')+'<div class="workflow-result"><strong>'+esc(rev.decision)+'</strong><p>'+esc(rev.basis||'')+'</p></div>':'<p>문제가 있는지, 기준에 맞는지, 더 확인해야 하는지 선택합니다.</p>')+
      (rev?.decision==='판단 보류'?'<p><b>추가 확인:</b> '+esc(rev.followup_note||rev.basis||'확인할 내용을 기록해 주세요.')+'</p>':'')+
      (latestAction?'<h3>최근 조치</h3><p>'+esc(latestAction.description||'')+'</p>':'')+
      '<div class="actions"><a class="button '+(step===3||step===RiskWorkflow.DONE?'primary':'')+'" href="'+url+'/review">'+(rev?'판단 다시 기록하기':'판단 기록하기')+'</a>'+(summary?.queue==='confirmed_risk'?'<a class="button primary" href="'+url+'/action">조치 기록하기</a>':latestAction?'<a class="button" href="'+url+'/action">조치 추가 기록</a>':'')+'</div></section></div>';
    return {intro,pane,standardId:curStd?.id||'',step};
  };
})();
