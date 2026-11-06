'use strict';
// npm run gas:init — prepares the deployed GAS web app from the local side. Running it again is safe.
//   1) setup action: makes the Google Sheet and the private Drive folder, or keeps the ones already made
//   2) set_oneport_key action: copies ONEPORT_API_KEY from config/local-connection.json into the GAS script property
// The web app URL and the key are never printed; failure lines carry the error code and mask long IDs.
// The key is read from the config file only: an ONEPORT_API_KEY environment variable set for other tools is not sent.
const { loadLocalConfig, LocalConfigError } = require('./local-config.cjs');
const { requestGas } = require('./server.cjs');

// Same shape as ONEPORT_API_KEY_PATTERN in gas/Code.gs.
const ONEPORT_API_KEY_PATTERN = /^sk-[A-Za-z0-9_-]{20,200}$/;
// Before the first authorization the web app answers with a sign-in or authorization page instead of JSON.
const APPROVAL_CODES = new Set(['GAS_AUTH_REQUIRED', 'GAS_NON_JSON_RESPONSE']);

function needsApproval(result) {
  if (APPROVAL_CODES.has(result.error_code)) return true;
  return result.error_code === 'GAS_HTTP_ERROR' && /HTTP 3\d\d/.test(String(result.error || ''));
}

// npm scripts pin clasp; a bare `npx clasp` in the hint would fetch whatever version is latest.
function approvalHint(platform = process.platform) {
  const npm = platform === 'win32' ? 'npm.cmd' : 'npm';
  return `GAS 웹앱이 아직 권한 승인 전입니다. ${npm} run gas:open으로 웹앱 주소를 한 번 열어 허용하세요. 안 되면 ${npm} run gas:editor로 편집기를 열고 initialSetup을 한 번 실행하세요.`;
}

// Secrets are replaced first; then any long token (sheet, folder or deployment IDs, keys) is masked.
function redact(text, secrets = []) {
  let out = String(text || '');
  for (const secret of secrets) if (secret) out = out.split(secret).join('***');
  return out.replace(/[A-Za-z0-9_-]{25,}/g, '<ID>');
}

function failureLine(step, result, secrets, platform) {
  const code = result && result.error_code ? result.error_code : 'UNKNOWN';
  if (result && needsApproval(result)) return `${approvalHint(platform)} (${code})`;
  const error = String((result && result.error) || '');
  if (code === 'BAD_REQUEST' && /Unknown action/.test(error)) {
    return `GAS 웹앱이 ${step} 동작을 모릅니다(${code}). 웹앱 코드가 예전 것입니다. npm run gas:push와 npm run gas:redeploy로 최신 코드를 배포한 뒤 다시 실행하세요.`;
  }
  return `GAS ${step} 요청에 실패했습니다(${code}). ${redact(error, secrets)}`.trim();
}

async function init({ env = process.env, platform = process.platform, log = console.log, warn = console.warn, request = requestGas, load = loadLocalConfig } = {}) {
  const config = load({ env });
  for (const line of config.notices) log(line);
  for (const line of config.warnings) warn(`설정 경고: ${line}`);
  const url = config.values.GAS_WEBAPP_URL || String(env.GAS_WEBAPP_URL || '');
  const key = String(config.values.ONEPORT_API_KEY || '').trim();
  const secrets = [url, key];
  if (!url) {
    warn('GAS_WEBAPP_URL이 비어 있습니다. npm run gas:deploy로 배포하면 자동으로 적힙니다. 편집기에서 배포했다면 웹 앱 URL을 config/local-connection.json의 GAS_WEBAPP_URL에 넣으세요.');
    return 1;
  }
  if (key && !ONEPORT_API_KEY_PATTERN.test(key)) {
    warn('ONEPORT_API_KEY 값이 OnePort API 키 형식이 아닙니다(sk-로 시작하고 영문·숫자·-·_ 20자 이상이 이어짐). sk-로 시작하는 OnePort 키를 따옴표 안에 그대로 넣었는지 확인하세요. 아무것도 보내지 않았습니다.');
    return 1;
  }

  const setup = await request(url, { action: 'setup' });
  if (!setup || setup.success !== true) { warn(failureLine('setup', setup, secrets, platform)); return 1; }
  log('Google 시트와 비공개 Drive 폴더를 준비했습니다. 이미 있으면 그대로 씁니다.');

  if (!key) {
    log('ONEPORT_API_KEY가 비어 있어 키는 보내지 않았습니다. AI 판독을 쓰려면 config/local-connection.json의 ONEPORT_API_KEY에 OnePort 키를 넣고 npm run gas:init을 다시 실행하세요. 기록 저장은 키 없이도 됩니다.');
    return 0;
  }
  const saved = await request(url, { action: 'set_oneport_key', api_key: key });
  if (!saved || saved.success !== true) { warn(failureLine('set_oneport_key', saved, secrets, platform)); return 1; }
  log('OnePort API 키를 GAS 스크립트 속성 ONEPORT_API_KEY에 저장했습니다. 다음 할 일: npm start');
  return 0;
}

if (require.main === module) {
  init().then(code => { process.exitCode = code; }, e => {
    // Config errors name keys and paths only; any other message is masked because it may quote a URL or an ID.
    console.error(e instanceof LocalConfigError ? e.message : `GAS 초기화를 마치지 못했습니다. ${redact(e && e.message)}`);
    process.exitCode = 1;
  });
}

module.exports = { approvalHint, init, needsApproval, redact };
