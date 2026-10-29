/**
 * 비전 리스크 대시보드 - Google Apps Script (GAS) Web App
 *
 * 정본 저장소: Google Drive (비공개 이미지 보존) & Google Sheets (6개 탭 정본)
 * 모델 판독: Gemini API (GAS ScriptProperties 실행, 모델은 GEMINI_MODEL 또는 DEFAULT_GEMINI_MODEL)
 * 보안: Formula Injection 방지, 비공개 권한 고정
 * 동시성/멱등성: LockService(try-catch), request_id 기반 결정적 record_id 및 부분 저장 재개
 */

// 판독에 쓸 수 있는 모델. 2.5 모델은 새로 만든 키에서 막힐 수 있어 쓰지 않는다(Gemini API 변경 기록 2026-09-18).
const GEMINI_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash-lite'];
// Script Property GEMINI_MODEL이 없을 때 쓰는 모델. tools/server.cjs의 모의 응답도 같은 값을 쓴다.
const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';
// 기본 모델이 붐비거나(503) 한도에 걸리면(429) 한 번만 다시 보내는 모델. GEMINI_FALLBACK_MODEL에 off를 넣으면 다시 보내지 않는다.
const DEFAULT_GEMINI_FALLBACK_MODEL = 'gemini-3.5-flash-lite';

/**
 * Script Property GEMINI_MODEL·GEMINI_FALLBACK_MODEL을 읽는다. 허용 목록에 없는 값이면 null을 돌려준다.
 * fallback_model은 off이거나 판독 모델과 같으면 ''이다.
 */
function getGeminiModels(props) {
  const model = String(props.getProperty('GEMINI_MODEL') || '').trim() || DEFAULT_GEMINI_MODEL;
  const fallback = String(props.getProperty('GEMINI_FALLBACK_MODEL') || '').trim() || DEFAULT_GEMINI_FALLBACK_MODEL;
  if (!GEMINI_MODELS.includes(model) || (fallback !== 'off' && !GEMINI_MODELS.includes(fallback))) return null;
  return { model: model, fallback_model: fallback === 'off' || fallback === model ? '' : fallback };
}

const GEMINI_MODEL_SETTING_ERROR = 'GAS 스크립트 속성의 GEMINI_MODEL·GEMINI_FALLBACK_MODEL은 ' + GEMINI_MODELS.join(', ') + ' 중 하나여야 합니다(대체 모델은 off도 됩니다). 값을 고치거나 지우면 기본 모델을 씁니다.';

// 로컬 서버가 기동할 때 판독 모델을 한 줄로 보여 주려고 묻는다.
function handleGeminiSettings() {
  const models = getGeminiModels(PropertiesService.getScriptProperties());
  if (!models) return { success: false, status: 'setup_required', error_code: 'SETUP_REQUIRED', error: GEMINI_MODEL_SETTING_ERROR };
  return { success: true, model: models.model, fallback_model: models.fallback_model };
}

// 429·503 밖의 Gemini 오류 안내. {model}에는 실제로 부른 모델(대체 모델일 수 있다)이 들어간다. 화면이 그대로 보여 주도록 LOCAL-SETUP.md를 가리킨다.
const GEMINI_HTTP_MESSAGES = {
  400: 'Gemini API 키가 올바르지 않거나 요청을 받아 주지 않았습니다(HTTP 400, {model}). config/local-connection.json의 GEMINI_API_KEY를 확인하고 npm.cmd run gas:init(macOS: npm run gas:init)을 다시 실행하세요(docs/LOCAL-SETUP.md 3절).',
  403: 'Gemini API 키에 이 요청을 할 권한이 없습니다(HTTP 403, {model}). AI Studio에서 새 키를 만들어 npm.cmd run gas:init(macOS: npm run gas:init)으로 다시 넣으세요(docs/LOCAL-SETUP.md 3절).',
  404: 'Gemini 판독 모델을 찾지 못했습니다(HTTP 404, {model}). 스크립트 속성 GEMINI_MODEL·GEMINI_FALLBACK_MODEL을 지우거나 ' + GEMINI_MODELS.join(', ') + ' 중 하나로 두세요(docs/LOCAL-SETUP.md 2절).'
};

const SHEET_TABS = {
  RECORDS: 'records',
  AI_DRAFTS: 'ai_drafts',
  EVIDENCE_CHECKS: 'evidence_checks',
  FINAL_REVIEWS: 'final_reviews',
  ACTIONS: 'actions',
  HISTORY: 'history'
};

const TAB_HEADERS = {
  records: ['record_id', 'request_id', 'created_at', 'location', 'category', 'memo', 'image_count', 'status', 'drive_folder_id', 'drive_file_ids', 'version', 'updated_at'],
  ai_drafts: ['draft_id', 'record_id', 'request_id', 'created_at', 'model', 'facts', 'suspected_risk', 'locations', 'uncertainty', 'additional_checks', 'raw_response', 'input_version'],
  evidence_checks: ['check_id', 'record_id', 'request_id', 'created_at', 'standard_id', 'notebook_id', 'source_id', 'quote', 'match', 'sufficient', 'notes', 'answer', 'source_name', 'references', 'input_version'],
  final_reviews: ['review_id', 'record_id', 'request_id', 'created_at', 'decision', 'basis', 'followup_note', 'reviewer'],
  actions: ['action_id', 'record_id', 'request_id', 'created_at', 'action_type', 'description', 'evidence_note', 'actor', 'status'],
  history: ['history_id', 'record_id', 'timestamp', 'phase', 'action_name', 'summary', 'operator']
};

// 홑따옴표를 붙여 글자 그대로 저장할 값. =+-@는 수식이 되고, 숫자로 시작하면 시트가 날짜·숫자로 바꾼다.
const QUOTED_TEXT = /^[=+\-@\t\r0-9]/;

/**
 * 수식 인젝션과 날짜·숫자 자동 변환 방지: QUOTED_TEXT로 시작하는 문자열은 홑따옴표 접두
 */
function sanitizeSheetValue(val) {
  if (typeof val === 'string' && QUOTED_TEXT.test(val)) {
    return "'" + val;
  }
  return val;
}

// 읽은 셀에 홑따옴표 접두가 남아 있으면 뗀다.
function readCell(val) {
  return typeof val === 'string' && val.startsWith("'") && QUOTED_TEXT.test(val.slice(1)) ? val.slice(1) : val;
}

/**
 * 짧은 단위 스크립트 락 헬퍼 (트랜잭션 쓰기 전용)
 */
function withShortLock(fn, timeoutMs = 10000) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(timeoutMs);
  } catch (lockErr) {
    throw new Error('LOCK_TIMEOUT: concurrent transaction in progress');
  }
  try {
    return fn();
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {}
  }
}

/**
 * 초기 설정 함수. npm run gas:init이 웹앱 setup 동작으로 부르고, GAS 에디터에서 직접 실행해도 된다.
 * 이미 만든 시트와 폴더가 있으면 그대로 쓴다.
 */
function initialSetup() {
  const props = PropertiesService.getScriptProperties();
  let spreadsheetId = props.getProperty('SPREADSHEET_ID');
  let ss = null;

  if (spreadsheetId) {
    try {
      ss = SpreadsheetApp.openById(spreadsheetId);
    } catch (e) {
      ss = null;
    }
  }

  if (!ss) {
    ss = SpreadsheetApp.create('Vision_Risk_Records_Master_' + Utilities.formatDate(new Date(), 'GMT+9', 'yyyyMMdd'));
    spreadsheetId = ss.getId();
    props.setProperty('SPREADSHEET_ID', spreadsheetId);
  }

  for (const [key, tabName] of Object.entries(SHEET_TABS)) {
    let sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
    }
    const headers = TAB_HEADERS[tabName];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    } else {
      // 컬럼 append 마이그레이션: 기존 열 위치 보존하면서 부족한 컬럼 추가
      const existingHeaders = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0] || [];
      if (existingHeaders.length < headers.length) {
        for (let c = existingHeaders.length; c < headers.length; c++) {
          sheet.getRange(1, c + 1).setValue(headers[c]).setFontWeight('bold');
        }
      }
    }
  }

  let folderId = props.getProperty('DRIVE_FOLDER_ID');
  if (!folderId) {
    const folder = DriveApp.createFolder('Vision_Risk_Records_Private_' + spreadsheetId.slice(0, 8));
    folder.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
    folderId = folder.getId();
    props.setProperty('DRIVE_FOLDER_ID', folderId);
  }

  // 스프레드시트 비공개 접근 고정
  try {
    const ssFile = DriveApp.getFileById(spreadsheetId);
    if (ssFile) {
      ssFile.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
    }
  } catch (e) {
    // 권한 설정 예외 안전 처리
  }

  return {
    success: true,
    spreadsheet_id: spreadsheetId,
    drive_folder_id: folderId,
    tabs: Object.values(SHEET_TABS)
  };
}

// 한 번의 실행 안에서는 같은 스프레드시트를 다시 열지 않는다.
let openedSpreadsheet = null;

/**
 * 스프레드시트 인스턴스 획득 (Standalone 호환)
 */
function getSpreadsheet() {
  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty('SPREADSHEET_ID');
  if (!spreadsheetId) {
    throw new Error('SETUP_REQUIRED: SPREADSHEET_ID is not configured in Script Properties');
  }
  if (!openedSpreadsheet || openedSpreadsheet.getId() !== spreadsheetId) {
    openedSpreadsheet = SpreadsheetApp.openById(spreadsheetId);
  }
  return openedSpreadsheet;
}

function getSheet(tabName) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    initialSetup();
    sheet = ss.getSheetByName(tabName);
  }
  return sheet;
}

/**
 * Web App doPost 진입점 (전역 락 제거, 작업별 짧은 락 적용)
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({
        success: false,
        status: 'error',
        error_code: 'BAD_REQUEST',
        error: 'Empty post body'
      });
    }

    let payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return jsonResponse({
        success: false,
        status: 'error',
        error_code: 'BAD_REQUEST',
        error: 'Invalid JSON payload'
      });
    }

    const action = payload.action;

    switch (action) {
      case 'setup':
        // 동시에 두 번 불려도 스프레드시트와 폴더가 하나만 생기게 락 안에서 만든다.
        return jsonResponse(withShortLock(() => initialSetup()));
      case 'set_gemini_key':
        return jsonResponse(withShortLock(() => handleSetGeminiKey(payload)));
      case 'gemini_settings':
        return jsonResponse(handleGeminiSettings());
      case 'create_record':
        return jsonResponse(withShortLock(() => handleCreateRecord(payload)));
      case 'update_record':
        return jsonResponse(withShortLock(() => handleUpdateRecord(payload)));
      case 'get_records':
        return jsonResponse(handleGetRecords(payload));
      case 'get_record':
        return jsonResponse(handleGetRecord(payload));
      case 'analyze_gemini':
        return jsonResponse(handleAnalyzeGemini(payload));
      case 'save_evidence_check':
        return jsonResponse(withShortLock(() => handleSaveEvidenceCheck(payload)));
      case 'save_review':
        return jsonResponse(withShortLock(() => handleSaveReview(payload)));
      case 'save_action':
        return jsonResponse(withShortLock(() => handleSaveAction(payload)));
      case 'get_image':
        return jsonResponse(handleGetImage(payload));
      case 'reconcile_job':
        return jsonResponse(handleReconcileJob(payload));
      default:
        return jsonResponse({
          success: false,
          status: 'error',
          error_code: 'BAD_REQUEST',
          error: 'Unknown action: ' + action
        });
    }
  } catch (err) {
    const errMsg = String(err.message || err);
    const isLockTimeout = errMsg.includes('LOCK_TIMEOUT');
    const isSetup = errMsg.includes('SETUP_REQUIRED');
    return jsonResponse({
      success: false,
      status: isLockTimeout ? 'error' : (isSetup ? 'setup_required' : 'error'),
      error_code: isLockTimeout ? 'LOCK_TIMEOUT' : (isSetup ? 'SETUP_REQUIRED' : 'INTERNAL_ERROR'),
      error: errMsg
    });
  }
}

// 기록은 읽지 않는다. 첫 권한 승인 뒤 브라우저로 주소를 열면(npm run gas:open) message가 보인다.
function doGet(e) {
  return jsonResponse({
    status: 'ok',
    service: 'Vision Risk Dashboard GAS Backend',
    message: '권한 승인이 끝났습니다. 이 창을 닫고 터미널로 돌아가세요.',
    timestamp: new Date().toISOString()
  });
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ======================== 핸들러 구현 ======================== //

// Gemini API 키 형식. 영문·숫자·'-'·'_'만 쓴다.
const GEMINI_API_KEY_PATTERN = /^[A-Za-z0-9_-]{20,200}$/;

/**
 * 로컬 설정 파일의 Gemini API 키를 스크립트 속성 GEMINI_API_KEY에 저장한다(npm run gas:init).
 * 편집기 프로젝트 설정에서 직접 넣어도 된다. 키 값은 응답과 오류 문구에 넣지 않고, 저장된 키를 돌려주는 동작도 없다.
 */
function handleSetGeminiKey(p) {
  const key = typeof p.api_key === 'string' ? p.api_key.trim() : '';
  if (!GEMINI_API_KEY_PATTERN.test(key)) {
    return {
      success: false,
      status: 'error',
      error_code: 'BAD_REQUEST',
      error: 'api_key is not a Gemini API key (20-200 letters, digits, "-" or "_")'
    };
  }
  PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', key);
  return { success: true, gemini_key_saved: true };
}

/**
 * 사건 신규 등록 (Drive 업로드 및 Sheets 등록, 부분 실패 재개 및 멱등성 보장)
 */
function handleCreateRecord(p) {
  const reqId = p.request_id || Utilities.getUuid();
  const recordsSheet = getSheet(SHEET_TABS.RECORDS);

  // 1. 멱등성 검사: 동일 request_id가 이미 등록 완료되었는지 확인
  const data = recordsSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (readCell(data[i][1]) === reqId) {
      const existing = rowToRecord(data[i]);
      return {
        success: true,
        idempotent: true,
        record_id: existing.record_id,
        request_id: existing.request_id,
        status: existing.status,
        created_at: existing.created_at,
        image_count: existing.image_count,
        drive_file_ids: existing.drive_file_ids,
        record: existing
      };
    }
  }

  // 2. 결정적 record_id 생성 (request_id 기반 해시)
  const reqHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, reqId);
  const hashHex = reqHash.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('').slice(0, 10);
  const recordId = 'R-' + hashHex;

  const props = PropertiesService.getScriptProperties();
  const folderId = props.getProperty('DRIVE_FOLDER_ID');
  if (!folderId) {
    throw new Error('SETUP_REQUIRED: DRIVE_FOLDER_ID is not configured');
  }
  const folder = DriveApp.getFolderById(folderId);

  const now = new Date().toISOString();
  const images = p.images || [];

  if (images.length < 1 || images.length > 5) {
    return {
      success: false,
      status: 'error',
      error_code: 'BAD_REQUEST',
      error: '사진은 1장 이상 5장 이하로 올려 주세요.'
    };
  }

  for (let idx = 0; idx < images.length; idx++) {
    const img = images[idx];
    if (!img.base64) {
      return {
        success: false,
        status: 'error',
        error_code: 'BAD_REQUEST',
        error: `${idx + 1}번째 사진 파일이 비어 있습니다. 사진을 다시 골라 주세요.`
      };
    }
    const mime = (img.mimeType || '').toLowerCase();
    if (mime !== 'image/png' && mime !== 'image/jpeg' && mime !== 'image/jpg') {
      return {
        success: false,
        status: 'error',
        error_code: 'BAD_REQUEST',
        error: `${idx + 1}번째 파일은 사진 파일이 아닙니다. JPG나 PNG 사진을 올려 주세요.`
      };
    }
    if (img.base64.length > 2.8 * 1024 * 1024) {
      return {
        success: false,
        status: 'error',
        error_code: 'BAD_REQUEST',
        error: `${idx + 1}번째 사진이 2MB보다 큽니다. 2MB 이하 사진을 올려 주세요.`
      };
    }
  }

  const fileIds = [];

  // 3. 이미지 비공개 저장 (부분 저장 재개 지원)
  for (let idx = 0; idx < images.length; idx++) {
    const img = images[idx];
    const expectedFilename = `${recordId}_${idx + 1}_${img.filename || 'photo'}`;

    // 이미 존재하는 파일인지 검색 (이전 시도에서 파일 생성 후 Sheets 등록 전 중단된 경우 재사용)
    const existingFiles = folder.getFilesByName(expectedFilename);
    if (existingFiles.hasNext()) {
      const existingFile = existingFiles.next();
      fileIds.push(existingFile.getId());
    } else {
      const decoded = Utilities.base64Decode(img.base64);
      const blob = Utilities.newBlob(decoded, img.mimeType || 'image/png', expectedFilename);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
      fileIds.push(file.getId());
    }
  }

  const recordObj = {
    record_id: recordId,
    request_id: reqId,
    created_at: now,
    location: p.location || '창고 A',
    category: p.category || 'safety',
    memo: p.memo || '',
    image_count: images.length,
    status: 'REGISTERED',
    drive_folder_id: folderId,
    drive_file_ids: fileIds,
    version: 1,
    updated_at: now
  };

  const newRow = [
    sanitizeSheetValue(recordObj.record_id),
    sanitizeSheetValue(recordObj.request_id),
    sanitizeSheetValue(recordObj.created_at),
    sanitizeSheetValue(recordObj.location),
    sanitizeSheetValue(recordObj.category),
    sanitizeSheetValue(recordObj.memo),
    recordObj.image_count,
    sanitizeSheetValue(recordObj.status),
    sanitizeSheetValue(recordObj.drive_folder_id),
    JSON.stringify(recordObj.drive_file_ids),
    1,
    sanitizeSheetValue(recordObj.created_at)
  ];

  recordsSheet.appendRow(newRow);
  appendHistory(recordId, now, 'REGISTER', '사건 등록', `사진 ${images.length}장 보존 완료 (${recordObj.location})`, '시스템');

  return {
    success: true,
    idempotent: false,
    record_id: recordId,
    request_id: reqId,
    status: 'REGISTERED',
    created_at: now,
    image_count: images.length,
    drive_file_ids: fileIds,
    record: recordObj
  };
}

/**
 * 사건 정보 수정 (화이트리스트, 멱등성, 버전 관리, 이력 보존)
 */
function handleUpdateRecord(p) {
  if (!p || !p.record_id) {
    return {
      success: false,
      status: 'error',
      error_code: 'BAD_REQUEST',
      error: '사건 번호가 없습니다. 목록에서 사건을 다시 골라 주세요.'
    };
  }

  const recordId = p.record_id;
  const reqId = p.request_id || '';
  const recordsSheet = getSheet(SHEET_TABS.RECORDS);
  const data = recordsSheet.getDataRange().getValues();

  let foundRowIdx = -1;
  let currentRec = null;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === recordId) {
      foundRowIdx = i + 1; // 1-based sheet row
      currentRec = rowToRecord(data[i]);
      break;
    }
  }

  if (foundRowIdx === -1 || !currentRec) {
    return {
      success: false,
      status: 'error',
      error_code: 'NOT_FOUND',
      error: '기록을 찾지 못했습니다(' + recordId + '). 목록에서 다시 골라 주세요.'
    };
  }

  // 멱등성 검사: 동일한 request_id로 이미 update_record가 수행되었는지 history 검사
  if (reqId) {
    const historyList = getRowsByRecordId(SHEET_TABS.HISTORY, recordId);
    const existing = historyList.find(h => h.phase === 'RECORD_UPDATE' && h.summary && h.summary.includes(`req=${reqId}`));
    if (existing) {
      return {
        success: true,
        idempotent: true,
        status: 'updated',
        record_id: recordId,
        version: currentRec.version,
        updated_at: currentRec.updated_at,
        record: currentRec
      };
    }
  }

  // 필드 화이트리스트 검증: location, category, memo만 허용
  // (file_ids, ai_draft, final_review, status 등 임의 위조 필드는 절대 반영하지 않음)
  if (p.category !== undefined && p.category !== 'safety' && p.category !== 'quality') {
    return {
      success: false,
      status: 'error',
      error_code: 'BAD_REQUEST',
      error: '분류는 산업안전 또는 택배 발송 확인 중에서 골라 주세요.'
    };
  }

  const oldLoc = currentRec.location;
  const oldCat = currentRec.category;
  const oldMemo = currentRec.memo;
  const oldVersion = currentRec.version || 1;

  const newLoc = p.location !== undefined ? String(p.location) : oldLoc;
  const newCat = p.category !== undefined ? String(p.category) : oldCat;
  const newMemo = p.memo !== undefined ? String(p.memo) : oldMemo;
  const newVersion = oldVersion + 1;
  const now = new Date().toISOString();

  // 시트 업데이트 (컬럼 4: location, 5: category, 6: memo, 11: version, 12: updated_at)
  recordsSheet.getRange(foundRowIdx, 4).setValue(sanitizeSheetValue(newLoc));
  recordsSheet.getRange(foundRowIdx, 5).setValue(sanitizeSheetValue(newCat));
  recordsSheet.getRange(foundRowIdx, 6).setValue(sanitizeSheetValue(newMemo));
  recordsSheet.getRange(foundRowIdx, 11).setValue(newVersion);
  recordsSheet.getRange(foundRowIdx, 12).setValue(sanitizeSheetValue(now));

  // 이력 시트에 RECORD_UPDATE 기록
  const summaryParts = [];
  if (oldLoc !== newLoc) summaryParts.push(`장소: ${oldLoc}->${newLoc}`);
  if (oldCat !== newCat) summaryParts.push(`분류: ${oldCat}->${newCat}`);
  if (oldMemo !== newMemo) summaryParts.push(`메모: ${oldMemo}->${newMemo}`);
  const summaryText = `수정(v${oldVersion}->v${newVersion}) [${summaryParts.join(', ') || '정보 갱신'}]${reqId ? ` (req=${reqId})` : ''}`;

  appendHistory(recordId, now, 'RECORD_UPDATE', '사건 정보 수정', summaryText, p.operator || '현장 작업자');

  const updatedRec = {
    ...currentRec,
    location: newLoc,
    category: newCat,
    memo: newMemo,
    version: newVersion,
    updated_at: now
  };

  return {
    success: true,
    idempotent: false,
    status: 'updated',
    record_id: recordId,
    version: newVersion,
    updated_at: now,
    record: updatedRec
  };
}

/**
 * 사건 목록 조회
 */
function handleGetRecords(p) {
  const recordsSheet = getSheet(SHEET_TABS.RECORDS);
  const data = recordsSheet.getDataRange().getValues();
  const records = [];

  for (let i = 1; i < data.length; i++) {
    records.push(rowToRecord(data[i]));
  }

  // 4개 연관 탭을 각 1회씩 읽어 record_id 맵 구성 (N+1 방지)
  function readAllRowsAsMap(tabName) {
    const map = {};
    const sheet = getSheet(tabName);
    const sData = sheet.getDataRange().getValues();
    const headers = TAB_HEADERS[tabName];
    for (let i = 1; i < sData.length; i++) {
      const recId = readCell(sData[i][1]);
      if (!recId) continue;
      if (!map[recId]) map[recId] = [];
      const obj = {};
      for (let c = 0; c < headers.length; c++) {
        if (headers[c] === 'raw_response') continue; // 예전 행에 남은 Gemini 응답 전체는 내려보내지 않는다.
        let val = readCell(sData[i][c]);
        if (headers[c] === 'created_at' || headers[c] === 'updated_at' || headers[c] === 'timestamp') {
          val = normalizeSheetDate(val);
        }
        obj[headers[c]] = val;
      }
      map[recId].push(obj);
    }
    return map;
  }

  const aiMap = readAllRowsAsMap(SHEET_TABS.AI_DRAFTS);
  const evidenceMap = readAllRowsAsMap(SHEET_TABS.EVIDENCE_CHECKS);
  const reviewMap = readAllRowsAsMap(SHEET_TABS.FINAL_REVIEWS);
  const actionMap = readAllRowsAsMap(SHEET_TABS.ACTIONS);

  for (let i = 0; i < records.length; i++) {
    const rId = records[i].record_id;
    records[i].review_summary = buildReviewSummary(
      records[i],
      aiMap[rId] || [],
      evidenceMap[rId] || [],
      reviewMap[rId] || [],
      actionMap[rId] || []
    );
  }

  const queueCounts = computeQueueCounts(records);

  return {
    success: true,
    queue_counts: queueCounts,
    records: records.reverse()
  };
}

/**
 * 특정 사건 상세 조회
 */
function handleGetRecord(p) {
  const recordId = p.record_id;
  const lookup = findRecord(recordId);
  if (!lookup.success) return lookup;
  const found = lookup.record;

  const drafts = getRowsByRecordId(SHEET_TABS.AI_DRAFTS, recordId);
  const evidenceChecks = getRowsByRecordId(SHEET_TABS.EVIDENCE_CHECKS, recordId);
  const reviews = getRowsByRecordId(SHEET_TABS.FINAL_REVIEWS, recordId);
  const actions = getRowsByRecordId(SHEET_TABS.ACTIONS, recordId);
  const history = getRowsByRecordId(SHEET_TABS.HISTORY, recordId);

  const reviewSummary = buildReviewSummary(found, drafts, evidenceChecks, reviews, actions);
  found.review_summary = reviewSummary;

  const latestEvidence = evidenceChecks.length > 0 ? Object.assign({}, evidenceChecks[evidenceChecks.length - 1]) : null;
  if (latestEvidence) {
    latestEvidence.match = normalizeBool(latestEvidence.match);
    latestEvidence.sufficient = normalizeBool(latestEvidence.sufficient);
  }

  return {
    success: true,
    record: found,
    review_summary: reviewSummary,
    ai_draft: drafts.length > 0 ? drafts[drafts.length - 1] : null,
    evidence_check: latestEvidence,
    final_review: reviews.length > 0 ? reviews[reviews.length - 1] : null,
    actions: actions,
    history: history
  };
}

/**
 * 사건 하나를 records 탭만 읽어 찾는다. 저장·판독·사진 조회의 사건 확인에 쓴다. 없으면 NOT_FOUND 결과를 돌려준다.
 */
function findRecord(recordId) {
  const data = getSheet(SHEET_TABS.RECORDS).getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === recordId) return { success: true, record: rowToRecord(data[i]) };
  }
  return {
    success: false,
    status: 'error',
    error_code: 'NOT_FOUND',
    error: '기록을 찾지 못했습니다(' + recordId + '). 목록에서 다시 골라 주세요.'
  };
}

/**
 * Gemini 429 응답 본문에서 할당량 종류와 재시도 지연을 꺼낸다.
 * 본문 형식: { error: { message, status, details: [QuotaFailure{violations[]}, RetryInfo{retryDelay:'39s'}] } }
 */
function parseGeminiRateLimit(text, headers) {
  const info = { message: '', quota_violations: [], retry_after_seconds: null };
  try {
    const body = JSON.parse(text);
    const err = body && body.error ? body.error : {};
    info.message = String(err.message || '').slice(0, 300);
    const details = Array.isArray(err.details) ? err.details : [];
    details.forEach(d => {
      const type = String(d['@type'] || '');
      if (type.indexOf('QuotaFailure') !== -1 && Array.isArray(d.violations)) {
        d.violations.forEach(v => {
          info.quota_violations.push({
            quota_metric: v.quotaMetric || '',
            quota_id: v.quotaId || '',
            quota_value: v.quotaValue !== undefined ? String(v.quotaValue) : ''
          });
        });
      }
      if (type.indexOf('RetryInfo') !== -1 && d.retryDelay) {
        const seconds = parseFloat(String(d.retryDelay));
        if (isFinite(seconds)) info.retry_after_seconds = Math.ceil(seconds);
      }
    });
  } catch (e) {
    info.message = String(text || '').slice(0, 300);
  }
  if (info.retry_after_seconds === null && headers) {
    const retryAfter = headers['Retry-After'] || headers['retry-after'];
    const seconds = parseFloat(String(retryAfter || ''));
    if (isFinite(seconds)) info.retry_after_seconds = Math.ceil(seconds);
  }
  return info;
}

/**
 * Gemini API 모델 판독 (GAS 실행)
 */
function handleAnalyzeGemini(p) {
  const recordId = p.record_id;
  const recordResult = findRecord(recordId);
  if (!recordResult.success) {
    return recordResult;
  }
  const record = recordResult.record;

  // 1. 멱등성 검사: request_id가 이미 등록되어 있다면 기존 초안 반환
  if (p.request_id) {
    const existingDrafts = getRowsByRecordId(SHEET_TABS.AI_DRAFTS, recordId);
    const existing = existingDrafts.find(d => d.request_id === p.request_id);
    if (existing) {
      return {
        success: true,
        idempotent: true,
        draft_id: existing.draft_id,
        record_id: recordId,
        model: existing.model,
        input_version: existing.input_version ? Number(existing.input_version) : 1,
        draft: existing
      };
    }
  }

  const props = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    return {
      success: false,
      status: 'setup_required',
      error_code: 'SETUP_REQUIRED',
      error: 'GAS 스크립트 속성에 GEMINI_API_KEY가 없습니다. npm.cmd run gas:init(macOS: npm run gas:init)으로 Gemini API 키를 넣어 주세요.'
    };
  }
  const geminiModels = getGeminiModels(props);
  if (!geminiModels) {
    return {
      success: false,
      status: 'setup_required',
      error_code: 'SETUP_REQUIRED',
      error: GEMINI_MODEL_SETTING_ERROR
    };
  }

  // 같은 request_id의 초안은 위 1번에서 돌려준다. 여기서는 판독할 사진만 정한다.
  const inputVersion = Number(p.input_version) || 1;
  const snapshotImageIds = p.image_ids || (p.input_snapshot && (p.input_snapshot.image_ids || p.input_snapshot.drive_file_ids));
  const fileIds = (Array.isArray(snapshotImageIds) && snapshotImageIds.length > 0)
    ? snapshotImageIds
    : (record.drive_file_ids || []);

  if (fileIds.length === 0) {
    return {
      success: false,
      status: 'error',
      error_code: 'NO_IMAGES',
      error: '분석할 원본 사진이 없습니다: ' + recordId
    };
  }

  // 2. 1~5장 전부 순서대로 포함하고 프레임 번호 명시 (Drive 읽기 실패 시 단계 실패 반환)
  const imageParts = [];
  for (let idx = 0; idx < fileIds.length; idx++) {
    const fid = fileIds[idx];
    try {
      const file = DriveApp.getFileById(fid);
      const blob = file.getBlob();
      imageParts.push({ text: `[사진 프레임 ${idx + 1}/${fileIds.length}]` });
      imageParts.push({
        inline_data: {
          mime_type: blob.getContentType(),
          data: Utilities.base64Encode(blob.getBytes())
        }
      });
    } catch (readErr) {
      return {
        success: false,
        status: 'error',
        error_code: 'IMAGE_READ_FAILED',
        error: `Drive 원본 사진(프레임 ${idx + 1}, fileId: ${fid}) 읽기 실패: ${String(readErr.message || readErr)}`
      };
    }
  }

  const promptText = `
당신은 물류창고의 택배 발송 확인과 산업안전 관찰을 보조하는 AI입니다. 상자 눌림·찢어짐, 포장·상품 오염, 상품 라벨, 병 상품 마개와 보호구·제한구역·통로·바닥 상태를 관찰합니다. 상품 라벨과 배송 라벨을 구분합니다. 실제 주문 자료 없이 구매자 주소·상품·수량 일치를 추정하지 않습니다.
원문 기준 원칙:
- 초안을 제시할 뿐 최종 판정이나 조치 완료를 확정하지 마십시오.
- 사진만으로 발송 승인·택배 인계·배송 완료를 확정하지 마십시오.
- 보이는 사실(facts)을 객관적으로 작성하십시오.
- 머리가 가려졌거나 조명 반사, 또는 허용 기준 미확인 시 불확실성을 명시하십시오.
반드시 아래 JSON 형식으로만 응답하십시오:
{
  "facts": "화면에서 관찰되는 객관적 사실 설명",
  "suspected_risk": "의심되는 리스크 항목명",
  "locations": "이미지 내 위치",
  "uncertainty": "불확실성 및 식별 한계",
  "additional_checks": "현장에서 추가 확인해야 할 사항"
}
`;

  const requestBody = {
    contents: [
      {
        parts: [
          ...imageParts,
          { text: promptText }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json'
    }
  };

  // 3. API 키는 URL query 대신 x-goog-api-key 헤더로 전달하여 예외 메시지 노출 방지
  const fetchGemini = (model) => UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-goog-api-key': apiKey
    },
    payload: JSON.stringify(requestBody),
    muteHttpExceptions: true
  });

  // 판독 모델이 붐비거나(503) 한도에 걸리면(429) 대체 모델로 한 번만 다시 보낸다. 실제로 답한 모델을 기록한다.
  let geminiModel = geminiModels.model;
  let response = null;
  let code = 0;
  let text = '';
  try {
    response = fetchGemini(geminiModel);
    code = response.getResponseCode();
    if ((code === 503 || code === 429) && geminiModels.fallback_model) {
      geminiModel = geminiModels.fallback_model;
      response = fetchGemini(geminiModel);
      code = response.getResponseCode();
    }
    text = response.getContentText();
  } catch (netErr) {
    return {
      success: false,
      status: 'interrupted',
      error_code: 'NETWORK_TIMEOUT',
      error: 'Gemini API 호출 중 네트워크 오류가 발생했습니다.',
      interrupted: true
    };
  }

  if (code === 429) {
    // 429는 Gemini가 요청을 처리하지 않은 것이라 초안을 남기지 않는다. 같은 request_id로 다시 보내면 다시 판독한다.
    const headers = response && typeof response.getHeaders === 'function' ? response.getHeaders() : null;
    const limit = parseGeminiRateLimit(text, headers);
    const quotaIds = limit.quota_violations.map(v => v.quota_id).filter(Boolean);
    const quotaLabel = quotaIds.length > 0 ? `, 할당량: ${quotaIds.join(', ')}` : '';
    const retryLabel = limit.retry_after_seconds !== null ? `${limit.retry_after_seconds}초 뒤` : '잠시 후';
    const errorMessage = `Gemini API 호출 한도를 초과했습니다 (HTTP 429${quotaLabel}). ${retryLabel} 다시 시도해주세요.`;
    return {
      success: false,
      status: 'error',
      error_code: 'RATE_LIMIT_EXCEEDED',
      error: errorMessage,
      retryable: true,
      quota_violations: limit.quota_violations,
      retry_after_seconds: limit.retry_after_seconds,
      details: limit.message
    };
  }

  if (code !== 200) {
    return {
      success: false,
      status: 'error',
      error_code: 'GEMINI_API_ERROR',
      error: code === 503
        ? `Gemini 서버가 붐벼 판독하지 못했습니다(HTTP 503, ${geminiModel}). 잠시 뒤 다시 판독을 요청하세요.`
        : (GEMINI_HTTP_MESSAGES[code] || `Gemini API 분석 요청 중 오류가 발생했습니다 (HTTP ${code}, {model}).`).replace('{model}', geminiModel),
      details: text.slice(0, 300)
    };
  }

  // 4. Gemini JSON 파싱 검증 (차단/빈 응답/잘못된 필드 타입 오류 처리)
  let parsedContent = null;
  try {
    const resJson = JSON.parse(text);
    if (resJson.promptFeedback && resJson.promptFeedback.blockReason) {
      return {
        success: false,
        status: 'error',
        error_code: 'CONTENT_BLOCKED',
        error: `Gemini 콘텐츠 차단됨: ${resJson.promptFeedback.blockReason}`
      };
    }
    const cand = resJson.candidates && resJson.candidates[0];
    if (!cand || !cand.content || !cand.content.parts || cand.content.parts.length === 0) {
      return {
        success: false,
        status: 'error',
        error_code: 'EMPTY_RESPONSE',
        error: `Gemini 응답에 내용이 없습니다 (finishReason: ${cand?.finishReason || 'unknown'})`
      };
    }
    const rawOut = cand.content.parts[0].text;
    const jsonMatch = rawOut.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        success: false,
        status: 'error',
        error_code: 'INVALID_JSON',
        error: 'Gemini 응답에서 JSON 형식을 추출할 수 없습니다: ' + rawOut.slice(0, 100)
      };
    }
    parsedContent = JSON.parse(jsonMatch[0]);
  } catch (err) {
    return {
      success: false,
      status: 'error',
      error_code: 'PARSE_FAILED',
      error: `Gemini 응답 JSON 파싱 실패: ${String(err.message || err)}`
    };
  }

  if (!parsedContent || typeof parsedContent !== 'object' || typeof parsedContent.facts !== 'string' || !parsedContent.facts.trim()) {
    return {
      success: false,
      status: 'error',
      error_code: 'INVALID_DRAFT_SCHEMA',
      error: 'Gemini 초안에 필수 문자열 필드(facts)가 없거나 유효하지 않습니다.'
    };
  }

  const now = new Date().toISOString();
  const draftId = 'DRAFT-' + Utilities.getUuid().slice(0, 8);

  withShortLock(() => {
    const draftsSheet = getSheet(SHEET_TABS.AI_DRAFTS);
    draftsSheet.appendRow([
      sanitizeSheetValue(draftId),
      sanitizeSheetValue(recordId),
      sanitizeSheetValue(p.request_id || ''),
      sanitizeSheetValue(now),
      sanitizeSheetValue(geminiModel),
      sanitizeSheetValue(parsedContent.facts || ''),
      sanitizeSheetValue(parsedContent.suspected_risk || ''),
      sanitizeSheetValue(parsedContent.locations || ''),
      sanitizeSheetValue(parsedContent.uncertainty || ''),
      sanitizeSheetValue(parsedContent.additional_checks || ''),
      '', // raw_response: 열 위치만 지킨다. Gemini 응답 전체는 셀 한도(5만 자)를 넘을 수 있어 저장하지 않는다.
      inputVersion
    ]);

    updateRecordStatus(recordId, 'AI_DRAFTED');
    appendHistory(recordId, now, 'AI_ANALYSIS', 'AI 초안 생성', `Gemini 판독(${geminiModel}): ${parsedContent.suspected_risk || '초안 생성'}`, 'Gemini AI');
  });

  return {
    success: true,
    draft_id: draftId,
    record_id: recordId,
    model: geminiModel,
    input_version: inputVersion,
    draft: { ...parsedContent, model: geminiModel }
  };
}

/**
 * Drive 이미지 Base64 조회 (Live 모드 이미지 서빙용)
 */
function handleGetImage(p) {
  const recordId = p.record_id;
  const index = parseInt(p.index, 10) || 0;
  if (!recordId) {
    return { success: false, status: 'error', error_code: 'BAD_REQUEST', error: '사건 번호가 없습니다. 목록에서 사건을 다시 골라 주세요.' };
  }
  const recordRes = findRecord(recordId);
  if (!recordRes.success) return recordRes;

  const fileIds = recordRes.record.drive_file_ids || [];
  if (index < 0 || index >= fileIds.length) {
    return { success: false, status: 'error', error_code: 'NOT_FOUND', error: 'Image index out of range' };
  }

  try {
    const file = DriveApp.getFileById(fileIds[index]);
    const blob = file.getBlob();
    return {
      success: true,
      record_id: recordId,
      index: index,
      mime_type: blob.getContentType(),
      base64: Utilities.base64Encode(blob.getBytes())
    };
  } catch (err) {
    return {
      success: false,
      status: 'error',
      error_code: 'NOT_FOUND',
      error: 'Drive image not found: ' + String(err.message || err)
    };
  }
}

/**
 * NotebookLM MCP 근거 확인 결과 기록 (멱등성 보장)
 */
function handleSaveEvidenceCheck(p) {
  const recordId = p.record_id;
  if (!recordId) {
    return { success: false, status: 'error', error_code: 'BAD_REQUEST', error: '사건 번호가 없습니다. 목록에서 사건을 다시 골라 주세요.' };
  }
  const recordRes = findRecord(recordId);
  if (!recordRes.success) return recordRes;

  const reqId = p.request_id || '';
  if (reqId) {
    const existingChecks = getRowsByRecordId(SHEET_TABS.EVIDENCE_CHECKS, recordId);
    const existing = existingChecks.find(c => c.request_id === reqId);
    if (existing) {
      return { success: true, idempotent: true, check_id: existing.check_id, record_id: recordId };
    }
  }

  try {
    const now = new Date().toISOString();
    const checkId = 'EVID-' + Utilities.getUuid().slice(0, 8);
    const sheet = getSheet(SHEET_TABS.EVIDENCE_CHECKS);
    const inputVersion = Number(p.input_version) || 1;

    sheet.appendRow([
      sanitizeSheetValue(checkId),
      sanitizeSheetValue(recordId),
      sanitizeSheetValue(reqId),
      sanitizeSheetValue(now),
      sanitizeSheetValue(p.standard_id || 'C-01'),
      sanitizeSheetValue(p.notebook_id || ''),
      sanitizeSheetValue(p.source_id || ''),
      sanitizeSheetValue(p.quote || ''),
      normalizeBool(p.match) === true ? 'TRUE' : 'FALSE',
      normalizeBool(p.sufficient) === true ? 'TRUE' : 'FALSE',
      sanitizeSheetValue(p.notes || ''),
      sanitizeSheetValue(p.answer || ''),
      sanitizeSheetValue(p.source_name || ''),
      typeof p.references === 'object' ? JSON.stringify(p.references) : sanitizeSheetValue(p.references || ''),
      inputVersion
    ]);

    appendHistory(recordId, now, 'EVIDENCE_CHECK', '기준 근거 대조', `기준 ${p.standard_id} 대조 (충족여부: ${p.sufficient})`, 'NotebookLM MCP');

    return { success: true, check_id: checkId, record_id: recordId, input_version: inputVersion };
  } catch (err) {
    return {
      success: false,
      status: 'error',
      error_code: 'INTERNAL_ERROR',
      error: '근거 확인 저장 실패: ' + String(err.message || err)
    };
  }
}

/**
 * 비동기 Job 결과 대조 조회 (재시작 복구 및 멱등 대조용)
 */
function handleReconcileJob(p) {
  const reqId = p.request_id;
  const recordId = p.record_id;
  const jobType = p.job_type || 'analyze';

  if (!reqId) {
    return { success: false, status: 'error', error_code: 'BAD_REQUEST', error: '요청 번호가 없습니다. 페이지를 새로 고친 뒤 다시 시도해 주세요.' };
  }

  if (jobType === 'analyze') {
    const drafts = getRowsByRecordId(SHEET_TABS.AI_DRAFTS, recordId);
    const existing = drafts.find(d => d.request_id === reqId);
    if (existing) {
      return {
        success: true,
        reconciled: true,
        job_type: 'analyze',
        draft_id: existing.draft_id,
        record_id: existing.record_id,
        model: existing.model,
        draft: existing
      };
    }
  } else if (jobType === 'evidence_check') {
    const checks = getRowsByRecordId(SHEET_TABS.EVIDENCE_CHECKS, recordId);
    const existing = checks.find(c => c.request_id === reqId);
    if (existing) {
      return {
        success: true,
        reconciled: true,
        job_type: 'evidence_check',
        check_id: existing.check_id,
        record_id: existing.record_id,
        check: existing
      };
    }
  }

  return {
    success: true,
    reconciled: false
  };
}

/**
 * 사람의 최종 판단 기록 (4종: 위험 확인 / 기준 충족 / 판단 보류 / 해당 없음, 필수 근거 및 멱등성 검증)
 */
function handleSaveReview(p) {
  const recordId = p.record_id;
  if (!recordId) {
    return { success: false, status: 'error', error_code: 'BAD_REQUEST', error: '사건 번호가 없습니다. 목록에서 사건을 다시 골라 주세요.' };
  }
  const recordRes = findRecord(recordId);
  if (!recordRes.success) return recordRes;

  const ALLOWED_DECISIONS = ['위험 확인', '기준 충족', '판단 보류', '해당 없음'];
  const decision = p.decision;
  if (!decision || !ALLOWED_DECISIONS.includes(decision)) {
    return {
      success: false,
      status: 'error',
      error_code: 'BAD_REQUEST',
      error: `판정 결과를 골라 주세요(${ALLOWED_DECISIONS.join(', ')}).`
    };
  }
  if (!p.basis || typeof p.basis !== 'string' || !p.basis.trim()) {
    return {
      success: false,
      status: 'error',
      error_code: 'BAD_REQUEST',
      error: '판단 근거를 입력해 주세요.'
    };
  }

  const reqId = p.request_id || '';
  if (reqId) {
    const existingReviews = getRowsByRecordId(SHEET_TABS.FINAL_REVIEWS, recordId);
    const existing = existingReviews.find(r => r.request_id === reqId);
    if (existing) {
      return { success: true, idempotent: true, review_id: existing.review_id, record_id: recordId, status: recordRes.record.status };
    }
  }

  try {
    const now = new Date().toISOString();
    const reviewId = 'REV-' + Utilities.getUuid().slice(0, 8);
    const sheet = getSheet(SHEET_TABS.FINAL_REVIEWS);

    sheet.appendRow([
      sanitizeSheetValue(reviewId),
      sanitizeSheetValue(recordId),
      sanitizeSheetValue(reqId),
      sanitizeSheetValue(now),
      sanitizeSheetValue(decision),
      sanitizeSheetValue(p.basis || ''),
      sanitizeSheetValue(p.followup_note || ''),
      sanitizeSheetValue(p.reviewer || '현장 검토자')
    ]);

    const newStatus = decision === '판단 보류' ? 'HOLD' : 'REVIEWED';
    updateRecordStatus(recordId, newStatus);
    appendHistory(recordId, now, 'HUMAN_REVIEW', '사람 최종 판정', `${decision} (${p.basis || '근거 작성'})`, p.reviewer || '현장 검토자');

    return { success: true, review_id: reviewId, record_id: recordId, status: newStatus };
  } catch (err) {
    return {
      success: false,
      status: 'error',
      error_code: 'STORAGE_FAILED',
      error: '판단 기록을 시트에 저장하지 못했습니다: ' + String(err.message || err)
    };
  }
}

/**
 * 대응 관리 조치 기록 (조치 유형 및 완료 근거, 멱등성 검증)
 */
function handleSaveAction(p) {
  const recordId = p.record_id;
  if (!recordId) {
    return { success: false, status: 'error', error_code: 'BAD_REQUEST', error: '사건 번호가 없습니다. 목록에서 사건을 다시 골라 주세요.' };
  }
  const recordRes = findRecord(recordId);
  if (!recordRes.success) return recordRes;

  const ALLOWED_ACTIONS = ['REQUEST', 'COMPLETE'];
  const actionType = p.action_type || 'REQUEST';
  if (!ALLOWED_ACTIONS.includes(actionType)) {
    return {
      success: false,
      status: 'error',
      error_code: 'BAD_REQUEST',
      error: '조치 유형을 골라 주세요(조치 요청 또는 조치 완료).'
    };
  }
  if (!p.description || typeof p.description !== 'string' || !p.description.trim()) {
    return {
      success: false,
      status: 'error',
      error_code: 'BAD_REQUEST',
      error: '조치 내용을 입력해 주세요.'
    };
  }
  const isComplete = actionType === 'COMPLETE';
  if (isComplete) {
    if (!p.evidence_note || typeof p.evidence_note !== 'string' || !p.evidence_note.trim()) {
      return {
        success: false,
        status: 'error',
        error_code: 'BAD_REQUEST',
        error: '조치 완료를 기록하려면 완료 증빙 메모를 입력해 주세요.'
      };
    }
  }

  const reqId = p.request_id || '';
  if (reqId) {
    const existingActions = getRowsByRecordId(SHEET_TABS.ACTIONS, recordId);
    const existing = existingActions.find(a => a.request_id === reqId);
    if (existing) {
      return { success: true, idempotent: true, action_id: existing.action_id, record_id: recordId, status: recordRes.record.status };
    }
  }

  try {
    const now = new Date().toISOString();
    const actionId = 'ACT-' + Utilities.getUuid().slice(0, 8);
    const sheet = getSheet(SHEET_TABS.ACTIONS);

    sheet.appendRow([
      sanitizeSheetValue(actionId),
      sanitizeSheetValue(recordId),
      sanitizeSheetValue(reqId),
      sanitizeSheetValue(now),
      sanitizeSheetValue(actionType),
      sanitizeSheetValue(p.description || ''),
      sanitizeSheetValue(p.evidence_note || ''),
      sanitizeSheetValue(p.actor || '현장 담당자'),
      isComplete ? 'COMPLETED' : 'PENDING'
    ]);

    const newStatus = isComplete ? 'ACTION_COMPLETED' : 'ACTION_REQUESTED';
    updateRecordStatus(recordId, newStatus);
    appendHistory(recordId, now, 'ACTION_TAKEN', isComplete ? '조치 완료' : '조치 요청', `${p.description || ''} (완료근거: ${p.evidence_note || '미등록'})`, p.actor || '현장 담당자');

    return { success: true, action_id: actionId, record_id: recordId, status: newStatus };
  } catch (err) {
    return {
      success: false,
      status: 'error',
      error_code: 'STORAGE_FAILED',
      error: '조치 기록을 시트에 저장하지 못했습니다: ' + String(err.message || err)
    };
  }
}

// ======================== 보조 유틸리티 ======================== //

function appendHistory(recordId, timestamp, phase, actionName, summary, operator) {
  const sheet = getSheet(SHEET_TABS.HISTORY);
  sheet.appendRow([
    'HIST-' + Utilities.getUuid().slice(0, 8),
    sanitizeSheetValue(recordId),
    sanitizeSheetValue(timestamp),
    sanitizeSheetValue(phase),
    sanitizeSheetValue(actionName),
    sanitizeSheetValue(summary),
    sanitizeSheetValue(operator)
  ]);
}

function updateRecordStatus(recordId, status) {
  const sheet = getSheet(SHEET_TABS.RECORDS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === recordId) {
      sheet.getRange(i + 1, 8).setValue(sanitizeSheetValue(status));
      break;
    }
  }
}

/**
 * Google Sheets 셀 날짜 정규화:
 * - Date 객체: isNaN이면 null (Invalid Date는 불명 처리), 정상이면 ISO 8601 문자열(val.toISOString())로 정규화
 * - 문자열: 엄격 ISO/KST 형식만 허용 (parseKstOrIso 검증 통과한 경우에만 문자열 인정, 임의 자연어는 null 불명 처리)
 * - 기타/빈값: null
 */
function normalizeSheetDate(val) {
  if (val === undefined || val === null || val === '') return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return val.toISOString();
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;
    const ms = parseKstOrIso(trimmed);
    if (ms === null) return null;
    return trimmed;
  }
  return null;
}

function rowToRecord(sheetRow) {
  const row = sheetRow.map(readCell);
  let fileIds = [];
  try {
    fileIds = JSON.parse(row[9] || '[]');
  } catch (e) {
    fileIds = [];
  }
  const version = row[10] ? parseInt(row[10], 10) : 1;
  const createdAt = normalizeSheetDate(row[2]) || (typeof row[2] === 'string' ? row[2].trim() : (row[2] ? String(row[2]).trim() : ''));
  const updatedNormalized = normalizeSheetDate(row[11]);
  const updatedAt = updatedNormalized || (version > 1 ? null : createdAt);

  return {
    record_id: row[0],
    request_id: row[1],
    created_at: createdAt,
    location: row[3],
    category: row[4],
    memo: row[5],
    image_count: row[6],
    status: row[7],
    drive_folder_id: row[8],
    drive_file_ids: fileIds,
    version: version,
    updated_at: updatedAt
  };
}

function getRowsByRecordId(tabName, recordId) {
  const sheet = getSheet(tabName);
  const data = sheet.getDataRange().getValues();
  const headers = TAB_HEADERS[tabName];
  const list = [];
  for (let i = 1; i < data.length; i++) {
    if (readCell(data[i][1]) === recordId) {
      const obj = {};
      for (let c = 0; c < headers.length; c++) {
        if (headers[c] === 'raw_response') continue;
        let val = readCell(data[i][c]);
        if (headers[c] === 'created_at' || headers[c] === 'updated_at' || headers[c] === 'timestamp') {
          val = normalizeSheetDate(val);
        }
        obj[headers[c]] = val;
      }
      list.push(obj);
    }
  }
  return list;
}

/**
 * ISO 8601 및 yyyy-MM-dd HH:mm:ss(KST) 문자열을 epoch ms로 변환
 */
function parseKstOrIso(ts) {
  if (!ts) return null;
  if (ts instanceof Date) {
    const time = ts.getTime();
    return isNaN(time) ? null : time;
  }
  const str = String(ts).trim();
  if (!str) return null;

  // 1. yyyy-MM-dd HH:mm:ss 또는 yyyy-MM-dd HH:mm:ss.SSS (KST GMT+09:00 명시 해석)
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

  // 2. ISO 8601 with Z or offset
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

/**
 * 불리언 정규화: true/false, 'true'/'false', 'TRUE'/'FALSE'만 boolean으로 인정, 나머지는 null
 */
function normalizeBool(val) {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    if (s === 'true') return true;
    if (s === 'false') return false;
  }
  return null;
}

/**
 * 단일 사건의 review_summary 및 queue 산출
 */
function buildReviewSummary(record, aiList, evidenceList, reviewList, actionList) {
  aiList = aiList || [];
  evidenceList = evidenceList || [];
  reviewList = reviewList || [];
  actionList = actionList || [];

  const latestAi = aiList.length > 0 ? aiList[aiList.length - 1] : null;
  const latestEvidence = evidenceList.length > 0 ? evidenceList[evidenceList.length - 1] : null;
  const latestReview = reviewList.length > 0 ? reviewList[reviewList.length - 1] : null;
  const latestAction = actionList.length > 0 ? actionList[actionList.length - 1] : null;

  const ai = latestAi ? {
    facts: latestAi.facts || '',
    suspected_risk: latestAi.suspected_risk || '',
    locations: latestAi.locations || '',
    uncertainty: latestAi.uncertainty || '',
    additional_checks: latestAi.additional_checks || '',
    input_version: latestAi.input_version !== undefined && latestAi.input_version !== '' && latestAi.input_version !== null ? Number(latestAi.input_version) : null,
    created_at: normalizeSheetDate(latestAi.created_at)
  } : null;

  const evidence = latestEvidence ? {
    standard_id: latestEvidence.standard_id || '',
    source_id: latestEvidence.source_id || '',
    quote: latestEvidence.quote || '',
    match: normalizeBool(latestEvidence.match),
    sufficient: normalizeBool(latestEvidence.sufficient),
    notes: latestEvidence.notes || '',
    input_version: latestEvidence.input_version !== undefined && latestEvidence.input_version !== '' && latestEvidence.input_version !== null ? Number(latestEvidence.input_version) : null,
    created_at: normalizeSheetDate(latestEvidence.created_at)
  } : null;

  const review = latestReview ? {
    decision: latestReview.decision || '',
    basis: latestReview.basis || '',
    followup_note: latestReview.followup_note || '',
    reviewer: latestReview.reviewer || '',
    created_at: normalizeSheetDate(latestReview.created_at)
  } : null;

  const action = latestAction ? {
    action_type: latestAction.action_type || '',
    description: latestAction.description || '',
    evidence_note: latestAction.evidence_note || '',
    created_at: normalizeSheetDate(latestAction.created_at)
  } : null;

  // 버전 및 수정 시점 판별
  const version = Number(record.version) || 1;
  const isUpdated = version > 1;
  const recordCreatedMs = parseKstOrIso(record.created_at);
  const updatedAtMs = record.updated_at ? parseKstOrIso(record.updated_at) : (isUpdated ? null : recordCreatedMs);

  const versionTimeUnknown = isUpdated && (updatedAtMs === null);

  function checkContextChanged(stepObj) {
    if (!stepObj) return false;
    if (stepObj.input_version !== undefined && stepObj.input_version !== null) {
      if (version > Number(stepObj.input_version)) return true;
      if (version <= Number(stepObj.input_version)) return false;
    }
    if (!isUpdated) return false;
    if (versionTimeUnknown) return true;
    const stepMs = parseKstOrIso(stepObj.created_at);
    if (stepMs === null) return true;
    return updatedAtMs > stepMs;
  }

  const contextChanged = {
    after_ai: checkContextChanged(ai),
    after_evidence: checkContextChanged(evidence),
    after_review: checkContextChanged(review),
    after_action: checkContextChanged(action),
    version_time_unknown: versionTimeUnknown
  };

  // completion_recorded_after_review 판정
  let completionRecordedAfterReview = false;
  if (review && review.decision === '위험 확인') {
    if (action && action.action_type === 'COMPLETE') {
      const hasEvidenceNote = typeof action.evidence_note === 'string' && action.evidence_note.trim().length > 0;
      if (!hasEvidenceNote) {
        completionRecordedAfterReview = false;
      } else {
        const actionMs = parseKstOrIso(action.created_at);
        const reviewMs = parseKstOrIso(review.created_at);

        if (actionMs === null || reviewMs === null || actionMs === reviewMs) {
          completionRecordedAfterReview = null;
        } else if (actionMs < reviewMs) {
          completionRecordedAfterReview = false;
        } else if (contextChanged.after_action) {
          completionRecordedAfterReview = false;
        } else {
          completionRecordedAfterReview = true;
        }
      }
    } else {
      completionRecordedAfterReview = false;
    }
  } else {
    completionRecordedAfterReview = null;
  }

  // 큐 판정
  let queue = null;
  let queueReason = '';

  if (!review) {
    queue = 'awaiting_review';
    queueReason = '사람 검토 대기';
  } else {
    const dec = (review.decision || '').trim();
    const reviewMs = parseKstOrIso(review.created_at);
    const isUnknownDecision = !['위험 확인', '판단 보류', '기준 충족', '해당 없음'].includes(dec);

    if (versionTimeUnknown) {
      queue = 'additional_check';
      queueReason = '사건 수정 시각 불명으로 재확인 필요';
    } else if (reviewMs === null) {
      queue = 'additional_check';
      queueReason = '판정 일시 불명으로 재확인 필요';
    } else if (isUnknownDecision) {
      queue = 'additional_check';
      queueReason = '알 수 없는 판정 결과(' + dec + ')';
    } else if (dec === '판단 보류') {
      queue = 'additional_check';
      queueReason = '판단 보류 상태 (추가 자료 필요)';
    } else if (contextChanged.after_review) {
      queue = 'additional_check';
      queueReason = '판정 후 사건 정보 수정됨 (v' + version + ')';
    } else if (dec === '위험 확인') {
      if (completionRecordedAfterReview === true) {
        queue = null;
        queueReason = '위험 확인 후 현장 조치 완료';
      } else if (completionRecordedAfterReview === null) {
        queue = 'additional_check';
        queueReason = '조치 완료 근거 또는 완료 일시 재확인 필요';
      } else {
        queue = 'confirmed_risk';
        queueReason = '위험 확인 (현장 조치 필요)';
      }
    } else if (dec === '기준 충족' || dec === '해당 없음') {
      queue = null;
      queueReason = dec + ' 확인 완료';
    } else {
      queue = 'additional_check';
      queueReason = '추가 확인 필요';
    }
  }

  return {
    ai: ai,
    evidence: evidence,
    review: review,
    latest_action: action,
    context_changed: contextChanged,
    queue: queue,
    queue_reason: queueReason,
    completion_recorded_after_review: completionRecordedAfterReview
  };
}

/**
 * 전체 레코드 목록에서 queue_counts 산출
 */
function computeQueueCounts(records) {
  let additional_check = 0;
  let awaiting_review = 0;
  let confirmed_risk = 0;

  for (let i = 0; i < records.length; i++) {
    const q = records[i].review_summary ? records[i].review_summary.queue : null;
    if (q === 'additional_check') additional_check++;
    else if (q === 'awaiting_review') awaiting_review++;
    else if (q === 'confirmed_risk') confirmed_risk++;
  }

  return {
    additional_check: additional_check,
    awaiting_review: awaiting_review,
    confirmed_risk: confirmed_risk
  };
}

// Node.js 테스트 환경용 export (GAS 런타임에서는 무시됨)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initialSetup,
    doPost,
    doGet,
    handleCreateRecord,
    handleUpdateRecord,
    handleGetRecords,
    handleGetRecord,
    handleAnalyzeGemini,
    handleSaveEvidenceCheck,
    handleSaveReview,
    handleSaveAction,
    handleSetGeminiKey,
    sanitizeSheetValue,
    buildReviewSummary,
    computeQueueCounts,
    parseKstOrIso,
    normalizeBool,
    normalizeSheetDate,
    rowToRecord,
    SHEET_TABS,
    TAB_HEADERS,
    GEMINI_MODELS,
    DEFAULT_GEMINI_MODEL
  };
}
