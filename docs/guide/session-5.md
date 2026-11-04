# 5회차 보충 문서: 사진 판독(Gemini)과 Google 시트 저장

이 회차는 사건 상세에 Gemini 사진 설명 단계를 넣고 사건 기록을 Google 시트와 Drive 비공개 폴더에 저장하는 길을 더합니다. 4회차까지 내 컴퓨터 저장소와 NotebookLM으로 만든 앱은 그대로 두고 설정 파일의 스위치로 연습용 결과와 실제 연결을 고릅니다.
Google 쪽 코드는 내 컴퓨터 저장소와 같은 동작 이름, 같은 답 모양을 쓰므로 화면 코드는 어느 저장소를 쓰는지 몰라도 됩니다. 앞 회차 문서와 다른 내용은 이 문서에 "바꿉니다"라고 적었습니다.

이 문서는 3회차 문서(이력, 사건 상태)와 4회차 문서(연동 상태 줄, 작업 대기열, 요청 알림 패널, 관련 기준 확인)를 이어 받습니다. 이 기능을 건드릴 때는 session-3.md와 session-4.md도 읽습니다.

## 설정 스위치

### 설정 파일의 새 키와 스위치

설정 파일에 GAS_WEBAPP_URL(Google 웹앱 주소), GEMINI_API_KEY(Gemini 키), STORAGE_MODE(저장소 스위치), GEMINI_MODE(Gemini 스위치)를 더합니다.

- STORAGE_MODE는 live(Google 쪽 코드를 거쳐 Google 시트와 Drive에 저장) 또는 mock(지금처럼 이 PC의 파일에 저장)입니다. 비워 두면 live입니다.
- GEMINI_MODE는 off(쓰지 않음), mock(모의 사진 설명), live(실제 Gemini)입니다. 비워 두면 STORAGE_MODE와 같은 값입니다.
- 4회차 문서에서 비어 있으면 live로 보던 NOTEBOOKLM_MODE("비워 두면 live")는 이제 비워 두면 STORAGE_MODE와 같은 값으로 바꿉니다.
- 허용하지 않는 값이면 4회차 NOTEBOOKLM_MODE처럼 서버를 켜지 않고 허용 값을 알립니다.

세 스위치(STORAGE_MODE, GEMINI_MODE, NOTEBOOKLM_MODE)의 값은 비밀이 아닙니다. 요청하면 바꾸고 바꾼 값을 답에 알려 줘도 됩니다. 설정 파일의 값을 옮겨 적지 않는다는 지침에서 이 세 값만 예외입니다. GAS_WEBAPP_URL과 GEMINI_API_KEY의 값은 비밀입니다.

GEMINI_API_KEY는 npm.cmd run gas:init만 읽어 Google 쪽 설정으로 보냅니다. 서버(npm.cmd start)는 이 값을 읽어 쓰지 않고 환경 변수로도 옮기지 않습니다.

사용자가 대화에 Gemini 키를 붙여 넣으면 설정 파일의 GEMINI_API_KEY 값만 그 키로 바꿉니다. 다른 줄은 그대로 두고 키 값은 답, 화면, 터미널에 다시 쓰지 않습니다.

### 함께 쓸 수 없는 스위치 조합

아래 조합이면 서버는 포트를 잡기 전에 서버 창에 그 문장 한 줄을 보여 주고 켜지지 않은 채 끝납니다. off는 어느 조합에서나 쓸 수 있습니다.

- STORAGE_MODE=live, GEMINI_MODE=mock: "STORAGE_MODE=live에서는 GEMINI_MODE=mock을 쓸 수 없다. 모의 사진 설명이 실제 Google 시트 기록에 저장되기 때문이다. GEMINI_MODE를 live나 off로 바꾸거나 STORAGE_MODE=mock으로 시작한다."
- STORAGE_MODE=live, NOTEBOOKLM_MODE=mock: "STORAGE_MODE=live에서는 NOTEBOOKLM_MODE=mock을 쓸 수 없다. 모의 근거가 실제 Google 시트 기록에 저장되기 때문이다. NOTEBOOKLM_MODE를 live나 off로 바꾸거나 STORAGE_MODE=mock으로 시작한다."
- STORAGE_MODE=mock, GEMINI_MODE=live: "STORAGE_MODE=mock에서는 GEMINI_MODE=live를 쓸 수 없다. Gemini는 GAS 안에서 호출하므로 Google 시트 저장소 없이는 실제로 부를 수 없다. GEMINI_MODE를 mock이나 off로 바꾸거나 STORAGE_MODE=live로 시작한다."

### 연동 상태 줄과 서버 확인 주소

4회차의 연동 상태 줄을 세 칸으로 바꿉니다: "연동 상태: 저장소 로컬 저장 · Gemini mock · NotebookLM live". 저장소가 live면 "저장소 Google 시트", mock이면 "저장소 로컬 저장"입니다(저장소 스위치에는 off가 없습니다). Gemini와 NotebookLM의 off는 "꺼짐"입니다. 서버 창, /api/health의 integration_status, 화면 알림 줄의 연동 상태가 모두 같은 내용이고 화면 알림 줄에서는 세 칸으로 나눠 보여 줍니다.

화면 알림 줄의 연동 상태는 셋 중 live가 아닌 것이 하나라도 있을 때만 보여 줍니다.

/api/health에 modes(storage, gemini, notebooklm 세 값)와 gas_configured(GAS_WEBAPP_URL에 값이 있으면 true, 없으면 false)를 더합니다.

### "설정 필요"

STORAGE_MODE=live인데 GAS_WEBAPP_URL이 비어 있으면 사건 저장·조회 요청에 503과 아래 답을 돌려줍니다.

`{"error": "Google 시트에 연결할 GAS 웹 앱 주소가 설정되지 않았습니다. 설정 파일(config/local-connection.json)의 GAS_WEBAPP_URL에 GAS 웹 앱의 /exec 주소를 넣고 로컬 서버를 다시 시작하세요. GAS 없이 시험하려면 STORAGE_MODE를 mock으로 둡니다.", "error_code": "SETUP_REQUIRED", "status": "setup_required"}`

화면은 status가 "setup_required"인 오류나 503 오류를 받으면 머리말 연결 표시를 "설정 필요 (GAS Web App 배포 대기)"로 바꾸고 다음에 조회가 성공하면 원래 표시로 돌립니다. 저장소 사진 목록(GET /api/repository-images)을 못 받은 503은 여기서 뺍니다. 2회차 문서대로 그 칸에만 보여 줍니다.

## 내 컴퓨터 저장소의 사진 설명과 판독 요청

### 사진 설명(AI 초안) 저장

사진 설명 한 건의 항목은 draft_id, record_id, request_id, model(판독 모델 이름), facts(관찰 사실), suspected_risk(의심 위험), locations(위치), uncertainty(불확실성), additional_checks(추가 확인), input_version(판독한 사건 정보 버전), created_at입니다.

- 내 컴퓨터 저장소에 사진 설명 목록 ai_drafts를 더합니다. 예전 기록 파일에 이 목록이 없으면 빈 목록으로 읽습니다.
- 저장소 동작 이름은 analyze_gemini입니다. 같은 request_id로 다시 오면 새로 만들지 않고 저장된 설명을 돌려줍니다.
- 저장하면 사건의 처리 상태(status)를 AI_DRAFTED로 바꾸고 이력에 단계 AI_ANALYSIS, 작업 이름 "AI 초안 생성", 내용 "Gemini 판독: (의심 위험)"을 남깁니다.
- 사건 상세 데이터에는 가장 최근 사진 설명(ai_draft)을 함께 담습니다.

### 연습용(모의) 사진 설명

내 컴퓨터 저장소의 모의 사진 설명은 모델 이름 gemini-3.8-flash-synthetic, 이력 작업자 "gemini-3.8-flash (Synthetic)"입니다. 사건 종류별 글은 아래에 적었습니다.

- 산업안전 사건: 관찰 사실 "중앙 작업자의 머리가 충분히 식별되나 안전모가 관찰되지 않습니다.", 의심 위험 "머리 보호구 미착용 위험 (C-01)", 위치 "화면 중앙 작업자의 머리", 불확실성 "작업 구역 진입 직후 탈모인지 일시적 미착용인지 원인 불명확", 추가 확인 "해당 작업 라인의 안전모 착용 의무 및 현장 관리자 확인"
- 택배 발송 확인 사건: 관찰 사실 "출하 대기 완제품 상자의 모서리가 안쪽으로 함몰되어 있습니다.", 의심 위험 "포장 손상 결함 (C-05)", 위치 "화면 우측 하단 적재 상자", 불확실성 "내부 완충재 및 제품 본체 손상 여부는 외부 관찰로 확인 불가", 추가 확인 "품질 관리자 입회 하에 개봉 재검수 필요"

### 사진 판독 요청

POST /api/records/(사건번호)/analyze: 4회차의 관련 기준 확인 요청처럼 작업 대기열에 넣고 바로 202와 `{"success": true, "status": "(작업 상태)", "job_id": "(작업 번호)", "request_id": "(요청 번호)"}`를 돌려줍니다. 요청 본문의 request_id를 쓰고 없으면 서버가 만듭니다.

- 판독 작업의 종류(job_type)는 "analyze"로 따로 둡니다. 4회차의 기준 확인 작업은 "evidence_check" 그대로입니다. 기준 확인의 작업 목록, 진행 표시, 최신 결과 계산은 job_type이 "evidence_check"인 것만 봅니다.
- GET /api/jobs에는 두 종류가 다 나옵니다. 4회차의 ?record_id, ?status처럼 ?job_type=(종류)로도 거릅니다. 화면은 작업마다 job_type을 보고 나눕니다.
- 판독 작업은 요청한 때의 사건 정보 버전과 사진 목록을 고정해 analyze_gemini를 부릅니다. 보내는 항목은 record_id, request_id, input_version, image_ids(사진 목록), input_snapshot(version, updated_at, location, category, memo, image_ids)입니다. 실패하면 오류 코드와 문장을 작업에 남기고, 답의 draft를 작업 결과로 둡니다.
- 저장소 동작 reconcile_job은 request_id, record_id, job_type을 받습니다. 저장된 것이 있으면 analyze는 `{"success": true, "reconciled": true, "job_type": "analyze", "draft_id": "...", "record_id": "...", "model": "...", "draft": {...}}`, evidence_check는 `{"success": true, "reconciled": true, "job_type": "evidence_check", "check_id": "...", "record_id": "...", "check": {...}}`, 없으면 `{"success": true, "reconciled": false}`입니다.
- 서버를 다시 켤 때 끝나지 않은 판독 작업은 4회차처럼 정리합니다. 같은 request_id의 사진 설명이 저장돼 있으면 완료, 없으면 중단입니다.
- GEMINI_MODE=off이면 409와 `{"error": "Gemini 연동이 꺼져 있습니다(GEMINI_MODE=off). 사진 설명을 받으려면 GEMINI_MODE를 바꾸고 로컬 서버를 다시 시작하세요.", "error_code": "INTEGRATION_OFF"}`로 거절합니다.

## 사건 상세와 화면

### 사건 상세 네 단계

확인 순서는 "1. 사진", "2. AI 사진 설명 (Gemini)", "3. 관련 기준 확인 (NotebookLM)", "4. 내 판단 남기기"입니다.

"지금 버전"의 설명이나 결과는 판독하거나 확인한 사건 정보 버전이 지금 사건 버전과 같은 것입니다. 다르면 "수정 전" 것입니다.

- 처음 열 때 단계: 사진이 없으면 1, 지금 버전의 사진 설명이 없으면 2, 지금 버전의 기준 확인 결과가 없으면 3, 아니면 4입니다. 꺼진 연동의 단계는 건너뜁니다. 판단을 이미 저장한 사건은 4회차처럼 완료·조치 상태를 따릅니다.
- 안내 문구: 2단계 "Gemini 사진 설명을 확인해 주세요.", 3단계 "AI 결과를 확인했다면, NotebookLM으로 관련 기준을 찾아 사진과 비교해 주세요.", 4단계 "사진과 기준을 비교하고, 직접 확인한 판단을 남겨주세요."
- 2번 구역 끝에 "다음: 관련 기준 확인"(누르면 3단계), 3번 구역 끝에 "다음: 내 판단 남기기"(누르면 4단계) 단추를 둡니다.
- 4번 구역 제목 아래 설명은 "AI 결과와 기준을 참고해, 직접 확인한 판단을 기록하세요."입니다.

### 2번 구역 "2. AI 사진 설명 (Gemini)"

접었다 펴는 칸 "사진 설명 더 보기 · Gemini"를 둡니다. 사진 설명이 없거나 확인하지 않은 판독 상태(진행 중, 중단, 실패, 전송 상태 확인 필요)가 있으면 펼쳐 둡니다.

칸 안에 보이는 것:

- 진행 표시 자리와 판독 요청 단추를 둡니다. 단추 이름은 설명이 없으면 "사진 설명 더 보기", 있으면 "사진 설명 다시 보기"입니다.
- 설명이 있으면 이 칸 안의 "Gemini 관찰 초안" 아래에 "판독 모델: (모델 이름)", 관찰 사실, "확인할 점: (의심 위험)", "추가 확인: (추가 확인)"을 보여 줍니다. 위치와 불확실성은 접는 칸 "관찰 위치와 한계"를 펼치면 보입니다.
- 설명이 수정 전 것이면 이 칸 안의 "Gemini 관찰 초안" 바로 위에 "수정 전 결과입니다. 현재 사진과 내용을 다시 확인해 주세요."를 보여 줍니다.
- GEMINI_MODE=off이면 단추를 끄고 "Gemini 연동이 꺼져 있습니다(GEMINI_MODE=off)."를 보여 줍니다.

단추를 눌렀을 때:

- 판독을 요청합니다. 요청 번호 만들기, 보내는 중 끊긴 요청 처리, 2초마다 상태 확인, 새로고침 뒤 이어 보기는 4회차 관련 기준 확인과 같은 방식입니다.
- 기다리는 동안 단추를 끄고 이름을 "AI 초안 분석 중..."으로 바꾸며 진행 표시에 지금 상태를 보여 줍니다.
- 끝나면 상세 오른쪽 검토 영역(진행 표시와 2·3·4번 구역)만 다시 그리고 2번 칸을 펼칩니다.
- 사진을 읽을 수 없는 사건은 사진 파일이 열렸지만 가로나 세로가 1픽셀 이하인 사건입니다. 상세의 사진 자리에 "사진 내용을 확인할 수 없습니다."를 보여 주는 코드가 없으면 더합니다. 이런 사건은 요청하지 않고 화면 안 문구로 "사진 내용을 확인할 수 없어 AI 분석을 요청할 수 없습니다. 다른 사진으로 새 사건을 등록해 주세요."를 보여 줍니다. 브라우저 팝업이 아닙니다.

### 요청 알림 패널의 판독 요청

- 4회차 문서의 "기준 확인 작업"으로 만드는 알림 목록은 판독 작업도 함께 담는 것으로 바꿉니다. 제목과 설명은 작업의 job_type으로 고릅니다.
- 판독 요청의 알림 제목: 보내는 중 "AI 초안 요청 전송 중...", 대기 "AI 초안 요청 접수", 진행 "AI 초안 분석 중", 완료 "AI 초안이 준비됐습니다.", 실패 "AI 초안 생성 실패", 서버에 닿지 않음 "AI 초안 요청을 다시 보내 주세요".
- 판독이 NETWORK_TIMEOUT으로 중단되면 제목은 "AI 초안 요청이 중단됐습니다", 설명은 "Gemini 응답이 늦거나 연결이 끊겨 AI 초안을 받지 못했습니다. Gemini가 붐빌 때 생길 수 있습니다. 3분쯤 뒤 이 사건을 다시 열어 AI 초안이 없으면 다시 요청해 주세요."입니다. 2번 구역 진행 표시도 같은 설명을 씁니다.
- 결과 보기, 닫기, 경과 시간, 새로고침 뒤 이어 보기는 4회차 기준 확인 알림과 같습니다.

### 사건 상태 요약

- 사건 상태 요약에 ai(facts, suspected_risk, locations, uncertainty, additional_checks, input_version, created_at)를 더합니다.
- 설명을 받은 뒤 사건 정보를 고쳤으면 기준 확인·판단처럼 "수정 전 자료"로 표시하고 상세 위쪽의 정보가 바뀌었다는 경고에도 넣습니다.
- "추가 확인" 사건의 확인 이유는 판단 기록에 적은 내용이 없으면 사진 설명의 추가 확인 글을 씁니다.

### 관련 기준 확인은 사진 설명이 먼저

3번 구역 "관련 기준 찾기" 단추는 지금 버전의 사진 설명이 있을 때만 켭니다. 없으면 단추를 끄고 "먼저 2단계 Gemini 설명을 준비해 주세요."를 보여 줍니다.

서버도 막습니다. v 뒤의 숫자만 실제 버전으로 바꾸고 숫자 뒤의 "에서"와 "로"는 숫자와 상관없이 그대로 둡니다.

- 설명이 없으면 400과 `{"error": "현재 사건의 Gemini 설명을 먼저 준비해 주세요.", "error_code": "AI_DRAFT_REQUIRED"}`
- 수정 전 설명이면 400과 `{"error": "사건 정보가 수정되었습니다(v1에서 v2로). 최신 사건 정보로 AI 분석을 다시 실행한 후 근거 확인을 요청해주세요.", "error_code": "AI_DRAFT_STALE"}`

4회차 기준 확인 질문의 사건 정보 부분(분류·장소·메모·사진 장수)을 "장소: (장소) | 사용자 메모: (메모) | Gemini 의심 위험: (의심 위험) | Gemini 관찰 초안: (관찰 사실) | 위치: (위치) | 불확실성: (불확실성)"으로 바꿉니다. 빈칸은 뺍니다. 3번 구역의 4회차 안내 "사건 정보(분류·장소·메모·사진 장수)로 질문합니다."는 뺍니다.

GEMINI_MODE=off여도 위 규칙은 그대로입니다. 판독하지 않은 사건은 2단계를 건너뛰어 처음 단계가 3(기준 확인을 이미 했으면 4)이 되지만 "관련 기준 찾기"는 꺼져 있고 서버도 400으로 막습니다. 이때는 "다음: 내 판단 남기기"나 "판단 기록하기"로 넘어갑니다.

### 다른 화면

- 홈 카드의 관찰 칸: 사진 설명이 있으면 "AI 관찰: (관찰 사실)", 수정 전 설명이면 "AI 관찰(수정 전 자료): (관찰 사실)", 시점을 알 수 없으면 "AI 관찰(시점 불명): (관찰 사실)"입니다. 설명이 없으면 지금처럼 현장 메모를 보여 줍니다.
- 홈 카드 단추는 사진 설명만 있어도 "이어서 확인"입니다.
- 판단 기록 화면의 "NotebookLM 기준 확인:" 칸 맨 위에 "Gemini 관찰 사실: (관찰 사실)"을 더합니다. 설명이 없으면 "AI 초안 미등록"입니다. 제목 아래 작은 사진 옆에는 판단 근거가 없을 때 관찰 사실을 보여 줍니다.
- 사건 이력에서 단계 AI_ANALYSIS는 "Gemini 판독"으로, 작업자 끝의 "(Synthetic)"은 "(mock)"으로 보여 줍니다.

## Google 쪽 코드(Apps Script)

### 기본 틀과 답 모양

프로젝트 맨 위 gas 폴더에 Code.gs와 appsscript.json 두 파일만 둡니다. Google에서 돌아가는 코드라 require, module.exports, import, process.env를 쓰지 않고 이 PC에서는 실행해 볼 수 없습니다.

appsscript.json의 값은 "timeZone": "Asia/Seoul", "runtimeVersion": "V8", "oauthScopes"는 https://www.googleapis.com/auth/spreadsheets, https://www.googleapis.com/auth/drive, https://www.googleapis.com/auth/script.external_request 세 개, "webapp": {"executeAs": "USER_DEPLOYING", "access": "ANYONE_ANONYMOUS"}입니다.

doPost는 받은 JSON의 action 이름으로 일을 나누고 늘 JSON으로 답합니다.

- 성공은 `{"success": true, ...결과}`, 실패는 `{"success": false, "status": "setup_required" 또는 "error" 또는 "interrupted", "error_code": "...", "error": "문장"}`입니다.
- 본문이 비었거나 JSON이 아니거나 모르는 action이면 BAD_REQUEST입니다(모르는 action의 문장은 "Unknown action: (이름)").
- 처리 중 예외가 나도 JSON으로 답합니다. 시트·폴더 ID가 없으면 status "setup_required"와 SETUP_REQUIRED, 잠금이면 LOCK_TIMEOUT, 그 밖은 INTERNAL_ERROR입니다.

doGet은 기록을 읽지 않고 `{"status": "ok", "message": "권한 승인이 끝났습니다. 이 창을 닫고 터미널로 돌아가세요."}`만 돌려줍니다.

action은 setup, set_gemini_key, create_record, update_record, get_records, get_record, get_image, save_evidence_check, save_review, save_action, reconcile_job, analyze_gemini, gemini_settings입니다. 이름은 서버의 내 컴퓨터 저장소 동작 이름과 같고 입력 검사·답 모양·이력도 내 컴퓨터 저장소와 같게 합니다. 저장만 시트와 Drive로 합니다. 요청 항목 이름은 서버가 내 컴퓨터 저장소 동작에 넘기는 이름을 그대로 쓰고 각 일의 항목은 아래 절에 적었습니다. 입력 검사의 오류 문장은 서버의 같은 검사 문장을 그대로 쓰고 error_code는 BAD_REQUEST입니다. 없는 사건은 NOT_FOUND입니다.

시트 읽기·쓰기 공통 규칙을 아래에 적었습니다. 뒤의 일들이 함께 쓰므로 이 틀에 도우미로 만듭니다(시트 값 넣기와 읽기, 잠금 잡기, 탭 가져오기, 사건 번호로 탭의 줄을 항목 이름 객체로 읽기, 이력 한 줄 더하기, 사건 처리 상태 바꾸기).

- 시트에 글을 쓸 때 =, +, -, @, 탭, 줄바꿈(CR), 숫자로 시작하는 글은 앞에 '를 붙여 글자 그대로 저장하고 읽을 때는 그 '를 뗍니다. 수식이나 숫자로 바뀌지 않게 하려는 것입니다. 사진 파일 ID 목록은 JSON 글자로 저장합니다.
- 쓰는 일은 스크립트 잠금으로 하나씩 처리합니다. 10초 기다려도 잠금을 못 잡으면 LOCK_TIMEOUT입니다.
- 새 항목의 번호는 앞글자 뒤에 UUID 앞 8글자를 붙입니다. 사진 설명 DRAFT-, 기준 확인 EVID-, 판단 REV-, 조치 ACT-, 이력 HIST-입니다.
- 이력은 3회차, 4회차 문서와 같은 단계와 문구를 씁니다. 등록은 REGISTER, 정보 수정은 RECORD_UPDATE, 기준 확인은 EVIDENCE_CHECK(작업자 "NotebookLM MCP"), 판단은 HUMAN_REVIEW, 조치는 ACTION_TAKEN입니다.
- 사건 처리 상태는 3회차 문서와 같습니다. 등록은 REGISTERED, 판단 저장은 판단 보류면 HOLD, 그 밖은 REVIEWED, 조치 저장은 action_type이 REQUEST면 ACTION_REQUESTED, COMPLETE면 ACTION_COMPLETED입니다.

### 시트와 비공개 폴더 준비

setup(함수 이름 initialSetup): 내 Drive에 스프레드시트 "Vision_Risk_Records_Master_(오늘 날짜 yyyyMMdd)"와 폴더 "Vision_Risk_Records_Private_(스프레드시트 ID 앞 8글자)"를 만들고 두 ID를 스크립트 속성 SPREADSHEET_ID, DRIVE_FOLDER_ID에 저장합니다. 이미 만든 것이 있으면 그대로 쓰고 빠진 탭과 열만 끝에 더합니다. 시트와 폴더는 비공개로 둡니다. 잠금 안에서 해서 두 번 불려도 하나만 생깁니다.

요청은 `{"action": "setup"}`이고 다른 항목은 없습니다. 답은 `{"success": true, "spreadsheet_id": "...", "drive_folder_id": "...", "tabs": [...]}`입니다.

시트 탭은 records, ai_drafts, evidence_checks, final_reviews, actions, history입니다. 첫 줄에는 내 컴퓨터 저장소에서 그 목록이 저장하는 항목 이름을 열 제목으로 적습니다. 아래 순서로 둡니다.

- records: record_id, request_id, created_at, location, category, memo, image_count, status, drive_folder_id, drive_file_ids, version, updated_at
- ai_drafts: draft_id, record_id, request_id, created_at, model, facts, suspected_risk, locations, uncertainty, additional_checks, raw_response, input_version
- evidence_checks: check_id, record_id, request_id, created_at, standard_id, notebook_id, source_id, quote, match, sufficient, notes, answer, source_name, references, input_version
- final_reviews: review_id, record_id, request_id, created_at, decision, basis, followup_note, reviewer
- actions: action_id, record_id, request_id, created_at, action_type, description, evidence_note, actor, status
- history: history_id, record_id, timestamp, phase, action_name, summary, operator
 ai_drafts에는 raw_response 열도 두되 값은 비워 둡니다. Gemini 답 전체는 저장하지 않습니다. 새 스프레드시트에 처음 생기는 빈 기본 탭은 지우지 않고 그대로 둡니다.

### Gemini 키 저장

set_gemini_key: 요청은 `{"action": "set_gemini_key", "api_key": "(키)"}`입니다. api_key의 앞뒤 공백을 뗀 값이 영문·숫자·-·_ 20~200자일 때만 스크립트 속성 GEMINI_API_KEY에 저장하고 `{"success": true, "gemini_key_saved": true}`로 답합니다. 형식이 틀리면 BAD_REQUEST입니다. 키 값은 답과 오류 문장에 넣지 않습니다.

### 사건 상태 계산

사건 상태 요약과 전체 대기열 개수(queue_counts) 계산을 Code.gs 안에도 서버와 같은 규칙으로 둡니다. 서버 코드를 옮겨 와도 되고 서버 코드는 고치지 않습니다. 시트에서 읽은 시각은 날짜 값이든 글자든 같은 ISO 시각 글자로 맞추고 참거짓 칸은 TRUE, true, "TRUE"를 모두 참으로 읽습니다.

### 사건 등록과 정보 수정

create_record: 요청 항목은 request_id, location, category, memo, images(사진마다 base64, mimeType, filename)입니다. 저장소 사진은 서버가 같은 모양의 images로 바꿔 보냅니다. 사진은 1~5장, JPG·PNG, 장당 2MB 이하입니다. 비공개 폴더에 비공개 파일로 올리고 사건 줄에 drive_folder_id와 drive_file_ids(파일 ID 목록)를 적습니다. 사건 번호는 요청 번호(request_id)로 정해 같은 요청이면 같은 번호가 나옵니다. "R-" 뒤에 요청 번호의 SHA-256 16진수 앞 10글자를 붙입니다. 이미 등록된 요청이면 저장된 사건을 돌려주고 답에 idempotent를 true로 둡니다. Drive 파일 이름은 (사건 번호)_(순서, 1부터)_(원래 파일 이름, 없으면 photo)입니다. 사진만 올라가고 멈춘 요청이 다시 오면 같은 이름의 파일을 찾아 다시 씁니다.

답은 `{"success": true, "idempotent": false, "record_id": "...", "request_id": "...", "status": "REGISTERED", "created_at": "...", "image_count": 1, "drive_file_ids": [...], "record": {...}}`입니다.

update_record의 요청 항목은 record_id, request_id, operator와 바꾸는 값(location, category, memo)입니다. 내 컴퓨터 저장소의 정보 수정과 입력 검사·답 모양·이력이 같습니다.

### 목록·상세·사진 꺼내기

- get_records는 요청 항목이 없습니다. 탭마다 한 번씩만 읽어 사건별로 묶고 사건마다 상태 요약을, 전체에는 queue_counts를 붙입니다. 최근 사건이 위에 옵니다.
- get_record는 record_id를 받아 최신 사진 설명·기준 확인·판단과 조치 목록, 이력을 담아 `{"success": true, "record": {...}, "review_summary": {...}, "ai_draft": {...}, "evidence_check": {...}, "final_review": {...}, "actions": [...], "history": [...]}`로 답합니다. 없는 값은 null입니다.
- get_image는 record_id와 index(0부터)를 받아 사건에서 그 순서의 사진을 Drive에서 읽어 `{"success": true, "record_id": "...", "index": 0, "mime_type": "image/png", "base64": "..."}`로 돌려줍니다. 번호가 벗어나거나 파일이 없으면 NOT_FOUND입니다.

### 기준 확인·판단·조치 저장과 작업 맞춰 보기

- 요청 항목은 셋 다 record_id, request_id에 더해 save_evidence_check가 input_version, standard_id, notebook_id, source_id, source_name, answer, references, quote, match, sufficient, notes, save_review가 decision, basis, followup_note, reviewer, save_action이 action_type(REQUEST 또는 COMPLETE), description, evidence_note, actor입니다.
- save_evidence_check, save_review, save_action은 해당 탭에 한 줄씩 더합니다. 판정이 네 가지 밖이거나 근거가 비었을 때, 조치 유형·내용이 없거나 조치 완료인데 완료 증빙 메모가 없을 때는 거절합니다. 같은 request_id로 다시 오면 새 줄을 더하지 않고 저장된 것을 돌려줍니다.
- reconcile_job은 판독(analyze)과 기준 확인 작업(evidence_check)의 저장 결과를 request_id로 찾아 돌려줍니다. 요청 항목과 답은 위 "사진 판독 요청"의 저장소 동작 reconcile_job과 같고 job_type이 없으면 analyze로 봅니다.

## Google 쪽의 Gemini 판독(analyze_gemini)

### 사진과 지시문 보내기

요청 항목은 record_id, request_id, input_version, image_ids, input_snapshot입니다(서버가 보내는 이름 그대로입니다). 같은 request_id의 설명이 이미 있으면 그것을 돌려줍니다. 스크립트 속성 GEMINI_API_KEY가 없으면 SETUP_REQUIRED와 "GAS 스크립트 속성에 GEMINI_API_KEY가 없습니다. npm.cmd run gas:init(macOS: npm run gas:init)으로 Gemini API 키를 넣어 주세요."입니다.

- 서버가 보낸 사진 목록(image_ids, 없으면 사건의 drive_file_ids)을 Drive에서 순서대로 읽고 사진마다 앞에 "[사진 프레임 1/3]"처럼 번호 글을 붙입니다. 사진이 없으면 NO_IMAGES("분석할 원본 사진이 없습니다: (사건번호)"), 읽지 못하면 IMAGE_READ_FAILED입니다.
- 지시문은 materials/gemini-prompt.txt의 글을 Code.gs 안에 상수로 글자 그대로 옮겨 사진 뒤에 넣습니다. Google 쪽은 이 PC의 파일을 읽지 못합니다. temperature는 0.1이고 답은 JSON으로만 받습니다(responseMimeType "application/json").
- 모델은 gemini-3.8-flash와 gemini-3.5-flash-lite 두 개만 씁니다. 스크립트 속성 GEMINI_MODEL(기본 gemini-3.8-flash)과 GEMINI_FALLBACK_MODEL(기본 gemini-3.5-flash-lite, off면 쓰지 않음)로 바꿀 수 있고 목록 밖의 값이면 SETUP_REQUIRED와 "GAS 스크립트 속성의 GEMINI_MODEL·GEMINI_FALLBACK_MODEL은 gemini-3.8-flash, gemini-3.5-flash-lite 중 하나여야 합니다(대체 모델은 off도 됩니다). 값을 고치거나 지우면 기본 모델을 씁니다."를 돌려줍니다.
- 키는 주소에 넣지 않고 x-goog-api-key 헤더로 보냅니다. 주소는 https://generativelanguage.googleapis.com/v1beta/models/(모델):generateContent입니다. 보내다 예외가 나면 NETWORK_TIMEOUT(status "interrupted", interrupted true, 문장 "Gemini API 호출 중 네트워크 오류가 발생했습니다.")입니다.

### 답 읽기와 저장

Gemini 답에서 JSON을 꺼내 facts가 비어 있지 않을 때만 설명으로 받습니다. 차단은 CONTENT_BLOCKED, 빈 답은 EMPTY_RESPONSE, JSON 없음은 INVALID_JSON, 읽기 실패는 PARSE_FAILED, facts 없음은 INVALID_DRAFT_SCHEMA입니다.

받은 설명은 ai_drafts 탭에 한 줄 더하고(raw_response는 비움) 사건의 처리 상태를 AI_DRAFTED로 바꿉니다. 이력에는 단계 AI_ANALYSIS, 작업 이름 "AI 초안 생성", 내용 "Gemini 판독((모델)): (의심 위험)", 작업자 "Gemini AI"를 남깁니다. 답 모양은 내 컴퓨터 저장소의 판독과 같은 `{"success": true, "draft_id": "...", "record_id": "...", "model": "(실제 모델)", "input_version": 1, "draft": {...}}`입니다. 이미 있는 설명을 돌려줄 때는 idempotent를 true로 더합니다.

### 대체 모델과 오류 안내

판독 모델이 HTTP 503이나 429를 돌려주면 대체 모델로 한 번만 다시 보내고, 실제로 답한 모델 이름을 설명과 이력에 남깁니다. 대체 모델을 쓰지 않으면(off이거나 판독 모델과 같으면) 다시 보내지 않습니다. 그래도 실패하면 아래 문장으로 답합니다((모델)은 실제로 부른 모델). status는 "error"이고 오류 코드는 429가 RATE_LIMIT_EXCEEDED, 그 밖의 HTTP 오류는 모두 GEMINI_API_ERROR입니다.

- 429: RATE_LIMIT_EXCEEDED, "Gemini API 호출 한도를 초과했습니다 (HTTP 429). (N)초 뒤 다시 시도해주세요."(Gemini가 알려 준 초가 없으면 "(N)초 뒤" 대신 "잠시 후")
- 503: "Gemini 서버가 붐벼 판독하지 못했습니다(HTTP 503, (모델)). 잠시 뒤 다시 판독을 요청하세요."
- 400: "Gemini API 키가 올바르지 않거나 요청을 받아 주지 않았습니다(HTTP 400, (모델)). config/local-connection.json의 GEMINI_API_KEY를 확인하고 npm.cmd run gas:init(macOS: npm run gas:init)을 다시 실행하세요."
- 403: "Gemini API 키에 이 요청을 할 권한이 없습니다(HTTP 403, (모델)). AI Studio에서 새 키를 만들어 npm.cmd run gas:init(macOS: npm run gas:init)으로 다시 넣으세요."
- 404: "Gemini 판독 모델을 찾지 못했습니다(HTTP 404, (모델)). 스크립트 속성 GEMINI_MODEL·GEMINI_FALLBACK_MODEL을 지우거나 gemini-3.8-flash, gemini-3.5-flash-lite 중 하나로 두세요."
- 그 밖의 HTTP 오류: "Gemini API 분석 요청 중 오류가 발생했습니다 (HTTP (번호), (모델))."

### 모델 설정 알려 주기

gemini_settings는 요청 항목이 없고 `{"success": true, "model": "(판독 모델)", "fallback_model": "(대체 모델)"}`을 돌려줍니다. 대체 모델을 쓰지 않으면 fallback_model은 빈 글자입니다.

## 서버가 Google 쪽을 부르는 법

### 요청 보내기와 실패 이름

보낼 때는 JSON을 POST로 보내고 302 이동이 오면 직접 따라가 결과 주소를 GET으로 받습니다. 주소는 https만 받습니다(127.0.0.1·localhost 시험 서버만 http 허용). 제한 시간은 create_record와 analyze_gemini가 300초, 나머지는 120초입니다.

Google 로그인 화면은 이동할 주소의 호스트가 accounts.google.com이거나 받은 글에 accounts.google.com/ServiceLogin이나 accounts.google.com/signin(가운데 v3/가 있어도)이 들어 있는 경우입니다.

실패는 이렇게 바꿉니다. Google 로그인 화면으로 이동하거나 401·403이면 GAS_AUTH_REQUIRED, 접속을 못 하면 GAS_UNREACHABLE, 404면 GAS_URL_INVALID, 429면 RATE_LIMIT_EXCEEDED, JSON이 아니면 GAS_NON_JSON_RESPONSE, 그 밖의 HTTP 오류는 GAS_HTTP_ERROR, 시간 초과면 NETWORK_TIMEOUT입니다. 302를 받은 뒤의 실패와 시간 초과는 Google 쪽이 이미 실행했을 수 있으니 status "interrupted"로 둡니다. 오류 문장에 웹앱 주소를 넣지 않습니다.

### 저장소 고르기

STORAGE_MODE=live이면 사건 등록, 정보 수정, 목록, 상세, 판단·조치 저장, 사진 판독, 기준 확인 결과 저장, 작업 맞춰 보기를 내 컴퓨터 저장소 대신 Google 쪽에 같은 action 이름으로 보냅니다. mock이면 GAS_WEBAPP_URL에 값이 있어도 Google 쪽을 부르지 않습니다. 어느 쪽을 쓸지는 서버 한 곳에서 고릅니다.

서버를 켤 때는 연동 상태 줄을 먼저 보여 줍니다. Gemini가 live이면 이어서 gemini_settings로 판독 모델을 물어 "연동 상태: 저장소 Google 시트 · Gemini live(gemini-3.8-flash, 대체 gemini-3.5-flash-lite) · NotebookLM live"처럼 모델을 붙인 줄을 한 번 더 보여 주고 /api/health의 integration_status에도 같은 줄을 씁니다. 대체 모델이 없으면 ", 대체 …"를 뺍니다. 묻지 못하면 "Gemini 판독 모델을 GAS에서 확인하지 못했습니다: (이유)"를 보여 주고 서버는 그대로 켜 둡니다.

### 화면에 돌려줄 오류 번호

화면에 돌려줄 HTTP 번호는 SETUP_REQUIRED·GAS_AUTH_REQUIRED·GAS_URL_INVALID는 503, RATE_LIMIT_EXCEEDED·LOCK_TIMEOUT은 429, GAS_UNREACHABLE·GAS_NON_JSON_RESPONSE·GAS_HTTP_ERROR는 502, NOT_FOUND는 404, BAD_REQUEST는 400, 그 밖은 500입니다. LOCK_TIMEOUT의 문장은 "다른 저장이 끝나기를 기다리다 시간이 지났습니다. 잠시 뒤 다시 요청하세요(LOCK_TIMEOUT)."로 바꿔 보여 줍니다.

### 작업 기록

live일 때도 작업 기록은 지금 쓰는 작업 폴더(4회차 문서의 runtime/jobs, 이미 있는 코드가 다른 폴더를 쓰면 그 폴더)에 둡니다. 폴더를 옮기지 않습니다.

### Drive 사진과 사건 정보

live에서 사건 사진 주소를 열면 서버가 get_image로 Drive 사진을 받아 보여 줍니다. 받은 사진은 Drive 파일 ID를 기준으로 runtime 폴더 안 image-cache 폴더에 저장해 두고 다음부터 씁니다. 저장해 둔 사진을 읽을 때도 JPG·PNG인지 다시 확인하고, 저장이 실패해도 사진은 보여 줍니다.

등록 화면의 직접 파일 업로드 탭 사진 칸 아래 안내는 "현장 사진은 Google Drive 비공개 폴더에 즉시 격리 보존됩니다."입니다(다른 안내가 이미 있으면 바꿉니다).

"이전 기록과 사건 정보" 칸의 사건 번호 줄 아래에 "Drive 폴더 ID:"와 "Drive 파일 목록:" 두 줄을 두고(사진 파일 줄이 이미 있으면 이 두 줄로 바꿉니다) 저장소와 관계없이 늘 보여 줍니다. 서버와 Code.gs 모두 목록·상세의 사건 정보에 drive_folder_id와 drive_file_ids를 넣습니다. 내 컴퓨터 저장이면 빈 값이어도 됩니다. 사건 상태 요약에는 넣지 않습니다.

## Google 쪽 명령(package.json의 npm.cmd run gas:…)

프로젝트 맨 위의 .clasp.json을 "Google 연결 설정 파일"이라고 부릅니다. git에 올리지 않는 것(.gitignore)에 .clasp.json을 더합니다. runtime 폴더(2회차)가 없으면 runtime 폴더도 더합니다.

clasp는 npx --yes @google/clasp@3.4.1로 부르고 묻는 질문 없이 끝나게 합니다. 도우미 스크립트에서 부를 때 Windows에서는 셸로 실행하고, clasp 출력은 그대로 보여 줍니다.

### 로그인, 올리기, 편집기 열기

gas:login은 clasp login, gas:push는 clasp push --force(--force를 빼지 않음), gas:editor는 clasp open-script입니다.

### gas:create (도우미 스크립트)

빈 임시 폴더 runtime/gas-create를 만들고 clasp create-script --type standalone --title "비전 리스크 대시보드" --rootDir runtime/gas-create로 프로젝트를 만든 뒤 .clasp.json의 rootDir만 gas 폴더로 바꿉니다. clasp가 만들 때 지정한 폴더에 기본 appsscript.json을 받아 우리 파일을 덮어쓰기 때문입니다.

출력에 "Created new script"가 없으면 "clasp가 프로젝트를 만들지 못했습니다. 위 출력을 확인하고, 로그인이 만료됐으면 npm.cmd run gas:login을 다시 실행하세요."로 실패합니다. 성공하면 ".clasp.json이 gas 폴더를 가리키게 했습니다."를 보여 줍니다.

### gas:deploy

GAS_WEBAPP_URL에 이미 값이 있으면 배포하지 않고 "이미 배포 주소가 있습니다. npm.cmd run gas:redeploy로 갱신하세요."를 보여 줍니다.

clasp create-deployment --description vision-risk로 새 웹앱 배포를 만들고 clasp 출력에서 AKfyc로 시작하는 배포 ID를 정확히 하나 찾았을 때만 설정 파일의 GAS_WEBAPP_URL에 https://script.google.com/macros/s/(배포 ID)/exec를 적습니다. 이때 STORAGE_MODE가 비어 있으면 live로 같이 적고 다른 키는 그대로 둡니다. clasp가 0으로 끝나도 ID가 없으면 실패입니다(ID가 없거나 둘 이상이면 "clasp 출력에서 배포 ID를 찾지 못했습니다. 위 출력을 확인하고, 로그인이 만료됐으면 npm.cmd run gas:login을 다시 실행하세요."). 성공하면 "config/local-connection.json에 GAS_WEBAPP_URL을 적었습니다."를 보여 줍니다.

### gas:redeploy

설정 파일 주소의 배포 ID로 clasp update-deployment (배포 ID) --description vision-risk를 불러 같은 배포를 새 버전으로 갱신합니다(주소는 그대로). 주소가 없으면 "config/local-connection.json에 GAS_WEBAPP_URL이 없습니다. 먼저 npm.cmd run gas:deploy를 실행하세요."로 실패합니다. 출력에 "Redeployed (배포 ID) @"가 없으면 위 배포 ID 문장으로 실패합니다. 성공하면 "같은 배포를 새 버전으로 갱신했습니다. 주소는 그대로입니다."를 보여 줍니다.

### gas:open

"브라우저로 엽니다. 권한 승인 화면이 나오면 허용하세요."와 웹앱 주소 한 줄을 보여 주고 기본 브라우저로 엽니다. 시크릿 창에 붙여 넣을 때 쓰므로 이 명령만 웹앱 주소를 터미널에 보여 줍니다. 웹앱 주소를 터미널에 쓰지 않는다는 지침에서 이 명령만 예외입니다. 주소가 없으면 gas:redeploy와 같은 문장으로 실패합니다. 이 명령은 사용자가 직접 칩니다.

### gas:init

설정 파일의 GAS_WEBAPP_URL로 Google 쪽에 setup을 보내고, GEMINI_API_KEY에 값이 있으면 set_gemini_key로 키를 보냅니다. 다시 실행해도 됩니다. 키는 설정 파일에서만 읽고 같은 이름의 환경 변수는 읽지 않습니다. 아래 순서로 진행합니다.

1. GAS_WEBAPP_URL이 비어 있으면 "GAS_WEBAPP_URL이 비어 있습니다. npm.cmd run gas:deploy로 배포하면 자동으로 적힙니다. 편집기에서 배포했다면 웹 앱 URL을 config/local-connection.json의 GAS_WEBAPP_URL에 넣으세요."를 보여 주고 끝납니다.
2. setup을 보내기 전에 키 형식을 검사합니다. 키가 있는데 형식이 틀리면 "GEMINI_API_KEY 값이 Gemini API 키 형식이 아닙니다(영문·숫자·-·_ 20자 이상). AI Studio에서 복사한 키를 따옴표 안에 그대로 넣었는지 확인하세요. 아무것도 보내지 않았습니다."를 보여 주고 아무것도 보내지 않습니다.
3. setup을 보냅니다.
4. 키가 비어 있으면 "GEMINI_API_KEY가 비어 있어 키는 보내지 않았습니다. AI 판독을 쓰려면 config/local-connection.json의 GEMINI_API_KEY에 키를 넣고 npm.cmd run gas:init을 다시 실행하세요. 기록 저장은 키 없이도 됩니다."를 보여 주고 끝냅니다. 키가 있으면 set_gemini_key를 보냅니다.

상황별로 아래 문장을 보여 줍니다.

- Google 쪽이 승인·로그인 화면을 돌려주면 "GAS 웹앱이 아직 권한 승인 전입니다. npm.cmd run gas:open으로 웹앱 주소를 한 번 열어 허용하세요. 안 되면 npm.cmd run gas:editor로 편집기를 열고 initialSetup을 한 번 실행하세요."를 보여 줍니다.
- 모르는 action이라는 답이면 "GAS 웹앱이 (setup 또는 set_gemini_key) 동작을 모릅니다(BAD_REQUEST). 웹앱 코드가 예전 것입니다. npm.cmd run gas:push와 npm.cmd run gas:redeploy로 최신 코드를 배포한 뒤 다시 실행하세요."를 보여 줍니다.
- 그 밖의 실패는 "GAS (setup 또는 set_gemini_key) 요청에 실패했습니다((오류 코드)). (이유)"를 보여 줍니다. (이유)에서 키와 주소, 25글자가 넘는 영문·숫자 덩어리는 가립니다.
- 성공하면 "Google 시트와 비공개 Drive 폴더를 준비했습니다."와 "Gemini API 키를 GAS 스크립트 속성 GEMINI_API_KEY에 저장했습니다."를 보여 줍니다.
- 웹앱 주소, 키, 긴 ID는 어느 경우에도 출력하지 않습니다.

### AI가 명령을 실행할 때

AI가 gas:create, gas:push, gas:deploy, gas:redeploy, gas:init을 실행하면 답에는 각 명령의 마지막 결과 줄만 쓰고 스크립트 ID, 배포 ID, 웹앱 주소는 쓰지 않습니다. gas:deploy는 한 번만 실행합니다. 다시 하면 새 주소가 생깁니다. gas:login과 gas:open은 사용자가 직접 칩니다.
