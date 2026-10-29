# 5회차: 사진 판독(Gemini)과 Google 시트 저장(GAS)

시작: `milestone-4` 브랜치(또는 지난 회차까지 내가 만든 코드)
끝나면: 사건 기록이 내 Google 시트와 Drive에 저장된다. 사건 상세의 2번 구역 "AI 사진 설명 (Gemini)"에서 사진 판독을 요청하면 GAS를 거쳐 Gemini가 쓴 사진 설명 초안이 보이고, 관련 기준 확인은 이 설명이 있어야 할 수 있다. 판독 요청도 요청 알림 패널에 보인다.

## 시작하기 전에
1. Antigravity에서 `vision-risk-dashboard-student` 폴더를 엽니다.
2. 지난 회차 브랜치에서 시작하려면 터미널에서 `git switch milestone-4`를 칩니다. 내가 만든 코드로 이어 가면 이 줄은 건너뜁니다.
3. `npm.cmd ci`로 설치하고 `npm.cmd start`로 서버를 켭니다. 사진 저장소 폴더와 `config/local-connection.json`은 지난 회차 그대로 씁니다.
4. 개인 Google 계정 하나를 준비합니다. 학교·회사 계정은 웹앱 배포 설정("모든 사용자")이 막힐 수 있습니다.

이번 회차는 세 부분입니다. 5-1~5-15는 Gemini 모의 결과로 화면 흐름을 만들고, 5-16~5-30은 GAS 코드와 연결 명령을 만들고, 5-31~5-39는 직접 배포해 실제 연결로 바꿉니다.
서버 쪽을 고친 단계 뒤에는 서버 창에서 `Ctrl+C`로 끄고 `npm.cmd start`로 다시 켭니다. 화면만 고친 단계는 브라우저 새로 고침만 하면 됩니다.

## 5-1. 연동 스위치 두 개 더하기
저장소를 어디에 둘지와 Gemini를 쓸지를 정하는 스위치를 더합니다.
```text
설정 파일에 STORAGE_MODE(live: GAS를 거쳐 Google 시트에 저장, mock: 지금처럼 이 PC 파일에 저장)와 GEMINI_MODE(off, mock, live) 스위치를 더해 줘.
STORAGE_MODE를 비워 두면 live로, GEMINI_MODE와 NOTEBOOKLM_MODE를 비워 두면 STORAGE_MODE와 같은 값으로 봐 줘.
설정 예시 파일에 이 두 키와 GAS_WEBAPP_URL, GEMINI_API_KEY를 빈 값으로 더하고, GEMINI_API_KEY는 서버가 읽어 쓰지 않게(환경 변수로 옮기지 않게) 해 줘.
연동 상태 줄을 "연동 상태: 저장소 로컬 저장 · Gemini mock · NotebookLM live"처럼 세 가지로 보여 주고(live 저장소는 "저장소 Google 시트", off는 "꺼짐"), 화면 위 줄은 live가 아닌 것이 하나라도 있을 때만 보여 줘.
```
확인: 다음 단계(5-2)에서 설정 파일을 고친 뒤 서버를 켜서 본다.

## 5-2. 수업 조합으로 켜기 (직접 하기)
`config/local-connection.json`을 열어 `"STORAGE_MODE": "mock",`과 `"GEMINI_MODE": "mock",`을 적습니다.
`"NOTEBOOKLM_MODE"`도 지난 회차에 쓰던 값(`"live"` 또는 `"mock"`)으로 분명히 적습니다. 비워 두면 이제 `STORAGE_MODE`를 따라 `mock`이 되어, 실제 NotebookLM을 쓰던 사람도 모르는 사이에 모의 결과로 바뀝니다.
파일 맨 마지막 항목 뒤에는 쉼표를 붙이지 않습니다. 저장한 뒤 서버를 껐다가 `npm.cmd start`로 다시 켭니다.
확인: 서버 창과 화면 위에 `연동 상태: 저장소 로컬 저장 · Gemini mock · NotebookLM …`이 보이고, 지난 회차 사건이 그대로 보인다.

## 5-3. 함께 쓸 수 없는 조합 막기
```text
STORAGE_MODE=live일 때 GEMINI_MODE나 NOTEBOOKLM_MODE가 mock이면 서버가 켜지지 않게 해 줘. 모의 결과가 실제 시트 기록에 섞이면 안 되기 때문이야.
STORAGE_MODE=mock일 때 GEMINI_MODE=live도 막아 줘. Gemini는 GAS 안에서 부르기 때문이야.
막을 때는 포트를 잡기 전에 이유와 고칠 방법을 한 줄로 알려 주고 끝나게 해 줘. off는 어느 조합에서나 쓸 수 있어.
```
확인: 설정 파일의 `GEMINI_MODE`만 `live`로 바꿔 서버를 켜면 "STORAGE_MODE=mock에서는 GEMINI_MODE=live를 쓸 수 없다."로 시작하는 줄이 나오고 끝난다. 확인한 뒤 `mock`으로 되돌린다.

## 5-4. GAS 주소가 없을 때 "설정 필요"
```text
STORAGE_MODE=live인데 설정 파일의 GAS_WEBAPP_URL이 비어 있으면, 사건 저장·조회 요청이 "설정 필요" 오류(HTTP 503, SETUP_REQUIRED)를 돌려주게 해 줘.
오류 문구에는 GAS_WEBAPP_URL에 웹앱 /exec 주소를 넣고 서버를 다시 켜라는 것과, GAS 없이 쓰려면 STORAGE_MODE를 mock으로 두라는 것을 적어 줘.
화면은 이 오류를 받으면 위쪽 연결 표시를 "설정 필요 (GAS Web App 배포 대기)"로 바꾸고, 다음에 조회가 성공하면 원래대로 돌려줘.
/api/health에는 세 스위치 값과 GAS 주소를 넣었는지(gas_configured)를 같이 보여 줘.
```
확인: 설정 파일을 잠깐 `STORAGE_MODE` `live`, `GEMINI_MODE` `off`, `NOTEBOOKLM_MODE` `off`로 바꿔 켜면 연결 표시가 "설정 필요 (GAS Web App 배포 대기)"가 되고, `http://127.0.0.1:8765/api/health`에 `"gas_configured":false`가 보인다. 확인한 뒤 5-2의 값으로 되돌린다.

## 5-5. 로컬 저장소에 모의 사진 설명 저장하기
```text
로컬 저장소에 AI 사진 설명 목록(ai_drafts)을 더하고, 저장소 동작 이름 analyze_gemini로 사진 판독을 요청받으면 모의 설명 초안 하나를 저장하는 처리를 만들어 줘. 예전 기록 파일에 이 목록이 없으면 빈 목록으로 읽어 줘.
초안에는 관찰 사실, 의심 위험, 위치, 불확실성, 추가 확인 다섯 칸과 모델 이름 gemini-3.8-flash-synthetic, 판독한 사건 정보 버전을 넣어 줘. 글은 산업안전이면 안전모 미착용, 택배 발송 확인이면 상자 모서리 눌림 예시로 채워 줘.
저장하면 사건 처리 단계를 AI_DRAFTED로 바꾸고, 이력에 단계 AI_ANALYSIS, 작업 이름 "AI 초안 생성", 내용 "Gemini 판독: 의심 위험"을 남겨 줘. 작업자 이름 끝에는 (Synthetic)을 붙여 모의임을 알 수 있게 해 줘.
같은 요청 번호로 다시 오면 새로 만들지 말고 저장된 초안을 돌려주고, 사건 상세 조회에는 가장 최근 초안을 같이 담아 줘.
```
확인: 서버를 다시 켰을 때 오류 없이 켜진다. 화면 확인은 5-9에서 한다.

## 5-6. 사진 판독 요청 API
```text
POST /api/records/사건번호/analyze를 만들어 줘. 관련 기준 확인 요청처럼 작업 대기열에 판독(analyze) 작업으로 넣고 바로 202와 작업 번호를 돌려줘.
작업은 요청한 때의 사건 정보 버전과 사진 목록을 고정해 두고 판독 처리를 부르고, 실패하면 오류 코드와 문구를 작업에 남겨 줘.
서버를 다시 켠 뒤 끝나지 않은 판독 작업을 맞춰 볼 때는 같은 요청 번호의 초안이 저장돼 있는지 찾게 해 줘.
GEMINI_MODE=off이면 HTTP 409와 "Gemini 연동이 꺼져 있습니다(GEMINI_MODE=off). 사진 설명을 받으려면 GEMINI_MODE를 바꾸고 로컬 서버를 다시 시작하세요."를 돌려줘.
```
확인: 서버를 다시 켰을 때 오류 없이 켜진다. 화면 확인은 5-9에서 한다.

## 5-7. 사건 상세를 4단계로
```text
사건 상세의 확인 순서를 4단계로 바꿔 줘: 1. 사진, 2. AI 사진 설명 (Gemini), 3. 관련 기준 확인 (NotebookLM), 4. 내 판단 남기기.
처음 열 때 단계는 사진이 없으면 1, 지금 버전의 Gemini 설명이 없으면 2, 지금 버전의 기준 확인이 없으면 3, 아니면 4로 정하고, 꺼진 연동의 단계는 건너뛰어 줘.
안내 문구는 2단계 "Gemini 사진 설명을 확인해 주세요.", 3단계 "AI 결과를 확인했다면, NotebookLM으로 관련 기준을 찾아 사진과 비교해 주세요."로 해 줘.
새 2번 구역 끝에 "다음: 관련 기준 확인" 단추를 두고, "다음: 내 판단 남기기" 단추는 3번 구역 끝에 둬. 4번 구역 안내는 "AI 결과와 기준을 참고해, 직접 확인한 판단을 기록하세요."로 해 줘.
```
확인: 사건 상세의 확인 순서가 네 칸이고, 판독하지 않은 사건은 2단계가 강조돼 있다. "다음: 관련 기준 확인"을 누르면 3단계로 옮겨 간다.

## 5-8. 2번 구역 내용
```text
2번 구역 "2. AI 사진 설명 (Gemini)"에 접었다 펴는 "사진 설명 더 보기 · Gemini" 칸을 만들어 줘. 설명이 아직 없으면 펼쳐 둬.
칸 안에 요청 진행 표시 자리와 판독 요청 단추를 두고, 단추 이름은 설명이 없으면 "사진 설명 더 보기", 있으면 "사진 설명 다시 보기"로 해 줘.
설명이 있으면 "Gemini 관찰 초안" 아래 "판독 모델: 모델 이름", 관찰 사실, "확인할 점:"(의심 위험), "추가 확인:"을 보이고, 위치와 불확실성은 "관찰 위치와 한계"를 펼치면 보이게 해 줘.
설명이 사건 정보를 고치기 전 버전이면 접는 칸 바깥, 2번 제목 바로 아래에 "수정 전 결과입니다. 현재 사진과 내용을 다시 확인해 주세요."를 보이고, GEMINI_MODE=off이면 단추를 끄고 "Gemini 연동이 꺼져 있습니다(GEMINI_MODE=off)."를 적어 줘.
```
확인: 판독하지 않은 사건의 2번 구역이 펼쳐져 있고 "사진 설명 더 보기" 단추가 보인다.

## 5-9. 판독 요청 단추
```text
"사진 설명 더 보기" 단추를 누르면 판독 요청을 보내 줘. 요청 번호 만들기, 보내는 중 연결이 끊겼을 때 처리, 진행 따라가기는 관련 기준 확인 요청과 같은 방식으로 해 줘.
기다리는 동안 단추를 끄고 "AI 초안 분석 중..."으로 바꾸고, 2번 구역 진행 표시에 지금 상태를 보여 줘.
끝나면 상세 오른쪽 검토 영역만 다시 받아 그리고, 2번 구역 칸을 펼쳐 새 설명이 바로 보이게 해 줘.
사진을 읽을 수 없는 사건이면 요청하지 말고 "사진 내용을 확인할 수 없어 AI 분석을 요청할 수 없습니다. 다른 사진으로 새 사건을 등록해 주세요."를 알려 줘.
```
확인: 단추를 누르면 잠시 "AI 초안 분석 중..."이 보인 뒤 "Gemini 관찰 초안"과 "판독 모델: gemini-3.8-flash-synthetic"이 나온다. 이력에는 "Gemini 판독" 단계가 아직 코드 이름(`AI_ANALYSIS`)으로 보일 수 있다(5-13에서 바꾼다).

## 5-10. 요청 알림 패널과 중단 안내
```text
요청 알림 패널이 판독 요청도 보여 주게 해 줘. 제목은 "AI 초안 요청 전송 중...", "AI 초안 요청 접수", "AI 초안 분석 중", "AI 초안이 준비됐습니다.", "AI 초안 생성 실패", "AI 초안 요청을 다시 보내 주세요"로 해 줘.
판독이 시간 초과나 연결 끊김(NETWORK_TIMEOUT)으로 중단되면 제목은 "AI 초안 요청이 중단됐습니다", 안내는 "Gemini 응답이 늦거나 연결이 끊겨 AI 초안을 받지 못했습니다. Gemini가 붐빌 때 생길 수 있습니다. 3분쯤 뒤 이 사건을 다시 열어 AI 초안이 없으면 다시 요청해 주세요."로 해 줘. 2번 구역 진행 표시도 같은 안내를 써 줘.
새로 고친 뒤에도 진행 중인 판독 요청을 이어서 보여 주고, 확인하지 않은 판독 상태(진행 중·중단·실패·전송 확인 필요)가 있으면 2번 구역을 펼쳐 줘.
```
확인: 판독을 요청하고 바로 벨을 누르면 "AI 초안 분석 중"이 잠깐 보였다가 "AI 초안이 준비됐습니다."로 바뀐다. 새로 고쳐도 이 알림이 남아 있다. 모의 판독은 1~2초 안에 끝나므로 기다리는 중 새로 고침과 중단 안내는 5-39 실제 연결에서 본다.

## 5-11. 사건 상태 계산에 Gemini 설명 더하기
```text
사건 상태 요약에 최신 Gemini 설명(관찰 사실, 의심 위험, 위치, 불확실성, 추가 확인, 판독한 버전, 만든 시각)을 더해 줘.
사건 정보를 고친 뒤라 설명이 예전 것이면 판단·기준 확인처럼 "수정 전 자료"로 표시하고, 상세 위쪽의 정보가 바뀌었다는 경고에도 넣어 줘.
"추가 확인" 사건의 확인 이유는 판단 기록에 적은 내용이 없을 때 Gemini의 추가 확인 글을 쓰게 해 줘.
```
확인: 판독한 사건의 정보를 수정하면 2번 구역에 "수정 전 결과입니다. 현재 사진과 내용을 다시 확인해 주세요."가 보이고 진행 단계가 다시 2로 돌아간다.

## 5-12. 관련 기준 확인은 Gemini 설명이 먼저
```text
3번 구역의 "관련 기준 찾기" 단추는 지금 버전의 Gemini 설명이 있을 때만 켜고, 없으면 "먼저 2단계 Gemini 설명을 준비해 주세요."를 보여 줘.
서버도 막아 줘. 설명이 없으면 HTTP 400과 "현재 사건의 Gemini 설명을 먼저 준비해 주세요.", 예전 버전이면 400과 "사건 정보가 수정되었습니다(v1 -> v2). 최신 사건 정보로 AI 분석을 다시 실행한 후 근거 확인을 요청해주세요."(숫자는 실제 버전)를 돌려줘.
NotebookLM에 보내는 질문은 분류·사진 장수 대신 장소, 메모, Gemini 의심 위험, 관찰 초안, 위치, 불확실성으로 만들어 줘.
```
확인: 판독하지 않은 사건은 "관련 기준 찾기"가 꺼져 있고 안내 문구가 보인다. 판독한 뒤에는 단추가 켜지고 기준 확인 결과가 나온다. 모의 NotebookLM은 질문에 "가림"·"불명확"·"반사"가 들어 있으면 근거 부족(판단 보류)으로 답하므로, 모의 설명 글에 따라 "근거를 충분히 찾지 못했습니다"가 나와도 정상이다.

## 5-13. 다른 화면에 Gemini 설명 보이기
```text
홈 카드의 관찰 칸은 Gemini 설명이 있으면 "AI 관찰: 관찰 사실"을, 예전 버전이면 "AI 관찰(수정 전 자료): …", 시점을 알 수 없으면 "AI 관찰(시점 불명): …"을 보여 주고, 설명이 없으면 지금처럼 현장 메모를 보여 줘.
홈 카드 단추는 Gemini 설명만 있어도 "이어서 확인"으로 보여 줘.
판단 기록 화면의 참고 칸 맨 위에 "Gemini 관찰 사실:"(없으면 "AI 초안 미등록")을 더하고, 옆 사진 설명에는 판단 근거가 없을 때 관찰 사실을 보여 줘.
사건 이력의 AI_ANALYSIS 단계는 "Gemini 판독"으로, 작업자 끝의 (Synthetic)은 (mock)으로 보여 줘.
```
확인: 홈의 확인이 필요한 현장 카드에 "AI 관찰: …"이 보이고, 판단 기록 화면에 "Gemini 관찰 사실:"이 보인다. 이력에 "Gemini 판독"과 작업자 "… (mock)"이 보인다.

## 5-14. 꺼진 Gemini 확인 (직접 하기)
설정 파일의 `GEMINI_MODE`를 `off`로 바꾸고 서버를 다시 켭니다.
확인: 연동 상태 줄에 "Gemini 꺼짐"이 보이고, 2번 구역 단추가 꺼져 있으며 "Gemini 연동이 꺼져 있습니다(GEMINI_MODE=off)."가 보인다. 판독하지 않은 사건은 3단계 "관련 기준 찾기"도 꺼져 있다(Gemini 설명이 있어야 기준을 확인할 수 있다). 확인한 뒤 `mock`으로 되돌리고 서버를 다시 켠다.

## 5-15. 모의 흐름 끝까지 (직접 하기)
1. 사진 1장으로 새 사건을 등록하고 상세로 갑니다.
2. "사진 설명 더 보기"를 눌러 Gemini 관찰 초안을 받고, "다음: 관련 기준 확인"으로 옮겨 "관련 기준 찾기"를 누릅니다.
3. "판단 기록하기"로 판단을 남깁니다.
4. "정보 수정"으로 메모를 바꾼 뒤 상세로 돌아옵니다.
확인: 4번 뒤 2번 구역에 수정 전 결과 경고가 보이고 "관련 기준 찾기"가 꺼진다. "사진 설명 다시 보기"를 누르면 경고가 사라지고 단추가 다시 켜진다.

## 5-16. GAS 파일 두 개 만들기
여기서부터 Google에서 실행될 GAS 코드를 만듭니다. 이 PC에서는 실행해 볼 수 없어서 5-34에서 올린 뒤 실제로 확인합니다.
```text
GAS 웹앱 코드 폴더 courses/vision-96h-v2/gas를 만들고 Code.gs와 appsscript.json 두 파일을 넣어 줘(내 코드 구조가 다르면 프로젝트 안의 gas 폴더로 해 줘).
appsscript.json은 시간대 Asia/Seoul, 런타임 V8, 권한 범위는 스프레드시트·Drive·외부 요청(script.external_request), 웹앱은 실행 사용자 나(USER_DEPLOYING)·액세스 모든 사용자(ANYONE_ANONYMOUS)로 해 줘.
Code.gs의 doPost는 받은 JSON의 action 이름으로 처리를 나누고 늘 JSON으로 답하게 해 줘. 본문이 비었거나 JSON이 아니거나 모르는 action이면 BAD_REQUEST(모르는 action은 "Unknown action: 이름")를 돌려줘.
doGet은 기록을 읽지 말고 status "ok"와 message "권한 승인이 끝났습니다. 이 창을 닫고 터미널로 돌아가세요."만 돌려줘.
```
확인: gas 폴더에 `Code.gs`와 `appsscript.json` 두 파일만 있고, `appsscript.json`에서 `Asia/Seoul`, `ANYONE_ANONYMOUS`가 찾아진다.

## 5-17. 시트와 비공개 폴더 준비 (GAS)
```text
GAS에 시트 준비 함수 initialSetup과 action "setup"을 만들어 줘. 내 Drive에 스프레드시트 "Vision_Risk_Records_Master_날짜(yyyyMMdd)"와 폴더 "Vision_Risk_Records_Private_…"를 만들고, 두 ID를 스크립트 속성 SPREADSHEET_ID·DRIVE_FOLDER_ID에 저장해 줘.
시트에는 로컬 저장소의 여섯 목록(records, ai_drafts, evidence_checks, final_reviews, actions, history)과 같은 이름의 탭을 만들고, 첫 줄에 그 목록이 저장하는 필드 이름을 열 제목으로 적어 줘. ai_drafts에는 raw_response 열도 둬(값은 비워 둠).
이미 만든 시트와 폴더가 있으면 그대로 쓰고 빠진 탭과 열만 끝에 더해 줘. 스프레드시트와 폴더는 비공개로 고정하고, setup은 잠금 안에서 해서 두 번 불려도 하나만 생기게 해 줘.
action "set_gemini_key"는 받은 키가 Gemini 키 형식(영문·숫자·-·_ 20~200자)일 때만 스크립트 속성 GEMINI_API_KEY에 저장하고, 키 값은 응답과 오류 문구에 넣지 마.
```
확인: `Code.gs`에서 `initialSetup`, `SPREADSHEET_ID`, `DRIVE_FOLDER_ID`, `set_gemini_key`가 찾아진다.

## 5-18. 시트 공통 규칙 (GAS)
```text
시트에 글자를 쓸 때 =, +, -, @, 탭, 줄바꿈(CR), 숫자로 시작하면 앞에 '를 붙여 글자 그대로 저장하고, 읽을 때는 그 '를 떼 줘. 사진 파일 ID 목록은 JSON 글자로 저장해 줘.
쓰는 동작은 스크립트 잠금으로 하나씩 처리하고, 10초 기다려도 잠금을 못 잡으면 오류 코드 LOCK_TIMEOUT으로 답해 줘.
처리 중 예외가 나면 JSON으로 답해 줘. 시트·폴더 ID가 없으면 status "setup_required"와 SETUP_REQUIRED, 잠금이면 LOCK_TIMEOUT, 그 밖은 INTERNAL_ERROR로 해 줘.
```
확인: `Code.gs`에서 `LOCK_TIMEOUT`, `SETUP_REQUIRED`, `INTERNAL_ERROR`가 찾아진다.

## 5-19. 사건 등록과 정보 수정 (GAS)
```text
GAS에 action "create_record"와 "update_record"를 만들어 줘. 서버의 로컬 저장소 처리와 같은 입력 검사·응답 모양·이력을 쓰고, 저장만 시트로 해 줘.
등록할 때 사진(1~5장, JPG·PNG, 2MB 이하)은 비공개 폴더에 비공개 파일로 올리고, 폴더 ID와 파일 ID 목록을 사건 행에 적어 줘.
사건 번호는 요청 번호로 정해서 같은 요청을 다시 보내도 같은 번호가 나오게 하고, 이미 등록된 요청이면 저장된 사건을 돌려줘. 사진만 올라가고 멈춘 요청을 다시 보내면 이미 올린 사진 파일을 다시 써 줘.
```
확인: `Code.gs`에서 `create_record`, `update_record`, `DriveApp`이 찾아진다.

## 5-20A. 사건 상태 계산 옮기기 (GAS)
```text
서버의 사건 상태 계산 코드(사건 상태 요약과 대기열 개수를 만드는 함수, 거기서 쓰는 날짜·참거짓 정리 함수 포함)를 Code.gs에 같은 규칙 그대로 옮겨 줘.
Node 전용 줄(require, module.exports)은 빼고, 서버 코드는 고치지 마.
```
확인: `Code.gs`에서 상태 요약 함수와 대기열 개수 함수 이름이 서버 코드와 같은 이름으로 찾아진다.

## 5-20B. 목록·상세·사진 조회 (GAS)
```text
GAS에 action "get_records", "get_record", "get_image"를 만들어 줘. 로컬 저장소 조회와 같은 모양으로 돌려줘.
목록은 탭마다 한 번씩만 읽어 사건별로 묶고, 5-20A에서 옮긴 계산으로 사건마다 상태 요약과 전체 대기열 개수(queue_counts)를 붙여 줘. 최근 사건이 위에 오게 해 줘.
상세에는 최신 Gemini 설명·기준 확인·판단과 조치 목록, 이력을 담아 줘. get_image는 사건의 n번째 사진을 Drive에서 읽어 base64와 종류(mime)로 돌려줘.
```
확인: `Code.gs`에서 `get_records`, `get_image`, `queue_counts`가 찾아진다.

## 5-21. 기준 확인·판단·조치 저장 (GAS)
```text
GAS에 action "save_evidence_check", "save_review", "save_action", "reconcile_job"을 만들어 줘.
서버의 로컬 저장소 처리와 같은 검사·응답·이력 규칙을 쓰고, 저장은 시트의 해당 탭에 한 줄씩 더해 줘. 판정이 네 가지 밖이거나 근거가 비었을 때, 조치 유형·내용이 없거나 조치 완료인데 완료 증빙 메모가 없을 때는 거절해 줘.
같은 요청 번호로 다시 오면 새 줄을 더하지 말고 저장된 것을 돌려주고, reconcile_job은 판독(analyze)과 기준 확인 작업의 저장 결과를 요청 번호로 찾아 줘.
```
확인: `Code.gs`에서 `save_evidence_check`, `save_review`, `save_action`, `reconcile_job`이 찾아진다.

## 5-22. Gemini 판독 1: 사진 보내기 (GAS)
```text
GAS에 action "analyze_gemini"를 만들어 줘. 같은 요청 번호의 초안이 이미 있으면 그것을 돌려주고, 스크립트 속성 GEMINI_API_KEY가 없으면 SETUP_REQUIRED와 "GAS 스크립트 속성에 GEMINI_API_KEY가 없습니다. npm.cmd run gas:init(macOS: npm run gas:init)으로 Gemini API 키를 넣어 주세요."를 돌려줘.
판독할 사진은 서버가 보낸 사진 목록(없으면 사건의 사진)을 Drive에서 순서대로 읽고, 사진마다 앞에 "[사진 프레임 1/3]"처럼 번호 글을 붙여 줘. 사진이 없으면 NO_IMAGES, 못 읽으면 IMAGE_READ_FAILED로 끝내 줘.
지시문은 materials/gemini-prompt.txt의 글을 Code.gs 안에 상수로 글자 그대로 옮겨 사진 뒤에 넣고(GAS는 이 PC의 파일을 읽지 못해), temperature 0.1, 답은 JSON으로만(responseMimeType application/json) 받게 요청해 줘.
모델은 gemini-3.8-flash로 하고, API 키는 주소에 넣지 말고 x-goog-api-key 헤더로 보내 줘. 보내다 예외가 나면 NETWORK_TIMEOUT(interrupted)으로 답해 줘.
```
확인: `Code.gs`에서 `analyze_gemini`, `x-goog-api-key`, `사진 프레임`이 찾아진다.

## 5-23. Gemini 판독 2: 답 읽고 저장하기 (GAS)
```text
Gemini 답에서 JSON을 꺼내, 관찰 사실(facts)이 비어 있지 않을 때만 초안으로 받아 줘. 차단됨(CONTENT_BLOCKED), 빈 답(EMPTY_RESPONSE), JSON 없음(INVALID_JSON), 읽기 실패(PARSE_FAILED), facts 없음(INVALID_DRAFT_SCHEMA)으로 나눠 돌려줘.
초안은 ai_drafts 탭에 모델 이름, 다섯 칸, 판독한 정보 버전과 함께 한 줄 더하고(Gemini 답 전체는 저장하지 마), 사건 처리 단계를 AI_DRAFTED로 바꿔 줘.
이력에는 단계 AI_ANALYSIS, "AI 초안 생성", 내용 "Gemini 판독(모델 이름): 의심 위험", 작업자 "Gemini AI"를 남기고, 로컬 저장소 판독과 같은 모양으로 답해 줘.
```
확인: `Code.gs`에서 `AI_DRAFTED`, `INVALID_DRAFT_SCHEMA`가 찾아진다.

## 5-24. 대체 모델과 오류 안내 (GAS)
```text
쓸 수 있는 모델은 gemini-3.8-flash, gemini-3.5-flash-lite 둘이야. 스크립트 속성 GEMINI_MODEL(기본 gemini-3.8-flash)과 GEMINI_FALLBACK_MODEL(기본 gemini-3.5-flash-lite, off면 쓰지 않음)로 바꿀 수 있게 하고, 목록 밖 값이면 SETUP_REQUIRED와 고칠 방법을 돌려줘.
판독 모델이 HTTP 503이나 429를 돌려주면 대체 모델로 한 번만 다시 보내고, 실제로 답한 모델 이름을 초안과 이력에 남겨 줘.
그래도 429면 RATE_LIMIT_EXCEEDED와 "몇 초 뒤 다시 시도해주세요" 안내를, 400·403·404·503은 키 확인·키 권한·모델 이름·서버 붐빔을 알려 주는 한국어 안내(괄호 안에 HTTP 번호와 모델 이름)를 돌려줘.
지금 모델 설정을 알려 주는 action "gemini_settings"도 만들어 줘.
```
확인: `Code.gs`에서 `GEMINI_FALLBACK_MODEL`, `RATE_LIMIT_EXCEEDED`, `gemini_settings`가 찾아진다.

## 5-25. 서버가 GAS를 부르는 함수
```text
서버에 GAS 웹앱으로 요청을 보내는 함수를 만들어 줘. JSON을 POST로 보내고, GAS가 돌려주는 302 이동은 직접 따라가 결과 주소를 GET으로 받아 줘.
주소는 https만 받고(127.0.0.1·localhost 시험 서버만 http 허용), 제한 시간은 사건 등록과 사진 판독 300초, 나머지 120초로 해 줘.
Google 로그인 화면으로 이동하거나 401·403이면 GAS_AUTH_REQUIRED, 접속을 못 하면 GAS_UNREACHABLE, 404면 GAS_URL_INVALID, 429면 RATE_LIMIT_EXCEEDED, JSON이 아니면 GAS_NON_JSON_RESPONSE, 시간 초과면 NETWORK_TIMEOUT으로 바꿔 줘.
302를 받은 뒤의 실패와 시간 초과는 GAS가 이미 실행했을 수 있으니 "중단됨(interrupted)"으로 두고, 오류 문구에는 GAS 주소를 넣지 마.
```
확인: 서버를 다시 켰을 때 오류 없이 켜진다(지금은 mock이라 GAS를 부르지 않는다).

## 5-26. 저장소를 GAS로 잇기
```text
STORAGE_MODE=live이면 서버의 사건 저장·조회·판독·기준 확인 저장을 로컬 저장소 대신 GAS에 같은 action 이름으로 보내 줘. mock이면 GAS 주소가 있어도 GAS를 부르지 않아.
GAS 오류는 HTTP로 바꿔 줘: 설정 필요·로그인 필요 503, 한도·잠금 429, 접속 실패·HTML·HTTP 오류 502, 없는 사건 404, 잘못된 요청 400, 그 밖 500.
LOCK_TIMEOUT 문구는 "다른 저장이 끝나기를 기다리다 시간이 지났습니다. 잠시 뒤 다시 요청하세요(LOCK_TIMEOUT)."로 바꿔 보여 줘.
live일 때 작업 기록은 로컬 저장 때와 다른 폴더(_jobs)에 두고, 이 폴더와 .clasp.json, runtime 폴더는 git에 올라가지 않게 해 줘.
```
확인: 5-4처럼 `STORAGE_MODE` `live`, 나머지 둘 `off`로 켜면 여전히 "설정 필요 (GAS Web App 배포 대기)"가 보인다. 확인한 뒤 5-2의 값으로 되돌린다.

## 5-27. Drive 사진 보여 주기
```text
STORAGE_MODE=live에서 사건 사진 주소를 열면 서버가 GAS의 get_image로 Drive 사진을 받아 보여 주게 해 줘.
받은 사진은 Drive 파일 ID 기준으로 이 PC의 캐시 폴더(courses/vision-96h-v2/scratch/image-cache)에 저장해 두고 다음부터는 캐시를 써 줘. 캐시에서 읽을 때도 JPG·PNG인지 다시 확인하고, 캐시 저장이 실패해도 사진은 보여 줘.
등록 화면의 사진 안내는 "현장 사진은 Google Drive 비공개 폴더에 즉시 격리 보존됩니다."로, 사건 정보의 사진 줄은 "Drive 폴더 ID:"와 "Drive 파일 목록:" 두 줄로 바꿔 줘.
```
확인: 등록 화면에서 "직접 파일 업로드" 탭을 누르면 Drive 문구가 보이고, 사건 상세의 "이전 기록과 사건 정보"에 "Drive 폴더 ID:"와 "Drive 파일 목록:"이 보인다. 이 두 문구는 저장소 모드와 관계없이 늘 보인다. 실제 Drive 사진은 5-39에서 본다.

## 5-28. clasp 명령 넣기
```text
package.json scripts에 gas:login, gas:push, gas:editor를 더해 줘. 각각 npx --yes @google/clasp@3.4.1 login, push --force, open-script야. --force는 빼지 마(없으면 매니페스트를 덮어쓸지 묻다가 올리지 않을 수 있어).
gas:create는 도우미 스크립트로 만들어 줘. clasp는 프로젝트를 만들 때 지정한 폴더에 기본 appsscript.json을 받아 우리 파일(시간대 Asia/Seoul)을 덮어쓰니, 빈 임시 폴더 runtime/gas-create에서 standalone 프로젝트 "비전 리스크 대시보드"를 만든 뒤 .clasp.json의 rootDir만 gas 폴더로 바꿔 줘.
clasp 출력은 그대로 보여 주고, 출력에 "Created new script"가 없으면 "로그인이 만료됐으면 npm.cmd run gas:login을 다시 실행하세요" 안내와 함께 실패로 끝내 줘. Windows에서는 npx를 셸로 실행해야 해.
```
확인: `package.json`에 `push --force`가 있다. 명령은 아직 실행하지 않는다.

## 5-29. 배포·갱신·열기 명령
```text
도우미 스크립트에 gas:deploy, gas:redeploy, gas:open을 더해 줘. gas:deploy는 새 웹앱 배포를 만들고, clasp 출력에서 배포 ID(AKfyc로 시작)를 정확히 하나 찾았을 때만 config/local-connection.json의 GAS_WEBAPP_URL에 https://script.google.com/macros/s/배포ID/exec를 적어 줘.
이때 STORAGE_MODE가 비어 있으면 live로 같이 적고 다른 키는 그대로 둬. GAS_WEBAPP_URL에 이미 값이 있으면 배포하지 말고 gas:redeploy를 쓰라고 알려 줘. clasp가 0으로 끝나도 ID가 없으면 실패야.
gas:redeploy는 그 주소의 배포 ID로 같은 배포를 새 버전으로 갱신하고(주소는 그대로), 출력에 "Redeployed 배포ID @"가 없으면 실패로 알려 줘.
gas:deploy가 성공하면 "config/local-connection.json에 GAS_WEBAPP_URL을 적었습니다."를 보여 줘. gas:open은 "권한 승인 화면이 나오면 허용하세요"와 연 주소 한 줄을 보여 주고(시크릿 창에 붙여 넣을 때 쓴다) 기본 브라우저로 열어 줘.
```
확인: `package.json`에 `gas:deploy`, `gas:redeploy`, `gas:open`이 있다. 명령은 아직 실행하지 않는다.

## 5-30. gas:init 명령
```text
gas:init 명령을 만들어 줘. 설정 파일의 GAS_WEBAPP_URL로 GAS에 "setup"을 보내 시트와 폴더를 준비하고, GEMINI_API_KEY가 있으면 "set_gemini_key"로 키를 보내 줘. 다시 실행해도 되게 해 줘.
키는 설정 파일에서만 읽고(같은 이름 환경 변수는 안 읽음), 형식이 틀리면 아무것도 보내지 마. 키가 비어 있으면 시트만 준비하고 키 넣는 방법을 알려 줘.
GAS가 승인·로그인 화면을 돌려주면 "GAS 웹앱이 아직 권한 승인 전입니다. npm.cmd run gas:open으로 웹앱 주소를 한 번 열어 허용하세요. 안 되면 npm.cmd run gas:editor로 편집기를 열고 initialSetup을 한 번 실행하세요."를, 모르는 action이라 하면 gas:push와 gas:redeploy를 다시 하라는 안내를 보여 줘.
성공하면 "Google 시트와 비공개 Drive 폴더를 준비했습니다."와 "Gemini API 키를 GAS 스크립트 속성 GEMINI_API_KEY에 저장했습니다."를 보여 주고, gas:init은 주소·키·긴 ID를 어느 경우에도 출력하지 마.
```
확인: `package.json`에 `gas:init`이 있다. 명령은 아직 실행하지 않는다.

## 5-31. Gemini 키 만들기와 Apps Script API 켜기 (직접 하기)
1. `https://aistudio.google.com`에서 Gemini API 키를 만들고 복사해 둡니다. 키는 5-37에서만 씁니다.
2. `https://script.google.com/home/usersettings`에서 **Google Apps Script API**를 켭니다.
- 무료 키로 보낸 사진은 Google 제품 개선에 쓰일 수 있습니다. 실제 고객 자료나 개인정보가 든 사진은 올리지 않습니다.
확인: 그 화면의 Google Apps Script API가 켜져 있다.

## 5-32. clasp 로그인 (직접 하기)
내 PowerShell 창(프로젝트 폴더)에서 `npm.cmd run gas:login`을 칩니다. 브라우저가 열리면 준비한 Google 계정을 고르고 요청한 권한을 모두 허용합니다.
로그인 정보는 홈 폴더의 `.clasprc.json`에 저장됩니다. 다른 사람과 나누지 않습니다.
확인: 명령이 오류 없이 끝난다.

## 5-33. GAS 프로젝트 만들기
```text
npm.cmd run gas:create를 한 번만 실행하고 마지막 결과 줄을 알려 줘. 프로젝트 맨 위에 .clasp.json이 이미 있으면 실행하지 말고 "이미 있음"만 알려 줘.
실행한 뒤 git status로 gas 폴더의 appsscript.json이 바뀌지 않았는지 알려 줘. 스크립트 ID는 답에 쓰지 마.
```
확인: "Created new script"와 `.clasp.json`이 gas 폴더를 가리키게 했다는 줄이 나오고, `appsscript.json`은 바뀌지 않았다.
막히면: Apps Script API를 쓸 수 없다는 오류면 5-31의 2번을 한다. 출력에 `invalid_grant`가 있으면 5-32로 다시 로그인한 뒤 이 단계를 다시 보낸다.

## 5-34. 코드 올리고 배포하기
```text
npm.cmd run gas:push를 실행하고, 성공하면 npm.cmd run gas:deploy를 한 번 실행해 줘. 각 명령의 마지막 결과 줄만 알려 주고, 배포 ID와 웹앱 주소는 답에 쓰지 마.
gas:push가 GAS 코드 문법 오류로 실패하면 그 오류만 고치고 gas:push를 다시 해 줘. gas:deploy는 두 번 실행하지 마(새 주소가 생겨).
```
확인: `Pushed 2 files`와 "GAS_WEBAPP_URL을 적었습니다."가 나온다. 설정 파일의 `STORAGE_MODE`는 5-2에서 `mock`으로 적어 두었으므로 그대로다.
막히면: 출력에 `invalid_grant`가 있으면 5-32로 다시 로그인한 뒤 이 단계를 다시 보낸다.

## 5-35. 배포 접근 설정 확인 (직접 하기)
1. 내 PowerShell 창에서 `npm.cmd run gas:editor`를 쳐 Apps Script 편집기를 엽니다.
2. **배포**, **배포 관리**를 열고 배포가 **웹 앱**, 실행 사용자 **나**, 액세스 **모든 사용자**인지 봅니다. 다르면 편집(연필)을 눌러 고치고 **배포**를 누릅니다. 같은 배포를 고치면 주소는 그대로입니다.
- 웹앱 주소를 아는 사람은 누구나 내 시트 기록을 읽고 쓸 수 있습니다. 화면 공유 중에는 `gas:deploy`·`gas:redeploy`·`gas:open`을 실행하지 않습니다.
확인: 배포 관리에 웹 앱, 나, 모든 사용자가 보인다.

## 5-36. 첫 권한 승인 (직접 하기)
1. 내 PowerShell 창에서 `npm.cmd run gas:open`을 칩니다. 기본 브라우저에 웹앱 주소가 열립니다.
2. 권한 확인 화면이 나오면 5-32와 같은 계정을 고릅니다. "Google에서 확인하지 않은 앱"이 나오면 **고급**을 누르고 프로젝트로 이동한 뒤 **허용**합니다.
3. 브라우저에 Google 계정이 여러 개 로그인돼 있어 "액세스 거부됨"이 나오면, 시크릿 창(`Ctrl+Shift+N`)에서 그 계정으로만 로그인하고 터미널에 나온 주소를 붙여 넣어 엽니다.
4. 승인 화면이 나오지 않으면 `npm.cmd run gas:editor`로 편집기를 열고 함수 목록에서 `initialSetup`을 골라 **실행**한 뒤 같은 방법으로 허용합니다.
확인: 브라우저에 "권한 승인이 끝났습니다. 이 창을 닫고 터미널로 돌아가세요."가 든 짧은 JSON이 보인다.

## 5-37. Gemini 키 넣고 초기화하기
이 프롬프트를 보낸 뒤, Antigravity가 키를 달라고 하면 5-31에서 복사한 키를 그 대화에 붙여 넣습니다. 키를 붙여 넣은 대화는 화면 공유하거나 캡처하지 않습니다.
```text
지금부터 Gemini API 키를 이 대화에 붙여 넣을 테니 기다려 줘. 받으면 config/local-connection.json의 "GEMINI_API_KEY" 값 한 줄만 그 키로 바꾸고 다른 줄은 그대로 둬.
그다음 npm.cmd run gas:init을 한 번 실행하고 출력 줄을 알려 줘. 키 값은 답에 다시 쓰지 마.
```
확인: "Google 시트와 비공개 Drive 폴더를 준비했습니다."와 "Gemini API 키를 GAS 스크립트 속성 GEMINI_API_KEY에 저장했습니다."가 나온다. 내 Drive에 `Vision_Risk_Records_Master_날짜` 스프레드시트가 생기고 탭 여섯 개가 있다.
막히면: "권한 승인 전입니다"가 나오면 5-36을 다시 한 뒤 `npm.cmd run gas:init`만 다시 실행해 달라고 보낸다. 키 형식이 아니라고 나오면 키를 다시 붙여 넣는다.

## 5-38. 저장소를 live로 바꾸기
```text
config/local-connection.json의 스위치 세 줄만 바꿔 줘: STORAGE_MODE live, GEMINI_MODE live, NOTEBOOKLM_MODE live. NotebookLM을 아직 준비하지 않았으면 NOTEBOOKLM_MODE는 off로 해 줘.
다른 줄은 바꾸지 말고, 바꾼 뒤 세 스위치 값만 알려 줘.
```
확인: 서버를 다시 켜면 `연동 상태: 저장소 Google 시트 · Gemini live · NotebookLM live`가 나오고 화면 위 연동 상태 줄은 사라진다(NotebookLM을 off로 두었으면 남는다). `http://127.0.0.1:8765/api/records`에 `"success":true`와 `"records":[]`가 보이고, `/api/health`에 `"gas_configured":true`가 보인다.
막히면: 연결 표시가 "설정 필요"이거나 `/api/records`에 `GAS_AUTH_REQUIRED`가 보이면 5-35와 5-36을 다시 확인한다.

## 5-39. 실제 연결로 끝까지 (직접 하기)
1. 사진 1장으로 새 사건을 등록합니다. 스프레드시트 `records` 탭에 한 줄이 생기고, Drive의 `Vision_Risk_Records_Private_…` 폴더에 사진 파일이 생깁니다.
2. 상세에서 "사진 설명 더 보기"를 누릅니다. 수십 초 뒤 Gemini 관찰 초안과 "판독 모델: gemini-3.8-flash"(붐비면 gemini-3.5-flash-lite)가 보이고 `ai_drafts` 탭에 한 줄이 생깁니다.
3. "관련 기준 찾기"와 "판단 기록하기"를 하면 `evidence_checks`, `final_reviews` 탭에 줄이 생깁니다.
4. 설정 파일의 세 스위치를 5-2의 값으로 돌려 서버를 켜면 지난 회차의 로컬 사건이 다시 보입니다. 확인한 뒤 live로 되돌립니다.
확인: 1~4가 모두 위와 같다.
막히면: 판독이 "한도를 초과했습니다(HTTP 429…)"로 끝나면 안내된 시간 뒤 다시 요청한다. 계속되면 `GEMINI_MODE`를 `off`로 두고 저장소만 live로 쓴다. 이때 판독하지 않은 사건은 관련 기준 확인도 할 수 없다. `Code.gs`를 고쳤으면 아래 순서로 다시 올린다(주소는 그대로다).
```text
npm.cmd run gas:push, npm.cmd run gas:redeploy, npm.cmd run gas:init을 차례로 한 번씩 실행하고 각 명령의 마지막 결과 줄만 알려 줘. gas:deploy는 실행하지 마.
```

## 회차 끝 확인
- [ ] 서버 창의 연동 상태가 `저장소 Google 시트 · Gemini live · NotebookLM live`(또는 `NotebookLM 꺼짐`)이고, 함께 쓸 수 없는 조합이면 서버가 이유 한 줄을 내고 켜지지 않는다.
- [ ] 새로 등록한 사건이 내 스프레드시트의 `records` 탭과 비공개 Drive 폴더에 저장되고, 상세 화면에 그 사진이 보인다.
- [ ] 사건 상세가 1 사진, 2 AI 사진 설명 (Gemini), 3 관련 기준 확인 (NotebookLM), 4 내 판단 남기기 네 단계이고, 2번 구역에서 판독을 요청하면 판독 모델과 함께 Gemini 관찰 초안이 보인다.
- [ ] 판독 요청이 요청 알림 패널에 "AI 초안 분석 중", "AI 초안이 준비됐습니다."로 보이고, 새로 고쳐도 이어진다.
- [ ] Gemini 설명이 없거나 사건 정보를 고친 뒤라 예전 것이면 "관련 기준 찾기"가 꺼져 있다.
- [ ] `STORAGE_MODE`를 `mock`으로 두면 GAS를 부르지 않고 이 PC의 로컬 저장소와 모의 Gemini 결과로 지난 회차처럼 동작한다.
