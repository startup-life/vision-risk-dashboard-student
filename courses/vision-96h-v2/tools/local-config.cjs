'use strict';
// Single list of local connection settings; run-local, tests and the example file follow it.
// Messages name keys and file paths only; setting values are never printed because they hold secrets.
const fs = require('node:fs');
const path = require('node:path');
const CONFIG_KEYS = ['GAS_WEBAPP_URL', 'ONEPORT_API_KEY', 'NOTEBOOKLM_NOTEBOOK_ID', 'NOTEBOOKLM_SOURCE_IDS', 'NOTEBOOKLM_MCP_COMMAND', 'VISION_TM_ROOT', 'REPOSITORY_IMAGES_ROOT', 'STORAGE_MODE', 'GEMINI_MODE', 'NOTEBOOKLM_MODE'];
// Keys only `npm run gas:init` reads. The OnePort key goes to the GAS script property; the local server never needs it,
// so it is not copied into the server's environment (and from there into child processes).
const GAS_INIT_ONLY_KEYS = ['ONEPORT_API_KEY'];
// Keys that were renamed. An old settings file gets a hint that names the new key instead of the generic unknown-key line.
const RENAMED_KEYS = { GEMINI_API_KEY: '더 이상 쓰지 않는다. 사진 판독은 OnePort를 거치므로 OnePort 키를 ONEPORT_API_KEY에 넣고 npm run gas:init을 다시 실행한다. GEMINI_API_KEY 줄은 지운다.' };
const DEFAULT_CONFIG_PATH = path.resolve(__dirname, '../../../config/local-connection.json');
const LEGACY_CONFIG_PATH = path.resolve(__dirname, '../scratch/local-connection.json');
const EXAMPLE_CONFIG_PATH = path.resolve(__dirname, '../../../config/local-connection.example.json');
// Example placeholders such as "/absolute/path/..." must not become real paths.
const KEY_SHAPE = /^[A-Z0-9_]{1,40}$/;
const PLACEHOLDER = /(^|[\\/])absolute[\\/]path([\\/]|$)/i;

class LocalConfigError extends Error {}

function lineColumn(text, position) {
  const before = text.slice(0, position).split('\n');
  return `${before.length}행 ${before[before.length - 1].length + 1}열`;
}

const SLASH_HINT = '경로에는 `/`를 쓰거나 역슬래시를 두 번(`\\\\`) 쓴다. 예: "C:/vision/images" 또는 "C:\\\\vision\\\\images"';
const PUNCTUATION_HINT = '쉼표와 따옴표를 확인한다. 항목 사이에는 쉼표가 있어야 하고 마지막 항목 뒤에는 쉼표가 없어야 한다. 따옴표는 곧은 따옴표(")만 쓴다.';

function readConfigFile(file) {
  let bytes;
  try { bytes = fs.readFileSync(file); }
  catch (e) { throw new LocalConfigError(`설정 파일을 읽지 못했다: ${file} (${e.code || e.message})`); }
  if ((bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff)) {
    throw new LocalConfigError(`설정 파일이 UTF-16으로 저장돼 있다: ${file}\n메모장의 "다른 이름으로 저장"에서 인코딩을 UTF-8로 골라 다시 저장한다.`);
  }
  const text = bytes.toString('utf8').replace(/^\uFEFF/, '');
  if (!text.trim()) throw new LocalConfigError(`설정 파일이 비어 있다: ${file}\nconfig/local-connection.example.json 내용을 복사해 넣는다.`);
  try { return JSON.parse(text); }
  catch (e) {
    // JSON.parse messages can quote the file text, so only the position is reported.
    const position = /position (\d+)/.exec(e.message);
    const smartQuote = text.search(/[\u2018\u2019\u201c\u201d]/);
    let hint = PUNCTUATION_HINT;
    if (/Bad (escaped character|Unicode escape)/.test(e.message)) hint = SLASH_HINT;
    else if (smartQuote >= 0) hint = `${lineColumn(text, smartQuote)}에 둥근 따옴표(“ ” ‘ ’)가 있다. 곧은 따옴표(")로 바꾼다.`;
    const where = position ? ` (${lineColumn(text, Number(position[1]))})` : '';
    throw new LocalConfigError(`설정 파일의 JSON 형식이 올바르지 않다: ${file}${where}\n${hint}`);
  }
}

function validateConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new LocalConfigError('설정 파일은 { } 로 감싼 JSON 객체여야 한다.');
  const values = {}, warnings = [];
  let malformedKeys = 0;
  for (const [key, value] of Object.entries(config)) {
    // A value pasted into the key position must not reach the console, so only key-shaped names are shown.
    if (!CONFIG_KEYS.includes(key) && !KEY_SHAPE.test(key)) malformedKeys++;
    else if (Object.hasOwn(RENAMED_KEYS, key)) warnings.push(`설정 키 ${key}는 ${RENAMED_KEYS[key]}`);
    else if (!CONFIG_KEYS.includes(key)) warnings.push(`알 수 없는 설정 키 ${key}는 무시한다.`);
    else if (typeof value !== 'string') warnings.push(`${key} 값은 문자열이어야 한다. 이 값은 무시한다.`);
    // A single backslash such as "C:\new" parses as a control character instead of failing.
    else if (/[\u0000-\u001f]/.test(value)) warnings.push(`${key} 값에 줄바꿈·탭 같은 제어 문자가 있다. 경로에는 \`/\`를 쓰거나 역슬래시를 두 번 쓴다. 이 값은 무시한다.`);
    else if (PLACEHOLDER.test(value)) warnings.push(`${key} 값이 예시 자리표시자 그대로다. 실제 경로로 바꾸거나 빈 문자열로 둔다. 이 값은 무시한다.`);
    else values[key] = value;
  }
  if (malformedKeys) warnings.push(`형식이 맞지 않는 키 ${malformedKeys}개는 무시한다. 키 이름은 대문자·숫자·밑줄로 쓴다.`);
  return { values, warnings };
}

// The example file is tracked by Git, so values typed into it could be committed.
// Reading it is only a hint: a missing or broken example file is deliberately ignored here.
function exampleHasValues(file) {
  try {
    const example = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
    return Boolean(example) && typeof example === 'object' && Object.values(example).some(value => value !== '' && value !== null);
  } catch (_) { return false; }
}

// Order: VISION_RISK_CONFIG, then config/local-connection.json, then the old scratch/ location.
function loadLocalConfig(options = {}) {
  const env = options.env || process.env;
  const defaultPath = options.defaultPath || DEFAULT_CONFIG_PATH;
  const legacyPath = options.legacyPath || LEGACY_CONFIG_PATH;
  const examplePath = options.examplePath || EXAMPLE_CONFIG_PATH;
  const notices = [], exampleWarnings = [];
  // Checked even when the real settings file exists: a copied file does not remove values left in the example.
  if (exampleHasValues(examplePath)) exampleWarnings.push(`예시 파일에 값이 들어 있다: ${examplePath}\n예시 파일은 Git이 추적하므로 값을 넣지 않는다. 예시 파일의 값은 빈 문자열로 되돌리고, 값은 ${defaultPath}에만 넣는다.`);
  let file = null;
  if (env.VISION_RISK_CONFIG) {
    file = path.resolve(env.VISION_RISK_CONFIG);
    if (!fs.existsSync(file)) throw new LocalConfigError(`VISION_RISK_CONFIG가 가리키는 설정 파일이 없다: ${file}\n경로를 고치거나 VISION_RISK_CONFIG를 지우고 ${defaultPath}에 설정 파일을 둔다.`);
  } else if (fs.existsSync(defaultPath)) {
    file = defaultPath;
    if (fs.existsSync(legacyPath)) notices.push(`예전 위치의 설정 파일은 읽지 않는다: ${legacyPath}`);
  } else if (fs.existsSync(legacyPath)) {
    file = legacyPath;
    notices.push(`예전 위치의 설정 파일을 읽었다: ${legacyPath}\n이 파일을 ${defaultPath}로 옮긴다.`);
  } else {
    notices.push(`설정 파일 없이 시작한다. 연결 설정이 필요하면 config/local-connection.example.json을 복사해 ${defaultPath}를 만든다.`);
    return { file, values: {}, notices, warnings: exampleWarnings };
  }
  const { values, warnings } = validateConfig(readConfigFile(file));
  return { file, values, notices, warnings: [...exampleWarnings, ...warnings] };
}

// Empty values mean "not set here", so an environment variable of the same name stays in effect.
function applyLocalConfig(values, env = process.env) {
  for (const [key, value] of Object.entries(values)) if (value !== '' && !GAS_INIT_ONLY_KEYS.includes(key)) env[key] = value;
  return env;
}

// Connection switches. STORAGE_MODE picks Google Sheets through GAS (live) or the local mock store (mock).
// GEMINI_MODE and NOTEBOOKLM_MODE default to the storage mode. Teachable Machine runs in the browser and has no switch.
const MODE_VALUES = { STORAGE_MODE: ['live', 'mock'], GEMINI_MODE: ['off', 'mock', 'live'], NOTEBOOKLM_MODE: ['off', 'mock', 'live'] };

function modeValue(env, key) {
  const raw = env[key] === undefined || env[key] === null ? '' : String(env[key]).trim().toLowerCase();
  if (raw === '') return '';
  // The value is not echoed: the loader never prints setting values.
  if (!MODE_VALUES[key].includes(raw)) throw new LocalConfigError(`${key} 값을 알아볼 수 없다. 허용 값은 ${MODE_VALUES[key].join(', ')}이다. 설정 파일이나 환경 변수의 ${key}를 고친다.`);
  return raw;
}

// Mock results must not mix into the real Google Sheets records, and Gemini is called inside GAS.
function checkModes(modes) {
  if (modes.storage === 'live' && modes.gemini === 'mock') throw new LocalConfigError('STORAGE_MODE=live에서는 GEMINI_MODE=mock을 쓸 수 없다. 모의 사진 설명이 실제 Google 시트 기록에 저장되기 때문이다. GEMINI_MODE를 live나 off로 바꾸거나 STORAGE_MODE=mock으로 시작한다.');
  if (modes.storage === 'live' && modes.notebooklm === 'mock') throw new LocalConfigError('STORAGE_MODE=live에서는 NOTEBOOKLM_MODE=mock을 쓸 수 없다. 모의 근거가 실제 Google 시트 기록에 저장되기 때문이다. NOTEBOOKLM_MODE를 live나 off로 바꾸거나 STORAGE_MODE=mock으로 시작한다.');
  if (modes.storage === 'mock' && modes.gemini === 'live') throw new LocalConfigError('STORAGE_MODE=mock에서는 GEMINI_MODE=live를 쓸 수 없다. Gemini는 GAS 안에서 호출하므로 Google 시트 저장소 없이는 실제로 부를 수 없다. GEMINI_MODE를 mock이나 off로 바꾸거나 STORAGE_MODE=live로 시작한다.');
  return modes;
}

// SYNTHETIC_MODE=true is kept as an alias for STORAGE_MODE=mock (both switches then default to mock).
function resolveModes(env = process.env) {
  const synthetic = String(env.SYNTHETIC_MODE || '').trim().toLowerCase() === 'true';
  let storage = modeValue(env, 'STORAGE_MODE');
  if (synthetic && storage === 'live') throw new LocalConfigError('SYNTHETIC_MODE=true는 STORAGE_MODE=mock과 같은 뜻이라 STORAGE_MODE=live와 함께 쓸 수 없다. SYNTHETIC_MODE를 지우거나 STORAGE_MODE=mock으로 맞춘다.');
  storage = storage || (synthetic ? 'mock' : 'live');
  return checkModes({ storage, gemini: modeValue(env, 'GEMINI_MODE') || storage, notebooklm: modeValue(env, 'NOTEBOOKLM_MODE') || storage });
}

// geminiModels: GAS가 알려 준 판독 모델({ model }). 받기 전이거나 live가 아니면 모델을 적지 않는다.
function describeModes(modes, geminiModels) {
  const label = mode => mode === 'off' ? '꺼짐' : mode;
  const models = modes.gemini === 'live' && geminiModels?.model ? `(${geminiModels.model})` : '';
  return `연동 상태: 저장소 ${modes.storage === 'mock' ? '로컬 저장' : 'Google 시트'} · Gemini ${label(modes.gemini)}${models} · NotebookLM ${label(modes.notebooklm)} · Teachable Machine 브라우저`;
}

module.exports = { applyLocalConfig, checkModes, CONFIG_KEYS, describeModes, GAS_INIT_ONLY_KEYS, MODE_VALUES, resolveModes, DEFAULT_CONFIG_PATH, EXAMPLE_CONFIG_PATH, LEGACY_CONFIG_PATH, LocalConfigError, loadLocalConfig, readConfigFile, validateConfig };
