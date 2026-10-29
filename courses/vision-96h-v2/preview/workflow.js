(function(root){
  const steps=['사진','내 판단 남기기'];
  // 진행 중인 단계는 1~2 번호로, 끝난 상태는 단계 번호와 겹치지 않는 이름으로 돌려준다.
  const DONE='done',ACTION='action';
  // 사진이 없으면 1, 있으면 2(내 판단 남기기)다.
  function current({photo=true,review=false,queue=null}={}) {
    if(queue==='confirmed_risk')return ACTION;
    if(review&&queue!=='additional_check')return DONE;
    return !photo?1:2;
  }
  function action(state={}) {
    const n=current(state);
    return n===ACTION?'조치 기록':n===DONE?'기록 보기':state.review?'이어서 확인':'확인 시작';
  }
  // 단계(current의 값)마다 보여 줄 안내 문구.
  function guide(n) {
    return ({[DONE]:'판단이 저장됐습니다. 기록을 다시 확인할 수 있습니다.',1:'먼저 확인할 사진을 등록해 주세요.',2:'사진과 사건 정보를 확인하고, 직접 확인한 판단을 남겨주세요.',[ACTION]:'어떤 조치를 했는지 기록해 주세요.'})[n];
  }
  const api={steps,DONE,ACTION,current,action,guide};root.RiskWorkflow=api;
  if(typeof module!=='undefined')module.exports=api;
})(globalThis);
