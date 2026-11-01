# 프로젝트 규칙

> 이 브랜치의 코드는 강사가 만든 완성본입니다. 아래 약속의 이름(폴더·파일·데이터 주소·저장 위치·화면 문구)이 코드와 다르면 코드에 있는 것을 따르고, 코드를 약속에 맞춰 고치지 마세요. 단, 지금 회차 약속과 프롬프트가 새로 만들거나 바꾸라고 한 것은 그대로 합니다.

## 일하는 방식
- 병렬·서브 에이전트를 사용하지 말고 현재 에이전트가 순서대로 직접 수행하세요.
- 사용자는 코딩을 모르는 분입니다. 설명은 짧고 쉬운 한국어로 하고, 전문 용어를 쓰지 마세요.
- 한 번에 요청한 일만 하고, 요청하지 않은 파일은 고치지 마세요. 다음 단계 기능을 미리 만들지 마세요.
- 요청한 것이 이미 되어 있으면 고치지 말고 "이미 되어 있습니다"라고 알려 주세요.
- 프롬프트 안의 "---- 아래 글 그대로 ----" 줄은 표시일 뿐이니 파일에 넣지 말고, 그 아래 글만 그대로 쓰세요.
- 인터넷 검색 없이 이 프로젝트의 파일을 먼저 읽고 작업하세요. 이미 있는 코드의 방식을 새 기능에도 그대로 따르세요.
- 이 파일 아래쪽 약속을 지키세요. 뒤 회차 약속이 앞의 약속과 다르면 뒤 회차 약속을 따르세요.
- 프롬프트와 약속의 문구·주소에서 (이유)처럼 값의 이름을 괄호로 쓴 것은 실제 값이 들어갈 자리이고 괄호는 보여 주지 않습니다. 예: "오류: (이유)"는 "오류: 없는 데이터 주소입니다."로 보입니다. 괄호까지 보여야 하면 "조회 실패 ((이유))"처럼 두 겹으로 적습니다. (재확인 권장)처럼 값이 아닌 정해진 말은 괄호까지 그대로 보여 줍니다.
- 이 프로젝트 폴더 안의 파일만 만들고 고치세요. 옆 폴더 vision-risk-student-images(사진 저장소)는 읽기만 합니다.
- 일을 마치면 무엇을 바꿨는지 두세 줄로 알려 주고, 사용자가 화면에서 무엇을 보면 되는지 한 줄로 알려 주세요.
- API 키, 비밀번호, 토큰, 웹앱 주소, 노트북·소스 ID 같은 비밀 값은 화면, 터미널, 대화 답 어디에도 쓰지 마세요.
- 설정 파일(config/local-connection.json)과 .env는 요청한 줄만 고치고, 그 안의 값을 화면, 터미널, 대화 답에 옮겨 적지 마세요.
- 터미널 명령은 Windows PowerShell 기준으로 npm.cmd, npx.cmd를 씁니다.
- 서버 켜기(npm.cmd start)는 사용자가 직접 합니다. 실행하지 말고, 켜야 하면 켜는 명령만 알려 주세요. 서버 코드를 고쳤으면 node --check로 고친 파일에 문법 오류가 없는지만 확인하세요.
- 브라우저를 열어 확인하지 마세요. 화면 확인은 사용자가 직접 합니다.
- 요청이나 약속에 없는 패키지는 더하지 말고, 있는 패키지의 버전을 바꾸지 마세요. npm audit fix도 실행하지 마세요.

## 앱의 기본 약속

### 앱과 폴더
- 물류창고 현장 사진으로 택배 발송·산업안전 리스크를 확인하고 판단·조치를 기록하는 "현장 리스크 대시보드" 웹앱입니다. 이 PC에서만 씁니다.
- 서버는 Node.js로 server 폴더에 두고, 시작 파일은 server/server.js입니다. 웹 프레임워크 없이 Node.js 기본 기능으로 만듭니다.
- 화면은 HTML·CSS·JavaScript로 public 폴더에 둡니다. public/index.html 한 페이지이고, 화면을 그리는 코드는 js 파일에, 모양은 css 파일에 따로 둡니다.
- npm.cmd start를 치면 server/server.js가 켜집니다(package.json의 start).
- git에 올리지 않는 파일은 node_modules 폴더, .env, config/local-connection.json입니다(.gitignore). 예시 파일 config/local-connection.example.json은 git에 올립니다.

### 서버 켜기
- 서버는 이 PC 안(127.0.0.1)에서만 열리고 포트는 8765입니다.
- 서버가 켜지면 터미널에 "현장 리스크 대시보드: http://127.0.0.1:8765" 한 줄을 보여 줍니다.
- 8765번 포트를 이미 쓰고 있으면 "8765번 포트를 이미 쓰고 있습니다. 먼저 켠 서버 창에서 Ctrl+C로 끈 뒤 다시 켜세요."를 보여 주고 서버를 켜지 않고 끝냅니다.

### 화면 파일 보내기
- 서버는 public 폴더의 파일만 브라우저에 보냅니다. 주소 /는 public/index.html입니다.
- public 폴더에 없는 파일은 404와 "Not found" 글로 답합니다.
- public 폴더 밖의 파일, 이름이 점(.)으로 시작하는 파일, 이름에 .env가 들어간 파일은 보내지 않고 403으로 거절합니다.
- 다른 사이트 주소에서 온 요청은 403으로 거절합니다. 요청에 Origin 헤더가 있는데 127.0.0.1이나 localhost가 아니면 다른 사이트로 봅니다. Origin 헤더가 없는 요청은 받습니다.
- 브라우저가 옛 화면을 기억하지 않게 모든 답에 캐시를 끕니다(Cache-Control: no-store).

### 데이터 주소
- 화면이 쓰는 데이터 주소는 /api/ 로 시작하고 JSON으로 답합니다.
- 오류는 {"error": "한국어 문장"} 모양으로 답합니다. 뒤 회차 약속이 오류에 다른 항목을 더할 수 있습니다.
- /api/ 로 시작하는데 없는 주소는 404와 {"error": "없는 데이터 주소입니다."}로 답합니다.
- GET /api/health: 서버가 켜져 있는지 봅니다. {"status": "ok"}로 답합니다. 뒤 회차 약속이 항목을 더할 수 있습니다.
- GET /api/standards: materials/standards.json 내용을 그대로 돌려줍니다. 파일이 없으면 {"standards": []}로 답합니다.

### 확인 기준 목록(materials/standards.json)
- standards 목록의 한 줄이 기준 하나입니다. id는 번호(C-01~C-09), name은 이름, category는 분류, hazard_condition은 추가 확인 조건, hold_condition은 판단 보류 조건, canonical_quote는 원문 인용, notes는 참고입니다.
- category가 quality면 화면에 "택배 발송 확인", safety면 "산업안전"으로 보입니다.

### 화면
- 화면 글은 모두 한국어입니다. 브라우저 탭 제목은 "Vision QC"입니다.
- 화면은 주소 끝 # 뒤 이름으로 바꿉니다. #dashboard와 # 없음은 홈, #models는 확인 기준 화면이고, 모르는 이름은 홈을 보여 줍니다. 뒤 회차 약속이 화면을 더합니다.
- 화면이 바뀌면 맨 위로 올라갑니다. 브라우저 뒤로 가기를 누르면 앞 화면으로 돌아갑니다.
- 모든 화면 맨 위에 머리말이 있습니다. 왼쪽은 로고 그림과 "현장 리스크 대시보드"이고 누르면 홈으로 갑니다. 오른쪽은 연결 표시입니다.
- 로고 그림은 materials/factory-logo.png를 public 폴더 안 assets 폴더로 복사해서 씁니다.
- 머리말 아래가 화면마다 바뀌는 본문입니다. 본문은 위에서부터 길잡이 줄, 알림 줄, 화면 내용 순서입니다.
- 홈이 아닌 화면은 "← 홈으로 / (화면 이름)" 같은 길잡이 줄을 두고, 앞부분을 누르면 그 화면으로 갑니다. 홈에는 길잡이 줄이 없습니다.
- 연결 표시: 처음엔 "연결 대기", 서버에 요청하는 중이면 "연결 확인 중...", 답을 받으면 "데이터 연결됨", 실패하면 "조회 실패 ((이유))"입니다. 한 번 연결된 뒤에는 요청 중에도 "데이터 연결됨"을 유지합니다. 서버가 400번대 오류로 답한 것은 연결 실패로 치지 않고 연결 표시를 그대로 둡니다(아직 연결된 적이 없으면 "연결 대기").
- 알림 줄: 요청 중이면 "처리 중...", 오류가 있으면 "오류: (이유)"를 보여 주고, 둘 다 아니면 비워 둡니다. 오류 이유는 서버가 보낸 error 문장을 그대로 씁니다.
- 서버에 닿지 못해 실패하면 이유는 "로컬 서버에 연결하지 못했습니다. 터미널에서 npm.cmd start(macOS: npm start)가 켜져 있는지 확인하세요."입니다.
- 서버에서 받은 글은 화면에 글자 그대로 넣습니다. HTML로 넣지 않습니다.
- 화면 틀은 데이터를 받기 전에 먼저 보여 줍니다. 확인 기준 목록은 화면을 처음 열 때 한 번 받아 둡니다.

### 설정 파일(config/local-connection.json)
- 키와 연결 정보를 넣는 JSON 파일입니다. 서버가 켜질 때 한 번 읽습니다. 파일이 없으면 그대로 켭니다.
- JSON 형식이 틀리면 오류 원문은 보여 주지 말고 "설정 파일의 JSON 형식이 올바르지 않습니다: 3행 5열"처럼 몇 행 몇 열인지만 알립니다(모르면 "설정 파일의 JSON 형식이 올바르지 않습니다: 문법 오류"). 그리고 서버를 켜지 않고 끝냅니다.
- 쓰는 키는 회차 약속에 적힌 것뿐입니다. 그 밖의 키는 "설정 경고: 알 수 없는 설정 키 (키 이름)는 무시한다." 한 줄로 이름만 알리고 넘어갑니다. 예: 설정 경고: 알 수 없는 설정 키 TEST_KEY는 무시한다.
- 값은 모두 따옴표로 감싼 글자입니다. 값은 터미널, 화면, 대화 답에 절대 보여 주지 않습니다.
- 예시 파일 config/local-connection.example.json에는 쓰는 키를 모두 빈 값("")으로 적습니다. 키가 없으면 { }입니다. 회차 약속이 키를 더하면 예시 파일에도 더합니다.

### 지급 자료(materials 폴더)
- 강사가 준 원문 자료입니다. 확인 기준 목록 standards.json, 로고 factory-logo.png, 기준 원문 factory-criteria-v1.txt, Gemini 지시문 gemini-prompt.txt, 안내 README.md가 들어 있습니다.
- 이 폴더의 파일은 고치거나 옮기거나 지우지 않습니다. 필요하면 읽거나 다른 폴더로 복사해서 씁니다.

## 2회차 약속

### 사진 저장소(vision-risk-student-images)
- 사건 등록에 쓰는 연습용 사진은 강사가 공개한 사진 저장소에 있습니다. 기본 위치는 프로젝트 폴더 바로 옆 vision-risk-student-images 폴더입니다.
- 서버가 켜질 때 한 번 읽습니다. 사진 목록은 그 저장소에서 git으로 origin/main 커밋에 든 metadata/generation_manifest.csv를 읽습니다(작업 폴더의 파일이 아니라 커밋의 내용).
- 목록에서 status가 accepted, split이 train, sequence_id가 빈 줄만 씁니다. 쓰는 칸은 image_id(사진 번호, 예: Q-IND-001), track(분류: quality 또는 safety), sha256, filename(사진 파일 위치)뿐입니다.
- 읽기 전에 그 저장소의 origin 주소가 https://github.com/startup-life/vision-risk-student-images.git 인지 확인합니다.
- 사진마다 작업 폴더의 실제 파일이 PNG인지, 2MB 이하인지, sha256 값이 목록과 같은지 보고, 다르면 그 사진만 뺍니다.
- 다 읽으면 서버 창에 "사진 저장소: 사진 180장을 읽었습니다."처럼 읽은 장수를 한 줄로 보여 줍니다.
- 못 읽어도 서버는 켭니다. 서버 창에 "[RepositoryImages] 사진 저장소를 읽지 못했습니다: (원인)" 한 줄을 보여 줍니다. 원인은 경로 없음, git 미설치, git 저장소가 아님, origin 원격 없음, origin이 다른 저장소, origin/main 없음, 쓸 수 있는 사진 0장 가운데 하나입니다.
- 못 읽은 상태에서 화면이 사진 목록을 다시 달라고 하면, 서버를 다시 켜지 않아도 사진 저장소를 다시 읽어 봅니다.

### 설정 파일
- 설정 키 REPOSITORY_IMAGES_ROOT를 씁니다. 사진 저장소 폴더 위치이고, 비어 있으면 프로젝트 폴더 바로 옆 vision-risk-student-images를 씁니다.
- 설정 파일이 없으면 기본 약속대로 그대로 켜고, 서버 창에 "설정 파일 없이 시작한다." 한 줄을 보여 줍니다.

### 사건 기록 저장
- 사건 기록은 프로젝트 폴더의 runtime 폴더 안 records.json 파일 하나에 저장합니다. 모양은 {"records": [ … ]}입니다.
- 등록한 사진은 runtime 폴더 안 record-images 폴더에 한 장씩 파일로 저장합니다. 파일 이름은 (사건 번호)_(순서).png 또는 .jpg입니다(예: R-101_0.png, 순서는 0부터).
- 서버를 다시 켜면 이 파일들을 읽어 이어서 씁니다.
- runtime 폴더는 .gitignore에 넣어 git에 올리지 않습니다. public 폴더 밖이라 브라우저 주소로도 열리지 않습니다.

### 사건 한 건
- 항목 이름은 record_id, request_id, created_at, location, category, memo, image_count, status입니다.
- record_id(사건 번호)는 서버가 R-101부터 차례로 붙입니다(R-101, R-102, …).
- request_id(요청 번호)는 화면이 등록할 때 만들어 보내는 글입니다. 같은 내용을 다시 보내면 같은 번호를, 사진이나 내용을 바꾸면 새 번호를 쓰고, 등록에 성공하면 그 번호는 버립니다.
- created_at은 등록 시각(예: 2026-11-01T06:30:00.000Z)이고, 화면에는 한국 시각 YYYY-MM-DD HH:mm으로 보입니다.
- location은 장소, category는 분류(safety 또는 quality), memo는 현장 메모, image_count는 사진 수입니다.
- status(상태)는 등록하면 REGISTERED이고 화면에는 "검토 대기"로 보입니다. 뒤 회차 약속이 상태를 더합니다.
- 사건 목록을 돌려줄 때 사건마다 queue를 붙입니다. status가 REGISTERED이면 queue는 awaiting_review(검토 대기)입니다.

### 데이터 주소
- GET /api/repository-images: 저장소 사진 목록입니다. {"success": true, "available": true, "total": 180, "images": [{"id": "Q-IND-001", "track": "quality", "url": "/api/repository-images/Q-IND-001/file"}]} 모양이고 사진 번호 순입니다. ?track=quality 또는 ?track=safety로 거르면 total도 거른 장수입니다.
- 이 목록에는 사진 번호, 분류, 사진 주소만 넣습니다. 정답이 될 수 있는 다른 칸이나 내 PC 경로는 넣지 않습니다.
- 사진 저장소를 못 읽었으면 503과 {"success": false, "available": false, "error": "사진 저장소를 연결하지 못했습니다. 저장소 경로와 사진 파일을 확인해 주세요.", "total": 0, "images": []}로 답합니다.
- GET /api/repository-images/(사진 번호)/file: 저장소 사진 한 장(PNG)입니다. 이 주소만 기본 약속의 캐시 끄기 대신 Cache-Control: private, max-age=3600으로 브라우저가 기억해도 되게 합니다. 없는 번호면 404와 "사진을 찾지 못했습니다."로 답합니다.
- GET /api/records: {"success": true, "queue_counts": {"awaiting_review": 2}, "records": [ … ]} 모양입니다. 최근 등록한 사건이 앞에 오고, queue_counts는 queue별 사건 수입니다.
- POST /api/records: 사건 등록입니다. JSON 하나로 request_id, location, category, memo와 사진을 보냅니다.
  - 사진 파일은 images: [{"filename": "a.png", "mimeType": "image/png", "base64": "(사진 내용)"}]로 보냅니다.
  - 저장소 사진은 images 대신 repository_image_ids: ["Q-IND-001"]로 보냅니다. 둘을 함께 보내지 않습니다.
  - 새로 저장하면 201과 {"success": true, "record_id": "R-101", "record": { … }}로 답합니다.
  - 같은 request_id가 다시 오면 새로 저장하지 않고 처음 저장한 사건을 200으로 돌려줍니다.
- GET /api/records/(사건 번호)/images/(순서): 등록한 사진 한 장입니다. 순서는 0부터입니다. 없는 사건이면 404와 "기록을 찾지 못했습니다. 목록에서 다시 골라 주세요.", 없는 순서면 404와 "사진을 찾지 못했습니다."로 답하고 다른 사진으로 대신하지 않습니다.

### 등록 규칙(화면과 서버가 함께 지킵니다)
- 화면은 아래 경우에 보내지 않고 이유를 보여 줍니다. 서버도 다시 검사해서 400과 {"error": "이유"}로 거절합니다(사진 저장소를 못 읽은 경우만 503).
- 장소가 비었거나 띄어쓰기뿐이면 "장소를 입력해 주세요."
- 사진 파일도 저장소 사진도 없으면 "사진을 1장 이상 올리거나 저장소 사진을 골라 주세요."
- 둘을 함께 보내면 "사진 파일과 저장소 사진을 함께 보낼 수 없습니다. 한 가지만 골라 주세요."
- 사진 파일이 1~5장이 아니면 "사진은 1장 이상 5장 이하로 올려 주세요."
- 사진 파일 한 장이 2MB보다 크면 "(N)번째 사진이 2MB보다 큽니다. 2MB 이하 사진을 올려 주세요."
- 서버는 파일 앞부분을 읽어 진짜 JPG나 PNG인지 봅니다. 아니면 "(N)번째 파일은 사진 파일이 아닙니다. JPG나 PNG 사진을 올려 주세요."
- 저장소 사진인데 분류가 없으면 "저장소 사진을 쓸 때는 분류(산업안전 또는 택배 발송 확인)를 골라 주세요."
- 저장소 사진이 1~5장이 아니면 "저장소 사진은 1장 이상 5장 이하로 골라 주세요."
- 같은 사진 번호가 두 번 있으면 "같은 저장소 사진을 두 번 골랐습니다. 한 번씩만 골라 주세요."
- 없는 사진 번호면 "저장소 사진((사진 번호))을 찾지 못했거나 쓸 수 없는 사진입니다. 사진을 다시 골라 주세요."
- 사진 분류와 사건 분류가 다르면 "저장소 사진((사진 번호))의 분류((분류 이름))가 사건 분류((분류 이름))와 다릅니다. 분류를 맞춰 주세요." 분류 이름은 "산업안전" 또는 "택배 발송 확인"입니다.
- 사진 저장소를 못 읽은 상태면 503과 "저장소 사진을 지금 쓸 수 없습니다. 사진 파일을 직접 올려 주세요."

### 저장소 사진의 출처
- 저장소 사진으로 등록하면 서버가 사진 저장소에서 그 사진을 꺼내 사진 파일처럼 저장합니다.
- 서버는 메모 끝에 빈 줄 하나를 두고 출처를 붙여 저장합니다. 첫 줄은 "[Repository Images: startup-life/vision-risk-student-images @ (커밋 40자리)]"이고, 그 아래 사진마다 "- (사진 번호): sha256=(값) ((사진 번호).png)" 한 줄입니다.
- 화면에 현장 메모를 보여 줄 때는 "[Repository Images:"부터 끝까지 빼고 보여 줍니다.

### 화면
- 화면 이름을 더합니다. #records는 사건 목록, #records/new는 사건 등록 화면입니다.
- 사건 목록의 길잡이 줄은 "← 홈으로 / 사건 목록", 사건 등록의 길잡이 줄은 "← 사건 목록 / 현장 사건 등록"입니다.
- 알림 줄은 성공 안내도 보여 줍니다(예: "사건이 등록되었습니다: R-101"). 브라우저 팝업 창(alert, confirm)은 쓰지 않고 모든 알림을 화면 안 글로 보여 줍니다. 알림 줄이 화면 밖에 있으면 보이는 곳까지 올려 줍니다.
- 사건 목록은 화면을 처음 열 때 받고, 등록에 성공하면 다시 받습니다. 저장소 사진 목록은 화면을 처음 열 때 한 번 받아 둡니다.
- 저장소 사진 목록을 못 받았을 때는 기본 약속과 달리 머리말 연결 표시와 알림 줄을 바꾸지 않습니다. 못 받았다는 것은 저장소 사진을 보여 주는 칸에만 보여 줍니다.
- 등록 화면은 늦게 온 서버 답 때문에 입력 중인 장소, 메모, 고른 사진을 지우지 않습니다.

## 3회차 약속

### 사건 기록 더하기
- 2회차의 사건 기록 파일에 목록 셋을 더해 {"records": [ … ], "final_reviews": [ … ], "actions": [ … ], "history": [ … ]} 모양으로 저장합니다. final_reviews는 판단, actions는 조치, history는 이력입니다. 사건 목록과 사진은 2회차 그대로 둡니다.
- 지난 회차에 만든 기록 파일에 이 목록이 없으면 빈 목록으로 채워 오류 없이 엽니다.
- 사건 한 건에 version(버전, 1부터)과 updated_at(마지막 수정 시각, 처음엔 등록 시각)을 더합니다. 이 둘이 없는 옛 사건은 버전 1, 등록 시각으로 봅니다.
- 시각은 모두 등록 시각(created_at)과 같은 모양으로 저장합니다.
- 정보 수정, 판단, 조치 요청도 2회차 등록처럼 request_id(요청 번호)를 함께 보냅니다. 같은 사건에 같은 요청 번호가 다시 오면 새로 저장하지 않고 성공으로 답합니다. review_id와 action_id는 처음 것이고, version, updated_at, status, record는 그 사건의 지금 값입니다.

### 이력 한 줄(history)
- 항목은 history_id, record_id, timestamp(시각), phase(단계), action_name(작업), summary(내용), operator(작업자)입니다.
- phase 값과 화면 이름: REGISTER "사진 등록", RECORD_UPDATE "정보 수정", HUMAN_REVIEW "내 판단", ACTION_TAKEN "조치 기록". 모르는 값은 그대로 보여 줍니다.
- 사건 등록: 작업 "사건 등록", 내용 "사진 (N)장 보존 완료 ((장소))", 작업자 "시스템".
- 정보 수정: 작업 "사건 정보 수정", 작업자는 operator(비면 "현장 작업자")입니다. 내용은 "수정(v1->v2) [장소: 창고 A->창고 B, 메모: 이전 메모->새 메모]"처럼 바뀐 항목만 이전 값과 새 값을 적고, 바뀐 것이 없으면 "수정(v1->v2) [정보 갱신]"입니다. request_id가 있으면 내용 끝에 " (req=(요청 번호))"를 붙이고, 같은 요청 번호가 다시 왔는지는 이것으로 봅니다.
- 내 판단: 작업 "사람 최종 판정", 내용 "(판정 결과) ((판단 근거))", 작업자는 검토자입니다.
- 조치: 작업 "조치 요청" 또는 "조치 완료", 내용 "(조치 내용) (완료근거: (완료 증빙 메모))", 작업자는 담당자입니다. 증빙 메모가 비면 "미등록"으로 적습니다.

### 판단 한 건(final_reviews)
- 항목은 review_id, record_id, request_id, created_at, decision(판정 결과), basis(판단 근거), followup_note(후속 확인 메모), reviewer(검토자, 비면 "현장 검토자")입니다.
- decision은 "위험 확인", "기준 충족", "판단 보류", "해당 없음" 넷 중 하나를 글자 그대로 저장합니다.
- 판단은 덮어쓰지 않고 차례로 쌓습니다. 사건의 지금 판단은 가장 마지막 판단입니다.
- 판단을 저장하면 사건의 status를 판단 보류면 HOLD, 그 밖에는 REVIEWED로 바꿉니다.

### 조치 한 건(actions)
- 항목은 action_id, record_id, request_id, created_at, action_type(조치 유형), description(조치 내용), evidence_note(완료 증빙 메모), actor(담당자, 비면 "현장 담당자"), status입니다.
- action_type은 REQUEST(화면 "조치 요청")와 COMPLETE(화면 "조치 완료") 둘뿐입니다. status는 COMPLETE면 COMPLETED, REQUEST면 PENDING입니다.
- 조치도 차례로 쌓습니다. 조치를 저장하면 사건의 status를 ACTION_COMPLETED 또는 ACTION_REQUESTED로 바꿉니다.
- 사건의 status는 기록용입니다. 화면의 상태 배지와 홈 숫자는 아래 "상태 계산"으로만 정합니다.

### 데이터 주소
- GET /api/records/(사건 번호): {"success": true, "record": 사건, "final_review": 마지막 판단(없으면 null), "actions": 조치 목록, "history": 이력 목록, "review_summary": 상태 계산 결과}로 답합니다.
- 없는 사건 번호면 이 주소와 아래 주소 모두 404와 {"error": "기록을 찾지 못했습니다. 목록에서 다시 골라 주세요."}로 답합니다.
- PATCH /api/records/(사건 번호): 사건 정보 수정입니다. location, category, memo, request_id, operator만 받고 나머지는 버립니다. location, category, memo 중 안 온 칸은 지금 값을 그대로 둡니다. 저장할 때마다 version을 1 올리고 updated_at을 지금으로 바꾸고 이력을 남깁니다. 답은 {"success": true, "record_id", "version", "updated_at", "record"}입니다.
  - 장소가 비었거나 공백뿐이면 400 "장소를 입력해 주세요.", 분류가 safety나 quality가 아니면 400 "분류는 산업안전 또는 택배 발송 확인 중에서 골라 주세요."로 거절합니다.
  - 저장소 사진으로 등록한 사건은 2회차에서 메모 끝에 붙인 사진 출처("[Repository Images:"부터 끝까지)를 수정으로 바꾸거나 지울 수 없습니다. 받은 메모에서는 출처 표지 앞부분만 쓰고, 저장되어 있던 출처를 글자 그대로 그 뒤에 다시 붙입니다(메모와 출처 사이는 빈 줄 하나). 이력의 메모 비교와 기록도 출처를 뺀 메모로 합니다. 출처가 없는 사건은 받은 메모를 그대로 씁니다.
- POST /api/records/(사건 번호)/review: 내 판단 저장입니다. decision, basis, followup_note, reviewer, request_id를 받습니다. 답은 {"success": true, "review_id", "record_id", "status"}입니다.
  - decision이 넷 중 하나가 아니면 400 "판정 결과를 골라 주세요(위험 확인, 기준 충족, 판단 보류, 해당 없음).", basis가 비면 400 "판단 근거를 입력해 주세요."로 거절합니다.
- POST /api/records/(사건 번호)/actions: 조치 저장입니다. action_type, description, evidence_note, actor, request_id를 받습니다. 답은 {"success": true, "action_id", "record_id", "status"}입니다.
  - action_type이 둘 중 하나가 아니면 400 "조치 유형을 골라 주세요(조치 요청 또는 조치 완료).", description이 비면 400 "조치 내용을 입력해 주세요.", COMPLETE인데 evidence_note가 비면 400 "조치 완료를 기록하려면 완료 증빙 메모를 입력해 주세요."로 거절합니다.
- GET /api/records: 사건마다 review_summary를 붙이고, queue_counts는 {"additional_check", "awaiting_review", "confirmed_risk"} 세 숫자입니다. 사건의 상태는 review_summary.queue 하나로 정합니다. 2회차에 사건마다 붙이던 queue는 빼고, 화면도 review_summary.queue를 봅니다.
- GET /api/health: 기본 약속의 {"status": "ok"}에 "modes": {"storage": "mock"}와 "integration_status": "연동 상태: 저장소 로컬 저장"을 더합니다.

### 상태 계산(review_summary)
- 서버가 사건마다 마지막 판단과 마지막 조치로 계산합니다. 항목은 review(마지막 판단의 decision, basis, followup_note, reviewer, created_at, 없으면 null), latest_action(마지막 조치의 action_type, description, evidence_note, created_at, 없으면 null), context_changed({"after_review", "after_action", "version_time_unknown"} 참·거짓), queue, completion_recorded_after_review(참·거짓·null)입니다.
- queue 값: additional_check(추가 확인), awaiting_review(검토 대기), confirmed_risk(대응 필요), null(어느 큐에도 없음, 확인 완료).
- 판단만 보는 규칙
  - 판단이 없으면 awaiting_review입니다.
  - 판단 시각을 읽을 수 없거나 넷에 없는 판정이면 additional_check입니다.
  - 판단 보류면 additional_check, 위험 확인이면 confirmed_risk, 기준 충족과 해당 없음은 null입니다.
- 조치 완료 규칙(판단이 위험 확인일 때만 봅니다)
  - 마지막 조치가 완료 증빙 메모가 있는 COMPLETE이고 그 시각이 판단 시각보다 늦으면 queue는 null(확인 완료)이고 completion_recorded_after_review는 참입니다.
  - 조치가 없거나, 마지막 조치가 REQUEST이거나, COMPLETE가 판단보다 먼저였거나, 증빙이 비었으면 confirmed_risk 그대로이고 completion_recorded_after_review는 거짓입니다.
  - 마지막 조치가 증빙 있는 COMPLETE인데 두 시각 중 하나를 읽을 수 없거나 두 시각이 같으면 additional_check이고 completion_recorded_after_review는 null입니다.
  - 판단이 없거나 위험 확인이 아니면 completion_recorded_after_review는 null입니다.
- 판단 뒤 수정 규칙
  - 버전이 2 이상이고 updated_at이 판단 시각보다 늦으면 after_review가 참이고 queue는 additional_check입니다. 그 뒤에 판단을 다시 남기면 새 판단으로 다시 정합니다.
  - updated_at이 마지막 조치 시각보다 늦으면 after_action이 참이고, 그 조치는 조치 완료 규칙에 쓰지 않습니다.
  - 버전이 2 이상인데 updated_at을 읽을 수 없으면 version_time_unknown과 after_review가 참이고, 판단이 있으면 queue는 additional_check입니다.
- 판단이 있을 때 보는 순서: 수정 시각을 모름, 판단 시각을 모름이나 넷에 없는 판정, 판단 보류, 판단 뒤 수정, 위험 확인(조치 완료 규칙), 기준 충족과 해당 없음.

### 화면
- 새 화면 주소: #records/(사건 번호) 사건 상세, #records/(사건 번호)/edit 정보 수정, #records/(사건 번호)/review 내 판단 남기기, #records/(사건 번호)/action 조치 기록. 네 화면은 열 때마다 그 사건을 서버에서 받습니다. 불러오는 중과 불러오지 못했을 때의 문구("사건 정보를 불러오고 있어요.", "사건을 불러오지 못했습니다.")와 "다시 조회" 단추는 네 화면이 같습니다.
- 길잡이 줄: 사건 상세는 "← 사건 목록 / 사건 상세", 나머지는 "← 사건 상세 / 정보 수정", "← 사건 상세 / 내 판단 남기기", "← 사건 상세 / 조치 기록"입니다.
- 상태 배지: additional_check "추가 확인", awaiting_review "검토 대기", confirmed_risk "대응 필요". queue가 null이면 completion_recorded_after_review가 참일 때 "완료 기록 있음", 아니면 판정 결과 이름("기준 충족", "해당 없음")입니다. 사건 목록, 상세, 홈 카드, 홈 "최근 확인한 사건"이 같은 규칙을 씁니다.
- 확인 이유(상세의 상태 배지 옆, 홈 카드의 "확인 이유:" 줄)
  - 검토 대기: "사진과 사건 정보를 확인하고 판단을 남겨주세요"
  - 대응 필요: "확인된 위험의 대응 기록을 확인하세요"
  - 추가 확인: 수정 시각을 모르면 "판단·조치 기록의 시점을 확인해야 합니다", 판단 뒤 수정이면 "판단 후 정보가 바뀌어 다시 확인해야 합니다", 조치 뒤 수정이면 "조치 후 정보가 바뀌어 다시 확인해야 합니다", 판단 보류면 판단 근거(없으면 후속 확인 메모, 둘 다 없으면 "판단 보류된 사건으로 추가 확인이 필요합니다"), 그 밖에는 "추가 확인이 필요한 사건입니다".
  - 상태 없음: 조치 완료로 끝났으면 "대응 조치 완료가 확인된 사건입니다", 아니면 판단 근거(없으면 "확인이 완료된 사건입니다").
- 저장하는 세 화면(정보 수정, 내 판단 남기기, 조치 기록)은 같은 방식으로 저장합니다.
  - 2회차 등록 화면처럼 request_id를 함께 보내고(같은 내용을 다시 보내면 같은 번호), 저장하는 동안 저장 단추를 꺼서 두 번 저장되지 않게 합니다.
  - 성공하면 그 사건과 사건 목록을 서버에서 다시 받아 새로고침하지 않아도 상세, 사건 목록, 홈 숫자가 바로 바뀌게 하고, 상세 화면으로 돌아가 알림 줄에 성공 문구를 보여 줍니다.
  - 실패하면 그 화면에 남아 입력한 값을 그대로 두고, 알림 줄에 "수정 실패: (이유)"나 "저장 실패: (이유)"를 보여 줍니다. 이유는 서버가 보낸 error 문장입니다. 브라우저 팝업 창은 쓰지 않습니다.
  - 늦게 온 서버 답 때문에 입력 중인 값을 지우지 않습니다.
- 기본 약속의 알림 줄은 처리 중도 오류도 아니고 보여 줄 문구도 없을 때 비워 두는 대신, 서버 확인용 주소에서 받은 "연동 상태: 저장소 로컬 저장"을 보여 줍니다(받기 전에는 비워 둡니다). 머리말 연결 표시는 그대로입니다.

### 서버 켜기
- 서버가 켜지면 기본 약속의 시작 줄 바로 다음 줄에 "연동 상태: 저장소 로컬 저장"을 보여 줍니다.

## 4회차 약속

### NotebookLM 설정 키와 스위치
- 설정 파일에 키 네 개를 더합니다. NOTEBOOKLM_MODE(연동 스위치), NOTEBOOKLM_NOTEBOOK_ID(노트북 ID), NOTEBOOKLM_SOURCE_IDS(소스 ID, 여러 개면 쉼표로 잇습니다), NOTEBOOKLM_MCP_COMMAND(NotebookLM MCP 실행 파일 위치, 비워 두면 PATH에서 찾습니다)입니다.
- NOTEBOOKLM_MODE 값은 off(꺼짐), mock(예시 결과), live(실제 NotebookLM) 세 가지이고, 비어 있으면 live로 봅니다. 앞뒤 공백과 대소문자는 따지지 않습니다.
- 그 밖의 값이면 서버를 켜지 않고 "NOTEBOOKLM_MODE 값을 알아볼 수 없다. 허용 값은 off, mock, live이다. 설정 파일이나 환경 변수의 NOTEBOOKLM_MODE를 고친다." 한 줄을 보여 주고 끝냅니다. 적힌 값은 보여 주지 않습니다.
- 노트북 ID와 소스 ID는 사용자가 설정 파일에 직접 넣습니다. 비밀 값이라 화면, 터미널, 대화 답, 작업 파일, README에 옮겨 적지 않습니다.

### 연동 상태 줄
- 3회차의 "연동 상태: 저장소 로컬 저장" 줄은 "연동 상태: 저장소 로컬 저장 · NotebookLM mock"처럼 스위치 값을 붙인 줄로 바꿉니다. off는 "꺼짐"으로 씁니다.
- 서버 창의 시작 줄 다음 줄, GET /api/health의 integration_status, 화면 알림 줄에 보이는 연동 상태가 모두 이 줄을 씁니다. 화면 알림 줄에서는 "저장소 로컬 저장"과 "NotebookLM mock"을 두 칸으로 나눠 보여 줍니다.
- 3회차의 GET /api/health modes에 notebooklm을 더해 {"storage": "mock", "notebooklm": "mock"} 모양으로 답합니다.
- live인데 MCP 실행 파일을 찾지 못하면 서버 창의 줄만 "연동 상태: 저장소 로컬 저장 · NotebookLM live(실행 파일을 찾지 못함: notebooklm-mcp를 설치하거나 NOTEBOOKLM_MCP_COMMAND를 지정)"으로 씁니다.

### 사건 상세의 세 단계
- 확인 순서는 "1. 사진", "2. 관련 기준 확인 (NotebookLM)", "3. 내 판단 남기기"입니다. 3회차의 "2. 내 판단 남기기" 칸은 "3. 내 판단 남기기" 칸이 되고, 그 칸의 판단·조치 표시와 단추는 3회차 그대로입니다.
- 진행 표시와 그 아래 안내 문구는 상세를 열 때 위에서부터 먼저 맞는 것으로 정합니다.
  - review_summary.queue가 confirmed_risk(대응 필요): 강조하는 단계 없음, "어떤 조치를 했는지 기록해 주세요."
  - 판단이 있고 queue가 additional_check가 아님: 강조하는 단계 없음, "판단이 저장됐습니다. 기록을 다시 확인할 수 있습니다."
  - 사진이 없음: 1단계, "먼저 확인할 사진을 등록해 주세요."
  - 스위치가 off가 아니고, 기준 확인 결과가 없거나 그 결과 뒤에 사건 정보를 고쳤음(after_evidence가 참): 2단계, "NotebookLM으로 관련 기준을 찾아 사진과 비교해 주세요."
  - 그 밖: 3단계, "사진과 기준을 비교하고, 직접 확인한 판단을 남겨주세요."
- 2번 칸 끝의 "다음: 내 판단 남기기" 단추를 누르면 진행 표시와 안내 문구가 3단계로 바뀌고, 화면이 3번 칸으로 내려갑니다.

### 2번 칸: 관련 기준 확인
- "무엇을 확인할까요?" 고르는 칸에는 확인 기준 목록 가운데 이 사건 분류와 같은 기준만 넣고, 처음에는 첫 기준을 골라 둡니다.
- 고른 기준 아래에 "확인할 점:"과 그 기준의 hazard_condition을 보여 주고, 접는 칸 "미리 읽어볼 기준"에 canonical_quote와 hold_condition을 넣습니다.
- 그 아래에 "관련 기준 찾기" 단추와 "사건 정보(분류·장소·메모·사진 장수)로 질문합니다." 안내를 둡니다.
- 스위치가 off면 단추를 끄고 그 아래에 "NotebookLM 연동이 꺼져 있습니다(NOTEBOOKLM_MODE=off)."를 보여 줍니다. 화면은 GET /api/health의 modes로 스위치를 알아내고, 아직 모르면 단추를 켜 둡니다.

### 질문 글
- 서버는 저장된 사건 정보로 "분류: 산업안전 | 장소: 2층 포장 구역 | 현장 메모: … | 현장 사진 3장" 모양의 질문 글을 만듭니다. 화면이 보낸 사건 정보는 쓰지 않습니다.
- 메모 끝에 붙은 저장소 사진 출처 부분은 뺍니다. 메모가 없으면 그 칸을 뺍니다.

### 예시 결과(mock)
- 스위치가 mock이면 NotebookLM을 부르지 않고 예시 결과를 만듭니다. 인용문은 고른 기준의 canonical_quote, 답변은 "[1] 기준 원문 대조 결과: (인용문)", 소스 ID는 "src-standards-v1", 노트북 ID는 "mock-notebook"입니다. 일치(match true), 근거 충분(sufficient true)으로 판정하고 메모는 "기준 일치 확인: (hazard_condition)"입니다.
- 질문 글에 "가림", "불명확", "반사" 가운데 하나가 들어 있으면 같은 인용을 주되 일치(match true), 근거 부족(sufficient false)으로 판정하고, 메모는 "판단 보류 조건 충족: (hold_condition)"입니다.

### 작업 대기열
- 관련 기준 찾기 요청은 POST /api/records/(사건번호)/evidence-check입니다. 화면은 {"standard_id": "C-01", "request_id": "(요청 번호)"}를 보냅니다. 요청 번호는 화면이 보내기 전에 만듭니다.
- 서버는 바로 처리하지 않고 작업을 하나 만들어 대기열에 넣은 뒤 202와 {"success": true, "status": "queued", "job_id": "(작업 번호)", "request_id": "(요청 번호)"}로 답합니다.
- 작업 상태는 queued(대기), running(진행), succeeded(완료), failed(실패), interrupted(중단) 다섯 가지입니다. 서버는 한 번에 한 작업만, 들어온 순서대로 처리합니다.
- 작업 항목은 job_id, job_type("evidence_check"), record_id, request_id, status, standard_id, query(질문 글), input_version(요청할 때의 사건 버전), created_at, started_at, completed_at, acknowledged(알림을 닫았는지, 처음 false), result(결과), error(실패 이유 {"code", "message"})입니다.
- 같은 사건에 대기·진행 중인 작업이 있거나 같은 요청 번호로 다시 오면 새 작업을 만들지 않고 그 작업을 돌려줍니다.
- 스위치가 off면 409와 {"error": "NotebookLM 연동이 꺼져 있습니다(NOTEBOOKLM_MODE=off). 관련 기준을 확인하려면 NOTEBOOKLM_MODE를 바꾸고 로컬 서버를 다시 시작하세요.", "error_code": "INTEGRATION_OFF"}로 거절합니다.
- GET /api/jobs는 작업 목록을 {"success": true, "jobs": [...]}로 돌려줍니다. 주소 끝에 ?record_id=(사건번호)나 ?status=(상태)를 붙이면 그것만 거릅니다.
- GET /api/jobs/(작업번호)는 {"success": true, "job": {...}}, POST /api/jobs/(작업번호)/ack는 acknowledged를 true로 바꾸고 같은 모양으로 답합니다. 없는 작업이면 404와 {"error": "없는 작업입니다."}입니다.

### 작업 파일
- 작업은 사건 기록이 어디에 있든 상관없이 프로젝트 폴더 맨 위의 runtime 폴더 안 jobs 폴더(runtime/jobs)에 한 건씩 JSON 파일로 저장하고, 상태가 바뀔 때마다 다시 씁니다. 서버를 껐다 켜도 남습니다.
- runtime 폴더는 git에 올리지 않고 브라우저 주소로도 열리지 않습니다. .gitignore에 runtime 폴더가 없으면 더합니다.
- 서버를 켤 때 작업 파일을 읽어 정리합니다. running이던 작업은 사건 기록에 같은 요청 번호의 결과가 있으면 succeeded, 없으면 interrupted로 바꿉니다. queued이던 작업도 interrupted로 바꿉니다. 중단된 작업은 저절로 다시 실행하지 않습니다.

### 결과 저장
- 3회차의 사건 기록 파일에 evidence_checks(기준 확인 결과) 목록을 더합니다. 이 목록이 없는 옛 파일은 빈 목록으로 채워 오류 없이 엽니다.
- 작업이 끝나면 결과를 작업 파일의 result에 먼저 남기고, 그다음 사건 기록의 기준 확인 목록(evidence_checks)에 한 줄 더합니다. 사건 기록에 저장하지 못하면 작업은 failed로 끝냅니다.
- 기준 확인 한 줄의 항목은 check_id, record_id, request_id, standard_id, notebook_id, source_id, answer(답변), quote(인용문), match(일치 여부), sufficient(근거 충분 여부), notes(메모), input_version, created_at입니다.
- 이력(history)에도 한 줄 남깁니다. phase는 EVIDENCE_CHECK(화면 이름 "NotebookLM 대조"), action_name은 "기준 근거 대조", summary는 "기준 C-01 대조 (충족여부: true)" 모양, operator는 "NotebookLM MCP"이고 mock이면 "NotebookLM MCP (mock)"입니다.
- GET /api/records/(사건 번호)의 답에 evidence_check(가장 최근 결과, 없으면 null)와 evidence_by_standard(기준 번호마다 가장 최근 결과)를 더합니다.
- review_summary에 evidence(가장 최근 결과의 standard_id, source_id, quote, match, sufficient, notes, input_version, created_at, 없으면 null)를 더하고, context_changed에 after_evidence(버전이 2 이상이고 updated_at이 그 결과 시각보다 늦으면 참)를 더합니다. queue 계산은 바꾸지 않습니다.

### 요청 상태 줄과 결과
- "관련 기준 찾기"를 누르면 기다리는 동안 단추를 끄고 단추 글을 "기준 근거 대조 중..."으로 바꿉니다. 화면은 2초마다 GET /api/jobs/(작업번호)로 상태를 확인하고, 작업이 끝나면 단추를 다시 켭니다. 2초마다 하는 상태 확인과 결과를 다시 받는 요청은 알림 줄의 "처리 중..."을 띄우지 않고 화면도 움직이지 않습니다.
- 2번 칸 제목 바로 아래 요청 상태 줄: 보내는 중 "요청을 보내고 있어요.", 대기 "서버 대기열에 등록되었습니다. 순서대로 처리됩니다.", 진행 "분석이 진행 중입니다. 잠시만 기다려 주세요...", 완료 "완료되었습니다.", 실패는 실패 이유, 중단 "처리가 중단됐습니다. 저장된 결과를 확인해 주세요."입니다.
- 요청 상태 줄은 끝난 작업이면 지금 고른 기준과 지금 사건 버전의 것만 보여 주고, 기다리는 작업은 기준과 상관없이 보여 줍니다.
- 결과가 오면 화면 전체를 다시 그리지 않고 상세의 2·3번 칸만 바꿉니다. 진행 표시와 안내 문구는 그때 보이던 단계를 그대로 두고, 상세를 다시 열거나 새로고침하면 위 규칙으로 다시 정합니다. 상세 위 경고, 맨 아래 이력, 홈 카드는 새로고침하면 새 결과로 바뀝니다. 다른 화면을 보고 있으면 그 화면은 그대로 둡니다.
- 결과 칸: 판정 제목, 답변 앞부분 240자, "인용한 기준: … · 소스 ID: …" 한 줄, 인용 상자, 접는 칸 "전체 답변"입니다.
- 판정 제목: 근거 부족이면 "근거를 충분히 찾지 못했습니다", 근거 충분이면 "문서에서 관련 근거를 찾았습니다"입니다.
- 고르는 칸에서 기준을 바꾸면 그 기준으로 확인한 결과만 보여 줍니다. 그 기준으로 확인한 적이 없으면 "이 기준으로는 아직 확인하지 않았습니다."를 보여 주고, 다른 기준의 결과가 있으면 뒤에 " 가장 최근 확인은 C-01 머리 보호구 기준입니다."처럼 덧붙입니다.
- 기준 확인 뒤에 사건 정보를 고쳤으면 그 결과 위에 "수정 전 결과입니다. 현재 사진과 내용을 다시 확인해 주세요."를 붙입니다. 3회차의 상세 위 경고 "정보가 수정됐습니다. 현재 사진과 내용을 다시 확인해 주세요."도 after_evidence가 참이면 보여 줍니다.

### 인용한 기준 대조
- 화면은 인용문을 확인 기준 목록의 기준마다 name, canonical_quote, notes와 공백 차이를 무시하고 비교해, 그 문장이 들어 있는 기준을 "인용한 기준: C-01 머리 보호구"처럼 적습니다. 여러 기준이면 모두 적고, 없으면 "등록된 기준 문장에서 찾지 못했습니다", 인용문이 비었으면 "인용문 없음"입니다.
- 판정 제목은 근거 충분인 결과일 때만 이 대조로 다시 정합니다. 인용 안에 고른 기준의 canonical_quote가 통째로 있거나 인용이 고른 기준에만 있으면 "문서에서 관련 근거를 찾았습니다" 그대로입니다.
- 다른 기준에만 있으면 "선택한 기준과 다른 기준의 문장입니다", 고른 기준을 포함해 여러 기준에 함께 있으면 "어느 기준의 문장인지 정할 수 없습니다", 어느 기준에도 없으면 "등록된 기준 문장과 일치하지 않습니다"로 제목을 바꿉니다.
- 제목을 바꿨으면 제목 아래에 "확인 필요: (이유)"를 한 줄 적습니다. 저장된 판정 값은 바꾸지 않습니다. 이유는 고른 기준이 C-01 머리 보호구일 때 다음과 같은 모양입니다.
  - 다른 기준에만 있을 때: "인용한 문장은 C-03 통로 적치 기준의 문장입니다. C-01 머리 보호구 기준의 근거로 보지 않습니다."
  - 여러 기준에 함께 있을 때: "인용한 문장이 여러 기준(C-01 머리 보호구, C-03 통로 적치)에 함께 있어 C-01 머리 보호구 기준의 근거로 확정하지 않습니다."
  - 어느 기준에도 없을 때: "인용한 문장을 확인 기준 목록에서 찾지 못해 C-01 머리 보호구 기준의 근거로 보지 않습니다. 노트북 소스와 기준 버전이 같은지 확인해 주세요."

### 답변 글 모양
- "전체 답변"과 답변 앞부분에서 "#"으로 시작하는 제목 줄은 굵게, "* "나 "- "로 시작하는 목록 줄은 "• "로, "**글자**"는 굵게 보여 줍니다.
- "> " 다음에 따옴표나 글자가 오는 줄만 인용 모양으로 보여 줍니다. "> 5bar" 같은 비교는 그대로 둡니다. 그 밖의 글은 HTML로 해석하지 않고 글자 그대로 넣습니다.

### 요청 알림 패널
- 머리말에 요청 알림 벨 단추를 두고 닫지 않은 알림 수를 숫자로 보여 줍니다. 브라우저 팝업이 아니라 화면 안의 패널입니다.
- 벨을 누르면 "요청 알림" 패널이 열리고, 패널의 "닫기" 단추, Esc 키, 패널 바깥 클릭으로 닫힙니다.
- 알림 목록은 페이지를 열 때 GET /api/jobs로 받은 기준 확인 작업(acknowledged가 true인 것은 뺍니다)과 지금 보내는 요청으로 만듭니다. 알림이 없으면 "새로운 요청 알림이 없습니다."를 보여 줍니다.
- 알림 하나에는 제목, "사건 R-101", 설명을 보여 줍니다. 제목과 설명은 다음과 같습니다.
  - 보내는 중: "기준 근거 대조 요청 전송 중..." / "요청을 보내고 있어요."
  - 대기: "기준 근거 대조 접수" / "요청을 접수했습니다. 순서가 되면 분석을 시작합니다."
  - 진행: "기준 근거 대조 중" / "분석 결과를 기다리고 있어요. 다른 사건을 확인해도 됩니다. 준비되면 사이트에서 알려드릴게요."
  - 완료: "기준 근거 대조가 완료됐습니다." / "분석이 완료되어 결과를 확인할 수 있습니다."
  - 실패: "기준 근거 대조 실패" / 실패 이유
  - 중단: "처리가 중단됐습니다" / "처리가 중단됐습니다. 저장된 결과를 확인해 주세요."
- 완료 알림의 "결과 보기"를 누르면 그 사건 상세를 열고 그 작업의 기준을 골라 결과를 보여 줍니다. 상세를 연 뒤에 POST /api/jobs/(작업번호)/ack로 알림을 닫습니다.
- 끝난 알림(완료·실패·중단)의 "닫기"를 누르면 POST /api/jobs/(작업번호)/ack를 보내고 패널과 숫자에서 뺍니다.
- 알림 패널과 숫자는 어느 화면에서나 바뀌고, 이때 화면 전체를 다시 그리지 않습니다.

### 경과 시간과 새로고침
- 대기·진행 중인 요청 옆에 "12초 지남", "1분 5초 지남"처럼 요청한 뒤 지난 시간을 보여 줍니다. 2번 칸 요청 상태 줄과 알림 패널 둘 다입니다. 단추를 누른 시각부터 세고, 1초마다 그 글자만 바꿉니다.
- 화면은 기다리는 요청(작업 번호, 사건 번호, 기준 번호, 요청 번호, 요청 시각)을 브라우저 탭 저장 공간(sessionStorage)에 남깁니다. 비밀 값은 넣지 않습니다.
- 페이지를 열 때 받은 작업 목록에 대기·진행 중인 작업이 있으면 2초마다 상태 확인을 다시 시작합니다.
- 상세는 작업 목록을 받은 뒤에 그립니다. 그 사건에 기다리는 요청이 있으면 그 요청의 기준을 골라 두고 단추를 끈 채로 보여 줍니다.

### 홈 카드와 판단 화면
- 홈 사건 카드에 "출처 대조:" 한 줄을 더합니다. 결과가 없으면 "근거 미확인", 결과 뒤에 사건 정보를 고쳤으면 "수정 전 기준 대조됨 (재확인 권장)"입니다. 그 밖에는 근거를 찾았으면 "출처 대조 완료", 근거 충분이지만 인용한 기준 대조가 맞지 않으면 "인용 기준 확인 필요", 근거 부족이면 "근거 부족"입니다.
- 홈 카드 단추 이름은 위에서부터 먼저 맞는 것을 씁니다. 대응 필요면 "조치 기록", 판단이 있고 추가 확인이 아니면 "기록 보기", 판단이나 기준 확인 결과가 있으면 "이어서 확인", 둘 다 없으면 "확인 시작"입니다.
- "내 판단 남기기" 화면의 판정 칸 위에 "NotebookLM 기준 확인:" 칸을 두고, 상세에서 고른 기준의 판정 제목, "확인 필요:" 이유, 답변 앞부분, 인용, 인용한 기준, 소스 ID를 보여 줍니다.
- 그 기준의 결과가 없으면 "C-01 머리 보호구 기준으로는 아직 확인하지 않았습니다."처럼, 고른 기준이 없으면 "아직 관련 기준을 확인하지 않았습니다."를 보여 줍니다. 수정 전 결과면 제목 뒤에 "(수정 전 결과)"를 붙입니다.

### 실제 NotebookLM(live) 연결
- NotebookLM 도구는 notebooklm-mcp-cli 0.15.6입니다. uv 설치, uv tool install, nlm login, 노트북 만들기는 사용자가 직접 합니다. AI는 이 명령을 실행하지 않습니다.
- 이 회차에 더해도 되는 패키지는 @modelcontextprotocol/sdk 하나입니다. 설치 명령은 npm.cmd install @modelcontextprotocol/sdk입니다.
- 서버는 MCP 실행 파일을 직접 띄워 stdio로 연결하고, 실행할 때 --transport stdio를 붙입니다. 연결은 처음 필요할 때 한 번만 하고, 동시에 온 요청이 실행 파일을 두 번 띄우지 않게 합니다. 실행 파일이 끝났으면 다음 요청 때 새로 연결합니다. 서버가 꺼질 때 연결도 닫습니다.
- 실행 파일은 설정의 NOTEBOOKLM_MCP_COMMAND를 먼저 쓰고, 비어 있으면 PATH에서 notebooklm-mcp(Windows는 notebooklm-mcp.exe)를 찾습니다. 찾지 못하면 실행하지 않습니다.
- 실행 파일에는 실행에 필요한 기본 값(PATH 등)과 NOTEBOOKLM_로 시작하는 값, 그리고 NOTEBOOKLM_HL=ko, NOTEBOOKLM_RATE_LIMIT_MAX_RETRIES=0, NOTEBOOKLM_DISABLE_HEADLESS_REFRESH=1만 넘깁니다. REPOSITORY_IMAGES_ROOT 같은 다른 설정 값은 넘기지 않습니다.
- GET /api/health에 mcp_status를 더합니다. 모양은 {"connected": true, "authStatus": "configured"}입니다. 연결되면 MCP의 server_info 도구(인자 없음) 응답 JSON의 auth_status(configured, not_configured, stale 등)를 authStatus에 넣고, 읽지 못하면 "unknown"입니다.
- 연결하지 못하면 connected는 false, authStatus는 "unreachable"이고, error에 확인한 곳마다 무엇이 없었는지와 할 일(notebooklm-mcp 설치나 NOTEBOOKLM_MCP_COMMAND 지정)을 적습니다. 스위치가 off면 실행 파일을 띄우지 않고 authStatus를 "off"로 둡니다. server_info 응답에 든 메일 주소는 빼고 보냅니다.
- live 질문: 서버가 켜진 뒤 첫 질문 전에 한 번 server_info의 auth_status를 보고, configured가 아니면 질문하지 않고 실패로 끝냅니다.
- live 질문은 MCP의 notebook_query 도구에 notebook_id(설정의 노트북 ID), source_ids(설정의 소스 ID 목록), query, timeout(120)을 넘깁니다. 호출 전체는 135초까지 기다립니다.
- query는 "현장 기준 (기준 번호)((기준 이름)) 관련: (질문 글) 답변 끝에 추가 질문이나 제안을 붙이지 마세요."입니다.
- 응답 content의 글은 JSON입니다. answer를 답변, references 첫 항목의 cited_text를 인용문, source_id를 인용 소스로 씁니다. status가 error면 근거 부족이 아니라 질문 실패로 끝냅니다.

### live 인용 검증
- 인용 소스가 없거나, 인용문이 비었거나, 인용 소스가 설정의 소스 ID 목록에 없으면 근거 부족입니다.
- 통과하면 MCP의 source_get_content 도구에 source_id(인용 소스)를 넘겨 원문을 받습니다. 원문은 응답 JSON의 content입니다. status가 success가 아니거나 호출이 실패하면 작업을 failed로 끝냅니다.
- 공백 차이만 무시하고 인용문이 원문에 그대로 있으면 근거 충분, 없거나 원문이 비었으면 근거 부족입니다. 판정 이유는 결과 메모에 한 줄로 남깁니다.

### live 실패 문구
- 실패하면 작업을 failed로 끝내고, 2번 칸 요청 상태 줄과 알림 패널에 이유를 보여 줍니다. 브라우저 팝업은 쓰지 않습니다.
- 로그인이 안 됐거나 만료됐으면 이유에 "nlm login --storage protected로 로그인한 뒤 로컬 서버를 다시 시작하세요"를 넣습니다.
- 노트북 ID나 소스 ID가 비었으면 채워야 할 키 이름(NOTEBOOKLM_NOTEBOOK_ID, NOTEBOOKLM_SOURCE_IDS)을 이유에 적습니다.
- 질문 오류면 "NotebookLM 질의가 실패했습니다: (이유)", 시간이 지나면 "NotebookLM 응답 시간이 지났습니다. 잠시 뒤 관련 기준 찾기를 다시 눌러 주세요."입니다.
- 실제 연결을 아직 만들지 않은 동안 live로 요청하면 작업을 failed로 끝내고, 이유는 "실제 NotebookLM 연결이 아직 없습니다. NOTEBOOKLM_MODE를 mock으로 두세요."입니다.

### README
- README의 4회차 절에는 사건 상세 세 단계, NOTEBOOKLM_MODE(off·mock·live), 처음에는 mock으로 켜는 법, 실제 연결 준비(uv 설치, uv tool install notebooklm-mcp-cli==0.15.6, nlm login --storage protected, 노트북 만들기, materials/factory-criteria-v1.txt 올리기, 설정 파일에 ID 넣기), MCP 실행 파일을 찾는 순서와 못 찾을 때 할 일을 적습니다.
- 노트북·소스 ID는 설정 파일에만 두고 커밋하거나 대화창에 붙여 넣지 않는다는 안내, Git이 추적하지 않는 파일 목록에 runtime/jobs 폴더(작업 기록), "NotebookLM 결과는 참고 자료이며 발송 승인이나 안전 인증을 대신하지 않습니다." 문장을 넣습니다.
- 실제 연결 준비의 명령은 아래 글자 그대로 적고 다른 명령을 지어내지 않습니다. AI는 이 명령을 실행하지 않습니다. uv 설치는 powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex", 도구 설치는 uv tool install notebooklm-mcp-cli==0.15.6, 로그인은 nlm login --storage protected, 노트북 만들기는 nlm notebook create "현장 리스크 기준" --json, 기준 원문 올리기는 nlm source add <노트북 ID> --file materials/factory-criteria-v1.txt --wait, 소스 ID 보기는 nlm source list <노트북 ID>입니다. <노트북 ID>는 꺾쇠까지 그대로 적습니다.
- 실제 연결을 건너뛰어 그 코드가 아직 없으면 실제 연결 준비 앞에 "아직 이 프로젝트에 실제 NotebookLM을 연결하지 않았습니다. 지금은 예시 결과(mock)만 동작합니다."를 적습니다.

## 5회차 약속

### 설정 파일의 새 키와 스위치
- 설정 파일에 GAS_WEBAPP_URL(Google 웹앱 주소), GEMINI_API_KEY(Gemini 키), STORAGE_MODE(저장소 스위치), GEMINI_MODE(Gemini 스위치)를 더합니다.
- STORAGE_MODE는 live(Google 쪽 코드를 거쳐 Google 시트와 Drive에 저장) 또는 mock(지금처럼 이 PC의 파일에 저장)입니다. 비워 두면 live입니다.
- GEMINI_MODE는 off(쓰지 않음), mock(모의 사진 설명), live(실제 Gemini)입니다. 비워 두면 STORAGE_MODE와 같은 값입니다.
- 4회차의 NOTEBOOKLM_MODE도 이제 비워 두면 STORAGE_MODE와 같은 값입니다(4회차의 "비워 두면 live"를 바꿉니다).
- 허용하지 않는 값이면 4회차 NOTEBOOKLM_MODE처럼 서버를 켜지 않고 허용 값을 알립니다.
- 세 스위치(STORAGE_MODE, GEMINI_MODE, NOTEBOOKLM_MODE)의 값은 비밀이 아닙니다. 요청하면 바꾸고, 바꾼 값을 답에 알려 줘도 됩니다. GAS_WEBAPP_URL과 GEMINI_API_KEY의 값은 비밀입니다.
- GEMINI_API_KEY는 npm.cmd run gas:init만 읽어 Google 쪽 설정으로 보냅니다. 서버(npm.cmd start)는 이 값을 읽어 쓰지 않고 환경 변수로도 옮기지 않습니다.
- 사용자가 대화에 Gemini 키를 붙여 넣으면 설정 파일의 GEMINI_API_KEY 값만 그 키로 바꿉니다. 다른 줄은 그대로 두고, 키 값은 답, 화면, 터미널에 다시 쓰지 않습니다.

### 함께 쓸 수 없는 스위치 조합
- 아래 조합이면 서버는 포트를 잡기 전에 서버 창에 그 문장 한 줄을 보여 주고, 켜지지 않고 끝납니다. off는 어느 조합에서나 쓸 수 있습니다.
  - STORAGE_MODE=live, GEMINI_MODE=mock: "STORAGE_MODE=live에서는 GEMINI_MODE=mock을 쓸 수 없다. 모의 사진 설명이 실제 Google 시트 기록에 저장되기 때문이다. GEMINI_MODE를 live나 off로 바꾸거나 STORAGE_MODE=mock으로 시작한다."
  - STORAGE_MODE=live, NOTEBOOKLM_MODE=mock: "STORAGE_MODE=live에서는 NOTEBOOKLM_MODE=mock을 쓸 수 없다. 모의 근거가 실제 Google 시트 기록에 저장되기 때문이다. NOTEBOOKLM_MODE를 live나 off로 바꾸거나 STORAGE_MODE=mock으로 시작한다."
  - STORAGE_MODE=mock, GEMINI_MODE=live: "STORAGE_MODE=mock에서는 GEMINI_MODE=live를 쓸 수 없다. Gemini는 GAS 안에서 호출하므로 Google 시트 저장소 없이는 실제로 부를 수 없다. GEMINI_MODE를 mock이나 off로 바꾸거나 STORAGE_MODE=live로 시작한다."

### 연동 상태와 "설정 필요"
- 4회차의 연동 상태 줄을 세 칸으로 바꿉니다: "연동 상태: 저장소 로컬 저장 · Gemini mock · NotebookLM live". 저장소가 live면 "저장소 Google 시트", off는 "꺼짐"입니다. 서버 창, /api/health의 integration_status, 화면 알림 줄의 연동 상태가 모두 같은 내용이고, 화면 알림 줄에서는 세 칸으로 나눠 보여 줍니다.
- 화면 알림 줄의 연동 상태는 셋 중 live가 아닌 것이 하나라도 있을 때만 보여 줍니다.
- /api/health에 modes(storage, gemini, notebooklm 세 값)와 gas_configured(GAS_WEBAPP_URL에 값이 있으면 true, 없으면 false)를 더합니다.
- STORAGE_MODE=live인데 GAS_WEBAPP_URL이 비어 있으면 사건 저장·조회 요청에 503과 {"error": "Google 시트에 연결할 GAS 웹 앱 주소가 설정되지 않았습니다. 설정 파일(config/local-connection.json)의 GAS_WEBAPP_URL에 GAS 웹 앱의 /exec 주소를 넣고 로컬 서버를 다시 시작하세요. GAS 없이 시험하려면 STORAGE_MODE를 mock으로 둡니다.", "error_code": "SETUP_REQUIRED", "status": "setup_required"}로 답합니다.
- 화면은 status가 "setup_required"인 오류나 503 오류를 받으면 머리말 연결 표시를 "설정 필요 (GAS Web App 배포 대기)"로 바꾸고, 다음에 조회가 성공하면 원래 표시로 돌립니다. 저장소 사진 목록을 못 받은 503은 여기서 뺍니다(2회차 약속대로 그 칸에만 보여 줍니다).

### 사진 설명(AI 초안) 저장
- 사진 설명 한 건의 항목은 draft_id, record_id, request_id, model(판독 모델 이름), facts(관찰 사실), suspected_risk(의심 위험), locations(위치), uncertainty(불확실성), additional_checks(추가 확인), input_version(판독한 사건 정보 버전), created_at입니다.
- 내 컴퓨터 저장소에 사진 설명 목록 ai_drafts를 더합니다. 예전 기록 파일에 이 목록이 없으면 빈 목록으로 읽습니다.
- 저장소 동작 이름은 analyze_gemini입니다. 같은 request_id로 다시 오면 새로 만들지 않고 저장된 설명을 돌려줍니다.
- 저장하면 사건의 처리 상태(status)를 AI_DRAFTED로 바꾸고, 이력에 단계 AI_ANALYSIS, 작업 이름 "AI 초안 생성", 내용 "Gemini 판독: (의심 위험)"을 남깁니다.
- 사건 상세 데이터에는 가장 최근 사진 설명(ai_draft)을 함께 담습니다.
- 내 컴퓨터 저장소의 모의 사진 설명은 모델 이름 gemini-3.8-flash-synthetic, 이력 작업자 "gemini-3.8-flash (Synthetic)"이고 글은 아래와 같습니다.
  - 산업안전 사건: 관찰 사실 "중앙 작업자의 머리가 충분히 식별되나 안전모가 관찰되지 않습니다.", 의심 위험 "머리 보호구 미착용 위험 (C-01)", 위치 "화면 중앙 작업자의 머리", 불확실성 "작업 구역 진입 직후 탈모인지 일시적 미착용인지 원인 불명확", 추가 확인 "해당 작업 라인의 안전모 착용 의무 및 현장 관리자 확인"
  - 택배 발송 확인 사건: 관찰 사실 "출하 대기 완제품 상자의 모서리가 안쪽으로 함몰되어 있습니다.", 의심 위험 "포장 손상 결함 (C-05)", 위치 "화면 우측 하단 적재 상자", 불확실성 "내부 완충재 및 제품 본체 손상 여부는 외부 관찰로 확인 불가", 추가 확인 "품질 관리자 입회 하에 개봉 재검수 필요"

### 사진 판독 요청
- POST /api/records/(사건번호)/analyze: 4회차의 관련 기준 확인 요청처럼 작업 대기열에 넣고 바로 202와 작업 번호를 돌려줍니다.
- 판독 작업의 종류(job_type)는 analyze로 따로 둡니다. 종류가 없는 예전 작업은 기준 확인으로 봅니다. 기준 확인의 작업 목록, 진행 표시, 최신 결과 계산에 판독 작업을 섞지 않습니다.
- 판독 작업은 요청한 때의 사건 정보 버전과 사진 목록을 고정해 analyze_gemini를 부릅니다. 실패하면 오류 코드와 문장을 작업에 남깁니다.
- 서버를 다시 켤 때 끝나지 않은 판독 작업은 4회차처럼 정리합니다. 같은 request_id의 사진 설명이 저장돼 있으면 완료, 없으면 중단입니다.
- GEMINI_MODE=off이면 409와 {"error": "Gemini 연동이 꺼져 있습니다(GEMINI_MODE=off). 사진 설명을 받으려면 GEMINI_MODE를 바꾸고 로컬 서버를 다시 시작하세요.", "error_code": "INTEGRATION_OFF"}로 거절합니다.

### 사건 상세 네 단계
- 확인 순서는 "1. 사진", "2. AI 사진 설명 (Gemini)", "3. 관련 기준 확인 (NotebookLM)", "4. 내 판단 남기기"입니다.
- "지금 버전"의 설명이나 결과는 판독하거나 확인한 사건 정보 버전이 지금 사건 버전과 같은 것입니다. 다르면 "수정 전" 것입니다.
- 처음 열 때 단계: 사진이 없으면 1, 지금 버전의 사진 설명이 없으면 2, 지금 버전의 기준 확인 결과가 없으면 3, 아니면 4입니다. 꺼진 연동의 단계는 건너뜁니다. 판단을 이미 저장한 사건은 4회차처럼 완료·조치 상태를 따릅니다.
- 안내 문구: 2단계 "Gemini 사진 설명을 확인해 주세요.", 3단계 "AI 결과를 확인했다면, NotebookLM으로 관련 기준을 찾아 사진과 비교해 주세요.", 4단계 "사진과 기준을 비교하고, 직접 확인한 판단을 남겨주세요."
- 2번 구역 끝에 "다음: 관련 기준 확인"(누르면 3단계), 3번 구역 끝에 "다음: 내 판단 남기기"(누르면 4단계) 단추를 둡니다.
- 4번 구역 제목 아래 설명은 "AI 결과와 기준을 참고해, 직접 확인한 판단을 기록하세요."입니다.

### 2번 구역 "2. AI 사진 설명 (Gemini)"
- 접었다 펴는 칸 "사진 설명 더 보기 · Gemini"를 둡니다. 사진 설명이 없거나, 확인하지 않은 판독 상태(진행 중, 중단, 실패, 전송 상태 확인 필요)가 있으면 펼쳐 둡니다.
- 칸 안에 진행 표시 자리와 판독 요청 단추를 둡니다. 단추 이름은 설명이 없으면 "사진 설명 더 보기", 있으면 "사진 설명 다시 보기"입니다.
- 설명이 있으면 이 칸 안의 "Gemini 관찰 초안" 아래에 "판독 모델: (모델 이름)", 관찰 사실, "확인할 점: (의심 위험)", "추가 확인: (추가 확인)"을 보여 줍니다. 위치와 불확실성은 접는 칸 "관찰 위치와 한계"를 펼치면 보입니다.
- 설명이 수정 전 것이면 이 칸 안의 "Gemini 관찰 초안" 바로 위에 "수정 전 결과입니다. 현재 사진과 내용을 다시 확인해 주세요."를 보여 줍니다.
- GEMINI_MODE=off이면 단추를 끄고 "Gemini 연동이 꺼져 있습니다(GEMINI_MODE=off)."를 보여 줍니다.
- 단추를 누르면 판독을 요청합니다. 요청 번호 만들기, 보내는 중 끊긴 요청 처리, 2초마다 상태 확인, 새로고침 뒤 이어 보기는 4회차 관련 기준 확인과 같은 방식입니다.
- 기다리는 동안 단추를 끄고 이름을 "AI 초안 분석 중..."으로 바꾸며, 진행 표시에 지금 상태를 보여 줍니다.
- 끝나면 상세 오른쪽 검토 영역(진행 표시와 2·3·4번 구역)만 다시 그리고 2번 칸을 펼칩니다.
- 상세에 사진을 읽을 수 없다는 안내가 보이는 사건은 요청하지 않고, 화면 안 문구로 "사진 내용을 확인할 수 없어 AI 분석을 요청할 수 없습니다. 다른 사진으로 새 사건을 등록해 주세요."를 보여 줍니다(브라우저 팝업이 아님).

### 요청 알림 패널의 판독 요청
- 판독 요청의 알림 제목: 보내는 중 "AI 초안 요청 전송 중...", 대기 "AI 초안 요청 접수", 진행 "AI 초안 분석 중", 완료 "AI 초안이 준비됐습니다.", 실패 "AI 초안 생성 실패", 서버에 닿지 않음 "AI 초안 요청을 다시 보내 주세요".
- 판독이 NETWORK_TIMEOUT으로 중단되면 제목은 "AI 초안 요청이 중단됐습니다", 설명은 "Gemini 응답이 늦거나 연결이 끊겨 AI 초안을 받지 못했습니다. Gemini가 붐빌 때 생길 수 있습니다. 3분쯤 뒤 이 사건을 다시 열어 AI 초안이 없으면 다시 요청해 주세요."입니다. 2번 구역 진행 표시도 같은 설명을 씁니다.
- 결과 보기, 닫기, 경과 시간, 새로고침 뒤 이어 보기는 4회차 기준 확인 알림과 같습니다.

### 사건 상태 요약
- 사건 상태 요약에 ai(facts, suspected_risk, locations, uncertainty, additional_checks, input_version, created_at)를 더합니다.
- 설명을 받은 뒤 사건 정보를 고쳤으면 기준 확인·판단처럼 "수정 전 자료"로 표시하고, 상세 위쪽의 정보가 바뀌었다는 경고에도 넣습니다.
- "추가 확인" 사건의 확인 이유는 판단 기록에 적은 내용이 없으면 사진 설명의 추가 확인 글을 씁니다.

### 관련 기준 확인은 사진 설명이 먼저
- 3번 구역 "관련 기준 찾기" 단추는 지금 버전의 사진 설명이 있을 때만 켭니다. 없으면 단추를 끄고 "먼저 2단계 Gemini 설명을 준비해 주세요."를 보여 줍니다.
- 서버도 막습니다. 설명이 없으면 400과 {"error": "현재 사건의 Gemini 설명을 먼저 준비해 주세요.", "error_code": "AI_DRAFT_REQUIRED"}, 수정 전 설명이면 400과 {"error": "사건 정보가 수정되었습니다(v1에서 v2로). 최신 사건 정보로 AI 분석을 다시 실행한 후 근거 확인을 요청해주세요.", "error_code": "AI_DRAFT_STALE"}로 답합니다(숫자는 실제 버전).
- 4회차 기준 확인 질문의 사건 정보 부분(분류·장소·메모·사진 장수)을 "장소: (장소) | 사용자 메모: (메모) | Gemini 의심 위험: (의심 위험) | Gemini 관찰 초안: (관찰 사실) | 위치: (위치) | 불확실성: (불확실성)"으로 바꿉니다. 빈 칸은 뺍니다.
- 3번 구역의 4회차 안내 "사건 정보(분류·장소·메모·사진 장수)로 질문합니다."는 뺍니다.
- GEMINI_MODE=off여도 위 규칙은 그대로입니다. 판독하지 않은 사건은 2단계를 건너뛰어 처음 단계가 3(기준 확인을 이미 했으면 4)이 되지만 "관련 기준 찾기"는 꺼져 있고 서버도 400으로 막습니다. 이때는 "다음: 내 판단 남기기"나 "판단 기록하기"로 넘어갑니다.

### 다른 화면
- 홈 카드의 관찰 칸: 사진 설명이 있으면 "AI 관찰: (관찰 사실)", 수정 전 설명이면 "AI 관찰(수정 전 자료): (관찰 사실)", 시점을 알 수 없으면 "AI 관찰(시점 불명): (관찰 사실)"입니다. 설명이 없으면 지금처럼 현장 메모를 보여 줍니다.
- 홈 카드 단추는 사진 설명만 있어도 "이어서 확인"입니다.
- 판단 기록 화면의 "NotebookLM 기준 확인:" 칸 맨 위에 "Gemini 관찰 사실: (관찰 사실)"을 더합니다. 설명이 없으면 "AI 초안 미등록"입니다. 제목 아래 작은 사진 옆에는 판단 근거가 없을 때 관찰 사실을 보여 줍니다.
- 사건 이력에서 단계 AI_ANALYSIS는 "Gemini 판독"으로, 작업자 끝의 "(Synthetic)"은 "(mock)"으로 보여 줍니다.

### Google 쪽 코드(Apps Script)
- 프로젝트 맨 위 gas 폴더에 Code.gs와 appsscript.json 두 파일만 둡니다. Google에서 돌아가는 코드라 require, module.exports, import, process.env를 쓰지 않고, 이 PC에서는 실행해 볼 수 없습니다.
- appsscript.json: "timeZone": "Asia/Seoul", "runtimeVersion": "V8", "oauthScopes"는 https://www.googleapis.com/auth/spreadsheets, https://www.googleapis.com/auth/drive, https://www.googleapis.com/auth/script.external_request 세 개, "webapp": {"executeAs": "USER_DEPLOYING", "access": "ANYONE_ANONYMOUS"}.
- doPost는 받은 JSON의 action 이름으로 일을 나누고 늘 JSON으로 답합니다. 성공은 {"success": true, ...결과}, 실패는 {"success": false, "status": "setup_required" 또는 "error" 또는 "interrupted", "error_code": "...", "error": "문장"}입니다. 본문이 비었거나 JSON이 아니거나 모르는 action이면 BAD_REQUEST입니다(모르는 action의 문장은 "Unknown action: (이름)").
- doGet은 기록을 읽지 않고 {"status": "ok", "message": "권한 승인이 끝났습니다. 이 창을 닫고 터미널로 돌아가세요."}만 돌려줍니다.
- action은 setup, set_gemini_key, create_record, update_record, get_records, get_record, get_image, save_evidence_check, save_review, save_action, reconcile_job, analyze_gemini, gemini_settings입니다. 이름은 서버의 내 컴퓨터 저장소 동작 이름과 같고, 입력 검사·답 모양·이력도 내 컴퓨터 저장소와 같게 합니다. 저장만 시트와 Drive로 합니다.
- setup(함수 이름 initialSetup): 내 Drive에 스프레드시트 "Vision_Risk_Records_Master_(오늘 날짜 yyyyMMdd)"와 폴더 "Vision_Risk_Records_Private_(스프레드시트 ID 앞 8글자)"를 만들고, 두 ID를 스크립트 속성 SPREADSHEET_ID, DRIVE_FOLDER_ID에 저장합니다. 이미 만든 것이 있으면 그대로 쓰고 빠진 탭과 열만 끝에 더합니다. 시트와 폴더는 비공개로 둡니다. 잠금 안에서 해서 두 번 불려도 하나만 생깁니다.
- 시트 탭은 records, ai_drafts, evidence_checks, final_reviews, actions, history입니다. 첫 줄에는 내 컴퓨터 저장소에서 그 목록이 저장하는 항목 이름을 열 제목으로 적습니다. ai_drafts에는 raw_response 열도 두되 값은 비워 둡니다(Gemini 답 전체는 저장하지 않음). 새 스프레드시트에 처음 생기는 빈 기본 탭은 지우지 않고 그대로 둡니다.
- set_gemini_key: 받은 키가 영문·숫자·-·_ 20~200자일 때만 스크립트 속성 GEMINI_API_KEY에 저장합니다. 키 값은 답과 오류 문장에 넣지 않습니다.
- 시트에 글을 쓸 때 =, +, -, @, 탭, 줄바꿈(CR), 숫자로 시작하는 글은 앞에 '를 붙여 글자 그대로 저장하고, 읽을 때는 그 '를 뗍니다. 사진 파일 ID 목록은 JSON 글자로 저장합니다.
- 쓰는 일은 스크립트 잠금으로 하나씩 처리합니다. 10초 기다려도 잠금을 못 잡으면 LOCK_TIMEOUT입니다.
- 처리 중 예외가 나도 JSON으로 답합니다. 시트·폴더 ID가 없으면 status "setup_required"와 SETUP_REQUIRED, 잠금이면 LOCK_TIMEOUT, 그 밖은 INTERNAL_ERROR입니다.
- 사건 상태 요약과 전체 대기열 개수(queue_counts) 계산을 Code.gs 안에도 서버와 같은 규칙으로 둡니다. 서버 코드를 옮겨 와도 되고, 서버 코드는 고치지 않습니다. 시트에서 읽은 시각은 날짜 값이든 글자든 같은 ISO 시각 글자로 맞추고, 참거짓 칸은 TRUE, true, "TRUE"를 모두 참으로 읽습니다.
- create_record: 사진은 1~5장, JPG·PNG, 장당 2MB 이하입니다. 비공개 폴더에 비공개 파일로 올리고, 사건 줄에 drive_folder_id와 drive_file_ids(파일 ID 목록)를 적습니다. 사건 번호는 요청 번호(request_id)로 정해 같은 요청이면 같은 번호가 나오고, 이미 등록된 요청이면 저장된 사건을 돌려줍니다. 사진만 올라가고 멈춘 요청이 다시 오면 이미 올린 사진 파일을 다시 씁니다.
- get_records는 탭마다 한 번씩만 읽어 사건별로 묶고, 사건마다 상태 요약을, 전체에는 queue_counts를 붙입니다. 최근 사건이 위에 옵니다. get_record는 최신 사진 설명·기준 확인·판단과 조치 목록, 이력을 담습니다. get_image는 사건의 n번째 사진을 Drive에서 읽어 base64와 종류(mime)로 돌려줍니다.
- save_evidence_check, save_review, save_action은 해당 탭에 한 줄씩 더합니다. 판정이 네 가지 밖이거나 근거가 비었을 때, 조치 유형·내용이 없거나 조치 완료인데 완료 증빙 메모가 없을 때는 거절합니다. 같은 request_id로 다시 오면 새 줄을 더하지 않고 저장된 것을 돌려줍니다.
- reconcile_job은 판독(analyze)과 기준 확인 작업의 저장 결과를 request_id로 찾아 돌려줍니다.

### Google 쪽의 Gemini 판독(analyze_gemini)
- 같은 request_id의 설명이 이미 있으면 그것을 돌려줍니다. 스크립트 속성 GEMINI_API_KEY가 없으면 SETUP_REQUIRED와 "GAS 스크립트 속성에 GEMINI_API_KEY가 없습니다. npm.cmd run gas:init(macOS: npm run gas:init)으로 Gemini API 키를 넣어 주세요."입니다.
- 서버가 보낸 사진 목록(없으면 사건의 사진)을 Drive에서 순서대로 읽고, 사진마다 앞에 "[사진 프레임 1/3]"처럼 번호 글을 붙입니다. 사진이 없으면 NO_IMAGES, 읽지 못하면 IMAGE_READ_FAILED입니다.
- 지시문은 materials/gemini-prompt.txt의 글을 Code.gs 안에 상수로 글자 그대로 옮겨 사진 뒤에 넣습니다(Google 쪽은 이 PC의 파일을 읽지 못함). temperature는 0.1이고, 답은 JSON으로만 받습니다(responseMimeType "application/json").
- 모델은 gemini-3.8-flash와 gemini-3.5-flash-lite 두 개만 씁니다. 스크립트 속성 GEMINI_MODEL(기본 gemini-3.8-flash)과 GEMINI_FALLBACK_MODEL(기본 gemini-3.5-flash-lite, off면 쓰지 않음)로 바꿀 수 있고, 목록 밖의 값이면 SETUP_REQUIRED와 고칠 방법을 돌려줍니다.
- 키는 주소에 넣지 않고 x-goog-api-key 헤더로 보냅니다. 보내다 예외가 나면 NETWORK_TIMEOUT(status "interrupted")입니다.
- 판독 모델이 HTTP 503이나 429를 돌려주면 대체 모델로 한 번만 다시 보내고, 실제로 답한 모델 이름을 설명과 이력에 남깁니다.
- 그래도 실패하면 아래 문장으로 답합니다((모델)은 실제로 부른 모델).
  - 429: RATE_LIMIT_EXCEEDED, "Gemini API 호출 한도를 초과했습니다 (HTTP 429). (N)초 뒤 다시 시도해주세요."(Gemini가 알려 준 초가 없으면 "(N)초 뒤" 대신 "잠시 후")
  - 503: "Gemini 서버가 붐벼 판독하지 못했습니다(HTTP 503, (모델)). 잠시 뒤 다시 판독을 요청하세요."
  - 400: "Gemini API 키가 올바르지 않거나 요청을 받아 주지 않았습니다(HTTP 400, (모델)). config/local-connection.json의 GEMINI_API_KEY를 확인하고 npm.cmd run gas:init(macOS: npm run gas:init)을 다시 실행하세요."
  - 403: "Gemini API 키에 이 요청을 할 권한이 없습니다(HTTP 403, (모델)). AI Studio에서 새 키를 만들어 npm.cmd run gas:init(macOS: npm run gas:init)으로 다시 넣으세요."
  - 404: "Gemini 판독 모델을 찾지 못했습니다(HTTP 404, (모델)). 스크립트 속성 GEMINI_MODEL·GEMINI_FALLBACK_MODEL을 지우거나 gemini-3.8-flash, gemini-3.5-flash-lite 중 하나로 두세요."
- Gemini 답에서 JSON을 꺼내 facts가 비어 있지 않을 때만 설명으로 받습니다. 차단은 CONTENT_BLOCKED, 빈 답은 EMPTY_RESPONSE, JSON 없음은 INVALID_JSON, 읽기 실패는 PARSE_FAILED, facts 없음은 INVALID_DRAFT_SCHEMA입니다.
- 받은 설명은 ai_drafts 탭에 한 줄 더하고(raw_response는 비움), 사건의 처리 상태를 AI_DRAFTED로 바꿉니다. 이력에는 단계 AI_ANALYSIS, 작업 이름 "AI 초안 생성", 내용 "Gemini 판독((모델)): (의심 위험)", 작업자 "Gemini AI"를 남깁니다. 답 모양은 내 컴퓨터 저장소의 판독과 같습니다.
- gemini_settings는 {"success": true, "model": "(판독 모델)", "fallback_model": "(대체 모델)"}을 돌려줍니다.

### 서버가 Google 쪽을 부르는 법
- STORAGE_MODE=live이면 사건 등록, 정보 수정, 목록, 상세, 판단·조치 저장, 사진 판독, 기준 확인 결과 저장, 작업 맞춰 보기를 내 컴퓨터 저장소 대신 Google 쪽에 같은 action 이름으로 보냅니다. mock이면 GAS_WEBAPP_URL에 값이 있어도 Google 쪽을 부르지 않습니다. 어느 쪽을 쓸지는 서버 한 곳에서 고릅니다.
- 보낼 때는 JSON을 POST로 보내고, 302 이동이 오면 직접 따라가 결과 주소를 GET으로 받습니다. 주소는 https만 받습니다(127.0.0.1·localhost 시험 서버만 http 허용). 제한 시간은 create_record와 analyze_gemini가 300초, 나머지는 120초입니다.
- 실패는 이렇게 바꿉니다. Google 로그인 화면으로 이동하거나 401·403이면 GAS_AUTH_REQUIRED, 접속을 못 하면 GAS_UNREACHABLE, 404면 GAS_URL_INVALID, 429면 RATE_LIMIT_EXCEEDED, JSON이 아니면 GAS_NON_JSON_RESPONSE, 그 밖의 HTTP 오류는 GAS_HTTP_ERROR, 시간 초과면 NETWORK_TIMEOUT입니다. 302를 받은 뒤의 실패와 시간 초과는 Google 쪽이 이미 실행했을 수 있으니 status "interrupted"로 둡니다. 오류 문장에 웹앱 주소를 넣지 않습니다.
- 화면에 돌려줄 HTTP 번호: SETUP_REQUIRED·GAS_AUTH_REQUIRED·GAS_URL_INVALID는 503, RATE_LIMIT_EXCEEDED·LOCK_TIMEOUT은 429, GAS_UNREACHABLE·GAS_NON_JSON_RESPONSE·GAS_HTTP_ERROR는 502, NOT_FOUND는 404, BAD_REQUEST는 400, 그 밖은 500입니다. LOCK_TIMEOUT의 문장은 "다른 저장이 끝나기를 기다리다 시간이 지났습니다. 잠시 뒤 다시 요청하세요(LOCK_TIMEOUT)."로 바꿔 보여 줍니다.
- live일 때도 작업 기록은 4회차 작업 폴더(runtime/jobs)에 둡니다.
- live에서 사건 사진 주소를 열면 서버가 get_image로 Drive 사진을 받아 보여 줍니다. 받은 사진은 Drive 파일 ID를 기준으로 runtime 폴더 안 image-cache 폴더에 저장해 두고 다음부터 씁니다. 저장해 둔 사진을 읽을 때도 JPG·PNG인지 다시 확인하고, 저장이 실패해도 사진은 보여 줍니다.
- git에 올리지 않는 것(.gitignore)에 .clasp.json을 더합니다. runtime 폴더(2회차)가 없으면 runtime 폴더도 더합니다.
- 등록 화면의 직접 파일 업로드 탭 사진 칸 아래 안내는 "현장 사진은 Google Drive 비공개 폴더에 즉시 격리 보존됩니다."입니다(다른 안내가 이미 있으면 바꿉니다). "이전 기록과 사건 정보" 칸의 사건 번호 줄 아래에 "Drive 폴더 ID:"와 "Drive 파일 목록:" 두 줄을 두고(사진 파일 줄이 이미 있으면 이 두 줄로 바꿉니다) 저장소와 관계없이 늘 보여 줍니다. 서버와 Code.gs 모두 목록·상세의 사건 정보에 drive_folder_id와 drive_file_ids를 넣습니다(내 컴퓨터 저장이면 빈 값이어도 됨). 사건 상태 요약에는 넣지 않습니다.

### Google 쪽 명령(package.json의 npm.cmd run gas:…)
- 프로젝트 맨 위의 .clasp.json을 "Google 연결 설정 파일"이라고 부릅니다.
- clasp는 npx --yes @google/clasp@3.4.1로 부르고, 묻는 질문 없이 끝나게 합니다. 도우미 스크립트에서 부를 때 Windows에서는 셸로 실행하고, clasp 출력은 그대로 보여 줍니다.
- gas:login은 clasp login, gas:push는 clasp push --force(--force를 빼지 않음), gas:editor는 clasp open-script입니다.
- gas:create(도우미 스크립트): 빈 임시 폴더 runtime/gas-create를 만들고 clasp create-script --type standalone --title "비전 리스크 대시보드" --rootDir runtime/gas-create로 프로젝트를 만든 뒤 .clasp.json의 rootDir만 gas 폴더로 바꿉니다(clasp가 만들 때 지정한 폴더에 기본 appsscript.json을 받아 우리 파일을 덮어쓰기 때문). 출력에 "Created new script"가 없으면 "clasp가 프로젝트를 만들지 못했습니다. 위 출력을 확인하고, 로그인이 만료됐으면 npm.cmd run gas:login을 다시 실행하세요."로 실패합니다. 성공하면 ".clasp.json이 gas 폴더를 가리키게 했습니다."를 보여 줍니다.
- gas:deploy: GAS_WEBAPP_URL에 이미 값이 있으면 배포하지 않고 "이미 배포 주소가 있습니다. npm.cmd run gas:redeploy로 갱신하세요."를 보여 줍니다. clasp create-deployment --description vision-risk로 새 웹앱 배포를 만들고, clasp 출력에서 AKfyc로 시작하는 배포 ID를 정확히 하나 찾았을 때만 설정 파일의 GAS_WEBAPP_URL에 https://script.google.com/macros/s/(배포 ID)/exec를 적습니다. 이때 STORAGE_MODE가 비어 있으면 live로 같이 적고 다른 키는 그대로 둡니다. clasp가 0으로 끝나도 ID가 없으면 실패입니다. 성공하면 "config/local-connection.json에 GAS_WEBAPP_URL을 적었습니다."를 보여 줍니다.
- gas:redeploy: 설정 파일 주소의 배포 ID로 clasp update-deployment (배포 ID) --description vision-risk를 불러 같은 배포를 새 버전으로 갱신합니다(주소는 그대로). 출력에 "Redeployed (배포 ID) @"가 없으면 실패입니다. 성공하면 "같은 배포를 새 버전으로 갱신했습니다. 주소는 그대로입니다."를 보여 줍니다.
- gas:open: "브라우저로 엽니다. 권한 승인 화면이 나오면 허용하세요."와 웹앱 주소 한 줄을 보여 주고 기본 브라우저로 엽니다. 시크릿 창에 붙여 넣을 때 쓰므로 이 명령만 웹앱 주소를 터미널에 보여 줍니다. 이 명령은 사용자가 직접 칩니다.
- gas:init: 설정 파일의 GAS_WEBAPP_URL로 Google 쪽에 setup을 보내고, GEMINI_API_KEY에 값이 있으면 set_gemini_key로 키를 보냅니다. 다시 실행해도 됩니다. 키는 설정 파일에서만 읽고(같은 이름의 환경 변수는 읽지 않음), 형식이 틀리면 아무것도 보내지 않습니다. 키가 비어 있으면 시트만 준비하고 키를 넣는 방법을 알려 줍니다.
  - Google 쪽이 승인·로그인 화면을 돌려주면 "GAS 웹앱이 아직 권한 승인 전입니다. npm.cmd run gas:open으로 웹앱 주소를 한 번 열어 허용하세요. 안 되면 npm.cmd run gas:editor로 편집기를 열고 initialSetup을 한 번 실행하세요."를 보여 줍니다.
  - 모르는 action이라는 답이면 gas:push와 gas:redeploy를 다시 하라고 알려 줍니다.
  - 성공하면 "Google 시트와 비공개 Drive 폴더를 준비했습니다."와 "Gemini API 키를 GAS 스크립트 속성 GEMINI_API_KEY에 저장했습니다."를 보여 줍니다.
  - 웹앱 주소, 키, 긴 ID는 어느 경우에도 출력하지 않습니다.
- AI가 gas:create, gas:push, gas:deploy, gas:redeploy, gas:init을 실행하면 답에는 각 명령의 마지막 결과 줄만 쓰고 스크립트 ID, 배포 ID, 웹앱 주소는 쓰지 않습니다. gas:deploy는 한 번만 실행합니다(다시 하면 새 주소가 생김). gas:login과 gas:open은 사용자가 직접 칩니다.
