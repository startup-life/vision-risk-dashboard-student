/**
 * 로컬 NotebookLM MCP Stdio Client
 *
 * 공식 @modelcontextprotocol/sdk의 Client & StdioClientTransport를 사용합니다.
 * 이 클라이언트가 고정하는 환경변수(NOTEBOOKLM_DISABLE_HEADLESS_REFRESH=1 등)를 넘겨 실행하며,
 * 인증 미완료 상태를 정직하게 setup_required로 보고합니다.
 */

const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport, getDefaultEnvironment } = require('@modelcontextprotocol/sdk/client/stdio.js');

const DEFAULT_MCP_ARGS = ['--transport', 'stdio'];
// Antigravity MCP 설정과 같은 항목을 읽어 같은 실행 파일을 띄운다.
// 서버 이름은 notebooklm-mcp-cli의 `nlm setup`이 등록하는 이름이다.
const ANTIGRAVITY_SERVER_NAME = 'gemini-notebook-mcp';
// `uv tool install notebooklm-mcp-cli`가 PATH(~/.local/bin)에 두는 MCP 실행 파일 이름. 설정이 하나도 없을 때 마지막으로 찾는다.
const PATH_MCP_COMMAND = 'notebooklm-mcp';
// 실제 질의는 40~60초 걸린다. notebook_query에는 notebooklm-mcp-cli 0.15.6 기본값과 같은 120초를 주고,
// MCP 호출은 그보다 15초 더 기다린다(SDK 기본 60초는 짧다).
const NOTEBOOK_QUERY_SECONDS = 120;
const MCP_CALL_MS = 135 * 1000;
// NotebookLM 쪽 시간 초과(error_details.category deadline_exceeded)와 SDK 시간 초과(-32001)에 같은 문구를 쓴다.
const NOTEBOOK_TIMEOUT_MESSAGE = 'NotebookLM 응답 시간이 지났습니다. 잠시 뒤 관련 기준 찾기를 다시 눌러 주세요.';
const MCP_REQUEST_TIMEOUT_CODE = -32001;

/**
 * Antigravity 설정 파일 후보. 앞의 것이 먼저다.
 * 1) Antigravity 문서가 안내하는 전역 설정 2) `nlm setup add antigravity`가 쓰는 위치.
 * 작업영역 설정(.agents/mcp_config.json)은 대시보드 실행 폴더와 다를 수 있어 읽지 않는다.
 */
function antigravityConfigCandidates(options = {}) {
  const home = options.homeDir || os.homedir();
  return [
    path.join(home, '.gemini', 'config', 'mcp_config.json'),
    path.join(home, '.gemini', 'antigravity', 'mcp_config.json')
  ];
}

// 화면에 나가는 문구에서 홈 경로는 ~로 줄인다.
function displayConfigPath(filePath, options = {}) {
  const home = options.homeDir || os.homedir();
  return filePath.startsWith(home + path.sep) ? '~' + filePath.slice(home.length).split(path.sep).join('/') : filePath;
}

function readAntigravityEntry(filePath) {
  if (!fs.existsSync(filePath)) return { reason: '파일 없음' };
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    // 권한 오류(EACCES·EPERM) 등은 JSON 문제가 아니다.
    return { reason: e.code === 'ENOENT' ? '파일 없음' : `읽을 수 없음(${e.code || e.message})` };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { reason: 'JSON 오류' };
  }
  const entry = parsed && typeof parsed === 'object' && parsed.mcpServers && parsed.mcpServers[ANTIGRAVITY_SERVER_NAME];
  if (!entry || typeof entry.command !== 'string' || !entry.command) return { reason: `${ANTIGRAVITY_SERVER_NAME} 항목 없음` };
  return { entry };
}

/**
 * MCP 실행 방법을 정한다. 순서: options.command, 환경 변수 NOTEBOOKLM_MCP_COMMAND, Antigravity 설정 파일 후보, PATH의 notebooklm-mcp.
 * 앞의 것이 있으면 뒤의 것은 읽지 않는다(테스트가 환경 변수로 실제 MCP 실행을 막는 데 쓴다).
 * 설정 파일이 비었거나 JSON 오류여도 다음 후보로 넘어가 PATH까지 찾는다.
 * 모두 없으면 command가 null이고, checked에 확인한 위치마다 무엇이 없었는지 담는다.
 */
function resolveMcpLaunch(options = {}, env = process.env) {
  if (options.command) {
    return { source: 'options', command: options.command, args: options.args || DEFAULT_MCP_ARGS, env: {} };
  }
  if (env.NOTEBOOKLM_MCP_COMMAND) {
    return { source: 'NOTEBOOKLM_MCP_COMMAND', command: env.NOTEBOOKLM_MCP_COMMAND, args: options.args || DEFAULT_MCP_ARGS, env: {} };
  }
  const checked = [{ location: 'NOTEBOOKLM_MCP_COMMAND', reason: '설정 안 됨' }];
  for (const filePath of antigravityConfigCandidates(options)) {
    const location = displayConfigPath(filePath, options);
    const { entry, reason } = readAntigravityEntry(filePath);
    if (entry) {
      return {
        source: 'antigravity',
        configLocation: location,
        command: entry.command,
        // 명령 이름(예: uvx)과 args 배열을 Antigravity와 똑같이 넘긴다. PATH 해석은 SDK가 한다.
        args: options.args || (Array.isArray(entry.args) ? entry.args.map(String) : []),
        env: entry.env && typeof entry.env === 'object' ? { ...entry.env } : {}
      };
    }
    checked.push({ location, reason });
  }
  // uv로 설치만 하고 어디에도 등록하지 않은 경우다. 찾은 경로를 그대로 띄운다.
  const fromPath = findExecutable(PATH_MCP_COMMAND, { env, platform: options.platform || process.platform });
  if (fromPath) {
    return { source: 'PATH', command: fromPath, args: options.args || DEFAULT_MCP_ARGS, env: {} };
  }
  checked.push({ location: `PATH의 ${PATH_MCP_COMMAND}`, reason: '찾지 못함' });
  return { source: null, command: null, args: options.args || DEFAULT_MCP_ARGS, env: {}, checked };
}

function describeLaunchSource(launch) {
  if (launch.source === 'options') return '생성자 옵션 command';
  if (launch.source === 'NOTEBOOKLM_MCP_COMMAND') return '환경 변수 NOTEBOOKLM_MCP_COMMAND';
  if (launch.source === 'antigravity') return `${launch.configLocation}의 ${ANTIGRAVITY_SERVER_NAME}`;
  if (launch.source === 'PATH') return `PATH의 ${PATH_MCP_COMMAND}`;
  return '설정 없음';
}

// MCP 자식 프로세스에 넘기는 고정값. 설정 파일 env보다 우선한다.
const FIXED_MCP_ENV = {
  NOTEBOOKLM_HL: 'ko',
  NOTEBOOKLM_RATE_LIMIT_MAX_RETRIES: '0',
  NOTEBOOKLM_DISABLE_HEADLESS_REFRESH: '1'
};
// SDK 기본 목록(PATH·HOME, Windows의 APPDATA·SYSTEMROOT 등)에 더해 넘기는 변수: 임시 폴더·로캘, 그리고 표준 프록시 설정.
// 프록시를 쓰는 네트워크에서는 이 값이 없으면 MCP가 Google에 접속하지 못한다. 앱 설정값(GAS_WEBAPP_URL 등)과는 무관하다.
// TLS 검사 장비가 있는 네트워크를 위해 인증서 묶음 위치(SSL_CERT_FILE 등)도 넘긴다.
const EXTRA_INHERITED_ENV_VARS = [
  'TMPDIR', 'TMP', 'LANG', 'LC_ALL', 'LC_CTYPE',
  'HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy', 'no_proxy', 'all_proxy',
  'SSL_CERT_FILE', 'SSL_CERT_DIR', 'REQUESTS_CA_BUNDLE'
];
const EXTRA_INHERITED_ENV_VARS_UPPER = new Set(EXTRA_INHERITED_ENV_VARS.map(name => name.toUpperCase()));

// 넘겨도 되는 변수인지. Windows는 이름의 대소문자를 가리지 않으므로(예: Https_Proxy) 대문자로 비교한다.
function isInheritedEnvName(key, platform) {
  if (platform === 'win32') {
    const upper = key.toUpperCase();
    return upper.startsWith('NOTEBOOKLM_') || EXTRA_INHERITED_ENV_VARS_UPPER.has(upper);
  }
  return key.startsWith('NOTEBOOKLM_') || EXTRA_INHERITED_ENV_VARS.includes(key);
}

/**
 * 비공식 MCP 서버에는 필요한 변수만 넘긴다. GAS_WEBAPP_URL·GEMINI_API_KEY 같은 서버 설정값은 넘기지 않는다.
 * 넘기는 것: SDK getDefaultEnvironment(), NOTEBOOKLM_로 시작하는 변수, Antigravity 설정 항목의 env, 고정값, 생성자 옵션 env.
 */
function buildMcpEnv(launchEnv = {}, overrides = {}, env = process.env, platform = process.platform) {
  const inherited = {};
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) continue;
    if (isInheritedEnvName(key, platform)) inherited[key] = value;
  }
  return {
    ...getDefaultEnvironment(),
    ...inherited,
    ...launchEnv,
    ...FIXED_MCP_ENV,
    ...overrides
  };
}

function isPathLike(command) {
  return path.isAbsolute(command) || command.includes('/') || command.includes('\\');
}

function envValue(env, name, platform) {
  if (platform !== 'win32') return env[name];
  // Windows 환경 변수 이름은 대소문자를 가리지 않는다(Path, PATH).
  const key = Object.keys(env).find(k => k.toUpperCase() === name);
  return key === undefined ? undefined : env[key];
}

function isExecutableFile(filePath, platform) {
  try {
    if (!fs.statSync(filePath).isFile()) return false;
    if (platform !== 'win32') fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * spawn 전에 실행 파일을 직접 찾는다. 찾으면 그 경로를, 못 찾으면 null을 돌려준다.
 * Windows에서는 cross-spawn이 못 찾은 명령을 cmd.exe로 띄워 spawn이 성공해 버리므로 여기서 먼저 걸러야 한다.
 * - 경로: 그대로 확인하고, Windows면 확장자가 없을 때 PATHEXT 확장자(.cmd, .exe 등)를 붙여 본다.
 * - 명령 이름: PATH의 각 폴더에서 찾는다(Windows는 PATHEXT 확장자까지).
 * env는 자식 프로세스에 넘길 환경이다(cross-spawn도 이 PATH로 찾는다). platform은 테스트에서 바꿔 넣을 수 있다.
 */
function findExecutable(command, { env = process.env, platform = process.platform } = {}) {
  const isWin = platform === 'win32';
  const exts = isWin
    ? String(envValue(env, 'PATHEXT', platform) || '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean)
    : [];
  const withExtensions = base => {
    if (!isWin) return [base];
    const hasExt = exts.some(ext => base.toLowerCase().endsWith(ext.toLowerCase()));
    return hasExt ? [base] : [base, ...exts.map(ext => base + ext.toLowerCase())];
  };
  if (isPathLike(command)) {
    return withExtensions(command).find(c => isExecutableFile(c, platform)) || null;
  }
  const dirs = String(envValue(env, 'PATH', platform) || '').split(isWin ? ';' : ':').filter(Boolean);
  for (const dir of dirs) {
    const found = withExtensions(path.join(dir.replace(/^"(.*)"$/, '$1'), command)).find(c => isExecutableFile(c, platform));
    if (found) return found;
  }
  return null;
}

/**
 * MCP를 띄우지 않고 실행 파일만 찾는다. 찾으면 그 경로를, 설정이 없거나 못 찾으면 null을 돌려준다.
 * 서버 기동 줄에서 NotebookLM live인데 실행 파일이 없음을 첫 기준 확인 전에 알리는 데 쓴다.
 */
function findMcpExecutable(options = {}, env = process.env) {
  const launch = resolveMcpLaunch(options, env);
  if (!launch.command) return null;
  const platform = options.platform || process.platform;
  return findExecutable(launch.command, { env: buildMcpEnv(launch.env, options.env || {}, env, platform), platform });
}

const LOCAL_SETUP_GUIDE = 'docs/LOCAL-SETUP.md의 NotebookLM 절';

// 화면에 그대로 나가는 인증 안내. 상태별로 수강생이 할 일을 적는다.
function authSetupMessage(authStatus) {
  if (authStatus === 'not_configured') {
    return `NotebookLM에 로그인되어 있지 않습니다(상태: not_configured). 터미널에서 nlm login --storage protected로 로그인한 뒤 로컬 서버를 다시 시작하세요. 자세한 방법은 ${LOCAL_SETUP_GUIDE}을 보세요.`;
  }
  if (authStatus === 'stale') {
    return `NotebookLM 로그인이 만료되었습니다(상태: stale). 터미널에서 nlm login --storage protected로 다시 로그인한 뒤 로컬 서버를 다시 시작하세요. 자세한 방법은 ${LOCAL_SETUP_GUIDE}을 보세요.`;
  }
  return `NotebookLM 인증 상태를 확인하지 못했습니다(상태: ${authStatus}). 터미널에서 nlm login --storage protected로 로그인한 뒤 로컬 서버를 다시 시작하세요. 자세한 방법은 ${LOCAL_SETUP_GUIDE}을 보세요.`;
}

const WHOLE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMBEDDED_EMAIL = /[^\s@"'<>()[\]{},;:]+@[^\s@"'<>()[\]{},;:]+\.[A-Za-z]{2,}/g;

/**
 * server_info 결과에서 메일 주소를 뺀다. /api/health의 mcp_status.serverInfo로 나가고, 수업 중 그 화면을 공유할 수 있어서다.
 * - 이름이 email인 항목(profiles[].email)과 값 전체가 메일 꼴인 항목·배열 원소는 뺀다.
 * - 긴 문장 안에 든 메일 주소는 그 부분만 "(메일 생략)"으로 바꾼다. auth_status 등 나머지 값은 그대로 둔다.
 */
function withoutEmails(value) {
  if (typeof value === 'string') return value.replace(EMBEDDED_EMAIL, '(메일 생략)');
  if (Array.isArray(value)) {
    return value.filter(v => !(typeof v === 'string' && WHOLE_EMAIL.test(v.trim()))).map(withoutEmails);
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, v] of Object.entries(value)) {
      if (key.toLowerCase() === 'email') continue;
      if (typeof v === 'string' && WHOLE_EMAIL.test(v.trim())) continue;
      out[key] = withoutEmails(v);
    }
    return out;
  }
  return value;
}

function mcpSetupError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

class NotebookLMClient {
  constructor(options = {}) {
    this.options = options;
    this.client = null;
    this.transport = null;
    this.connected = false;
    this.connecting = null;
    // 로그인 상태(getStatus)는 연결마다 한 번만 확인한다. 연결이 끊기면 다시 확인한다.
    this.authChecked = false;
  }

  async connect() {
    if (this.connected && this.client) {
      return this.client;
    }
    // 동시에 들어온 요청이 프로세스를 두 번 띄우지 않도록 진행 중인 연결을 함께 기다린다.
    if (!this.connecting) {
      this.connecting = this._open().finally(() => { this.connecting = null; });
    }
    return this.connecting;
  }

  async _open() {
    const launch = resolveMcpLaunch(this.options);
    if (!launch.command) {
      const checkedText = launch.checked.map(c => `${c.location}: ${c.reason}`).join(', ');
      throw mcpSetupError('MCP_NOT_CONFIGURED',
        `NotebookLM MCP 실행 파일을 찾지 못했습니다. uv tool install notebooklm-mcp-cli로 설치해 PATH에 ${PATH_MCP_COMMAND}가 있게 하거나, `
        + '설정 파일(config/local-connection.json)의 NOTEBOOKLM_MCP_COMMAND를 지정하거나, '
        + `Antigravity 설정 파일에 ${ANTIGRAVITY_SERVER_NAME} 항목을 등록하세요(확인한 위치: ${checkedText}).`
        + ` 설치와 설정 방법은 ${LOCAL_SETUP_GUIDE}을 보세요.`);
    }
    const notFound = () => mcpSetupError('MCP_EXECUTABLE_NOT_FOUND',
      `NotebookLM MCP 실행 파일을 찾을 수 없습니다: ${launch.command} (설정 출처: ${describeLaunchSource(launch)}). 설치했는지, 경로나 명령 이름이 맞는지 확인하세요. 설치와 설정 방법은 ${LOCAL_SETUP_GUIDE}을 보세요.`);
    const platform = this.options.platform || process.platform;
    const childEnv = buildMcpEnv(launch.env, this.options.env || {}, process.env, platform);
    const executable = findExecutable(launch.command, { env: childEnv, platform });
    if (!executable) throw notFound();

    const transport = new StdioClientTransport({
      command: executable,
      args: launch.args,
      env: childEnv
    });
    const client = new Client(
      { name: 'vision-risk-local-client', version: '1.0.0' },
      { capabilities: {} }
    );
    // MCP 프로세스가 끝나면 상태를 비워 다음 호출 때 새로 연결한다.
    // 오류는 프로세스가 이미 없을 때만 연결을 버린다(살아 있는 연결의 개별 메시지 오류로는 끊지 않는다).
    client.onclose = () => this._forget(client);
    client.onerror = () => {
      if (transport.pid === null) this._forget(client);
    };
    this.client = client;
    this.transport = transport;

    try {
      await client.connect(transport);
    } catch (err) {
      this._forget(client);
      try { await client.close(); } catch (e) { /* 연결 실패 뒤 정리 오류는 원래 오류를 가리지 않게 무시한다 */ }
      if (err && err.code === 'ENOENT') throw notFound();
      // 실행은 됐지만 MCP 응답 전에 프로세스가 끝난 경우(-32000 Connection closed). 원인을 알 수 있게 안내한다.
      if (err && (err.code === -32000 || /Connection closed/i.test(String(err.message)))) {
        throw mcpSetupError('MCP_EXITED',
          `NotebookLM MCP 프로세스가 연결 중에 종료되었습니다: ${launch.command} (설정 출처: ${describeLaunchSource(launch)}). `
          + `터미널에서 같은 명령이 실행되는지, 인자가 맞는지 확인하세요. 서버 콘솔에 MCP의 오류 출력이 남습니다. 설치와 설정 방법은 ${LOCAL_SETUP_GUIDE}을 보세요.`);
      }
      throw err;
    }
    if (this.client !== client) {
      // 연결 도중 프로세스가 끝났다.
      throw new Error('NotebookLM MCP 프로세스가 연결 직후 종료되었습니다.');
    }
    this.connected = true;
    return client;
  }

  _forget(client) {
    if (this.client !== client) return;
    this.client = null;
    this.transport = null;
    this.connected = false;
    this.authChecked = false;
  }

  async close() {
    if (this.connecting) {
      try { await this.connecting; } catch (e) { /* 실패한 연결은 _open에서 이미 정리했다 */ }
    }
    const client = this.client;
    const transport = this.transport;
    this.client = null;
    this.transport = null;
    this.connected = false;
    // Client.close()가 transport.close()를 부른다. SDK가 stdin을 닫고 기다린 뒤 SIGTERM, SIGKILL 순으로 종료한다.
    if (client) {
      try { await client.close(); } catch (e) { /* 종료 중 오류는 무시한다 */ }
    }
    if (transport) {
      try { await transport.close(); } catch (e) { /* 이미 닫힌 전송이면 아무것도 하지 않는다 */ }
    }
  }

  /**
   * MCP 상태 및 도구 목록 조회 (인증 상태 포함)
   */
  async getStatus() {
    try {
      const client = await this.connect();
      const tools = await client.listTools();
      const toolNames = (tools.tools || []).map(t => t.name);

      // server_info 도구가 있으면 호출하여 인증 상태 확인
      let authStatus = 'unknown';
      let serverInfo = null;
      if (toolNames.includes('server_info')) {
        try {
          const infoResult = await client.callTool({ name: 'server_info', arguments: {} });
          const text = (infoResult.content || []).map(c => c.text).join(' ');
          try {
            serverInfo = withoutEmails(JSON.parse(text));
            if (serverInfo && typeof serverInfo.auth_status === 'string') {
              authStatus = serverInfo.auth_status;
            }
          } catch (pe) {
            const match = text.match(/"auth_status"\s*:\s*"([^"]+)"/);
            if (match) {
              authStatus = match[1];
            } else {
              authStatus = 'error';
            }
          }
        } catch (e) {
          authStatus = 'error';
        }
      }

      return {
        connected: true,
        authStatus: authStatus, // 'configured' | 'not_configured' | 'stale' | 'unverified' | 'error'
        availableTools: toolNames,
        serverInfo: serverInfo
      };
    } catch (err) {
      return {
        connected: false,
        authStatus: 'unreachable',
        error: String(err.message || err),
        // MCP_NOT_CONFIGURED·MCP_EXECUTABLE_NOT_FOUND·MCP_EXITED 등. /api/health의 mcp_status로 그대로 나간다.
        error_code: typeof err.code === 'string' ? err.code : 'MCP_UNREACHABLE'
      };
    }
  }

  /**
   * 가상 공장 기준 대조 (Evidence Check)
   *
   * @param {Object} params
   * @param {string} params.standard_id - 가상 공장 기준 ID (C-01 ~ C-05)
   * @param {string} params.notebook_id - NotebookLM 노트북 ID
   * @param {Array<string>} params.source_ids - 허용된 출처 ID 목록 (빈 배열은 setup_required)
   * @param {string} params.query - 질의 내용
   * @param {boolean} params.synthetic - 모의 테스트 모드 여부
   */
  async checkEvidence(params) {
    const { standard_id, notebook_id, source_ids, query, synthetic } = params;

    // 1. 기준 원문 불러오기
    const standardsPath = path.resolve(__dirname, '../preview/standards.json');
    let standardsData = null;
    if (fs.existsSync(standardsPath)) {
      standardsData = JSON.parse(fs.readFileSync(standardsPath, 'utf8'));
    }
    const std = standardsData?.standards?.find(s => s.id === standard_id);
    if (!std) {
      return {
        success: false,
        status: 'error',
        error: `Unknown standard_id: ${standard_id}`
      };
    }

    // 허용된 소스 목록(allowlist) 확인
    const allowedSourceIds = Array.isArray(source_ids) ? source_ids.filter(Boolean) : [];
    if (!synthetic && allowedSourceIds.length === 0) {
      return {
        success: false,
        status: 'setup_required',
        error: `대조할 소스 ID 목록(source_ids)이 비어 있어 대조할 수 없습니다. NOTEBOOKLM_SOURCE_IDS에 노트북의 소스 ID를 쉼표로 구분해 넣고 로컬 서버를 다시 시작하세요. 소스 ID 확인 방법은 ${LOCAL_SETUP_GUIDE}을 보세요.`
      };
    }

    // 2. 모의(Synthetic) 모드인 경우
    if (synthetic) {
      if (allowedSourceIds.length === 0) {
        return {
          success: false,
          status: 'setup_required',
          error: '허용된 소스 ID 목록(source_ids)이 비어 있습니다.'
        };
      }
      const isHold = query && (query.includes('가림') || query.includes('불명확') || query.includes('반사'));
      const isExternalSource = params.test_external_source;
      const isNoCitation = params.test_no_citation;
      const isMismatch = query && query.includes('mismatch');

      const isUnknownSource = params.test_unknown_source;
      const isExtraSentence = params.test_extra_sentence;

      if (isUnknownSource) {
        return {
          success: true,
          status: 'insufficient_evidence',
          standard_id: std.id,
          standard_name: std.name,
          notebook_id: notebook_id || 'mock-notebook',
          source_id: null,
          quote: '인용문은 있으나 출처 불명',
          match: false,
          sufficient: false,
          notes: '질의 응답에 구체적인 출처 참조(source_id)가 명시되지 않은 출처 불명이므로 근거 부족(insufficient_evidence)으로 판정합니다.'
        };
      }

      if (isExtraSentence) {
        return {
          success: true,
          status: 'insufficient_evidence',
          standard_id: std.id,
          standard_name: std.name,
          notebook_id: notebook_id || 'mock-notebook',
          source_id: allowedSourceIds[0],
          quote: std.canonical_quote + ' 임의의 허위 추가 문장',
          match: false,
          sufficient: false,
          notes: '인용문이 조회된 실제 소스 원문에 정확히 부합하지 않거나 임의 추가 문장이 포함되어 근거 부족으로 판정합니다.'
        };
      }

      if (isNoCitation) {
        return {
          success: true,
          status: 'insufficient_evidence',
          standard_id: std.id,
          standard_name: std.name,
          notebook_id: notebook_id || 'mock-notebook',
          source_id: allowedSourceIds[0],
          quote: '',
          match: false,
          sufficient: false,
          notes: '질의 응답에 원문 인용이 포함되지 않아 근거 부족(insufficient_evidence)으로 판정합니다.'
        };
      }

      if (isExternalSource) {
        return {
          success: true,
          status: 'insufficient_evidence',
          standard_id: std.id,
          standard_name: std.name,
          notebook_id: notebook_id || 'mock-notebook',
          source_id: 'unauthorized-external-source',
          quote: '외부 웹페이지 임의 인용',
          match: false,
          sufficient: false,
          notes: '허용된 source_ids 외부 출처이므로 근거 부족(insufficient_evidence)으로 판정합니다.'
        };
      }

      if (isMismatch) {
        return {
          success: true,
          status: 'insufficient_evidence',
          standard_id: std.id,
          standard_name: std.name,
          notebook_id: notebook_id || 'mock-notebook',
          source_id: allowedSourceIds[0],
          quote: '기준과 무관한 일반 안내 문구',
          match: false,
          sufficient: false,
          notes: '기준 원문과 인용 내용이 불일치하여 근거 부족(insufficient_evidence)으로 판정합니다.'
        };
      }

      return {
        success: true,
        status: isHold ? 'hold_condition' : 'sufficient_evidence',
        standard_id: std.id,
        standard_name: std.name,
        source_title: standardsData.facility,
        notebook_id: notebook_id || 'mock-notebook',
        source_id: allowedSourceIds[0],
        quote: std.canonical_quote,
        answer: `[1] 기준 원문 대조 결과: ${std.canonical_quote}`,
        references: [{ source_id: allowedSourceIds[0], citation_number: 1, cited_text: std.canonical_quote }],
        match: true,
        sufficient: !isHold,
        notes: isHold
          ? `판단 보류 조건 충족: ${std.hold_condition}`
          : `기준 일치 확인: ${std.hazard_condition}`
      };
    }

    // 3. 실제 MCP 서버 호출
    try {
      if (!this.authChecked) {
        const status = await this.getStatus();
        if (!status.connected) {
          return {
            success: false,
            status: 'setup_required',
            error: `NotebookLM MCP 서버에 연결할 수 없습니다: ${status.error}`
          };
        }

        // 오직 'configured' 상태일 때만 인증 유효!
        if (status.authStatus !== 'configured') {
          return {
            success: false,
            status: 'setup_required',
            error: authSetupMessage(status.authStatus)
          };
        }
        this.authChecked = true;
      }

      if (!notebook_id) {
        return {
          success: false,
          status: 'setup_required',
          error: `가상 공장 노트북 ID(NOTEBOOKLM_NOTEBOOK_ID)가 설정되지 않았습니다. 대조할 노트북의 ID를 NOTEBOOKLM_NOTEBOOK_ID에 넣고 로컬 서버를 다시 시작하세요. 노트북 ID 확인 방법은 ${LOCAL_SETUP_GUIDE}을 보세요.`
        };
      }

      const client = await this.connect();

      // notebook_query 실행 (source_ids를 실제 전달)
      const queryResult = await client.callTool({
        name: 'notebook_query',
        arguments: {
          notebook_id: notebook_id,
          query: `현장 기준 ${std.id}(${std.name}) 관련: ${query || std.canonical_quote} 답변 끝에 추가 질문이나 제안을 붙이지 마세요.`,
          source_ids: allowedSourceIds,
          timeout: NOTEBOOK_QUERY_SECONDS
        }
      }, undefined, { timeout: MCP_CALL_MS });

      const responseText = (queryResult.content || []).map(c => c.text).join('\n');

      // 실제 반환된 텍스트/JSON에서 인용 및 출처 추출
      let parsedQuery = null;
      try {
        parsedQuery = JSON.parse(responseText);
      } catch (e) {
        parsedQuery = null;
      }

      let extractedQuote = '';
      let citedSourceId = null;
      let answerText = '';
      let referencesList = [];

      // 질의가 실패한 응답을 출처 없음(근거 부족)으로 읽지 않는다.
      if (parsedQuery && parsedQuery.status === 'error') {
        const timedOut = parsedQuery.error_details && parsedQuery.error_details.category === 'deadline_exceeded';
        return {
          success: false,
          status: 'error',
          error_code: timedOut ? 'NOTEBOOKLM_TIMEOUT' : 'NOTEBOOKLM_QUERY_FAILED',
          error: timedOut ? NOTEBOOK_TIMEOUT_MESSAGE : `NotebookLM 질의가 실패했습니다: ${String(parsedQuery.error || '이유 없음').slice(0, 200)}`
        };
      }

      if (parsedQuery && typeof parsedQuery === 'object') {
        answerText = parsedQuery.answer || parsedQuery.response || '';
        const citations = parsedQuery.citations;
        referencesList = Array.isArray(parsedQuery.references) ? parsedQuery.references : [];

        // 1. 0.14.0 provider 정본: references 배열 [{source_id, citation_number, cited_text}]
        if (referencesList.length > 0) {
          const firstRef = referencesList[0];
          extractedQuote = (firstRef.cited_text || firstRef.quote || firstRef.text || '').trim();
          citedSourceId = firstRef.source_id || null;
          // citations 객체 {"1": "uuid"} 매핑 확인
          if (!citedSourceId && citations && typeof citations === 'object' && !Array.isArray(citations)) {
            if (firstRef.citation_number && citations[String(firstRef.citation_number)]) {
              citedSourceId = citations[String(firstRef.citation_number)];
            }
          }
        } else if (Array.isArray(citations) && citations.length > 0) {
          // 레거시 배열형 citations 지원
          const firstCite = citations[0];
          citedSourceId = firstCite.source_id || null;
          extractedQuote = (firstCite.cited_text || firstCite.quote || firstCite.text || '').trim();
        } else if (citations && typeof citations === 'object' && !Array.isArray(citations) && Object.keys(citations).length > 0) {
          // citations가 {"1": "uuid"} 형태이고 references가 없는 경우
          const firstKey = Object.keys(citations)[0];
          citedSourceId = citations[firstKey];
          if (answerText) {
            const quoteMatch = answerText.match(/["'“]([^"'”]{5,})["'”]/);
            if (quoteMatch) {
              extractedQuote = quoteMatch[1].trim();
            }
          }
        } else if (parsedQuery.source_id) {
          citedSourceId = parsedQuery.source_id;
          if (answerText) {
            const quoteMatch = answerText.match(/["'“]([^"'”]{5,})["'”]/);
            if (quoteMatch) {
              extractedQuote = quoteMatch[1].trim();
            }
          }
        }
      } else {
        answerText = responseText;
        const srcMatch = responseText.match(/\[(?:출처|source_id|Source):\s*([^\]]+)\]/i);
        if (srcMatch) {
          citedSourceId = srcMatch[1].trim();
        }
        const quoteMatch = responseText.match(/["'“]([^"'”]{5,})["'”]/);
        if (quoteMatch) {
          extractedQuote = quoteMatch[1].trim();
        }
      }

      // 1. 출처 불명 검증: 실제 citations/출처 참조가 없으면 임의 기본값 부여 없이 근거 부족 처리
      if (!citedSourceId) {
        return {
          success: true,
          status: 'insufficient_evidence',
          standard_id: std.id,
          standard_name: std.name,
          notebook_id: notebook_id,
          source_id: null,
          quote: extractedQuote,
          answer: answerText,
          match: false,
          sufficient: false,
          notes: '질의 응답에 구체적인 출처 참조(source_id)가 명시되지 않은 출처 불명이므로 근거 부족(insufficient_evidence)으로 판정합니다.'
        };
      }

      // 2. 반환된 인용이 없거나 공백인 경우 -> 부족(insufficient_evidence)
      if (!extractedQuote) {
        return {
          success: true,
          status: 'insufficient_evidence',
          standard_id: std.id,
          standard_name: std.name,
          notebook_id: notebook_id,
          source_id: citedSourceId,
          quote: '',
          answer: answerText,
          match: false,
          sufficient: false,
          notes: '질의 응답에 기준 원문 인용(cited_text)이 포함되지 않아 근거 부족(insufficient_evidence)으로 판정합니다.'
        };
      }

      // 3. 허용 목록 검증: 인용된 소스가 allowedSourceIds에 속하지 않으면 거부
      if (!allowedSourceIds.includes(citedSourceId)) {
        return {
          success: true,
          status: 'insufficient_evidence',
          standard_id: std.id,
          standard_name: std.name,
          notebook_id: notebook_id,
          source_id: citedSourceId,
          quote: extractedQuote,
          answer: answerText,
          match: false,
          sufficient: false,
          notes: `허용되지 않은 외부 출처(${citedSourceId}) 인용으로 근거 부족(insufficient_evidence)으로 판정합니다.`
        };
      }

      // 4. source_get_content로 해당 출처 원문 텍스트 확인 (여러 출처의 경우 인용된 source_id 원문 조회)
      let originalContent = '';
      try {
        const srcResult = await client.callTool({
          name: 'source_get_content',
          arguments: {
            source_id: citedSourceId
          }
        }, undefined, { timeout: MCP_CALL_MS });
        const rawText = (srcResult.content || []).map(c => c.text).join('\n');
        let parsedSrc = null;
        try {
          parsedSrc = JSON.parse(rawText);
        } catch (e) {
          parsedSrc = null;
        }

        if (parsedSrc && typeof parsedSrc === 'object') {
          if (parsedSrc.status && parsedSrc.status !== 'success') {
            return {
              success: false,
              status: 'retry_required',
              error: `가상 공장 소스 원문 조회 실패 (상태: ${parsedSrc.status}): ${parsedSrc.error || '원문 없음'}`
            };
          }
          originalContent = parsedSrc.content || parsedSrc.text || '';
        } else {
          originalContent = rawText;
        }
      } catch (err) {
        return {
          success: false,
          status: 'retry_required',
          error: err && err.code === MCP_REQUEST_TIMEOUT_CODE ? NOTEBOOK_TIMEOUT_MESSAGE : `가상 공장 소스 원문 조회 실패: ${String(err.message || err)}`
        };
      }

      if (!originalContent || !originalContent.trim()) {
        return {
          success: true,
          status: 'insufficient_evidence',
          standard_id: std.id,
          standard_name: std.name,
          notebook_id: notebook_id,
          source_id: citedSourceId,
          quote: extractedQuote,
          answer: answerText,
          match: false,
          sufficient: false,
          notes: '출처 원문이 비어 있거나 불명확하여 근거 부족(insufficient_evidence)으로 판정합니다.'
        };
      }

      // 5. 공백 정규화 원문 대조:
      // source_get_content는 줄바꿈이 많고 references.cited_text는 공백으로 연결되므로 공백 정규화(\s+ -> ' ')만 허용해 대조
      const normalizeWs = (s) => (s || '').replace(/\s+/g, ' ').trim();
      const cleanOriginal = normalizeWs(originalContent);
      const cleanQuote = normalizeWs(extractedQuote);

      const isStrictlyInOriginal = cleanOriginal.includes(cleanQuote);

      if (!isStrictlyInOriginal) {
        return {
          success: true,
          status: 'insufficient_evidence',
          standard_id: std.id,
          standard_name: std.name,
          notebook_id: notebook_id,
          source_id: citedSourceId,
          quote: extractedQuote,
          answer: answerText,
          match: false,
          sufficient: false,
          notes: '인용문이 조회된 실제 소스 원문에 정확히 부합하지 않거나 임의 추가 문장이 포함되어 근거 부족으로 판정합니다.'
        };
      }

      return {
        success: true,
        status: 'sufficient_evidence',
        standard_id: std.id,
        standard_name: std.name,
        source_title: standardsData.facility,
        notebook_id: notebook_id,
        source_id: citedSourceId,
        quote: extractedQuote,
        answer: answerText,
        references: referencesList,
        match: true,
        sufficient: true,
        notes: '허용된 소스의 기준 원문 인용 일치 확인 완료'
      };
    } catch (err) {
      if (err && err.code === MCP_REQUEST_TIMEOUT_CODE) {
        return { success: false, status: 'error', error_code: 'NOTEBOOKLM_TIMEOUT', error: NOTEBOOK_TIMEOUT_MESSAGE };
      }
      return {
        success: false,
        status: 'error',
        error: String(err.message || err)
      };
    }
  }
}

module.exports = { NotebookLMClient, resolveMcpLaunch, buildMcpEnv, findExecutable, findMcpExecutable, withoutEmails, ANTIGRAVITY_SERVER_NAME, PATH_MCP_COMMAND };
