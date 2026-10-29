// Vision Risk Management Dashboard - Live Application
// Integrates with local same-origin REST API (/api/*).

(function () {
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
    standardsLoading: true,
    standardsError: null,
    error: null,
    connected: false,
    standards: []
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
        // 요청 오류(4xx)는 서버가 정상으로 답한 것이다. 연결 표시는 그대로 두고 그 화면의 알림으로만 보인다.
        if (resp.status >= 500) state.connected = false;
        const err = new Error(data.error || `HTTP ${resp.status}`);
        err.status = resp.status;
        throw err;
      }
      state.error = null;
      state.connected = true;
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

  // 초기 데이터 로드
  async function initData() {
    render(); // 데이터보다 페이지 틀을 먼저 표시한다.
    await api('/api/standards').then(res => { state.standards = res.standards || []; state.standardsError = null; })
      .catch(e => { state.standardsError = e.message; }).finally(() => { state.standardsLoading = false; render(); });
  }

  // UI 컴포넌트 헬퍼
  const tag = (s, k = '') => `<span class="tag ${escapeHtml(k)}">${escapeHtml(s)}</span>`;
  const table = (h, r) => `<div class="table-scroll" role="region" aria-label="확인 기준 표" tabindex="0"><table><thead><tr>${h.map(x => `<th>${escapeHtml(x)}</th>`).join('')}</tr></thead><tbody>${r.map(a => `<tr>${a.map(x => `<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const card = (h, b) => `<section class="card"><h2>${escapeHtml(h)}</h2>${b}</section>`;
  const heading = (h, b = '', actions = '') => `<div class="heading"><div><h1>${escapeHtml(h)}</h1>${b ? `<p class="subtitle">${escapeHtml(b)}</p>` : ''}</div>${actions ? `<div class="heading-actions">${actions}</div>` : ''}</div>`;
  const headingRaw = (h, bHtml = '', actions = '') => `<div class="heading"><div><h1>${escapeHtml(h)}</h1>${bHtml ? `<p class="subtitle">${bHtml}</p>` : ''}</div>${actions ? `<div class="heading-actions">${actions}</div>` : ''}</div>`;

  // 화면 렌더러 정의
  const screens = {
    // 1. 홈 (현장 리스크 확인)
    dashboard: () => {
      const topActions = `<a class="button primary" href="#models">확인 기준 보기</a>`;
      return heading('현장 리스크 확인', '', topActions);
    },

    // 2. 확인 기준 (#models)
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

  // 머리말의 연결 표시. 한 번 연결된 뒤에는 요청 중에도 "데이터 연결됨"을 유지한다.
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

  // 머리말 연결 표시만 다시 그린다.
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
      el.innerHTML = '';
    }
  }

  function render() {
    const route = parseRoute();
    const pageRenderer = screens[route.page] || screens.dashboard;
    const isDash = route.page === 'dashboard';

    const badgeHtml = connectionBadgeHtml();

    // 브레드크럼 헤더
    let breadcrumb = '<b>현장 리스크 확인</b>';
    if (route.page === 'models') {
      breadcrumb = '<a class="back-link" href="#dashboard">← 홈으로</a><span class="header-sep">/</span><b>확인 기준</b>';
    } else if (!isDash) {
      breadcrumb = `<a class="back-link" href="#dashboard">← 홈으로</a><span class="header-sep">/</span><b>${escapeHtml(route.page)}</b>`;
    }

    const contentHtml = `${isDash ? '' : `<div class="page-breadcrumb">${breadcrumb}</div>`}<div id="global-status-msg" role="status"></div>${pageRenderer()}`;
    const existingMain = document.querySelector('main.content');
    const routeKey = route.page;
    const routeChanged = existingMain?.dataset.routeKey !== routeKey;
    const focusId = !routeChanged ? document.activeElement?.id : null;
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

    if (focusId) document.getElementById(focusId)?.focus({preventScroll:true});
    renderStatus();
    if (routeChanged) window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', render);
  initData();
})();
