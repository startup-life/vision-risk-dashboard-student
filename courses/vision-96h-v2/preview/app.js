// Vision Risk Management Dashboard - Live Application
// Integrates with the local same-origin REST API (/api/*).

(function () {
  // 라이브 대시보드 개편 스타일 동적 주입
  if (!document.getElementById('live-rework-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'live-rework-styles';
    styleEl.textContent = `
      .risk-card-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        margin-top: 14px;
      }
      @media (max-width: 1099px) {
        .risk-card-grid { grid-template-columns: repeat(2, 1fr); }
      }
      @media (max-width: 767px) {
        .risk-card-grid { grid-template-columns: 1fr; }
      }
      .queue-btn-group {
        display: flex;
        gap: 10px;
        margin: 12px 0 16px;
        flex-wrap: wrap;
      }
      .queue-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-radius: 6px;
        border: 1px solid var(--line, #cbd5e1);
        background: #fff;
        color: #334155;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .queue-btn:hover {
        background: #f8fafc;
        border-color: #94a3b8;
      }
      .queue-btn.active {
        background: #1e293b;
        color: #fff;
        border-color: #0f172a;
        font-weight: 600;
      }
      .queue-btn .badge-num {
        display: inline-block;
        padding: 2px 7px;
        border-radius: 10px;
        font-size: 12px;
        font-weight: 700;
        background: #f1f5f9;
        color: #475569;
      }
      .queue-btn.active .badge-num {
        background: #334155;
        color: #f8fafc;
      }
      .risk-card {
        border: 1px solid var(--line, #e2e8f0);
        border-radius: 8px;
        padding: 14px;
        background: #fff;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      }
      .risk-card-img-wrap {
        position: relative;
        width: 100%;
        height: 200px;
        background: #0f172a;
        border-radius: 6px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .risk-card-img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
      .risk-card-badge {
        position: absolute;
        top: 8px;
        left: 8px;
      }
      .risk-card-count {
        position: absolute;
        bottom: 8px;
        right: 8px;
        background: rgba(0,0,0,0.75);
        color: #fff;
        padding: 2px 7px;
        border-radius: 10px;
        font-size: 11px;
      }
      .detail-top-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 16px;
      }
      @media (max-width: 800px) {
        .detail-top-grid { grid-template-columns: 1fr; }
      }
      .workbench-split {
        display: grid;
        grid-template-columns: minmax(0, 55fr) minmax(0, 45fr);
        gap: 20px;
        align-items: start;
        margin-top: 14px;
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
      }
      @media (max-width: 900px) {
        .workbench-split {
          grid-template-columns: minmax(0, 1fr);
          gap: 14px;
        }
      }
      .photo-pane, .review-pane {
        min-width: 0;
        max-width: 100%;
        box-sizing: border-box;
      }
      .photo-pane {
        position: sticky;
        top: 16px;
      }
      @media (max-width: 900px) {
        .photo-pane {
          position: static;
        }
      }
      .photo-pane .card, .review-pane .card {
        min-width: 0;
        max-width: 100%;
        box-sizing: border-box;
        overflow-wrap: break-word;
        word-break: break-word;
      }
      .photo-main-viewer {
        position: relative;
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
        height: 380px;
        background: #0f172a;
        border-radius: 8px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #334155;
      }
      @media (max-width: 600px) {
        .photo-main-viewer {
          height: 260px;
        }
      }
      .photo-main-viewer img {
        width: 100%;
        height: 100%;
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }
      .thumbnail-bar {
        display: flex;
        gap: 8px;
        margin-top: 10px;
        overflow-x: auto;
        max-width: 100%;
        box-sizing: border-box;
        padding-bottom: 4px;
      }
      .thumbnail-item {
        flex: 0 0 72px;
        height: 72px;
        border-radius: 6px;
        overflow: hidden;
        border: 2px solid #cbd5e1;
        cursor: pointer;
        background: #0f172a;
        position: relative;
        padding: 0;
        outline: none;
        transition: border-color 0.15s;
        box-sizing: border-box;
      }
      .thumbnail-item.active {
        border-color: #2563eb;
        box-shadow: 0 0 0 2px rgba(37,99,235,0.25);
      }
      .thumbnail-item img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .thumbnail-badge {
        position: absolute;
        bottom: 2px;
        right: 2px;
        background: rgba(0,0,0,0.65);
        color: #fff;
        font-size: 9px;
        padding: 1px 4px;
        border-radius: 3px;
      }
      .review-pane {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
    `;
    document.head.appendChild(styleEl);
    const layoutLink = document.createElement('link');
    layoutLink.rel = 'stylesheet';
    layoutLink.href = 'risk-layout.css';
    document.head.appendChild(layoutLink);
    const wl=document.createElement('link');wl.rel='stylesheet';wl.href='workflow.css';document.head.appendChild(wl);
  }


  // KST/ISO 날짜 파서 (round-trip 유효성 검증 포함)
  function parseKstOrIso(ts) {
    if (!ts) return null;
    if (ts instanceof Date) {
      const time = ts.getTime();
      return isNaN(time) ? null : time;
    }
    const str = String(ts).trim();
    if (!str) return null;

    const kstMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?$/);
    if (kstMatch) {
      const [, yStr, mStr, dStr, hStr, minStr, sStr, msStr] = kstMatch;
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10);
      const d = parseInt(dStr, 10);
      const h = parseInt(hStr, 10);
      const min = parseInt(minStr, 10);
      const s = parseInt(sStr, 10);
      if (m < 1 || m > 12 || d < 1 || d > 31 || h > 23 || min > 59 || s > 59) return null;
      const checkDate = new Date(Date.UTC(y, m - 1, d));
      if (checkDate.getUTCFullYear() !== y || (checkDate.getUTCMonth() + 1) !== m || checkDate.getUTCDate() !== d) {
        return null;
      }
      const isoStr = `${yStr}-${mStr}-${dStr}T${hStr}:${minStr}:${sStr}${msStr ? '.' + msStr.padEnd(3, '0').slice(0, 3) : ''}+09:00`;
      const t = Date.parse(isoStr);
      return isNaN(t) ? null : t;
    }

    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:?\d{2})?$/i);
    if (isoMatch) {
      const [, yStr, mStr, dStr, hStr, minStr, sStr] = isoMatch;
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10);
      const d = parseInt(dStr, 10);
      const h = parseInt(hStr, 10);
      const min = parseInt(minStr, 10);
      const s = parseInt(sStr, 10);
      if (m < 1 || m > 12 || d < 1 || d > 31 || h > 23 || min > 59 || s > 59) return null;
      const checkDate = new Date(Date.UTC(y, m - 1, d));
      if (checkDate.getUTCFullYear() !== y || (checkDate.getUTCMonth() + 1) !== m || checkDate.getUTCDate() !== d) {
        return null;
      }
      const t = Date.parse(str);
      return isNaN(t) ? null : t;
    }
    return null;
  }

  // 큐 태그 헬퍼
  function getQueueTag(queue) {
    if (queue === 'additional_check') return tag('추가 확인', 'warn');
    if (queue === 'awaiting_review') return tag('검토 대기', 'info');
    if (queue === 'confirmed_risk') return tag('대응 필요', 'red');
    return tag('확인 완료', 'green');
  }

  // 사건 상태 배지. rec.status(등록·판단 같은 처리 단계)가 아니라 review_summary의 큐와 최신 판단·완료 기록으로 정한다.
  // 상세, 사건 목록, 홈의 최근 확인 표가 같은 규칙을 쓴다.
  function reviewStatusTag(summary, rev) {
    if (summary?.queue) return getQueueTag(summary.queue);
    if (summary?.completion_recorded_after_review) return tag('완료 기록 있음', 'green');
    if (rev?.decision) return tag(rev.decision, (rev.decision === '위험 없음' || rev.decision === '해당 없음') ? 'green' : 'gray');
    return tag('검토 대기', 'gray');
  }

  // 큐 및 사건 확인 이유 도출 공통 헬퍼 (홈/상세 완벽 동기화)
  function getCheckReason(summary, review) {
    if (!summary) return '';
    const q = summary.queue;
    const context = summary.context_changed || {};

    if (q === 'additional_check') {
      if (context.version_time_unknown) {
        return '판단·조치 기록의 시점을 확인해야 합니다';
      } else if (context.after_review) {
        return '판단 후 정보가 바뀌어 다시 확인해야 합니다';
      } else if (context.after_action) {
        return '조치 후 정보가 바뀌어 다시 확인해야 합니다';
      } else if (review && review.decision === '판단 보류') {
        return review.basis || review.followup_note || '판단 보류된 사건으로 추가 확인이 필요합니다';
      } else if (review && review.followup_note) {
        return review.followup_note;
      } else {
        return '추가 확인이 필요한 사건입니다';
      }
    } else if (q === 'confirmed_risk') {
      return '확인된 위험의 대응 기록을 확인하세요';
    } else if (q === 'awaiting_review') {
      return '사진과 사건 정보를 확인하고 판단을 남겨주세요';
    } else {
      if (summary.completion_recorded_after_review) {
        return '대응 조치 완료가 확인된 사건입니다';
      }
      return review?.basis || '확인이 완료된 사건입니다';
    }
  }

  // 간결한 일시 포맷 헬퍼 (초 단위 및 장황한 ISO 대신 YYYY-MM-DD HH:mm 제공)
  function formatDateSimple(ts) {
    if (!ts) return '일시 미상';
    const time = parseKstOrIso(ts);
    if (!time) return String(ts);
    const d = new Date(time);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // 저장소 사진 출처는 서버가 메모 끝에 붙인다. 첫 표지 앞은 현장 메모, 표지부터 끝은 읽기 전용 출처로 나눠 보여 준다.
  const PROVENANCE_MARK = '[Repository Images:';
  const memoNote = memo => String(memo || '').split(PROVENANCE_MARK)[0].trim();
  const memoProvenance = memo => String(memo || '').includes(PROVENANCE_MARK) ? `<details><summary>사진 출처</summary><p class="meta">${escapeHtml(PROVENANCE_MARK + String(memo).split(PROVENANCE_MARK).slice(1).join(PROVENANCE_MARK))}</p></details>` : '';
  // 메모 수정 이력의 내용에는 수정 전후 메모가 출처 표지째 들어 있다. 표시할 때만 표지와 그 아래 사진 줄을 빼서 접어 둔다(저장값은 그대로).
  const PROVENANCE_BLOCK = /\s*\[Repository Images:[^\]\n]*\](?:\n- [^\n]*?: sha256=[^\s()]* \([^()\n]*\))*/g;
  const historySummaryHtml = summary => {
    const text = String(summary || '');
    const blocks = [...new Set((text.match(PROVENANCE_BLOCK) || []).map(b => b.trim()))];
    if (!blocks.length) return escapeHtml(text);
    return `${escapeHtml(text.replace(PROVENANCE_BLOCK, '').trim())}<details><summary>사진 출처</summary><p class="meta">${escapeHtml(blocks.join('\n\n'))}</p></details>`;
  };
  // 감사 이력의 단계 코드를 화면 이름으로 바꾼다. 모르는 코드는 그대로 보여 준다.
  const HISTORY_PHASE_LABELS = {
    REGISTER: '사진 등록',
    RECORD_UPDATE: '정보 수정',
    HUMAN_REVIEW: '내 판단',
    ACTION_TAKEN: '조치 기록'
  };
  const historyPhaseLabel = phase => Object.hasOwn(HISTORY_PHASE_LABELS, phase) ? HISTORY_PHASE_LABELS[phase] : String(phase || '');
  // 로컬 저장소가 모의 Gemini·NotebookLM 작업자 이름 끝에 붙이는 "(Synthetic)"을 상태 줄의 mock 표기와 같은 말로 바꾼다.
  const historyOperator = operator => String(operator || '').replace(/\s*\(Synthetic\)$/, ' (mock)');

  // HTML escape 헬퍼 (XSS 및 템플릿 인젝션 방지)
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // 상태 관리
  const state = {
    loading: false,
    recordsLoading: true,
    recordsError: null,
    detailLoading: false,
    detailError: null,
    detailAttemptId: null,
    standardsLoading: true,
    standardsError: null,
    error: null,
    connected: false,
    integrations: null, // /api/health의 연동 모드와 상태 한 줄
    queue_counts: null,
    activeQueueFilter: null,
    records: [],
    selectedRecordId: null,
    currentDetail: null,
    standards: [],
    repositoryImages: [],
    repoImagesLoaded: false,
    repoImagesLoading: false,
    repoImagesAvailable: true,
    repoImagesError: null,
    repoImagesFilterTrack: 'all',
    repoImagesVisibleCount: 12,
    newRecordDraft: null,
    // 등록·정보 수정·판단·조치 폼의 요청 번호와 그 번호로 보낸 본문. requestIdFor가 쓴다.
    formRequestIds: {},
    homePhotoPickerOpen: false,
    selectedImageIndex: 0
  };

  // 라우트 파서 (쿼리 파라미터 분리 지원)
  function parseRoute() {
    const rawHash = (location.hash.slice(1) || '').trim();
    const qIdx = rawHash.indexOf('?');
    const pathPart = qIdx >= 0 ? rawHash.slice(0, qIdx) : rawHash;
    const queryPart = qIdx >= 0 ? rawHash.slice(qIdx + 1) : '';
    const params = new URLSearchParams(queryPart);
    const raw = pathPart.trim();

    if (!raw || raw === 'dashboard') {
      return { page: 'dashboard', params };
    }
    if (raw === 'records') {
      return { page: 'records', params };
    }
    if (raw === 'records/new') {
      return { page: 'records_new', params };
    }
    const editMatch = raw.match(/^records\/([^/]+)\/edit$/);
    if (editMatch) {
      return { page: 'record_edit', recordId: decodeURIComponent(editMatch[1]), params };
    }
    const revMatch = raw.match(/^records\/([^/]+)\/review$/);
    if (revMatch) {
      return { page: 'record_review', recordId: decodeURIComponent(revMatch[1]), params };
    }
    const actMatch = raw.match(/^records\/([^/]+)\/action$/);
    if (actMatch) {
      return { page: 'record_action', recordId: decodeURIComponent(actMatch[1]), params };
    }
    const detailMatch = raw.match(/^records\/([^/]+)$/);
    if (detailMatch) {
      return { page: 'record_detail', recordId: decodeURIComponent(detailMatch[1]), params };
    }
    // 확인 기준 화면은 사건과 무관하다. 사건 ID를 붙이면 그 사건 상세를 불러오는 동안 로딩 화면이 먼저 보인다.
    if (raw === 'models') return { page: 'models', params };
    return { page: 'dashboard', params };
  }

  // API 호출 유틸리티
  let activeApiRequests = 0;
  // fetch가 서버에 닿지 못하면(서버가 꺼졌을 때) 브라우저의 영어 원문(Failed to fetch) 대신 보여 줄 안내.
  const SERVER_UNREACHABLE = '로컬 서버에 연결하지 못했습니다. 터미널에서 npm.cmd start(macOS: npm start)가 켜져 있는지 확인하세요.';
  async function api(path, options = {}) {
    activeApiRequests++;
    state.loading = true;
    renderStatus();
    try {
      const resp = await fetch(path, {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options
      }).catch(() => { throw new Error(SERVER_UNREACHABLE); });
      const data = await resp.json();
      if (!resp.ok) {
        // 요청 오류(4xx: 입력 검사 실패, 없는 사건)는 서버가 정상으로 답한 것이다. 연결 표시는 그대로 두고 그 화면의 알림으로만 보인다.
        if (resp.status >= 500) state.connected = false;
        const err = new Error(data.error || `HTTP ${resp.status}`);
        err.status = resp.status;
        throw err;
      }
      state.error = null;
      return data;
    } catch (err) {
      if (!(err.status >= 400 && err.status < 500)) state.error = err.message;
      throw err;
    } finally {
      state.loading = --activeApiRequests > 0;
      renderStatus();
    }
  }

  // 비차단형 인라인 알림 표시
  function notify(msg, type = 'info') {
    const el = document.getElementById('global-status-msg');
    if (el) {
      const bg = type === 'error' ? '#ef4444' : '#10b981';
      el.innerHTML = `<span style="display:inline-block; padding: 4px 12px; border-radius: 6px; background: ${bg}; color: #fff; font-size: 13px; font-weight: 600; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">${escapeHtml(msg)}</span>`;
      // 알림 줄은 페이지 맨 위에 있다. 폼 아래쪽 단추를 누른 뒤에도 알림이 보이도록, 화면 밖에 있을 때만 스크롤한다.
      el.scrollIntoView?.({ block: 'nearest' });
      setTimeout(() => {
        if (el && el.innerText.includes(msg)) el.innerHTML = '';
      }, 4000);
    }
  }

  function applyRecordsResponse(recRes) {
    state.records = recRes.records || [];
    state.queue_counts = recRes.queue_counts || null;
    state.connected = true;
    state.error = null;
  }

  // 사건 목록 및 큐 카운트 갱신 공통 함수
  async function refreshRecords() {
    try {
      const recRes = await api('/api/records');
      applyRecordsResponse(recRes);
      state.recordsError = null;
    } catch (e) {
      state.error = `사건 목록 갱신 실패: ${e.message}`;
      state.recordsError = e.message;
      renderStatus();
    }
  }

  // 저장소 사진 카탈로그 로드 함수 (독립 fetch 호출로 사건 목록 상태와 격리)
  async function loadRepositoryImages() {
    if (state.repoImagesLoading || state.repoImagesLoaded) return;
    state.repoImagesLoading = true;
    try {
      const res = await fetch('/api/repository-images?limit=200');
      const resp = await res.json().catch(() => null);
      if (res.ok && resp && resp.success) {
        state.repositoryImages = resp.images || [];
        state.repoImagesAvailable = true;
        state.repoImagesError = null;
      } else {
        state.repoImagesAvailable = false;
        state.repoImagesError = resp?.error || '저장소 사진을 사용할 수 없습니다.';
      }
    } catch (e) {
      state.repoImagesAvailable = false;
      state.repoImagesError = SERVER_UNREACHABLE; // 본문 읽기 실패는 null로 받으므로 여기 오는 것은 fetch 실패뿐이다.
    } finally {
      state.repoImagesLoaded = true; // 성공/실패 무관 시도 완료 표시하여 무한 재시도 차단
      state.repoImagesLoading = false;
    }
  }

  // 초기 데이터 로드 (홈에서는 첫 detail을 자동 조회하지 않음)
  async function initData() {
    render(); // 데이터보다 페이지 틀을 먼저 표시한다.
    const updateDataPage = () => {
      const page = parseRoute().page;
      // 배경 조회 완료로 사용자가 작성 중인 폼을 교체하지 않는다. 그 화면은 머리말 연결 표시만 바꾼다.
      if (['dashboard', 'records', 'record_detail', 'models'].includes(page)) render();
      else renderConnectionBadge();
    };
    loadRepositoryImages().then(() => {
      const picker = document.getElementById('new-photo-picker');
      if (parseRoute().page === 'records_new' && state.newRecordDraft && picker) {
        const template = document.createElement('template');
        template.innerHTML = screens.records_new(); // 탭을 고르지 않았으면 여기서 저장소 사진 모드가 된다.
        if (state.newRecordDraft.mode === 'repository') {
          picker.innerHTML = template.content.querySelector('#new-photo-picker').innerHTML;
          document.getElementById('tab-mode-repo')?.classList.add('primary');
          document.getElementById('tab-mode-upload')?.classList.remove('primary');
          bindEvents(parseRoute()); // 장소·메모 입력은 교체하지 않는다.
        }
      } else updateDataPage();
    }).catch(() => {});
    // 저장소 상태 한 줄. 조회에 실패하면 의도적으로 상태 줄 없이 둔다.
    fetch('/api/health').then(r => r.ok ? r.json() : null).then(h => {
      if (!h?.modes) return;
      state.integrations = { modes: h.modes, line: h.integration_status || '' };
      renderStatus();
      updateDataPage();
    }).catch(() => {});
    const standards = api('/api/standards').then(res => { state.standards = res.standards || []; state.standardsError = null; })
      .catch(e => { state.standardsError = e.message; }).finally(() => { state.standardsLoading = false; updateDataPage(); });
    const records = api('/api/records').then(res => {
      applyRecordsResponse(res);
      state.recordsError = null;
      if (!state.selectedRecordId) state.selectedRecordId = state.records[0]?.record_id || null;
    }).catch(e => {
      state.recordsError = e.message;
      state.connected = false;
    }).finally(() => { state.recordsLoading = false; updateDataPage(); });
    await Promise.allSettled([standards, records]);
  }

  let latestDetailToken = 0;
  let latestRenderToken = 0;

  async function loadDetail(recordId) {
    if (!recordId) return;
    const currentToken = ++latestDetailToken;
    state.detailAttemptId = recordId;
    state.detailLoading = true;
    state.detailError = null;
    try {
      const res = await api(`/api/records/${encodeURIComponent(recordId)}`);
      // 최신 요청이 아니면(뒤늦게 도착한 과거 응답) 상태를 덮어쓰지 않고 무시
      if (currentToken !== latestDetailToken) {
        return;
      }
      state.currentDetail = res;
      state.selectedRecordId = recordId;
      state.connected = true; // 상세 조회가 성공했으면 데이터 연결도 정상이다.
    } catch (e) {
      if (currentToken !== latestDetailToken) {
        return;
      }
      state.currentDetail = null;
      state.detailError = e.message;
    } finally {
      if (currentToken === latestDetailToken) state.detailLoading = false;
    }
  }

  // UI 컴포넌트 헬퍼
  const tag = (s, k = '') => `<span class="tag ${escapeHtml(k)}">${escapeHtml(s)}</span>`;
  const table = (h, r) => `<div class="table-scroll" role="region" aria-label="사건 기록 표" tabindex="0"><table><thead><tr>${h.map(x => `<th>${escapeHtml(x)}</th>`).join('')}</tr></thead><tbody>${r.map(a => `<tr>${a.map(x => `<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const card = (h, b) => `<section class="card"><h2>${escapeHtml(h)}</h2>${b}</section>`;
  const heading = (h, b = '', actions = '') => `<div class="heading"><div><h1>${escapeHtml(h)}</h1>${b ? `<p class="subtitle">${escapeHtml(b)}</p>` : ''}</div>${actions ? `<div class="heading-actions">${actions}</div>` : ''}</div>`;
  const headingRaw = (h, bHtml = '', actions = '') => `<div class="heading"><div><h1>${escapeHtml(h)}</h1>${bHtml ? `<p class="subtitle">${bHtml}</p>` : ''}</div>${actions ? `<div class="heading-actions">${actions}</div>` : ''}</div>`;

  // 화면 렌더러 정의
  const screens = {
    // 1. 홈 (현장 리스크 확인) - 큐 중심 사진 카드와 3개 필터 집계 버튼
    dashboard: () => {
      const topActions = `
        <a class="button primary" href="#records/new">사진 등록</a>
        <a class="button" href="#records">전체 사건</a>
      `;

      // 3개 큐 카운트 (목록을 아직 받지 못한 경우 '—' 표시)
      const counts = state.queue_counts;
      const addCountText = counts && counts.additional_check !== null && counts.additional_check !== undefined ? String(counts.additional_check) : '—';
      const awaitCountText = counts && counts.awaiting_review !== null && counts.awaiting_review !== undefined ? String(counts.awaiting_review) : '—';
      const confCountText = counts && counts.confirmed_risk !== null && counts.confirmed_risk !== undefined ? String(counts.confirmed_risk) : '—';

      // 3개 큐 토글 버튼 (button 요소, aria-pressed, 재클릭 시 전체 복귀)
      const isAddActive = state.activeQueueFilter === 'additional_check';
      const isAwaitActive = state.activeQueueFilter === 'awaiting_review';
      const isConfActive = state.activeQueueFilter === 'confirmed_risk';

      const queueButtons = `
        <div class="queue-btn-group" role="group" aria-label="사건 큐 필터">
          <button type="button" class="queue-btn ${isAddActive ? 'active' : ''}" data-queue-filter="additional_check" aria-pressed="${isAddActive}">
            <span>추가 확인</span>
            <span class="badge-num">${addCountText}</span>
          </button>
          <button type="button" class="queue-btn ${isAwaitActive ? 'active' : ''}" data-queue-filter="awaiting_review" aria-pressed="${isAwaitActive}">
            <span>검토 대기</span>
            <span class="badge-num">${awaitCountText}</span>
          </button>
          <button type="button" class="queue-btn ${isConfActive ? 'active' : ''}" data-queue-filter="confirmed_risk" aria-pressed="${isConfActive}">
            <span>대응 필요</span>
            <span class="badge-num">${confCountText}</span>
          </button>
        </div>
      `;

      // 큐 대상 사건 추출 및 정렬
      const priorityOrder = { 'additional_check': 1, 'awaiting_review': 2, 'confirmed_risk': 3 };

      let targetRecords = state.records.filter(r => {
        const q = r.review_summary ? r.review_summary.queue : null;
        if (state.activeQueueFilter) {
          return q === state.activeQueueFilter;
        }
        return q === 'additional_check' || q === 'awaiting_review' || q === 'confirmed_risk';
      });

      // 정렬: 기본 큐는 additional_check -> awaiting_review -> confirmed_risk 순, 각 그룹 내 오래된 등록일 순, 동률 시 record_id 순
      targetRecords.sort((a, b) => {
        const qa = a.review_summary ? a.review_summary.queue : null;
        const qb = b.review_summary ? b.review_summary.queue : null;
        const pa = priorityOrder[qa] || 99;
        const pb = priorityOrder[qb] || 99;
        if (pa !== pb) return pa - pb;

        const ta = parseKstOrIso(a.created_at) || 0;
        const tb = parseKstOrIso(b.created_at) || 0;
        if (ta !== tb) return ta - tb;

        return String(a.record_id || '').localeCompare(String(b.record_id || ''));
      });

      const displayCards = targetRecords.slice(0, 6);

      // 사진 카드 그리드 생성
      let cardsHtml = '';
      if (state.recordsLoading) {
        cardsHtml = '<p class="meta" style="padding:20px 0;">사건 목록을 불러오는 중입니다...</p>';
      } else if (state.recordsError) {
        cardsHtml = `<div class="card" role="alert"><p>사건 목록을 불러오지 못했습니다. (${escapeHtml(state.recordsError)})</p><button class="button" data-action="retry-records">다시 조회</button></div>`;
      } else if (targetRecords.length === 0) {
        if (state.activeQueueFilter) {
          cardsHtml = `
            <div class="card empty-state" style="text-align:center; padding:32px 16px;">
              <p style="font-size:15px; margin-bottom:8px;">해당하는 사건이 없습니다.</p>
              <button type="button" class="button small" id="btn-reset-queue-filter">전체 보기</button>
            </div>
          `;
        } else {
          cardsHtml = `
            <div class="card empty-state" style="text-align:center; padding:32px 16px;">
              <p style="font-size:15px; margin:0;">현재 확인이 필요한 사건이 없습니다.</p>
            </div>
          `;
        }
      } else {
        cardsHtml = `
          <div class="risk-card-grid">
            ${displayCards.map(r => {
              const summary = r.review_summary || {};
              const q = summary.queue;
              const review = summary.review;

              // 현장 메모 (최대 2줄)
              const obsText = memoNote(r.memo) ? '현장 메모: ' + memoNote(r.memo) : '현장 메모 없음';

              // 확인 이유 (공통 헬퍼 재사용)
              const reasonText = getCheckReason(summary, review);

              // 사진 장수 표기
              const imgCount = Number(r.image_count) || 1;
              const countBadge = imgCount > 1 ? `<span class="risk-card-count">사진 ${imgCount}장</span>` : '';

              const recIdEsc = escapeHtml(r.record_id);
              const recIdEnc = encodeURIComponent(r.record_id);

              return `
                <div class="risk-card">
                  <div>
                    <div class="risk-card-img-wrap">
                      <img class="risk-card-img" src="/api/records/${recIdEnc}/images/0" alt="${recIdEsc} 현장 사진" onload="if(this.naturalWidth <= 1 || this.naturalHeight <= 1){this.style.display='none'; const fallback=this.nextElementSibling; fallback.textContent='사진 내용을 확인할 수 없습니다. 상세에서 확인해 주세요.'; fallback.style.display='flex';}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                      <div class="img-fallback" role="status" style="display:none; align-items:center; justify-content:center; height:100%; padding:32px; text-align:center; color:#64748b; font-size:14px; background:#f1f5f9;">사진을 불러오지 못했습니다</div>
                      <div class="risk-card-badge">${getQueueTag(q)}</div>
                      ${countBadge}
                    </div>
                    <div style="margin-top:10px; font-size:13px; color:#475569;">
                      <b>${escapeHtml(r.location || '장소 미지정')}</b> · ${escapeHtml(r.category === 'safety' ? '산업안전' : (r.category === 'quality' ? '택배 발송 확인' : r.category))}
                    </div>
                    <div style="display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; font-size:14px; margin-top:6px; line-height:1.4; color:#1e293b;" title="${escapeHtml(obsText)}">
                      ${escapeHtml(obsText)}
                    </div>
                    <p class="meta" style="font-size:12px; color:#64748b; margin-top:6px; line-height:1.3;">
                      <b>확인 이유:</b> ${escapeHtml(reasonText)}
                    </p>
                  </div>
                  <div style="margin-top:12px;">
                    <a href="#records/${recIdEnc}" class="button small primary" style="display:block; text-align:center; width:100%; box-sizing:border-box;">${RiskWorkflow.action({review:!!review,queue:q})}</a>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }

      // 최근 확인한 사건
      let recentSection = '';
      function getLatestCheckTime(r) {
        const summary = r.review_summary;
        if (!summary) return 0;
        const reviewTime = summary.review ? parseKstOrIso(summary.review.created_at) : null;
        const actionTime = (summary.completion_recorded_after_review === true && summary.latest_action)
          ? parseKstOrIso(summary.latest_action.created_at)
          : null;
        return Math.max(reviewTime || 0, actionTime || 0);
      }

      const finishedRecords = state.records.filter(r => {
        return r.review_summary && r.review_summary.queue === null && getLatestCheckTime(r) > 0;
      });

      // 최신 확인(사람 판단 or 유효 완료) 시점 내림차순 정렬 후 최대 3건
      finishedRecords.sort((a, b) => getLatestCheckTime(b) - getLatestCheckTime(a));
      const recent3 = finishedRecords.slice(0, 3);

      if (recent3.length > 0) {
        const rows = recent3.map(r => {
          const link = `<a href="#records/${encodeURIComponent(r.record_id)}"><b>${escapeHtml(r.record_id)}</b></a>`;
          return [
            link,
            escapeHtml(r.location || ''),
            escapeHtml(r.category === 'safety' ? '산업안전' : (r.category === 'quality' ? '택배 발송 확인' : r.category)),
            reviewStatusTag(r.review_summary, r.review_summary?.review),
            `<a class="button small" href="#records/${encodeURIComponent(r.record_id)}">확인</a>`
          ];
        });
        recentSection = `
          <div style="margin-top:24px;">
            ${card('최근 확인한 사건', table(['사건 번호', '장소', '분류', '최종 상태', '이동'], rows))}
          </div>
        `;
      }

      // 저장소 사진 탐색 영역 (최대 6장: 품질 3장, 안전 3장, 실제 사건과 분리)
      let repoSectionHtml = '';
      if (!state.repoImagesLoaded && !state.repoImagesLoading) {
        loadRepositoryImages().then(() => render());
      }

      if (state.repoImagesLoading) {
        repoSectionHtml = '<p class="meta">저장소 사진을 불러오는 중입니다...</p>';
      } else if (!state.repoImagesAvailable || state.repoImagesError) {
        repoSectionHtml = `<p class="meta" style="color:#6b7280;">저장소 사진을 불러오지 못했습니다. <button type="button" id="btn-retry-repo-images" class="button small">다시 시도</button></p>`;
      } else {
        const qualityImages = state.repositoryImages.filter(img => img.track === 'quality').slice(0, 3);
        const safetyImages = state.repositoryImages.filter(img => img.track === 'safety').slice(0, 3);
        const sampleImages = [...qualityImages, ...safetyImages];

        if (sampleImages.length === 0) {
          repoSectionHtml = '<p class="meta">표시할 저장소 사진이 없습니다.</p>';
        } else {
          const cards = sampleImages.map(img => {
            const trackLabel = img.track === 'safety' ? '산업안전' : '택배 발송 확인';
            const badgeClass = img.track === 'safety' ? 'tag-warn' : 'tag-info';
            return `
              <div class="card" style="padding:10px; display:flex; flex-direction:column; gap:8px;">
                <div style="height:180px; background:#0f172a; border-radius:4px; overflow:hidden; display:flex; align-items:center; justify-content:center;">
                  <img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.id)} 사진" style="max-width:100%; max-height:100%; object-fit:contain;" loading="lazy" onerror="this.alt='사진을 읽어오지 못했습니다'">
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-weight:600; font-size:12px;">${escapeHtml(img.id)}</span>
                  <span class="tag ${badgeClass}" style="font-size:11px;">${escapeHtml(trackLabel)}</span>
                </div>
                <a href="#records/new?selected=${encodeURIComponent(img.id)}&category=${encodeURIComponent(img.track)}" class="button small" style="width:100%; text-align:center;">사진 선택</a>
              </div>
            `;
          }).join('');

          repoSectionHtml = `
            <p class="meta" style="margin-bottom:12px;">사진을 선택해 사건으로 등록하세요.</p>
            <div class="risk-card-grid" style="gap:12px;">
              ${cards}
            </div>
          `;
        }
      }

      const repoSection = `
        <details class="home-photo-picker" id="home-photo-picker" ${state.homePhotoPickerOpen ? 'open' : ''}>
          <summary><span>등록할 사진 찾기</span><span class="photo-picker-hint">저장소 사진에서 선택</span></summary>
          <div class="home-photo-picker-body">${repoSectionHtml}</div>
        </details>
      `;

      return heading('현장 리스크 확인', '', topActions) +
        queueButtons +
        card('확인이 필요한 현장', cardsHtml) +
        recentSection +
        repoSection +
        `<div style="margin-top:20px; text-align:center;">
          <a href="#models" class="meta" style="text-decoration:underline;">확인 기준 보기</a>
        </div>`;
    },

    // 2. 사건 목록 (#records)
    records: () => {
      const rows = state.records.map(r => {
        const link = `<a href="#records/${encodeURIComponent(r.record_id)}"><b>${escapeHtml(r.record_id)}</b></a>`;
        return [
          reviewStatusTag(r.review_summary, r.review_summary?.review),
          link,
          escapeHtml(r.location || ''),
          escapeHtml(r.category === 'safety' ? '산업안전' : '택배 발송 확인'),
          `v${escapeHtml(String(r.version || 1))}`,
          `${escapeHtml(String(r.image_count || 1))}장`,
          escapeHtml(formatDateSimple(r.created_at)),
          `<a class="button small primary" href="#records/${encodeURIComponent(r.record_id)}">상세 보기</a>`
        ];
      });

      const actionButtons = `
        <a class="button" href="#dashboard">← 홈으로</a>
        <a class="button primary" href="#records/new">+ 새 사건 등록</a>
      `;

      return heading('사건 목록', '등록된 현장 위험 사건 전체를 조회하고 개별 사건 상세로 이동합니다.', actionButtons) +
        card('전체 사건', (state.recordsLoading ? '<p role="status">사건 목록을 불러오고 있어요.</p>' : state.recordsError ? `<p role="alert">목록 조회 실패: ${escapeHtml(state.recordsError)}</p><button class="button" data-action="retry-records">다시 조회</button>` : state.records.length > 0
          ? table(['상태', '사건 번호', '장소', '트랙', '버전', '사진 수', '등록일', '이동'], rows)
          : '<p class="meta">등록된 사건이 없습니다. 새 사건을 등록하세요.</p>'
        ));
    },

    // 3. 새 사건 등록 (#records/new) - 저장소 사진 선택 vs 직접 업로드 배타적 지원, 실패 시 입력 보존
    records_new: () => {
      const actionButtons = `
        <a class="button" href="#records">목록가기</a>
      `;

      const curRoute = parseRoute();
      const selectedParam = curRoute.params?.get('selected') || '';
      const categoryParam = curRoute.params?.get('category') || '';

      if (!state.newRecordDraft) {
        state.newRecordDraft = {
          location: '물류창고 A',
          category: categoryParam || (selectedParam && state.repositoryImages.find(img => img.id === selectedParam)?.track) || 'safety',
          memo: '',
          selectedRepoIds: selectedParam ? [selectedParam] : [],
          mode: selectedParam ? 'repository' : (state.repositoryImages.length > 0 ? 'repository' : 'upload'),
          lastAppliedSelection: selectedParam || null
        };
        if (selectedParam && ['quality', 'safety'].includes(state.newRecordDraft.category)) {
          state.repoImagesFilterTrack = state.newRecordDraft.category;
          state.repoImagesVisibleCount = 12;
        }
      } else if (selectedParam && state.newRecordDraft.lastAppliedSelection !== selectedParam) {
        state.newRecordDraft.lastAppliedSelection = selectedParam;
        const found = state.repositoryImages.find(img => img.id === selectedParam);
        const targetTrack = found?.track || categoryParam;
        state.newRecordDraft.selectedRepoIds = [selectedParam];
        state.newRecordDraft.mode = 'repository';
        if (targetTrack) {
          state.newRecordDraft.category = targetTrack;
          state.repoImagesFilterTrack = targetTrack;
          state.repoImagesVisibleCount = 12;
        }
      }

      const draft = state.newRecordDraft;
      // 탭을 직접 고르거나 파일을 넣지 않았으면, 사진 목록이 늦게 도착해도 기본 모드는 저장소 사진이다.
      if (!draft.modeChosen && state.repositoryImages.length > 0) draft.mode = 'repository';
      const isRepoMode = draft.mode === 'repository';

      // 모드 전환 탭
      const modeTabs = `
        <div style="display:flex; gap:10px; margin-bottom:16px;">
          <button type="button" id="tab-mode-repo" class="button ${isRepoMode ? 'primary' : ''}">저장소 사진 선택 (1~5장)</button>
          <button type="button" id="tab-mode-upload" class="button ${!isRepoMode ? 'primary' : ''}">직접 파일 업로드 (1~5장)</button>
        </div>
      `;

      // 저장소 사진 선택 영역
      let repoPickerHtml = '';
      if (isRepoMode) {
        let filtered = state.repositoryImages;
        if (state.repoImagesFilterTrack === 'safety') filtered = filtered.filter(img => img.track === 'safety');
        else if (state.repoImagesFilterTrack === 'quality') filtered = filtered.filter(img => img.track === 'quality');

        const visibleCount = state.repoImagesVisibleCount || 12;
        const displayList = filtered.slice(0, visibleCount);

        const photoCards = displayList.map(img => {
          const isChecked = draft.selectedRepoIds.includes(img.id);
          const trackLabel = img.track === 'safety' ? '산업안전' : '택배 발송 확인';
          const badgeClass = img.track === 'safety' ? 'tag-warn' : 'tag-info';
          return `
            <label class="card" style="padding:8px; cursor:pointer; border:2px solid ${isChecked ? '#2563eb' : 'var(--line, #cbd5e1)'}; background:${isChecked ? '#eff6ff' : '#fff'}; display:flex; flex-direction:column; gap:6px; user-select:none;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <input type="checkbox" name="repo-img-check" value="${escapeHtml(img.id)}" data-track="${escapeHtml(img.track)}" ${isChecked ? 'checked' : ''} style="cursor:pointer; width:16px; height:16px;">
                <span class="tag ${badgeClass}" style="font-size:10px;">${escapeHtml(trackLabel)}</span>
              </div>
              <div style="height:110px; background:#0f172a; border-radius:4px; overflow:hidden; display:flex; align-items:center; justify-content:center;">
                <img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.id)} 사진" style="max-width:100%; max-height:100%; object-fit:contain;" loading="lazy" onerror="this.alt='사진을 읽어오지 못했습니다'">
              </div>
              <div style="font-size:11px; font-weight:600; text-align:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                ${escapeHtml(img.id)}
              </div>
            </label>
          `;
        }).join('');

        const moreBtn = filtered.length > displayList.length ? `
          <div style="text-align:center; margin-top:14px;">
            <button type="button" id="btn-repo-more" class="button small">사진 더보기 (${displayList.length} / ${filtered.length})</button>
          </div>
        ` : '';

        repoPickerHtml = `
          <div style="margin-bottom:16px; border:1px solid var(--line, #cbd5e1); border-radius:6px; padding:14px; background:#f8fafc;">
            <div style="display:flex; gap:8px; align-items:center; margin-bottom:12px; flex-wrap:wrap;">
              <span class="meta" style="font-weight:600;">분류 필터:</span>
              <button type="button" class="button small ${state.repoImagesFilterTrack === 'all' ? 'primary' : ''}" data-filter-track="all">전체</button>
              <button type="button" class="button small ${state.repoImagesFilterTrack === 'safety' ? 'primary' : ''}" data-filter-track="safety">산업안전</button>
              <button type="button" class="button small ${state.repoImagesFilterTrack === 'quality' ? 'primary' : ''}" data-filter-track="quality">택배 발송 확인</button>
              <span style="flex-grow:1;"></span>
              <span id="repo-count-badge" class="meta" style="font-weight:600; color:${draft.selectedRepoIds.length > 0 ? '#2563eb' : '#64748b'};">
                선택된 사진: ${draft.selectedRepoIds.length} / 5장 (1~5장 필수)
              </span>
            </div>
            ${displayList.length > 0 ? `
              <div class="risk-card-grid" style="grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap:10px;">
                ${photoCards}
              </div>
              ${moreBtn}
            ` : state.repoImagesLoading || !state.repoImagesLoaded ? '<p role="status">저장소 사진을 불러오고 있어요.</p>' : state.repoImagesError ? `<p role="alert">사진 조회 실패: ${escapeHtml(state.repoImagesError)}</p>` : '<p class="meta">조건에 맞는 저장소 사진이 없습니다.</p>'}
          </div>
        `;
      } else {
        // 직접 파일 업로드 영역
        repoPickerHtml = `
          <div style="margin-bottom:16px;">
            <label class="field">
              <span><b>현장 사진 첨부 (1~5장, JPG/PNG 장당 2MB 이하, 합계 3MB 이하) *</b></span>
              <input type="file" id="new-files" multiple accept="image/png,image/jpeg">
              <small class="meta">현장 사진은 이 PC의 로컬 저장소에 보존됩니다.</small>
            </label>
          </div>
        `;
      }

      return heading('현장 사건 등록', '현장 사진(1~5장)과 초기 관찰 메모를 등록하여 이 PC의 로컬 저장소에 보존합니다.', actionButtons) +
        card('사건 등록 양식', `
          <form id="new-record-form" class="upload-form">
            ${modeTabs}
            <div id="new-photo-picker">${repoPickerHtml}</div>
            <div class="grid cols2" style="margin-top:12px">
              <label class="field">
                <span><b>장소 *</b></span>
                <input type="text" id="new-location" value="${escapeHtml(draft.location || '물류창고 A')}" required placeholder="예: 물류창고 A, 포장대 2, 택배 인계구역">
              </label>
              <label class="field">
                <span><b>분류 *</b></span>
                <select id="new-category" required>
                  <option value="safety" ${draft.category === 'safety' ? 'selected' : ''}>산업안전</option>
                  <option value="quality" ${draft.category === 'quality' ? 'selected' : ''}>택배 발송 확인</option>
                </select>
              </label>
            </div>
            <label class="field" style="margin-top:12px">
              <span><b>현장 초기 메모</b></span>
              <textarea id="new-memo" rows="3" placeholder="현장 작업 상황, 특이사항, 초기 관찰 내용">${escapeHtml(draft.memo || '')}</textarea>
            </label>
            <div class="btn-group" style="margin-top:16px">
              <button type="submit" class="button primary" id="btn-submit-record">사건 등록</button>
              <a class="button" href="#records">목록가기</a>
            </div>
          </form>
        `);
    },

    // 4. 사건 상세 작업대 (#records/{id})
    record_detail: () => {
      const rec = state.currentDetail?.record;
      if (!rec) {
        return heading('사건 상세', '사건을 불러오는 중이거나 존재하지 않습니다.') +
          `<p><a class="button" href="#records">← 사건 목록으로 돌아가기</a></p>`;
      }

      const rev = state.currentDetail?.final_review;
      const actions = state.currentDetail?.actions || [];
      const history = state.currentDetail?.history || [];
      const count = Number(rec.image_count) || 1;
      const summary = rec.review_summary || state.currentDetail?.review_summary;
      const selectedImgIdx = (typeof state.selectedImageIndex === 'number' && state.selectedImageIndex < count) ? state.selectedImageIndex : 0;

      // 1. 헤더 영역 (장소 + 분류, 간결한 등록일시, 버전은 하단 기술정보로 이동)
      const headerTitle = rec.location || '장소 미지정';
      const headerMeta = `${rec.category === 'safety' ? '산업안전' : '택배 발송 확인'} · 등록: ${escapeHtml(formatDateSimple(rec.created_at))} · <a href="#records/${encodeURIComponent(rec.record_id)}/edit" style="color:#2563eb; text-decoration:underline; font-size:12px; font-weight:600;">✏️ 정보 수정</a>`;
      const headerActions = '';

      // 현재 검토 상태 배지 (rec.status fallback 금지, summary 최신 판단/완료 기록 기준)
      const currentStatusBadge = reviewStatusTag(summary, rev);

      // 사유 텍스트 (홈과 100% 동일한 getCheckReason 공유)
      const checkReason = getCheckReason(summary, rev);
      const queueReasonText = checkReason ? `<span class="meta" style="margin-left:8px; font-size:13px; color:#475569;">(${escapeHtml(checkReason)})</span>` : '';

      // 맥락 변경 경고 배너 (쉬운 문구로 통일)
      const context = summary?.context_changed || {};
      const hasContextChanged = Boolean(
        context.version_time_unknown ||
        context.after_review ||
        context.after_action
      );
      const contextWarningBanner = hasContextChanged ? `
        <div class="version-warning-banner" style="background:#fffbeb; border:1px solid #f59e0b; padding:12px 14px; border-radius:6px; margin-bottom:16px;">
          <p style="margin:0; color:#92400e; font-weight:700; font-size:13px;">
            ⚠️ 정보가 수정됐습니다. 현재 사진과 내용을 다시 확인해 주세요.
          </p>
        </div>
      ` : '';

      // 2. 좌측: 사진 영역 (55% 너비, contain 뷰어 + 1~5장 button 썸네일 바 + 1x1 / 로드실패 분리)
      const thumbnails = [];
      for (let i = 0; i < count; i++) {
        const isCurrent = i === selectedImgIdx;
        thumbnails.push(`
          <button type="button" class="thumbnail-item ${isCurrent ? 'active' : ''}"
            data-action="select-image" data-index="${i}" data-record-id="${escapeHtml(rec.record_id)}"
            aria-label="사진 ${i + 1}" aria-pressed="${isCurrent}">
            <img src="/api/records/${encodeURIComponent(rec.record_id)}/images/${i}" alt=""
              onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div style="display:none; align-items:center; justify-content:center; height:100%; color:#94a3b8; font-size:10px; background:#1e293b;">오류</div>
            <span class="thumbnail-badge">${i + 1}</span>
          </button>
        `);
      }

      const photoPane = `
        <div class="photo-pane">
          <div class="card" style="margin:0; padding:14px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
              <h3 style="margin:0; font-size:15px; font-weight:700;">확인할 사진</h3>
              <span class="meta">${escapeHtml(rec.location || '장소 미지정')} · 사진 총 ${count}장</span>
            </div>

            <div class="photo-main-viewer" id="main-photo-viewer">
              <div id="detail-photo-loading" style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px; text-align:center; height:100%; color:#94a3b8;">
                <span style="font-size:28px; margin-bottom:6px;">⏳</span>
                <p style="margin:0; font-size:13px; color:#cbd5e1;">사진을 불러오는 중입니다.</p>
              </div>
              <img id="detail-main-img" src="/api/records/${encodeURIComponent(rec.record_id)}/images/${selectedImgIdx}" alt="현장 사진 ${selectedImgIdx + 1}" style="display:none;"
                onload="const l=document.getElementById('detail-photo-loading'),f=document.getElementById('detail-photo-failed'),u=document.getElementById('detail-photo-unreadable'); if(l)l.style.display='none'; if (this.naturalWidth <= 1 && this.naturalHeight <= 1) { this.style.display='none'; if(f)f.style.display='none'; if(u)u.style.display='flex'; } else { this.style.display='block'; if(f)f.style.display='none'; if(u)u.style.display='none'; }"
                onerror="const l=document.getElementById('detail-photo-loading'),f=document.getElementById('detail-photo-failed'),u=document.getElementById('detail-photo-unreadable'); if(l)l.style.display='none'; this.style.display='none'; if(u)u.style.display='none'; if(f)f.style.display='flex';">
              <div id="detail-photo-failed" style="display:none; flex-direction:column; align-items:center; justify-content:center; padding:20px; text-align:center; height:100%; color:#94a3b8;">
                <span style="font-size:32px; margin-bottom:6px;">🖼️</span>
                <p style="margin:0; font-size:13px; color:#cbd5e1;">사진을 불러오지 못했습니다.</p>
              </div>
              <div id="detail-photo-unreadable" style="display:none; flex-direction:column; align-items:center; justify-content:center; padding:20px; text-align:center; height:100%; color:#f87171;">
                <span style="font-size:32px; margin-bottom:8px;">⚠️</span>
                <p style="margin:0; font-weight:700; font-size:14px; color:#ef4444;">사진 내용을 확인할 수 없습니다.</p>
                <p style="margin:6px 0 0; font-size:12px; color:#fca5a5;">다른 사진으로 새 사건을 등록해 주세요.</p>
              </div>
              <div id="detail-photo-badge" style="position:absolute; bottom:8px; right:8px; background:rgba(0,0,0,0.7); color:#fff; padding:2px 8px; border-radius:12px; font-size:11px;">
                사진 ${selectedImgIdx + 1} / ${count}
              </div>
            </div>

            ${count > 1 ? `
              <div class="thumbnail-bar" role="group" aria-label="현장 사진 목록">
                ${thumbnails.join('')}
              </div>
            ` : ''}

            <div style="background:#f8fafc; padding:10px 12px; border-radius:6px; font-size:13px; margin-top:12px; border:1px solid #e2e8f0;">
              ${memoNote(rec.memo) ? `<p><b>현장 메모:</b> ${escapeHtml(memoNote(rec.memo))}</p>` : ''}
              ${memoProvenance(rec.memo)}
            </div>
          </div>
        </div>
      `;

      // 4. 하단: 기술 정보 및 감사 이력 (옛 조치 목록 포함)
      const actionRows = actions.map(a => [
        a.action_type === 'COMPLETE' ? tag('조치 완료', 'green') : tag('조치 요청', 'warn'),
        escapeHtml(a.description || ''),
        escapeHtml(a.evidence_note || '미등록'),
        escapeHtml(a.actor || '담당자'),
        escapeHtml(a.created_at ? formatDateSimple(a.created_at) : '')
      ]);

      const historyRows = history.map(h => [
        escapeHtml(h.timestamp ? formatDateSimple(h.timestamp) : ''),
        tag(historyPhaseLabel(h.phase), 'gray'),
        escapeHtml(h.action_name || ''),
        historySummaryHtml(h.summary),
        escapeHtml(historyOperator(h.operator))
      ]);

      const techAndAuditDetails = `
        <details class="card" style="margin-top:20px;">
          <summary style="cursor:pointer; font-weight:600; padding:6px 0; color:#334155; font-size:13px;">
            이전 기록과 사건 정보
          </summary>
          <div style="margin-top:12px; border-top:1px solid #e2e8f0; padding-top:12px;">
            <div style="background:#f8fafc; padding:8px 10px; border-radius:6px; font-size:12px; margin-bottom:12px;">
              <p style="margin:2px 0;"><b>사건 ID:</b> <code>${escapeHtml(rec.record_id)}</code> · <b>버전:</b> v${escapeHtml(String(rec.version || 1))} · <b>최종 수정:</b> ${escapeHtml((rec.updated_at || rec.created_at) ? formatDateSimple(rec.updated_at || rec.created_at) : '수정 이력 없음')}</p>
            </div>
            ${actions.length > 1 ? `
              <h4 style="margin:10px 0 6px; font-size:12px; color:#475569;">전체 대응 조치 이력 (${actions.length}건)</h4>
              ${table(['유형', '내용', '완료 증빙', '담당자', '일시'], actionRows)}
              <div style="margin-bottom:12px;"></div>
            ` : ''}
            <h4 style="margin:10px 0 6px; font-size:12px; color:#475569;">감사 이력 (Audit Logs)</h4>
            ${history.length > 0
              ? table(['일시', '단계', '작업', '내용', '작업자'], historyRows)
              : '<p class="meta">감사 이력이 없습니다.</p>'}
          </div>
        </details>
      `;

      const live=RiskLiveDetail({rec,rev,actions,summary,context});
      // 전체 작업대 레이아웃 합성 (헤더Raw + 큐배지 + 55/45 스플릿 + 감사로그)
      return headingRaw(headerTitle, `${headerMeta} · 상태: ${currentStatusBadge} ${queueReasonText}`, headerActions) +
        contextWarningBanner + live.intro +
        `<div class="workbench-split">
          ${photoPane}
          ${live.pane}
        </div>` +
        techAndAuditDetails;
    },

    // 5. 사건 정보 수정 (#records/{id}/edit) - 모달 아닌 독립 페이지
    record_edit: () => {
      const rec = state.currentDetail?.record;
      if (!rec) {
        return heading('사건 수정', '사건을 불러오는 중입니다.') + `<p><a class="button" href="#records">← 사건 목록으로</a></p>`;
      }

      const provenance = memoProvenance(rec.memo);
      // 사건 상세로 돌아가는 링크는 화면 위 경로 표시("← 사건 상세")에 있다.
      return heading(`사건 정보 수정 · ${rec.record_id}`, `현재 버전: v${rec.version || 1} → 저장 시 v${(rec.version || 1) + 1}로 갱신됩니다.`) +
        `<div style="background:#eff6ff; border:1px solid #bfdbfe; padding:12px; border-radius:6px; margin-bottom:16px;">
          <p style="margin:0; color:#1e40af; font-size:13px;">
            <b>🛡️ 데이터 보존 및 무결성 원칙:</b> 원본 사진과 사람 판단·조치 이력은 절대 덮어쓰지 않고 안전하게 보존됩니다.
            장소·분류·메모 수정 시 버전이 증가하며 감사 이력(RECORD_UPDATE)에 변경 전후 내역이 영구 기록됩니다.
          </p>
        </div>` +
        formContext(rec) + card('수정 양식', `
          <form id="edit-record-form">
            <div class="grid cols2">
              <label class="field">
                <span><b>장소 *</b></span>
                <input type="text" id="edit-location" value="${escapeHtml(rec.location || '')}" required>
              </label>
              <label class="field">
                <span><b>분류 *</b></span>
                <select id="edit-category">
                  <option value="safety" ${rec.category === 'safety' ? 'selected' : ''}>산업안전</option>
                  <option value="quality" ${rec.category === 'quality' ? 'selected' : ''}>택배 발송 확인</option>
                </select>
              </label>
            </div>
            <label class="field" style="margin-top:12px;">
              <span><b>현장 메모</b></span>
              <textarea id="edit-memo" rows="4">${escapeHtml(String(rec.memo || '').includes(PROVENANCE_MARK) ? memoNote(rec.memo) : rec.memo || '')}</textarea>
            </label>
            ${provenance ? `<div style="overflow-wrap:anywhere;">${provenance}</div>` : ''}
            <div class="btn-group" style="margin-top:16px;">
              <button type="submit" class="button primary">수정 내용 저장 (PATCH)</button>
              <a class="button" href="#records/${encodeURIComponent(rec.record_id)}">취소하고 상세로 복귀</a>
            </div>
          </form>
        `);
    },

    // 6. 사람 판단 등록/수정 (#records/{id}/review) - 모달 아닌 독립 페이지
    record_review: () => {
      const rec = state.currentDetail?.record;
      if (!rec) {
        return heading('내 판단 남기기', '사건을 불러오는 중입니다.') + `<p><a class="button" href="#records">← 사건 목록으로</a></p>`;
      }

      const rev = state.currentDetail?.final_review;

      // 사건 상세로 돌아가는 링크는 화면 위 경로 표시("← 사건 상세")에 있다.
      return heading('내 판단 남기기', '사진과 사건 정보를 확인하여 위험 확인, 기준 충족, 판단 보류, 해당 없음 중 최종 판정을 등록합니다.') +
        formContext(rec) + card('내 판단', `
          <form id="page-review-form">
            <label class="field">
              <span><b>판정 결과 *</b></span>
              <select id="page-review-decision" required><option value="" ${!rev?'selected':''}>직접 확인한 판단을 선택해 주세요</option>
                <option ${rev?.decision === '위험 확인' ? 'selected' : ''}>위험 확인</option>
                <option ${rev?.decision === '기준 충족' ? 'selected' : ''}>기준 충족</option>
                <option ${rev?.decision === '판단 보류' ? 'selected' : ''}>판단 보류</option>
                <option ${rev?.decision === '해당 없음' ? 'selected' : ''}>해당 없음</option>
              </select>
            </label>
            <label class="field" style="margin-top:12px;">
              <span><b>판단 근거 * (필수)</b></span>
              <textarea id="page-review-basis" rows="3" required placeholder="사진에서 직접 확인한 내용과 구체적인 판단 근거를 기술하세요.">${escapeHtml(rev?.basis || '')}</textarea>
            </label>
            <div class="grid cols2" style="margin-top:12px;">
              <label class="field">
                <span><b>후속 확인 메모</b></span>
                <input id="page-review-followup" value="${escapeHtml(rev?.followup_note || '')}">
              </label>
              <label class="field">
                <span><b>검토자</b></span>
                <input id="page-review-reviewer" value="${escapeHtml(rev?.reviewer || '물류창고 담당자')}">
              </label>
            </div>
            <div class="btn-group" style="margin-top:16px;">
              <button type="submit" class="button primary">판단 기록 저장</button>
              <a class="button" href="#records/${encodeURIComponent(rec.record_id)}">취소하고 상세로 복귀</a>
            </div>
          </form>
        `);
    },

    // 7. 대응 조치 등록 (#records/{id}/action) - 모달 아닌 독립 페이지
    record_action: () => {
      const rec = state.currentDetail?.record;
      if (!rec) {
        return heading('대응 조치', '사건을 불러오는 중입니다.') + `<p><a class="button" href="#records">← 사건 목록으로</a></p>`;
      }

      // 사건 상세로 돌아가는 링크는 화면 위 경로 표시("← 사건 상세")에 있다.
      return heading('조치 기록', '현장 담당자에게 조치를 요청하거나 완료 증빙을 남깁니다.') +
        formContext(rec) + card('처리한 내용', `
          <form id="page-action-form">
            <label class="field">
              <span><b>조치 유형 *</b></span>
              <select id="page-action-type">
                <option value="REQUEST">조치 요청 (현장 담당자 전달)</option>
                <option value="COMPLETE">조치 완료 (후속 근거 확보됨)</option>
              </select>
            </label>
            <label class="field" style="margin-top:12px;">
              <span><b>조치 내용 * (필수)</b></span>
              <textarea id="page-action-desc" rows="3" required placeholder="현장 담당자에게 요청한 내용 또는 조치 내역"></textarea>
            </label>
            <div class="grid cols2" style="margin-top:12px;">
              <label class="field">
                <span><b>완료 증빙 메모 (완료 시 필수)</b></span>
                <input id="page-action-evidence" placeholder="후속 확인 사진 번호 또는 서명자 등">
              </label>
              <label class="field">
                <span><b>담당자</b></span>
                <input id="page-action-actor" value="현장 담당자">
              </label>
            </div>
            <div style="background:#fffbeb; padding:10px; border-radius:6px; margin-top:12px; font-size:12px; color:#92400e;">
              ⚠️ 요청을 전달했다는 사실만으로 조치를 완료 처리하지 마십시오. 후속 확인 사진이나 담당자 서명 등 실질적 증빙을 메모에 남겨야 합니다.
            </div>
            <div class="btn-group" style="margin-top:16px;">
              <button type="submit" class="button primary">조치 기록 저장</button>
              <a class="button" href="#records/${encodeURIComponent(rec.record_id)}">취소하고 상세로 복귀</a>
            </div>
          </form>
        `);
    },

    // 8. 확인 기준 (#models)
    models: () => {
      const rows = state.standards.map(s => [
        `<b>${escapeHtml(s.id)} · ${escapeHtml(s.name)}</b>`,
        s.category === 'quality' ? '택배 발송 확인' : '산업안전',
        escapeHtml(s.hazard_condition || ''),
        escapeHtml(s.hold_condition || ''),
        `"${escapeHtml(s.canonical_quote || '')}"`
      ]);

      const actionButtons = `<a class="button" href="#dashboard">← 홈으로</a>`;

      return heading('확인 기준', '물류창고에서 구매자에게 택배를 보내기 전 확인할 발송·산업안전 기준입니다. 사진만으로 주문 일치나 배송 완료를 확정하지 않습니다.', actionButtons) +
        card('택배 발송·산업안전 기준', state.standardsLoading ? '<p role="status">확인 기준을 불러오고 있어요.</p>' : state.standardsError ? `<p role="alert">기준 조회 실패: ${escapeHtml(state.standardsError)}</p>` : table(['항목', '분류', '추가 확인 조건', '판단 보류 조건', '원문 인용'], rows));
    }
  };

  // 저장소 상태 줄. .tag(줄바꿈 없음)로 감싸고 <p>의 아래 여백으로 제목과 떨어진다. 상태를 아직 모르면 그리지 않는다.
  function integrationStatusHtml() {
    if (!state.integrations?.modes) return '';
    return `<p data-integration-status>연동 상태: <span class="tag gray">${escapeHtml('저장소 로컬 저장')}</span></p>`;
  }

  // 머리말의 연결 표시. 한 번 연결된 뒤에는 저장 같은 요청 중에도 "데이터 연결됨"을 유지한다.
  function connectionBadgeHtml() {
    if (state.loading && !state.connected) {
      return `<span class="preview-status" style="border-color:#3b82f6; color:#1e40af; background:#eff6ff;"><i class="dot" style="background:#3b82f6;"></i>연결 확인 중...</span>`;
    } else if (state.error) {
      return `<span class="preview-status" style="border-color:#ef4444; color:#991b1b; background:#fef2f2;"><i class="dot" style="background:#ef4444;"></i>조회 실패 (${escapeHtml(state.error)})</span>`;
    } else if (state.connected) {
      return `<span class="preview-status" style="border-color:#10b981; color:#065f46; background:#ecfdf5;"><i class="dot" style="background:#10b981;"></i>데이터 연결됨</span>`;
    }
    return `<span class="preview-status" style="border-color:#6b7280; color:#374151; background:#f3f4f6;"><i class="dot" style="background:#9ca3af;"></i>연결 대기</span>`;
  }

  // 머리말 연결 표시만 다시 그린다. 폼 화면은 배경 조회가 끝나도 다시 그리지 않아서 render()만으로는 이전 표시가 남는다.
  function renderConnectionBadge() {
    const connection = document.querySelector('.risk-connection');
    if (connection) connection.innerHTML = connectionBadgeHtml();
  }

  function renderStatus() {
    renderConnectionBadge();
    const el = document.getElementById('global-status-msg');
    if (!el) return;
    if (state.loading) {
      el.innerHTML = '<span class="status-badge loading">처리 중...</span>';
    } else if (state.error) {
      el.innerHTML = `<span class="status-badge error">오류: ${escapeHtml(state.error)}</span>`;
    } else {
      el.innerHTML = integrationStatusHtml();
    }
  }

  async function render() {
    const currentRenderToken = ++latestRenderToken;
    const route = parseRoute();

    if (route.page !== 'records_new' && state.newRecordDraft) {
      state.newRecordDraft.lastAppliedSelection = null;
    }

    // 상세 라우트가 아닌 경우(예: 홈으로 복귀) 기존 loadDetail 응답이 currentDetail을 덮어쓰지 않도록 detailToken 증가
    if (!route.recordId && state.detailLoading) {
      latestDetailToken++;
      state.detailLoading = false;
      state.detailAttemptId = null;
    }
    // 상세 조회 실패는 상세 화면을 벗어나면 지운다. 같은 사건을 다시 열면 새로 조회한다.
    if (!route.recordId && state.detailError) {
      state.detailError = null;
      state.detailAttemptId = null;
    }

    // URL에 recordId가 명시되어 있는데 아직 로드되지 않은 경우 먼저 로드
    const needsDetail = route.recordId && (!state.currentDetail || state.currentDetail.record?.record_id !== route.recordId);
    if (needsDetail && state.detailAttemptId !== route.recordId) {
      state.selectedRecordId = route.recordId;
      state.currentDetail = null;
      // 조회를 시작하되 아래 레이아웃 렌더링을 기다리게 하지 않는다.
      loadDetail(route.recordId).then(() => {
        if (parseRoute().recordId === route.recordId) render();
      });
    }

    // loadDetail 비동기 대기 도중 새로운 render가 시작되었거나 URL 해시가 변경된 경우 화면 덮어쓰기 방지
    if (currentRenderToken !== latestRenderToken) {
      return;
    }
    const currentRoute = parseRoute();
    if (currentRoute.page !== route.page || currentRoute.recordId !== route.recordId) {
      return;
    }

    const pageRenderer = needsDetail ? () => {
      const titles = {record_detail:'사건 상세',record_edit:'사건 정보 수정',record_review:'내 판단 남기기',record_action:'대응 조치'};
      const notice = state.detailError ? `<p role="alert">사건을 불러오지 못했습니다. ${escapeHtml(state.detailError)}</p><button class="button" data-action="retry-detail">다시 조회</button>` : '<p role="status">사건 정보를 불러오고 있어요.</p>';
      return heading(titles[route.page] || '사건 확인', '', `<a class="button" href="#records">사건 목록</a>`) +
        (route.page === 'record_detail' ? `<div class="workbench-split" aria-busy="${!state.detailError}">${card('현장 사진',notice)}${card('내 판단 남기기', '<p class="meta">사람 판단 · 조치 기록</p>')}</div>` : card('사건 정보',notice));
    } : screens[route.page] || screens.dashboard;
    const isDash = route.page === 'dashboard';

    const badgeHtml = connectionBadgeHtml();

    // 브레드크럼 헤더
    let breadcrumb = '<b>현장 리스크 확인</b>';
    if (route.page === 'records') {
      breadcrumb = `<a class="back-link" href="#dashboard">← 홈으로</a><span class="header-sep">/</span><b>사건 목록</b>`;
    } else if (route.page === 'records_new') {
      breadcrumb = `<a class="back-link" href="#records">← 사건 목록</a><span class="header-sep">/</span><b>현장 사건 등록</b>`;
    } else if (route.page === 'record_detail') {
      breadcrumb = '<a class="back-link" href="#records">← 사건 목록</a>';
    } else if (route.page === 'record_edit') {
      breadcrumb = `<a class="back-link" href="#records/${encodeURIComponent(route.recordId)}">← 사건 상세</a><span class="header-sep">/</span><b>정보 수정</b>`;
    } else if (route.page === 'record_review') {
      breadcrumb = `<a class="back-link" href="#records/${encodeURIComponent(route.recordId)}">← 사건 상세</a><span class="header-sep">/</span><b>내 판단 남기기</b>`;
    } else if (route.page === 'record_action') {
      breadcrumb = `<a class="back-link" href="#records/${encodeURIComponent(route.recordId)}">← 사건 상세</a><span class="header-sep">/</span><b>대응 조치</b>`;
    } else if (route.page === 'models') {
      breadcrumb = '<a class="back-link" href="#dashboard">← 홈으로</a><span class="header-sep">/</span><b>확인 기준</b>';
    } else if (!isDash) {
      breadcrumb = `<a class="back-link" href="#dashboard">← 홈으로</a><span class="header-sep">/</span><b>${escapeHtml(route.page)}</b>`;
    }

    const contentHtml = `${isDash ? '' : `<div class="page-breadcrumb">${breadcrumb}</div>`}<div id="global-status-msg" role="status"></div>${pageRenderer()}`;
    const existingMain = document.querySelector('main.content');
    const routeKey = `${route.page}:${route.recordId || ''}`;
    const routeChanged = existingMain?.dataset.routeKey !== routeKey;
    const focusId = !routeChanged ? document.activeElement?.id : null;
    const openSections = !routeChanged && existingMain ? [...existingMain.querySelectorAll('details[id]')].map(el => [el.id,el.open]) : [];
    if (existingMain) {
      existingMain.className = `content${isDash ? ' dashboard-page' : ''}`;
      existingMain.dataset.page = route.page;
      existingMain.dataset.routeKey = routeKey;
      existingMain.innerHTML = contentHtml;
      const connection = document.querySelector('.risk-connection');
      if (connection) connection.innerHTML = badgeHtml;
    } else document.getElementById('app').innerHTML = `
      <div class="shell">
        <div class="workspace">
          <header class="risk-site-header">
            <div class="risk-header-inner">
              <a class="risk-brand" href="#dashboard" aria-label="현장 리스크 대시보드 홈"><img src="assets/factory-logo.png" width="44" height="44" alt=""><span class="risk-brand-copy"><span class="risk-brand-site-name">현장 리스크 대시보드</span></span></a>
              <div class="risk-header-tools">
                <div class="risk-connection">${badgeHtml}</div>
              </div>
            </div>
          </header>
          <main data-page="${escapeHtml(route.page)}" class="content${isDash ? ' dashboard-page' : ''}" data-route-key="${escapeHtml(routeKey)}">${contentHtml}</main>
        </div>
      </div>
    `;

    bindEvents(route);
    for (const [id,open] of openSections) { const el=document.getElementById(id); if(el) el.open=open; }
    if (focusId) document.getElementById(focusId)?.focus({preventScroll:true});
    renderStatus();
    if (routeChanged) window.scrollTo(0, 0);
  }

  function formContext(rec){
    const review=state.currentDetail?.final_review;
    return '<aside class="form-context"><img src="/api/records/'+encodeURIComponent(rec.record_id)+'/images/0" alt="확인할 현장 사진"><div><strong>'+escapeHtml(rec.location||'현장 사진')+'</strong><p>'+escapeHtml(review?.decision||'아직 판단을 남기지 않았습니다.')+'</p><p>'+escapeHtml(review?.basis||'사진에서 직접 확인한 내용을 기록해 주세요.')+'</p></div></aside>';
  }
  function bindEvents(route) {
    const appEl = document.getElementById('app');
    if (!appEl) return;
    const homePhotoPicker = document.getElementById('home-photo-picker');
    if (homePhotoPicker) homePhotoPicker.ontoggle = () => {
      state.homePhotoPickerOpen = homePhotoPicker.open;
    };
    // 전역 액션 클릭 위임
    appEl.onclick = async (e) => {
      if (e.target.closest('[data-action="retry-detail"]')) {
        state.detailAttemptId = null; render(); return;
      }
      if (e.target.closest('[data-action="retry-records"]')) {
        const retryPage = parseRoute().page;
        state.recordsLoading = true; state.recordsError = null; render();
        await refreshRecords(); state.recordsLoading = false;
        if (parseRoute().page === retryPage) render();
        return;
      }
      // 큐 필터 버튼 토글
      const qBtn = e.target.closest('[data-queue-filter]');
      if (qBtn) {
        const q = qBtn.dataset.queueFilter;
        state.activeQueueFilter = (state.activeQueueFilter === q) ? null : q;
        render();
        // 포커스 복원 (Tab/Enter 연속 탐색 접근성)
        const targetBtn = document.querySelector(`[data-queue-filter="${q}"]`);
        if (targetBtn) targetBtn.focus();
        return;
      }

      // 큐 필터 초기화 버튼
      const resetBtn = e.target.closest('#btn-reset-queue-filter');
      if (resetBtn) {
        state.activeQueueFilter = null;
        render();
        const firstFilterBtn = document.querySelector('[data-queue-filter]');
        if (firstFilterBtn) firstFilterBtn.focus();
        return;
      }

      const actionBtn = e.target.closest('[data-action]');
      if (actionBtn) {
        const action = actionBtn.dataset.action;

        if (action === 'select-image') {
          const idx = parseInt(actionBtn.dataset.index, 10);
          state.selectedImageIndex = idx;
          const mainImg = document.getElementById('detail-main-img');
          const loadingMsg = document.getElementById('detail-photo-loading');
          const unreadableMsg = document.getElementById('detail-photo-unreadable');
          const failedMsg = document.getElementById('detail-photo-failed');
          const rec = state.currentDetail?.record;
          if (mainImg && rec) {
            mainImg.style.display = 'none';
            if (loadingMsg) loadingMsg.style.display = 'flex';
            if (unreadableMsg) unreadableMsg.style.display = 'none';
            if (failedMsg) failedMsg.style.display = 'none';
            mainImg.src = `/api/records/${encodeURIComponent(rec.record_id)}/images/${idx}`;
            const frameBadge = document.querySelector('.photo-main-viewer div:last-child');
            const count = Number(rec.image_count) || 1;
            if (frameBadge) frameBadge.textContent = `사진 ${idx + 1} / ${count}`;
            document.querySelectorAll('.thumbnail-item').forEach((item, i) => {
              const isActive = (i === idx);
              item.classList.toggle('active', isActive);
              item.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            });
          }
          return;
        }
      }
    };

    // 0. 저장소 사진 재시도 버튼
    const retryRepoBtn = document.getElementById('btn-retry-repo-images');
    if (retryRepoBtn) {
      retryRepoBtn.onclick = () => {
        state.repoImagesLoaded = false;
        state.repoImagesLoading = false;
        loadRepositoryImages().then(() => render());
      };
    }

    // 1. 새 사건 등록 폼 (#records/new)
    if (route.page === 'records_new') {
      const form = document.getElementById('new-record-form');
      if (form) {
        function syncDraftInputs() {
          if (!state.newRecordDraft) return;
          const locEl = document.getElementById('new-location');
          if (locEl !== null) state.newRecordDraft.location = locEl.value;
          const memoEl = document.getElementById('new-memo');
          if (memoEl !== null) state.newRecordDraft.memo = memoEl.value;
          const catEl = document.getElementById('new-category');
          if (catEl !== null) state.newRecordDraft.category = catEl.value;
        }

        // 모드 전환 탭 이벤트
        const tabRepo = document.getElementById('tab-mode-repo');
        const tabUpload = document.getElementById('tab-mode-upload');
        if (tabRepo) {
          tabRepo.onclick = () => {
            if (state.newRecordDraft) {
              syncDraftInputs();
              state.newRecordDraft.mode = 'repository';
              state.newRecordDraft.modeChosen = true;
            }
            render();
          };
        }
        if (tabUpload) {
          tabUpload.onclick = () => {
            if (state.newRecordDraft) {
              syncDraftInputs();
              state.newRecordDraft.mode = 'upload';
              state.newRecordDraft.modeChosen = true;
            }
            render();
          };
        }

        // 파일을 넣으면 직접 고른 것으로 보고, 사진 목록이 늦게 도착해도 업로드 모드를 바꾸지 않는다.
        const filesInput = document.getElementById('new-files');
        if (filesInput) filesInput.onchange = () => { if (state.newRecordDraft) state.newRecordDraft.modeChosen = true; };

        // 분류 필터 버튼
        const filterBtns = form.querySelectorAll('[data-filter-track]');
        filterBtns.forEach(btn => {
          btn.onclick = () => {
            syncDraftInputs();
            state.repoImagesFilterTrack = btn.dataset.filterTrack;
            render();
          };
        });

        // 사진 더보기 버튼
        const moreBtn = document.getElementById('btn-repo-more');
        if (moreBtn) {
          moreBtn.onclick = () => {
            syncDraftInputs();
            state.repoImagesVisibleCount = (state.repoImagesVisibleCount || 12) + 12;
            render();
          };
        }

        // 저장소 사진 체크박스 이벤트
        const checkInputs = form.querySelectorAll('input[name="repo-img-check"]');
        checkInputs.forEach(chk => {
          chk.onchange = () => {
            const imgId = chk.value;
            const imgTrack = chk.dataset.track;
            const draft = state.newRecordDraft;
            if (!draft) return;

            if (chk.checked) {
              if (draft.selectedRepoIds.length >= 5) {
                notify('저장소 사진은 최대 5장까지만 선택할 수 있습니다.', 'error');
                chk.checked = false;
                return;
              }
              // 단일 사건 내 트랙 일치 검증: 이미 선택된 사진이 있고 트랙이 다르면 차단
              if (draft.selectedRepoIds.length > 0) {
                const firstImg = state.repositoryImages.find(i => i.id === draft.selectedRepoIds[0]);
                if (firstImg && firstImg.track && imgTrack && firstImg.track !== imgTrack) {
                  notify(`한 사건에는 동일한 분류(${firstImg.track === 'safety' ? '산업안전' : '택배 발송 확인'})의 사진만 함께 선택할 수 있습니다.`, 'error');
                  chk.checked = false;
                  return;
                }
              }
              draft.selectedRepoIds.push(imgId);
              // 선택된 사진의 분류에 따라 폼의 분류 자동 설정
              if (imgTrack) {
                draft.category = imgTrack;
                const catSelect = document.getElementById('new-category');
                if (catSelect) catSelect.value = imgTrack;
              }
            } else {
              draft.selectedRepoIds = draft.selectedRepoIds.filter(id => id !== imgId);
            }

            // UI 상태 즉시 갱신
            const countBadge = document.getElementById('repo-count-badge');
            if (countBadge) {
              countBadge.textContent = `선택된 사진: ${draft.selectedRepoIds.length} / 5장 (1~5장 필수)`;
              countBadge.style.color = draft.selectedRepoIds.length > 0 ? '#2563eb' : '#64748b';
            }
            const cardLabel = chk.closest('label');
            if (cardLabel) {
              cardLabel.style.borderColor = chk.checked ? '#2563eb' : 'var(--line, #cbd5e1)';
              cardLabel.style.background = chk.checked ? '#eff6ff' : '#fff';
            }
          };
        });

        // 폼 제출 이벤트 (배타적 모드 처리, 중복 제출 방지 및 등록 실패 시 보존)
        form.onsubmit = async (e) => {
          e.preventDefault();
          if (state.isSubmittingRecord) return;

          const submitBtn = document.getElementById('btn-submit-record');
          syncDraftInputs();
          const draft = state.newRecordDraft || {};
          const locationVal = (draft.location || '').trim();
          const categoryVal = (draft.category || '').trim();
          const memoVal = (draft.memo || '').trim();

          // 공백만 넣은 장소는 브라우저 필수 검사를 통과한다. 다듬은 값이 비면 보내지 않고, 빈 칸일 때처럼 장소 칸에서 알린다.
          if (!locationVal) {
            const locEl = document.getElementById('new-location');
            if (locEl) {
              locEl.setCustomValidity('장소를 입력해 주세요.');
              locEl.oninput = () => locEl.setCustomValidity('');
              locEl.reportValidity();
            }
            return;
          }

          const isRepoMode = draft.mode === 'repository';
          const payload = {
            location: locationVal,
            category: categoryVal,
            memo: memoVal
          };

          if (isRepoMode) {
            const selectedIds = draft.selectedRepoIds || [];
            if (selectedIds.length < 1 || selectedIds.length > 5) {
              notify('저장소 사진은 1장 이상 5장 이하로 선택해야 합니다.', 'error');
              return;
            }
            for (const id of selectedIds) {
              const found = state.repositoryImages.find(i => i.id === id);
              if (found && found.track && found.track !== categoryVal) {
                notify(`선택된 사진(${id})의 분류(${found.track})와 사건 분류(${categoryVal})가 일치하지 않습니다.`, 'error');
                return;
              }
            }
            payload.repository_image_ids = selectedIds;
          } else {
            const fileInput = document.getElementById('new-files');
            const files = Array.from(fileInput?.files || []);
            if (files.length < 1 || files.length > 5) {
              notify('사진은 1장 이상 5장 이하로 첨부해야 합니다.', 'error');
              return;
            }
            const images = [];
            for (const f of files) {
              if (f.size > 2 * 1024 * 1024) {
                notify(`파일 크기가 2MB를 초과합니다: ${f.name}`, 'error');
                return;
              }
              const b64 = await readFileAsBase64(f);
              images.push({
                filename: f.name,
                mimeType: f.type,
                base64: b64
              });
            }
            payload.images = images;
          }

          state.isSubmittingRecord = true;
          if (submitBtn) submitBtn.disabled = true;

          try {
            const res = await api('/api/records', {
              method: 'POST',
              body: JSON.stringify(withRequestId('create', payload, 'req'))
            });
            delete state.formRequestIds.create;
            notify(`사건이 성공적으로 등록되었습니다: ${res.record_id}`, 'info');
            state.selectedRecordId = res.record_id;
            state.newRecordDraft = null; // 성공 시에만 폼 초기화
            await refreshRecords();
            location.hash = `#records/${encodeURIComponent(res.record_id)}`;
          } catch (err) {
            // 실패 시 알림 후 입력값 보존. 같은 내용으로 다시 내면 같은 요청 번호가 나간다(requestIdFor).
            notify(`등록 실패: ${err.message}`, 'error');
          } finally {
            state.isSubmittingRecord = false;
            if (submitBtn) submitBtn.disabled = false;
          }
        };
      }
    }

    // 2. 사건 수정 폼 (#records/{id}/edit)
    if (route.page === 'record_edit') {
      const formKey = 'edit:' + route.recordId;
      const form = document.getElementById('edit-record-form');
      if (form) {
        form.onsubmit = async (e) => {
          e.preventDefault();
          if (state.isSubmittingForm) return;
          const locationVal = document.getElementById('edit-location').value;
          const categoryVal = document.getElementById('edit-category').value;
          const memoVal = document.getElementById('edit-memo').value;

          // 저장 중에는 두 번째 제출을 막고 저장 단추를 끈다(등록 폼과 같은 방식).
          const submitBtn = form.querySelector('button[type="submit"]');
          state.isSubmittingForm = true;
          if (submitBtn) submitBtn.disabled = true;

          try {
            const res = await api(`/api/records/${encodeURIComponent(route.recordId)}`, {
              method: 'PATCH',
              body: JSON.stringify(withRequestId(formKey, {
                location: locationVal,
                category: categoryVal,
                memo: memoVal,
                operator: '현장 작업자'
              }, 'req_edit'))
            });
            delete state.formRequestIds[formKey];
            notify(`사건 정보가 수정되었습니다 (v${res.version})`, 'info');
            await Promise.all([loadDetail(route.recordId), refreshRecords()]);
            location.hash = `#records/${encodeURIComponent(route.recordId)}`;
          } catch (err) {
            notify(`수정 실패: ${err.message}`, 'error');
          } finally {
            state.isSubmittingForm = false;
            if (submitBtn) submitBtn.disabled = false;
          }
        };
      }
    }

    // 3. 사람 판단 폼 (#records/{id}/review)
    if (route.page === 'record_review') {
      const formKey = 'review:' + route.recordId;
      const form = document.getElementById('page-review-form');
      if (form) {
        form.onsubmit = async (e) => {
          e.preventDefault();
          if (state.isSubmittingForm) return;
          const decision = document.getElementById('page-review-decision').value;
          const basis = document.getElementById('page-review-basis').value;
          const followup = document.getElementById('page-review-followup').value;
          const reviewer = document.getElementById('page-review-reviewer').value;

          // 저장 중에는 두 번째 제출을 막고 저장 단추를 끈다(등록 폼과 같은 방식).
          const submitBtn = form.querySelector('button[type="submit"]');
          state.isSubmittingForm = true;
          if (submitBtn) submitBtn.disabled = true;

          try {
            await api(`/api/records/${encodeURIComponent(route.recordId)}/review`, {
              method: 'POST',
              body: JSON.stringify(withRequestId(formKey, { decision, basis, followup_note: followup, reviewer }, 'req_review'))
            });
            delete state.formRequestIds[formKey];
            notify('판단 기록이 저장되었습니다.', 'info');
            await Promise.all([loadDetail(route.recordId), refreshRecords()]);
            location.hash = `#records/${encodeURIComponent(route.recordId)}`;
          } catch (err) {
            notify(`저장 실패: ${err.message}`, 'error');
          } finally {
            state.isSubmittingForm = false;
            if (submitBtn) submitBtn.disabled = false;
          }
        };
      }
    }

    // 4. 대응 조치 폼 (#records/{id}/action)
    if (route.page === 'record_action') {
      const formKey = 'action:' + route.recordId;
      const form = document.getElementById('page-action-form');
      if (form) {
        form.onsubmit = async (e) => {
          e.preventDefault();
          if (state.isSubmittingForm) return;
          const actionType = document.getElementById('page-action-type').value;
          const desc = document.getElementById('page-action-desc').value;
          const evid = document.getElementById('page-action-evidence').value;
          const actor = document.getElementById('page-action-actor').value;

          if (actionType === 'COMPLETE' && !evid.trim()) {
            notify('조치 완료 시에는 완료 증빙 메모를 반드시 입력해야 합니다.', 'error');
            return;
          }

          // 저장 중에는 두 번째 제출을 막고 저장 단추를 끈다(등록 폼과 같은 방식).
          const submitBtn = form.querySelector('button[type="submit"]');
          state.isSubmittingForm = true;
          if (submitBtn) submitBtn.disabled = true;

          try {
            await api(`/api/records/${encodeURIComponent(route.recordId)}/actions`, {
              method: 'POST',
              body: JSON.stringify(withRequestId(formKey, { action_type: actionType, description: desc, evidence_note: evid, actor }, 'req_action'))
            });
            delete state.formRequestIds[formKey];
            notify('조치 기록이 저장되었습니다.', 'info');
            await Promise.all([loadDetail(route.recordId), refreshRecords()]);
            location.hash = `#records/${encodeURIComponent(route.recordId)}`;
          } catch (err) {
            notify(`저장 실패: ${err.message}`, 'error');
          } finally {
            state.isSubmittingForm = false;
            if (submitBtn) submitBtn.disabled = false;
          }
        };
      }
    }
  }

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result;
        const b64 = res.split(',')[1];
        resolve(b64);
      };
      reader.onerror = () => reject(reader.error || new Error('파일 읽기 오류'));
      reader.readAsDataURL(file);
    });
  }

  // 폼 요청 번호: 같은 본문을 다시 보내면 같은 번호를, 본문이 바뀌면 새 번호를 쓴다.
  // 응답을 잃고 다시 눌러도 한 번만 저장되고, 사진이나 내용을 바꿔 다시 내면 새 기록이 된다.
  function requestIdFor(key, body, prefix) {
    const text = JSON.stringify(body);
    const kept = state.formRequestIds[key];
    if (!kept || kept.body !== text) state.formRequestIds[key] = { body: text, id: generateClientRequestId(prefix) };
    return state.formRequestIds[key].id;
  }
  const withRequestId = (key, body, prefix) => ({ ...body, request_id: requestIdFor(key, body, prefix) });

  // 클라이언트 UUID 생성 헬퍼
  function generateClientRequestId(prefix = 'req') {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}_${crypto.randomUUID()}`;
    }
    const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return `${prefix}_${Date.now()}_${s4()}${s4()}-${s4()}`;
  }

  window.addEventListener('hashchange', render);
  initData();
})();
