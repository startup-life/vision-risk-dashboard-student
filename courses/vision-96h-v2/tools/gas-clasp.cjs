// Creates the courses/vision-96h-v2/gas project with clasp (create), deploys it (deploy), updates the same address (redeploy)
// and opens it in the browser (open). The web app address goes into config/local-connection.json as GAS_WEBAPP_URL (docs/LOCAL-SETUP.md).
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

const CLASP = ['--yes', '@google/clasp@3.4.1'];
// npm start and gas:init read the same file, VISION_RISK_CONFIG included.
const CONFIG = process.env.VISION_RISK_CONFIG || 'config/local-connection.json';
const NO_ID = 'clasp 출력에서 배포 ID를 찾지 못했습니다. 위 출력을 확인하고, 로그인이 만료됐으면 npm.cmd run gas:login(macOS: npm run gas:login)을 다시 실행하세요.';
const NO_URL = `${CONFIG}에 GAS_WEBAPP_URL이 없습니다. 먼저 npm.cmd run gas:deploy(macOS: npm run gas:deploy)를 실행하세요.`;
const fail = message => { console.error(message); process.exit(1); };

// npx on Windows runs only through a shell, so the command goes to the shell as one line. A value with spaces is wrapped in double quotes by the caller.
function clasp(args) {
  const result = spawnSync('npx ' + [...CLASP, ...args].join(' '), { encoding: 'utf8', shell: true, stdio: ['inherit', 'pipe', 'pipe'] });
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  return (result.stdout ?? '') + (result.stderr ?? '');
}

// clasp can fail and still exit 0, so an ID is used only when the output has exactly one deployment ID (AKfyc…).
function deploymentId(text) {
  const ids = new Set(text.match(/AKfyc[\w-]+/g));
  return ids.size === 1 ? [...ids][0] : null;
}

// A missing file starts from the example file's keys with empty values (its values are never copied). A BOM from Notepad is
// dropped, and broken JSON stops the command before clasp runs.
function readConfig(file) {
  if (!fs.existsSync(file)) return Object.fromEntries(Object.keys(JSON.parse(fs.readFileSync(file.replace(/\.json$/, '.example.json'), 'utf8'))).map(key => [key, '']));
  try { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, '')); }
  catch { fail(`${file}의 JSON 형식이 올바르지 않습니다. 쉼표와 따옴표를 고친 뒤 다시 실행하세요.`); }
}

// GAS_WEBAPP_URL when its value is an https:// address (the example file leaves it empty).
const readUrl = (file = CONFIG) => /^https:\/\/\S+$/.exec(String(readConfig(file).GAS_WEBAPP_URL ?? '').trim())?.[0] ?? null;

// Sets GAS_WEBAPP_URL, and STORAGE_MODE=live when STORAGE_MODE is empty, so npm start saves to this web app. Other keys stay as they are.
function writeUrl(url, file = CONFIG) {
  const config = readConfig(file);
  fs.writeFileSync(file, JSON.stringify({ ...config, GAS_WEBAPP_URL: url, STORAGE_MODE: config.STORAGE_MODE || 'live' }, null, 2) + '\n', { mode: 0o600 });
}

const commands = {
  // create-script pulls default files into its rootDir, over gas/ if given that. It runs in an empty folder and only rootDir is changed after.
  create() {
    fs.rmSync('runtime/gas-create', { recursive: true, force: true });
    fs.mkdirSync('runtime/gas-create', { recursive: true });
    const output = clasp(['create-script', '--type', 'standalone', '--title', '"비전 리스크 대시보드"', '--rootDir', 'runtime/gas-create']);
    if (!output.includes('Created new script')) fail('clasp가 프로젝트를 만들지 못했습니다. 위 출력을 확인하고, 로그인이 만료됐으면 npm.cmd run gas:login(macOS: npm run gas:login)을 다시 실행하세요.');
    const settings = JSON.parse(fs.readFileSync('.clasp.json', 'utf8'));
    fs.writeFileSync('.clasp.json', JSON.stringify({ ...settings, rootDir: 'courses/vision-96h-v2/gas' }, null, 2) + '\n');
    console.log('.clasp.json이 courses/vision-96h-v2/gas 폴더를 가리키게 했습니다.\n다음: npm.cmd run gas:push(macOS: npm run gas:push)');
  },
  // A second deployment gets a new address. With an address already in the config file, redeploy updates the same deployment.
  deploy() {
    if (readUrl()) fail('이미 배포 주소가 있습니다. npm.cmd run gas:redeploy(macOS: npm run gas:redeploy)로 갱신하세요.');
    const id = deploymentId(clasp(['create-deployment', '--description', 'vision-risk'])) || fail(NO_ID);
    writeUrl(`https://script.google.com/macros/s/${id}/exec`);
    console.log(`${CONFIG}에 GAS_WEBAPP_URL을 적었습니다.\n다음: npm.cmd run gas:open(macOS: npm run gas:open)`);
  },
  redeploy() {
    const id = deploymentId(readUrl() || '') || fail(NO_URL);
    if (!clasp(['update-deployment', id, '--description', 'vision-risk']).includes(`Redeployed ${id} @`)) fail(NO_ID);
    console.log('같은 배포를 새 버전으로 갱신했습니다. 주소는 그대로입니다.');
  },
  open() {
    const url = readUrl() || fail(NO_URL);
    console.log(`브라우저로 엽니다. 권한 승인 화면이 나오면 허용하세요.\n${url}`);
    spawnSync(`${{ win32: 'start ""', darwin: 'open' }[process.platform] || 'xdg-open'} "${url}"`, { shell: true });
  }
};

if (require.main === module) {
  const command = commands[process.argv[2]] || fail('사용법: node courses/vision-96h-v2/tools/gas-clasp.cjs create|deploy|redeploy|open');
  command();
}

module.exports = { CLASP, deploymentId, readUrl, writeUrl };
