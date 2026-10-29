(function(){
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  window.RiskLiveDetail=function({rec,rev,actions,summary,context}){
    const freshReview=rev&&!context.after_review&&!context.version_time_unknown;
    const photoCount=Number(rec.image_count)||1;
    const step=RiskWorkflow.current({photo:photoCount>0,review:!!freshReview,queue:summary?.queue||null}),url='#records/'+encodeURIComponent(rec.record_id);
    const latestAction=actions.at(-1),warning='<p class="error">수정 전 결과입니다. 현재 사진과 내용을 다시 확인해 주세요.</p>';
    const intro='<p class="workflow-intro">이 사진에서 확인할 점을 살펴보고, 처리할 내용을 남겨주세요.</p><ol class="workflow-path" aria-label="확인 순서">'+RiskWorkflow.steps.map((label,i)=>'<li '+(step===i+1?'aria-current="step"':'')+'>'+(i+1)+'. '+label+'</li>').join('')+'</ol><p class="workflow-guide" id="workflow-guidance">'+RiskWorkflow.guide(step)+'</p>';
    const pane='<div class="review-pane">'+
      '<section class="workflow-step" id="details-human"><h2>2. 내 판단 남기기</h2><p class="hint">사진과 사건 정보를 보고, 직접 확인한 판단을 기록하세요.</p>'+
      (rev?(!freshReview?warning:'')+'<div class="workflow-result"><strong>'+esc(rev.decision)+'</strong><p>'+esc(rev.basis||'')+'</p></div>':'<p>문제가 있는지, 기준에 맞는지, 더 확인해야 하는지 선택합니다.</p>')+
      (rev?.decision==='판단 보류'?'<p><b>추가 확인:</b> '+esc(rev.followup_note||rev.basis||'확인할 내용을 기록해 주세요.')+'</p>':'')+
      (latestAction?'<h3>최근 조치</h3><p>'+esc(latestAction.description||'')+'</p>':'')+
      '<div class="actions"><a class="button '+(step===2||step===RiskWorkflow.DONE?'primary':'')+'" href="'+url+'/review">'+(rev?'판단 다시 기록하기':'판단 기록하기')+'</a>'+(summary?.queue==='confirmed_risk'?'<a class="button primary" href="'+url+'/action">조치 기록하기</a>':latestAction?'<a class="button" href="'+url+'/action">조치 추가 기록</a>':'')+'</div></section></div>';
    return {intro,pane,step};
  };
})();
