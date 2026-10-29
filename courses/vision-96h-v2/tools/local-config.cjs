'use strict';
// Single list of local connection settings; run-local, tests and the example file follow it.
// Messages name keys and file paths only; setting values are never printed because they hold secrets.
const fs = require('node:fs');
const path = require('node:path');
const CONFIG_KEYS = [];
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
    return { file, values: {}, notices, warnings: exampleWarnings };
  }
  const { values, warnings } = validateConfig(readConfigFile(file));
  return { file, values, notices, warnings: [...exampleWarnings, ...warnings] };
}

// Empty values mean "not set here", so an environment variable of the same name stays in effect.
function applyLocalConfig(values, env = process.env) {
  for (const [key, value] of Object.entries(values)) if (value !== '') env[key] = value;
  return env;
}

module.exports = { applyLocalConfig, CONFIG_KEYS, DEFAULT_CONFIG_PATH, EXAMPLE_CONFIG_PATH, LEGACY_CONFIG_PATH, LocalConfigError, loadLocalConfig, readConfigFile, validateConfig };
