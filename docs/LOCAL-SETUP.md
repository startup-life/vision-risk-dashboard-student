# 로컬 실행 준비

로컬 대시보드를 GAS·Gemini·NotebookLM과 연결하는 방법이다.

**Windows에서 명령 입력하기**
- 창의 줄 맨 앞이 `C:\...>`로 시작하면 명령 프롬프트, `PS C:\...>`로 시작하면 PowerShell입니다.
- 명령 프롬프트에서는 안내한 명령을 그대로 칩니다. 예: `npm start`
- PowerShell에서는 `npm`을 `npm.cmd`로, `npx`를 `npx.cmd`로 바꿔 칩니다. 예: `npm.cmd start`
- PowerShell에서 `.cmd` 없이 쳤다가 "이 시스템에서 스크립트를 실행할 수 없으므로 … npm.ps1 파일을 로드할 수 없습니다" 오류가 나면 `npm.cmd`로 다시 칩니다.
- 매번 바꿔 치기 번거로우면 PowerShell에서 아래 명령을 한 번만 실행합니다. 확인을 물으면 `Y`를 누르고, PowerShell 창을 닫았다가 새로 엽니다. 지금 로그인한 사용자 계정에만 적용되고, 그 뒤로는 `npm`을 그대로 쳐도 됩니다.
  `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`
- 학교·회사 PC에서 이 명령이 "더 구체적인 범위에서 정의된 정책" 같은 문구로 적용되지 않으면 관리자 정책 때문입니다. 그때는 계속 `npm.cmd`로 칩니다.

이 문서의 `npm` 명령은 위 안내대로 입력한다.

로컬 대시보드는 세 곳과 연결된다.

| 연결 | 하는 일 | 준비하는 곳 |
| --- | --- | --- |
| GAS 웹앱 | 사건·판단 기록을 Google Sheets와 Drive에 저장하고 Gemini를 호출한다 | Google Apps Script |
| NotebookLM MCP | 검사 기준 원문과 사진 판독 결과를 대조한다 | 내 PC |
| 로컬 설정 파일 | 위 두 곳의 주소·ID를 서버에 알려 주고, Gemini API 키를 GAS로 보낼 때 읽는다 | `config/local-connection.json` |

1절부터 6절까지가 연결 준비다. 7절은 연동을 하나씩 켜고 끄는 스위치, 8절은 연결 확인, 9절은 NotebookLM 결과를 읽는 법, 10절은 서버를 끄는 법, 11절은 알려진 제한, 12절은 사진 저장소(이미지 레포)를 받는 법이다.
API 키와 웹 앱 주소는 GAS 스크립트 속성과 6절의 설정 파일에만 둔다. 문서·메신저·커밋·에이전트 대화창에 붙여 넣지 않는다.

단계마다 **할 곳**을 적었다.

- **Antigravity(터미널)**: 저장소 폴더의 터미널에서 명령으로 끝난다. Antigravity 에이전트가 명령을 대신 실행해도 된다.
- **웹(클릭)**: 브라우저의 Google 화면에서 본인이 직접 로그인하고 누른다. 에이전트가 대신하지 않는다.
- **설정 파일(본인 편집)**: `config/local-connection.json`을 본인이 열어 고친다. API 키를 붙여 넣는 단계라 에이전트에게 맡기지 않는다.

단계 끝의 「확인:」 줄은 그 단계가 끝났을 때 보이는 것이다.

## 1. GAS 웹앱 배포

개인 Google 계정 하나로 진행한다.
학교·회사(Google Workspace) 계정은 관리자 설정 때문에 배포 액세스에서 "모든 사용자"를 고를 수 없을 수 있다.
이 계정의 Drive에 스프레드시트와 비공개 폴더가 새로 생긴다.

기본은 **clasp 경로**다. Antigravity 터미널에서 명령으로 GAS 프로젝트를 만들고, 코드를 올리고, 웹앱으로 배포한다.
웹에서 직접 하는 일은 아래 표의 "웹(클릭)" 단계뿐이다.
편집기에 코드를 붙여 넣는 방법은 [편집기 붙여넣기 경로(대안)](#편집기-붙여넣기-경로대안)로 남겨 두었다.

- clasp는 `npm run gas:*` 명령이 `npx`로 `@google/clasp@3.4.1`을 받아 실행한다. 따로 설치하지 않는다. 버전이 고정되지 않도록 `npx clasp …`를 직접 치지 않고 npm 명령을 쓴다(편집기 열기도 `npm.cmd run gas:editor`).
- GAS에 올리는 파일은 `courses/vision-96h-v2/gas/`의 `Code.gs`와 `appsscript.json`이다. `appsscript.json`에 시간대(Asia/Seoul), 권한 범위(Sheets·Drive·외부 요청), 웹앱 설정(실행 사용자: 나, 액세스: 모든 사용자)이 들어 있다.
- 명령은 Windows PowerShell 기준(`npm.cmd`, `npx.cmd`)으로 적었다. 명령 프롬프트와 macOS 터미널에서는 `.cmd`를 빼고 친다(위 "Windows에서 명령 입력하기").

| 단계 | 할 일 | 할 곳 | 명령·화면 |
| --- | --- | --- | --- |
| 1 | Gemini API 키 만들기 | 웹(클릭) | 3절 |
| 2 | Apps Script API 켜기 | 웹(클릭) | `script.google.com/home/usersettings` |
| 3 | clasp 로그인 | Antigravity(터미널), 이어서 웹(클릭) | `npm.cmd run gas:login` |
| 4 | GAS 프로젝트 만들기 | Antigravity(터미널) | `npm.cmd run gas:create` |
| 5 | 코드 올리기 | Antigravity(터미널) | `npm.cmd run gas:push` |
| 6 | 웹앱 배포와 주소 기록 | Antigravity(터미널) | `npm.cmd run gas:deploy` |
| 7 | 배포 접근 설정 확인 | Antigravity(터미널), 이어서 웹(클릭) | `npm.cmd run gas:editor`, 편집기의 배포 관리 |
| 8 | Gemini API 키 넣기 | 설정 파일(본인 편집) | `config/local-connection.json`의 `GEMINI_API_KEY` |
| 9 | 첫 권한 승인 | Antigravity(터미널), 이어서 웹(클릭) | `npm.cmd run gas:open` |
| 10 | 초기화(시트·폴더 만들기, 키 저장) | Antigravity(터미널) | `npm.cmd run gas:init` |

### 단계 2. Apps Script API 켜기 — 웹(클릭)

`https://script.google.com/home/usersettings`에서 **Google Apps Script API**를 켠다. 처음에는 꺼져 있다.
꺼져 있으면 4단계의 `npm.cmd run gas:create`가 Apps Script API를 쓸 수 없다는 오류로 끝난다.

확인: 그 화면의 Google Apps Script API가 켜져 있다.

### 단계 3. clasp 로그인 — Antigravity(터미널), 이어서 웹(클릭)

```powershell
npm.cmd run gas:login
```

- 브라우저가 열리면 본인 계정을 고르고, 요청한 권한을 모두 허용한다. 9단계에서도 같은 계정을 쓴다.
- 로그인 정보는 홈 폴더의 `.clasprc.json`에 저장된다. 다른 사람과 나누지 않는다.

확인: 명령이 오류 없이 끝나고 홈 폴더에 `.clasprc.json`이 생긴다.

### 단계 4. GAS 프로젝트 만들기 — Antigravity(터미널)

```powershell
npm.cmd run gas:create
```

- standalone 프로젝트 "비전 리스크 대시보드"를 만들고 저장소 폴더에 `.clasp.json`을 만든다. 프로젝트 ID는 사람마다 달라 `.clasp.json`은 Git에서 뺐다.
- clasp는 새 프로젝트의 기본 파일을 `--rootDir` 폴더에 받아 온다. 그래서 Git이 무시하는 빈 폴더 `runtime/gas-create`에서 만든 뒤 `.clasp.json`의 `rootDir`만 `courses/vision-96h-v2/gas`로 바꾼다. 저장소의 `appsscript.json`은 건드리지 않는다.
- 이미 `.clasp.json`이 있으면 clasp가 `Project file already exists.`를 내고 새 프로젝트를 만들지 않는다. 다른 사람의 `.clasp.json`을 이 저장소로 복사하지 않는다.

확인: `Created new script:`와 `.clasp.json이 courses/vision-96h-v2/gas 폴더를 가리키게 했습니다.`가 나오고, `git status`에 `appsscript.json` 변경이 없다.

### 단계 5. 코드 올리기 — Antigravity(터미널)

```powershell
npm.cmd run gas:push
```

- `courses/vision-96h-v2/gas/`의 `Code.gs`와 `appsscript.json`을 올린다.
- 매니페스트를 덮어쓸지 묻지 않도록 `--force`로 올린다. 편집기에서 고친 코드와 매니페스트는 저장소 내용으로 바뀐다.

확인: `Pushed 2 files`가 나온다.

### 단계 6. 웹앱 배포와 주소 기록 — Antigravity(터미널)

```powershell
npm.cmd run gas:deploy
```

- 새 버전을 만들고 웹앱 배포를 만든다. clasp 출력의 배포 ID로 웹앱 주소(`https://script.google.com/macros/s/<배포 ID>/exec`)를 만들어 `config/local-connection.json`의 `GAS_WEBAPP_URL`에 적는다.
- clasp 출력은 그대로 터미널에 나온다. 출력에 배포 ID가 정확히 하나 있을 때만 주소를 적는다. clasp가 종료 코드 0으로 끝나도 배포 ID가 없으면 실패로 끝낸다.
- 설정 파일이 없으면 `config/local-connection.example.json`의 키로 새로 만든다. 예시 파일에 값이 들어 있어도 옮기지 않는다.
- 주소를 적을 때 `STORAGE_MODE`가 비어 있으면 `live`로 같이 적는다. `npm start`가 이 웹앱(Google 시트)에 저장하게 하려는 것이다. `mock`이 적혀 있으면 바꾸지 않는다. 수업 조합(7절)으로 시작할 때는 이 값을 `mock`으로 바꾼다. 다른 키는 그대로 둔다.
- `GAS_WEBAPP_URL`에 이미 값이 있으면 `이미 배포 주소가 있습니다. npm.cmd run gas:redeploy(macOS: npm run gas:redeploy)로 갱신하세요.`를 내고 배포를 만들지 않는다. 새 배포를 쓰려면 그 값을 `""`로 바꾸고 다시 실행한다.
- 처음 한 번만 한다. 다시 하면 새 주소가 생긴다. 코드를 갱신할 때는 「코드를 고친 뒤 다시 배포하기」를 따른다.
- 설정 파일이 JSON 형식 오류로 읽히지 않으면 `…의 JSON 형식이 올바르지 않습니다. 쉼표와 따옴표를 고친 뒤 다시 실행하세요.`를 내고 배포를 만들기 전에 멈춘다. 틀린 위치는 `npm.cmd start`가 알려 준다(6절 「설정 파일 메시지」).

확인: `GAS_WEBAPP_URL을 적었습니다.`가 나오고, 설정 파일의 `STORAGE_MODE`가 `live`다(원래 `mock`이었으면 그대로다).

### 단계 7. 배포 접근 설정 확인 — Antigravity(터미널), 이어서 웹(클릭)

`appsscript.json`에는 "실행 사용자: 나, 액세스: 모든 사용자"가 들어 있다. 그런데 clasp가 배포를 만들 때 이 설정을 보내지 않는다는 보고가 있다(clasp 이슈 #1115). 그래서 편집기에서 한 번 본다.

1. Antigravity 터미널에서 편집기를 연다. 기본 브라우저에 Apps Script 편집기가 열린다.
   ```powershell
   npm.cmd run gas:editor
   ```
2. 편집기의 **배포**, **배포 관리**를 연다.
3. 6단계에서 만든 배포가 **웹 앱**이고, 실행 사용자가 **나**(Me), 액세스 권한이 있는 사용자가 **모든 사용자**(Anyone)인지 본다.
4. 다르면 그 배포의 편집(연필) 버튼을 눌러 고치고 **배포**를 누른다. 같은 배포를 고치면 주소는 바뀌지 않는다.

로컬 서버는 Google 로그인 없이 웹앱 주소로 요청을 보낸다. 그래서 "모든 사용자"가 아니면 연결되지 않는다. 웹 앱 주소를 아는 사람은 누구나 이 시트의 기록과 사진을 읽고 쓸 수 있고, 스크립트 속성의 API 키로 Gemini 판독을 실행하거나 키를 바꿀 수 있다. 그러니 주소는 6절의 설정 파일에만 두고(`config/` 아래 설정 파일은 Git이 추적하지 않는다) 화면 공유나 메시지로 남에게 보이지 않는다. `gas:deploy`·`gas:redeploy`의 clasp 출력에는 배포 ID가, `gas:open`의 출력에는 주소가 그대로 나오므로 화면을 공유하는 중에는 이 명령을 실행하지 않는다.

확인: 배포 관리에 보이는 설정이 웹 앱, 나, 모든 사용자다.

### 단계 8. Gemini API 키 넣기 — 설정 파일(본인 편집)

`config/local-connection.json`을 메모장(macOS: 텍스트 편집기)이나 Antigravity 편집기로 열고, 3절에서 만든 키를 `GEMINI_API_KEY`의 따옴표 안에 붙여 넣고 저장한다.

```json
"GEMINI_API_KEY": "여기에 키를 붙여 넣는다",
```

- 키는 10단계 `npm.cmd run gas:init`만 읽어 GAS 스크립트 속성 `GEMINI_API_KEY`로 보낸다. `npm start`로 띄운 로컬 서버는 이 값을 환경 변수로 옮기지 않는다.
- 같은 이름의 환경 변수는 읽지 않는다. 다른 도구용으로 넣어 둔 키가 GAS로 가지 않게 하려는 것이다.
- 키를 Antigravity 대화창에 붙여 넣거나 에이전트에게 이 파일을 읽게 하지 않는다.
- 편집기의 **프로젝트 설정**, **스크립트 속성**에 직접 넣어도 된다(2절). 그때는 이 칸을 비워 둔다.

확인: 파일을 저장한 뒤 `npm start`를 실행했을 때 `설정 경고:`로 시작하는 줄이 없다.

### 단계 9. 첫 권한 승인 — Antigravity(터미널), 이어서 웹(클릭)

웹앱은 배포한 사람의 권한(Sheets·Drive·외부 요청)으로 실행된다. 그 권한을 한 번 허용해야 웹앱이 응답한다.

1. Antigravity 터미널에서 웹앱 주소를 연다. 설정 파일의 `GAS_WEBAPP_URL`을 터미널에 출력하고 기본 브라우저로 연다. 브라우저가 열리지 않으면 터미널에 나온 주소를 브라우저 주소창에 붙여 넣는다.
   ```powershell
   npm.cmd run gas:open
   ```
2. 기본 브라우저가 3단계와 같은 계정으로 로그인돼 있어야 한다. 권한 확인 화면이 나오면 계정을 고르고 허용한다.
   브라우저에 Google 계정이 여러 개 로그인돼 있으면 웹앱 주소가 다른 계정(보통 처음 로그인한 계정)으로 열려 "액세스 거부됨"이나 파일을 열 수 없다는 화면이 나올 수 있다. 그때는 시크릿 창(Chrome: Windows `Ctrl+Shift+N`, macOS `Cmd+Shift+N`)을 열고 3단계 계정으로만 로그인한 뒤, 터미널에 나온 주소를 그 창의 주소창에 붙여 넣어 연다. 주소는 남에게 보이지 않게 한다(7단계).
   개인 Google 계정이면 "Google에서 확인하지 않은 앱" 경고가 나온다. 내가 만든 스크립트이므로 **고급**을 눌러 프로젝트로 이동한 뒤 허용한다.
3. 화면에 `권한 승인이 끝났습니다. 이 창을 닫고 터미널로 돌아가세요.`가 들어 있는 짧은 JSON이 보이면 창을 닫는다. 기록은 들어 있지 않다.

주소를 여는 것만으로 승인되지 않을 수 있다. 승인 화면이 나오지 않거나 10단계가 같은 안내를 다시 내면 편집기에서 승인한다.

1. Antigravity 터미널에서 `npm.cmd run gas:editor`로 편집기를 연다.
2. 상단 함수 목록에서 `initialSetup`을 고르고 **실행**을 누른다.
3. 권한 확인 창에서 위 2번처럼 허용한다. 이 실행이 시트와 폴더도 만든다.

확인: 10단계가 승인 안내 없이 끝난다. `gas:open`은 Windows에서 `start ""`, macOS에서 `open`으로 브라우저를 연다.

### 단계 10. 초기화 — Antigravity(터미널)

```powershell
npm.cmd run gas:init
```

설정 파일의 `GAS_WEBAPP_URL`로 웹앱에 두 가지를 요청한다. 다시 실행해도 된다.

1. 시트와 폴더 준비(`setup`): 내 Drive에 `Vision_Risk_Records_Master_날짜` 스프레드시트와 `Vision_Risk_Records_Private_…` 폴더를 만든다. 이미 있으면 그대로 쓰고, 빠진 탭과 열만 더한다. 두 ID는 스크립트 속성 `SPREADSHEET_ID`·`DRIVE_FOLDER_ID`에 저장되고, 폴더와 스프레드시트는 비공개로 설정된다.
2. 키 저장(`set_gemini_key`): 설정 파일의 `GEMINI_API_KEY`를 스크립트 속성 `GEMINI_API_KEY`에 저장한다. 값이 비어 있으면 보내지 않고 다음 할 일을 알린다. 키 없이도 기록 저장은 된다.

웹앱 주소와 키는 터미널에 출력하지 않는다. 실패하면 오류 코드와 한 줄 안내가 나오고 종료 코드 1로 끝난다.

| 터미널 메시지 | 뜻과 할 일 |
| --- | --- |
| GAS 웹앱이 아직 권한 승인 전입니다. npm.cmd run gas:open으로 … | 9단계를 한다. 승인 화면 대신 로그인 화면이 나오면 7단계의 접근 설정도 본다 |
| GAS_WEBAPP_URL이 비어 있습니다 | 6단계 `npm.cmd run gas:deploy`를 하거나, 편집기에서 배포한 웹 앱 URL을 설정 파일에 넣는다 |
| GEMINI_API_KEY 값이 Gemini API 키 형식이 아닙니다 | 키를 따옴표 안에 그대로 붙여 넣었는지 본다. 이때는 아무것도 보내지 않는다 |
| GAS 웹앱이 … 동작을 모릅니다 | 웹앱 코드가 예전 것이다. `npm.cmd run gas:push`와 `npm.cmd run gas:redeploy`를 한 뒤 다시 실행한다 |
| GAS … 요청에 실패했습니다(오류 코드) | 8절의 오류 코드 표를 본다 |

확인: `Google 시트와 비공개 Drive 폴더를 준비했습니다.`와 `Gemini API 키를 GAS 스크립트 속성 GEMINI_API_KEY에 저장했습니다.`가 나온다. `npm.cmd run gas:open`으로 연 화면에 `"status":"ok"`와 승인 완료 안내가 보인다.

### 편집기 붙여넣기 경로(대안)

clasp를 쓸 수 없을 때(Apps Script API를 켤 수 없는 계정 등) 편집기에서 직접 만든다.

| 단계 | 할 일 | 할 곳 |
| --- | --- | --- |
| 1 | 새 프로젝트를 만들고 코드 붙여 넣기 | 웹(클릭) |
| 2 | `initialSetup` 실행과 권한 승인 | 웹(클릭) |
| 3 | 웹 앱 배포 | 웹(클릭) |
| 4 | 웹 앱 URL을 설정 파일에 넣기 | 설정 파일(본인 편집) |
| 5 | 키 저장 | Antigravity(터미널) 또는 웹(클릭) |

1. [Apps Script](https://script.google.com)에서 **새 프로젝트**를 만든다. 편집기의 `Code.gs` 내용을 모두 지우고 이 저장소의 `courses/vision-96h-v2/gas/Code.gs` 내용을 그대로 붙여 넣은 뒤 저장한다.
   매니페스트(`appsscript.json`)는 붙여 넣지 않아도 동작한다. 시간대까지 맞추려면 **프로젝트 설정**에서 "편집기에 'appsscript.json' 매니페스트 파일 표시"를 켜고 저장소의 `appsscript.json` 내용으로 바꾼다.
2. 상단 함수 목록에서 `initialSetup`을 고르고 **실행**을 누른다. 권한 확인 창은 9단계의 2번처럼 허용한다. 실행이 끝나면 10단계 1번의 시트와 폴더가 생긴다.
3. **배포** 메뉴에서 **새 배포**를 누르고 유형을 **웹 앱**으로 고른다. 실행 사용자는 **나**(Me), 액세스 권한이 있는 사용자는 **모든 사용자**(Anyone)로 한다(7단계의 주의 사항을 읽는다).
4. 배포가 끝나면 나오는 **웹 앱 URL**(`https://`로 시작하고 `/exec`로 끝난다)을 `config/local-connection.json`의 `GAS_WEBAPP_URL`에 넣는다.
5. 8단계대로 설정 파일에 키를 넣고 `npm.cmd run gas:init`을 실행한다. 편집기의 스크립트 속성 `GEMINI_API_KEY`에 직접 넣어도 된다(2절). 속성은 배포한 뒤에 넣거나 바꿔도 다시 배포하지 않고 바로 반영된다.

확인: 시크릿 창에서 웹 앱 URL을 열면 `"status":"ok"`가 보인다.

### 코드를 고친 뒤 다시 배포하기

`Code.gs`나 `appsscript.json`을 바꾸면 다시 배포해야 반영된다. 같은 웹앱 주소를 유지한다. 새 배포를 만들면 주소가 바뀌어 설정 파일도 바꿔야 한다.

clasp 경로는 Antigravity(터미널)에서 이렇게 한다.

```powershell
npm.cmd run gas:push
npm.cmd run gas:redeploy
npm.cmd run gas:init
```

- `gas:redeploy`는 설정 파일의 `GAS_WEBAPP_URL`에서 배포 ID를 꺼내 `clasp update-deployment <배포 ID>`로 같은 배포를 새 버전으로 갱신한다. 주소는 그대로이고, 배포 ID를 따로 적지 않는다.
- `gas:init`은 새 코드에 더한 탭이나 열을 시트에 채운다. 있는 시트와 폴더는 그대로 쓴다. 설정 파일에 키가 있으면 그 키를 다시 저장하고, 비어 있으면 스크립트 속성의 키를 건드리지 않는다.
- `npm.cmd run gas:deploy`는 새 주소를 만들기 때문에 갱신에는 쓰지 않는다.
- 갱신한 뒤에도 7단계처럼 배포 관리의 접근 설정이 웹 앱, 나, 모든 사용자인지 본다.

편집기 붙여넣기 경로는 웹(클릭)에서 이렇게 한다.

1. 편집기의 `Code.gs` 내용을 저장소의 새 내용으로 모두 바꾸고 저장한다.
2. **배포** 메뉴에서 **배포 관리**를 연다.
3. 기존 웹 앱 배포의 편집(연필) 버튼을 누른다.
4. 버전에서 **새 버전**을 고르고 **배포**를 누른다.

확인: clasp 출력 `Redeployed <배포 ID> @<번호>`와 `같은 배포를 새 버전으로 갱신했습니다. 주소는 그대로입니다.`가 나오고, 이어서 `npm.cmd run gas:init`이 다시 성공한다.

- 이 문구는 clasp 출력에 `Redeployed <같은 배포 ID> @`가 있을 때만 나온다. clasp 3.4.1은 로그인이 만료됐을 때 갱신하지 않고도 종료 코드 0으로 끝날 수 있어, 이 줄이 없으면 실패로 알린다.

### clasp 로그인이 만료됐을 때

회사·학교 계정은 재인증 정책 때문에 clasp 로그인이 중간에 만료될 수 있다. 그때 clasp는 `{"error":"invalid_grant","error_description":"reauth related error (invalid_rapt)",…}`를 출력한다.

| 명령 | 나오는 것 | 할 일 |
| --- | --- | --- |
| `gas:push`, `gas:editor` | clasp 출력 그대로. 위 JSON이 나오고 종료 코드 1로 끝난다 | `npm.cmd run gas:login`으로 다시 로그인한 뒤 같은 명령을 다시 한다 |
| `gas:deploy`, `gas:redeploy` | clasp 출력 그대로 다음에 `clasp 출력에서 배포 ID를 찾지 못했습니다. 위 출력을 확인하고, 로그인이 만료됐으면 npm.cmd run gas:login(macOS: npm run gas:login)을 다시 실행하세요.` | 위 출력에 `invalid_grant`가 있으면 같다. 설정 파일은 바뀌지 않는다. 없으면 위 출력을 보고, `gas:redeploy`였으면 편집기의 배포 관리에서 그 배포의 버전이 바뀌었는지 확인한다 |
| `gas:create` | clasp 출력 그대로 다음에 `clasp가 프로젝트를 만들지 못했습니다. 위 출력을 확인하고, 로그인이 만료됐으면 npm.cmd run gas:login(macOS: npm run gas:login)을 다시 실행하세요.` | 위 출력에 `invalid_grant`가 있으면 같다 |

## 2. 스크립트 속성

스크립트 속성은 편집기 왼쪽의 **프로젝트 설정**(톱니바퀴), **스크립트 속성**에서 보고 고친다. 편집기는 Antigravity 터미널에서 `npm.cmd run gas:editor`로 연다.

| 속성 | 넣는 방법 | 비고 |
| --- | --- | --- |
| `SPREADSHEET_ID` | `npm.cmd run gas:init`(또는 편집기에서 `initialSetup` 실행)이 자동으로 넣는다 | 직접 고치지 않는다 |
| `DRIVE_FOLDER_ID` | `npm.cmd run gas:init`(또는 편집기에서 `initialSetup` 실행)이 자동으로 넣는다 | 직접 고치지 않는다 |
| `GEMINI_API_KEY` | 설정 파일의 `GEMINI_API_KEY`를 `npm.cmd run gas:init`이 넣는다. 편집기에서 직접 넣어도 된다 | 3절 참고 |
| `GEMINI_MODEL` | 선택. 비워 두면 `gemini-3.8-flash`를 쓴다 | 모델을 바꿀 때만 편집기에서 넣는다 |
| `GEMINI_FALLBACK_MODEL` | 선택. 비워 두면 `gemini-3.5-flash-lite`를 쓴다 | `off`를 넣으면 다시 보내지 않는다 |

같은 판독 요청이 두 번 저장되지 않는지는 `ai_drafts` 탭의 `request_id`로 확인한다. 예전 코드가 만든 `RESERVE_REQ_`로 시작하는 속성은 더 쓰지 않으니 지워도 된다.

`GEMINI_MODEL`·`GEMINI_FALLBACK_MODEL`을 넣을 때는 아래를 지킨다.

- 값은 `gemini-3.8-flash`, `gemini-3.5-flash-lite` 둘 중 하나다. 대체 모델은 `off`도 된다. `models/` 접두사는 붙이지 않는다.
- 2.5 모델은 쓰지 않는다. Google이 2.5 모델을 예전에 쓰던 사용자에게만 열어 두어, 새로 만든 키에서는 막힐 수 있다(Gemini API 변경 기록 2026-09-18).
- 판독 모델이 붐비거나(HTTP 503) 한도에 걸리면(HTTP 429) 같은 판독 안에서 대체 모델로 한 번만 다시 보낸다. 그 밖의 오류는 다시 보내지 않는다. 대체 모델이 `off`이거나 판독 모델과 같으면 다시 보내지 않는다.
- 실제로 답한 모델은 사건 상세의 Gemini 결과에 "판독 모델"로 보이고, 이력에도 남는다. `npm start`가 GAS에 물어 `연동 상태:` 줄에 `Gemini live(gemini-3.8-flash, 대체 gemini-3.5-flash-lite)`처럼 적는다.
- 값이 틀리면 AI 판독만 `SETUP_REQUIRED`로 끝난다. 기록 저장에는 영향이 없다.
- 속성은 다시 배포하지 않아도 바로 반영된다. 이 두 속성을 읽는 `Code.gs`를 배포한 뒤부터 적용된다.

## 3. Gemini API 키

- 키는 [Google AI Studio](https://aistudio.google.com)에서 만든다(웹(클릭)). 만든 키는 1절 8단계대로 설정 파일에 넣고 `npm.cmd run gas:init`으로 GAS에 저장한다.
- 처음에는 개인 AI Studio 무료 키로 시작한다.
- 무료 한도에 닿으면 대체 모델로 한 번 다시 보낸다(2절). 대체 모델도 한도에 걸리면 AI 판독이 `RATE_LIMIT_EXCEEDED`로 끝나고, 다시 시도할 시간이 함께 나온다. 그 시간이 지난 뒤 다시 판독을 요청한다.
- 키가 틀리면 HTTP 400, 권한이 없으면 HTTP 403, 모델이 없으면 HTTP 404 안내가 나온다. 안내대로 키를 다시 넣거나 `GEMINI_MODEL`을 지운다.
- 한도 오류가 계속 나오면 회사가 준 키로 바꾼다. 설정 파일의 `GEMINI_API_KEY`를 바꾸고 `npm.cmd run gas:init`을 다시 실행한다(편집기의 스크립트 속성을 직접 바꿔도 된다). 다시 배포하거나 로컬 서버를 다시 시작할 필요는 없다.
- 무료 등급에서는 보낸 내용(사진 포함)이 Google 제품 개선에 쓰일 수 있다([가격표](https://ai.google.dev/gemini-api/docs/pricing)의 "Used to improve our products" 항목). 실제 고객 자료나 개인정보가 든 사진은 올리지 않는다.
- 키가 없으면 AI 판독 요청이 `SETUP_REQUIRED`로 끝난다. 기록 저장은 키 없이도 된다.

## 4. NotebookLM MCP

NotebookLM 연결은 패키지 `notebooklm-mcp-cli`(저장소 [jacob-bd/gemini-notebook-mcp-cli](https://github.com/jacob-bd/gemini-notebook-mcp-cli))를 쓴다.
로컬 서버가 이 프로그램을 직접 실행해서 질의한다.

### 설치와 로그인

1. Python 도구 관리자 [uv](https://docs.astral.sh/uv/getting-started/installation/)를 설치한다. 설치가 끝나면 터미널 창을 닫고 새로 연다.
2. 새 터미널에서 설치한다.
   ```sh
   uv tool install notebooklm-mcp-cli
   ```
   명령줄 도구 `nlm`과 MCP 서버 `notebooklm-mcp`가 함께 설치된다.
   `nlm`을 찾을 수 없다고 나오면 `uv tool update-shell`을 실행하고 터미널 창을 다시 연다(Windows에서는 확인하지 않았다).
   로컬 서버는 `notebooklm-mcp`를 PATH에서 찾으므로 따로 등록하지 않아도 된다(5절). 설치한 뒤 새로 연 터미널에서 서버를 시작한다.
   Windows에서 `nlm`을 찾지 못하면 uv의 설치 폴더(`%USERPROFILE%\.local\bin`)가 PATH에 들어 있는지 본다.
   `nlm setup add antigravity`는 Antigravity에서 NotebookLM을 MCP 도구로 쓰려고 Antigravity 설정 파일(`~/.gemini/antigravity/mcp_config.json`)에 등록하는 명령이다. 대시보드를 실행하는 데는 필요 없다. 등록해 두면 로컬 서버도 그 항목을 쓴다(5절 2번).
3. 로그인한다. 이 명령은 Antigravity 터미널에 **본인이 직접** 입력한다. 로그인을 5분(300초)까지만 기다리므로 에이전트에게 시키지 않는다.
   ```sh
   nlm login --storage protected
   ```
   - `--storage protected`는 로그인 정보를 어디에 둘지 묻지 않고 운영체제의 암호 저장소에 암호화해 둔다.
   - 로그인 창은 평소 쓰는 Chrome과 별도인 nlm 전용 프로필 창으로 새로 뜬다. 평소 Chrome을 닫지 않아도 된다. 평소 프로필의 북마크·로그인은 쓰지 않는다.
   - 첫 화면은 Google 로그인 화면이 아니라 Gemini Notebook 소개 페이지다(NotebookLM의 새 이름). 오른쪽 위 `Sign in`이나 가운데 `Sign in to Gemini Notebook`을 눌러 Google 로그인으로 넘어간 뒤 NotebookLM을 쓸 본인 계정으로 로그인한다.
   - 성공 메시지가 나올 때까지 터미널과 로그인 창을 닫지 않는다.
4. 로그인 상태를 확인한다. `✓ Authentication valid!`가 나오면 된다.
   ```sh
   nlm login --check
   ```

위 순서는 nlm 0.15.6 기준이다.

### 노트북과 기준 문서 준비

검사 기준 원문은 `courses/vision-96h-v2/preview/factory-criteria-v1.txt`에 있다. C-01부터 C-09까지 기준 9개가 들어 있다.
아래 명령은 이 저장소 폴더에서 실행한다(파일을 상대 경로로 가리키기 때문이다).
`<노트북 ID>`는 꺾쇠(`<`, `>`)까지 지우고 실제 ID로 바꿔 넣는다. PowerShell에서는 `<`가 특수 기호라 그대로 두면 오류가 난다.

1. 노트북을 만든다. 출력되는 JSON의 `"notebook_id"` 값(36자 UUID)이 노트북 ID다.
   ```sh
   nlm notebook create "현장 리스크 기준" --json
   ```
   웹(notebook.google.com, 화면 이름 Gemini Notebook)에서 만들어도 된다. 그때는 `nlm notebook list --json`에서 `"title"`로 찾는다. 이 목록에서는 ID 이름이 `"notebook_id"`가 아니라 `"id"`다.
2. 기준 문서를 소스로 올린다. 끝나면 `✓ Added source: factory-criteria-v1.txt (ready)`처럼 `(ready)`가 붙은 줄이 나온다.
   ```sh
   nlm source add <노트북 ID> --file courses/vision-96h-v2/preview/factory-criteria-v1.txt --wait
   ```
3. 소스 ID를 확인한다.
   ```sh
   nlm source list <노트북 ID>
   ```

기준 확인 한 번은 보통 40~60초 걸린다. 대시보드는 NotebookLM 질의에 120초(notebooklm-mcp-cli 0.15.6 기본값), MCP 호출 전체에 135초까지 기다린다. 그 안에 답이 없으면 "NotebookLM 응답 시간이 지났습니다. 잠시 뒤 관련 기준 찾기를 다시 눌러 주세요."가 나온다. 질의문에는 답변 끝에 추가 질문이나 제안을 붙이지 말라고 적는다. 화면은 `> ` 다음에 따옴표나 글자가 오는 줄을 인용 모양으로 보여 주고(`> 5bar` 같은 비교는 그대로 둔다), "전체 답변"은 원문 그대로 보여 준다.

노트북 ID와 소스 ID는 6절 설정 파일에 넣는다.
대시보드는 여기서 허용한 소스에서 나온 인용만 근거로 인정한다.

## 5. NotebookLM 실행 파일 찾기 규칙

로컬 서버는 아래 순서로 MCP 실행 파일을 찾는다. 앞에서 찾으면 뒤는 보지 않는다.

1. 설정 파일(`config/local-connection.json`)의 `NOTEBOOKLM_MCP_COMMAND`. 같은 이름의 환경 변수도 된다.
   절대 경로나, PATH에 있는 명령 이름(`notebooklm-mcp`)을 쓴다.
2. 값이 없으면 Antigravity의 MCP 설정 파일을 이 순서로 읽는다. 앞 파일에 항목이 있으면 뒤 파일은 읽지 않는다.
   - `~/.gemini/config/mcp_config.json` (Windows: `%USERPROFILE%\.gemini\config\mcp_config.json`)
   - `~/.gemini/antigravity/mcp_config.json` (Windows: `%USERPROFILE%\.gemini\antigravity\mcp_config.json`)

   파일의 `mcpServers` 아래 `gemini-notebook-mcp` 항목에 있는 `command`·`args`·`env`를 쓴다.
   예전 이름(`notebooklm-mcp`, `notebooklm`)으로 등록했다면 `nlm setup add antigravity`를 다시 실행하면 새 이름으로 등록된다.
3. 그래도 없으면 마지막으로 PATH에서 `notebooklm-mcp`를 찾는다. `uv tool install notebooklm-mcp-cli`로 설치했다면 보통 여기서 찾는다.
   로컬 서버를 시작한 터미널의 PATH를 쓴다. Windows에서는 `PATHEXT`의 확장자(`.exe` 등)를 붙여 찾는다.
   2번의 설정 파일이 비어 있거나(0바이트) JSON 오류여도 PATH까지 찾는다.
4. 모두 없어도 서버는 시작한다. 서버를 시작할 때 터미널의 `연동 상태:` 줄에 `NotebookLM live(실행 파일을 찾지 못함, docs/LOCAL-SETUP.md 5절)`가 나온다.
   기준 대조는 실행 파일을 설치하거나 설정하라는 안내와 함께 실패한다. `/api/health`의 `mcp_status.error`에 확인한 위치마다 무엇이 없었는지 나온다.

실행 인자는 찾은 곳에 따라 다르다.

- `NOTEBOOKLM_MCP_COMMAND`를 쓰면 `--transport stdio`를 붙여 실행한다.
- Antigravity 항목을 쓰면 그 항목의 `args`로 실행한다. `args`가 없으면 인자 없이 실행한다.
  `"command": "uvx", "args": ["--from", "notebooklm-mcp-cli", "notebooklm-mcp"]` 형식도 된다.
- PATH에서 찾으면 `--transport stdio`를 붙여 실행한다.

MCP 실행 파일에는 아래 환경 변수만 넘긴다. `GAS_WEBAPP_URL` 같은 서버 설정값은 넘기지 않는다.

- MCP SDK가 기본으로 넘기는 변수(`PATH`, `HOME`, Windows의 `APPDATA` 등)
- `NOTEBOOKLM_`로 시작하는 변수
- `TMPDIR`, `TMP`, `LANG`, `LC_ALL`, `LC_CTYPE`
- 프록시: `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY`, `ALL_PROXY`(소문자 이름도 된다)
- 인증서 묶음: `SSL_CERT_FILE`, `SSL_CERT_DIR`, `REQUESTS_CA_BUNDLE`
- Antigravity 항목의 `env`

Windows에서는 변수 이름의 대소문자를 가리지 않는다. 그 밖의 변수가 필요하면 Antigravity 항목의 `env`에 넣는다.

설치한 실행 파일의 위치는 아래 명령으로 확인한다.

```powershell
# Windows (PowerShell)
(Get-Command notebooklm-mcp).Source
```

```sh
# macOS
which notebooklm-mcp
```

Windows에서 나온 경로는 역슬래시(`\`)로 이어져 있다. 설정 파일에 넣을 때는 `/`로 바꾸거나 역슬래시를 두 번 쓴다.

## 6. 로컬 설정 파일

`npm start`와 `gas:deploy`·`gas:redeploy`·`gas:init` 명령은 저장소의 `config/local-connection.json`을 읽는다.
어느 폴더에서 실행해도 이 위치는 같다. 이 파일은 Git이 추적하지 않는다.
clasp 경로에서는 `npm.cmd run gas:deploy`가 이 파일이 없으면 만들고 `GAS_WEBAPP_URL`만 채운다. 직접 만드는 방법은 [README](../README.md)의 "연결 설정 파일 만들기"를 따른다.

| 키 | 값 | 얻는 곳 |
| --- | --- | --- |
| `GAS_WEBAPP_URL` | 웹 앱 URL(`https://…/exec`) | 1절 단계 6의 `npm.cmd run gas:deploy`가 적는다. 편집기에서 배포했으면 직접 넣는다 |
| `GEMINI_API_KEY` | Gemini API 키. `npm.cmd run gas:init`만 읽어 GAS 스크립트 속성으로 보낸다. 로컬 서버는 쓰지 않는다 | 3절, 1절 단계 8 |
| `NOTEBOOKLM_NOTEBOOK_ID` | 노트북 ID | 4절 |
| `NOTEBOOKLM_SOURCE_IDS` | 소스 ID. 여러 개면 쉼표로 구분한 문자열 하나(`"ID1,ID2"`) | 4절 |
| `NOTEBOOKLM_MCP_COMMAND` | MCP 실행 파일 경로나 명령 이름. Antigravity 설정을 쓰면 비워 둔다 | 5절 |
| `REPOSITORY_IMAGES_ROOT` | 이미지 레포 폴더. 기본 위치에 두었으면 비워 둔다 | 12절 |
| `STORAGE_MODE`, `GEMINI_MODE`, `NOTEBOOKLM_MODE` | 연동 스위치. 비워 두면 기본값을 쓴다 | 7절 |

- 쓰지 않는 항목은 빈 문자열(`""`)로 둔다. 빈 값은 "이 파일에서 정하지 않음"이다. 같은 이름의 환경 변수가 있으면 그 값을 쓰고, 없으면 기본값을 쓴다.
- Windows 경로는 `C:/vision/models`처럼 `/`로 쓰거나 `C:\\vision\\models`처럼 역슬래시를 두 번 쓴다.
  역슬래시를 하나만 쓰면 서버가 JSON 형식 오류로 멈추거나, 그 값을 경고하고 무시한다.
- 파일은 UTF-8로 저장한다(메모장의 기본값이다). 파일 맨 앞의 BOM 표시는 서버가 떼고 읽는다.
  UTF-16으로 저장하면 서버가 알려 주고 시작하지 않는다. ANSI로 저장하면 한글 경로가 다른 글자로 바뀐다.
- 시크릿 값은 이 파일에만 둔다. 이 파일을 커밋하거나 다른 사람에게 보내지 않는다.

다른 위치의 설정 파일을 쓰려면 환경 변수 `VISION_RISK_CONFIG`에 그 파일의 절대 경로를 넣는다.

### 설정 파일 메시지

`npm start`를 실행하면 서버가 설정 파일을 먼저 확인하고 결과를 터미널에 알린다.
경고는 `설정 경고:`로 시작한다. 경고에는 키 이름만 나오고 값은 나오지 않는다.

서버가 시작하지 않는 오류:

| 터미널 메시지 | 뜻과 할 일 |
| --- | --- |
| 설정 파일을 읽지 못했다 | 파일 권한이나 경로를 확인한다. 괄호 안에 원인 코드가 나온다 |
| 설정 파일이 UTF-16으로 저장돼 있다 | 메모장의 "다른 이름으로 저장"에서 인코딩을 UTF-8로 골라 다시 저장한다 |
| 설정 파일이 비어 있다 | `config/local-connection.example.json` 내용을 복사해 넣는다 |
| 설정 파일의 JSON 형식이 올바르지 않다 | 알려 준 행·열과 다음 줄의 안내대로 역슬래시·쉼표·따옴표를 고친다 |
| 설정 파일은 { } 로 감싼 JSON 객체여야 한다 | 파일 전체를 `{`와 `}`로 감싼다 |
| VISION_RISK_CONFIG가 가리키는 설정 파일이 없다 | 경로를 고치거나 `VISION_RISK_CONFIG`를 지운다 |

값을 무시하고 시작하는 경고:

| 터미널 메시지 | 뜻과 할 일 |
| --- | --- |
| 알 수 없는 설정 키 … 는 무시한다 | 키 이름의 오타를 위 표와 맞춘다 |
| 형식이 맞지 않는 키 N개는 무시한다 | 키 자리에 값을 넣지 않았는지 본다. 키 이름은 대문자·숫자·밑줄로 쓴다 |
| … 값은 문자열이어야 한다 | 값을 따옴표로 감싼다. 여러 ID는 쉼표로 이은 문자열 하나로 쓴다 |
| … 값에 줄바꿈·탭 같은 제어 문자가 있다 | 경로의 역슬래시를 `/`나 두 번 쓴 역슬래시로 바꾼다 |
| … 값이 예시 자리표시자 그대로다 | `/absolute/path/…` 같은 예시 값을 실제 경로나 `""`로 바꾼다 |
| 예시 파일에 값이 들어 있다 | 예시 파일은 Git이 추적하므로 값을 넣지 않는다. 예시 파일의 값은 빈 문자열로 되돌리고, 값은 `config/local-connection.json`에만 넣는다 |

알림:

| 터미널 메시지 | 뜻과 할 일 |
| --- | --- |
| 설정 파일 없이 시작한다 | `config/local-connection.json`이 없다. 연결 없이 화면만 쓸 때는 그대로 둔다 |
| 예전 위치의 설정 파일을 읽었다 | `courses/vision-96h-v2/scratch/local-connection.json`을 `config/local-connection.json`으로 옮긴다 |
| 예전 위치의 설정 파일은 읽지 않는다 | 새 위치 파일을 쓰고 있다. 예전 위치 파일은 지워도 된다 |

## 7. 연동 스위치

저장소·Gemini·NotebookLM을 하나씩 실제 연결(`live`), 모의 결과(`mock`), 끄기(`off`)로 정한다.

| 이름 | 값 | 기본값 | 막는 조합 | 수업에서 쓰는 조합 |
| --- | --- | --- | --- | --- |
| `STORAGE_MODE` | `live`(GAS를 거쳐 Google 시트에 저장), `mock`(로컬 저장: 이 PC의 파일에 저장) | `live` | 환경 변수 `SYNTHETIC_MODE=true`와 `live`를 함께 쓰기 | `mock` |
| `GEMINI_MODE` | `off`, `mock`, `live` | 저장소 모드를 따른다 | 저장소 `live`에서 `mock`, 저장소 `mock`에서 `live` | `mock` |
| `NOTEBOOKLM_MODE` | `off`, `mock`, `live` | 저장소 모드를 따른다 | 저장소 `live`에서 `mock` | `live` |

- 스위치는 설정 파일 키와 환경 변수가 같은 이름이다. 설정 파일에 비어 있지 않은 값이 있으면 그 값이 먼저다. 빈 값은 "정하지 않음"이다.
- 값의 대소문자와 앞뒤 공백은 따지지 않는다.
- `STORAGE_MODE=mock`(로컬 저장)이면 `preview/_synthetic_store.json`에 저장한다. `GAS_WEBAPP_URL`이 있어도 GAS를 부르지 않는다.
- 로컬 저장소의 사진은 `preview/_synthetic_store_images/`에 한 장씩 저장되어 서버를 다시 시작해도 남는다. 기록 파일과 함께 git에서 제외된다.
- `NOTEBOOKLM_MODE=live`에는 `nlm login`, `NOTEBOOKLM_NOTEBOOK_ID`, `NOTEBOOKLM_SOURCE_IDS`가 필요하다(4절).
- 환경 변수 `SYNTHETIC_MODE=true`는 `STORAGE_MODE=mock`과 같은 뜻이다. 이때 두 스위치의 기본값도 `mock`이 된다.
- 수업에서는 `STORAGE_MODE=mock`, `GEMINI_MODE=mock`, `NOTEBOOKLM_MODE=live`로 시작한다. Gemini 키와 GAS 없이 NotebookLM만 실제로 시험하는 조합이다. 실제 연결은 셋 다 `live`다.

막는 조합이나 알 수 없는 값이 있으면 서버는 시작하지 않고 종료 코드 1로 끝난다. 터미널에 이유와 고칠 방법이 한 줄로 나온다. `off`는 어느 저장소 모드와도 함께 쓸 수 있다.

| 경우 | 터미널 메시지 |
| --- | --- |
| 저장소 `live`, Gemini `mock` | STORAGE_MODE=live에서는 GEMINI_MODE=mock을 쓸 수 없다. 모의 사진 설명이 실제 Google 시트 기록에 저장되기 때문이다. GEMINI_MODE를 live나 off로 바꾸거나 STORAGE_MODE=mock으로 시작한다. |
| 저장소 `live`, NotebookLM `mock` | STORAGE_MODE=live에서는 NOTEBOOKLM_MODE=mock을 쓸 수 없다. 모의 근거가 실제 Google 시트 기록에 저장되기 때문이다. NOTEBOOKLM_MODE를 live나 off로 바꾸거나 STORAGE_MODE=mock으로 시작한다. |
| 저장소 `mock`, Gemini `live` | STORAGE_MODE=mock에서는 GEMINI_MODE=live를 쓸 수 없다. Gemini는 GAS 안에서 호출하므로 Google 시트 저장소 없이는 실제로 부를 수 없다. GEMINI_MODE를 mock이나 off로 바꾸거나 STORAGE_MODE=live로 시작한다. |
| `SYNTHETIC_MODE=true`와 `STORAGE_MODE=live` | SYNTHETIC_MODE=true는 STORAGE_MODE=mock과 같은 뜻이라 STORAGE_MODE=live와 함께 쓸 수 없다. SYNTHETIC_MODE를 지우거나 STORAGE_MODE=mock으로 맞춘다. |
| 알 수 없는 값 | `<스위치 이름>` 값을 알아볼 수 없다. 허용 값은 …이다. 설정 파일이나 환경 변수의 `<스위치 이름>`를 고친다. |

연동을 `off`로 두면 그 단계의 버튼이 꺼지고 화면에 이유가 보인다.
API로 요청하면 HTTP 409와 `error_code` `INTEGRATION_OFF`를 돌려준다.

지금 쓰는 조합은 상태 줄로 확인한다.
상태 줄은 서버를 시작할 때 터미널과 `/api/health`의 `integration_status`에 늘 나온다.
화면 상단에는 `live`가 아닌 연동(`mock`·`off`)이 하나라도 있을 때만 보인다.

```text
연동 상태: 저장소 로컬 저장 · Gemini mock · NotebookLM live
```

`off`인 연동은 상태 줄에 `꺼짐`으로 나온다.

## 8. 연결 확인

1. `npm start`로 서버를 띄운다.
2. 브라우저에서 `http://127.0.0.1:8765/api/health`를 연다.
   - `gas_configured`가 `true`면 웹 앱 URL이 설정된 것이다. 실제 연결 여부는 3번에서 확인한다.
   - `mcp_status.connected`가 `true`면 MCP 실행 파일을 찾아 실행한 것이다.
   - `mcp_status.authStatus`가 `configured`여야 기준 대조가 동작한다.
     `not_configured`·`stale`이면 `nlm login --storage protected`를 다시 한 뒤 로컬 서버를 다시 시작한다. 로그인 상태는 서버가 켜진 뒤 첫 기준 확인 때 한 번 확인한다.
     `unknown`·`error`이면 `nlm login`으로 해결되지 않을 수 있다. MCP가 로그인 상태를 알려 주지 않았거나 그 응답을 읽지 못한 경우다.
   - `NOTEBOOKLM_MODE=off`이면 MCP를 실행하지 않고 `mcp_status.authStatus`가 `off`로 나온다.
   - `modes`와 `integration_status`에 지금 쓰는 연동 스위치가 나온다.
   - `mcp_status.authStatus`가 `unreachable`이면 MCP를 실행하지 못한 것이다. `mcp_status.error_code`와 `mcp_status.error`를 본다.

     | `error_code` | 뜻 |
     | --- | --- |
     | `MCP_NOT_CONFIGURED` | 설정한 곳에도 PATH에도 실행 파일이 없다. 5절의 찾는 순서를 확인한다 |
     | `MCP_EXECUTABLE_NOT_FOUND` | 설정한 경로나 명령 이름으로 실행 파일을 찾지 못했다 |
     | `MCP_EXITED` | 실행은 됐지만 연결 중에 종료됐다. 터미널에서 같은 명령과 인자가 실행되는지 본다 |
     | `MCP_UNREACHABLE` | 그 밖의 이유로 연결하지 못했다. `error`를 본다 |

   `mcp_status.serverInfo`의 메일 주소는 로컬 서버가 빼고 보낸다. 프로필 이름 같은 나머지 로그인 프로필 정보는 남으므로 화면을 공유할 때는 가린다.
3. `STORAGE_MODE=live`이면 브라우저에서 `http://127.0.0.1:8765/api/records`를 연다.
   `"success":true`가 보이면 GAS에 연결된 것이다. 새로 만든 시트면 `"records":[]`로 나온다.
   오류가 나오면 `error_code`를 본다.

| `error_code` | HTTP 상태 | 뜻과 할 일 |
| --- | --- | --- |
| `SETUP_REQUIRED` | 503 | 설정 파일의 `GAS_WEBAPP_URL`이 비어 있거나, GAS 스크립트 속성(`npm.cmd run gas:init`이나 `initialSetup`이 만드는 ID)이 없다. AI 판독에서는 `GEMINI_API_KEY`가 없거나(1절 단계 8·10) `GEMINI_MODEL`·`GEMINI_FALLBACK_MODEL`이 허용 값이 아닌 경우다(2절) |
| `GAS_AUTH_REQUIRED` | 503 | 첫 권한 승인 전이다(1절 9단계). 승인했는데도 나오면 액세스 권한이 "모든 사용자"가 아니거나 `/exec`로 끝나는 주소가 아니다(1절 7단계) |
| `GAS_URL_INVALID` | 503 | 주소 형식이 틀렸거나(오타, `https://`가 아님) 웹 앱이 없다(HTTP 404, 배포 삭제·보관). `http://`는 `127.0.0.1`·`localhost` 시험 서버에만 쓸 수 있다 |
| `GAS_UNREACHABLE` | 502 | 인터넷·DNS·프록시 문제나 인증서 오류로 접속하지 못했다. 교육장 네트워크의 보안 장비가 인증서를 바꾸는 경우에도 나온다. 요청은 실행되지 않았으니 다시 시도해도 된다 |
| `NETWORK_TIMEOUT` | 500 | 제한 시간 안에 응답이 없었다. 사건 등록(사진 업로드)과 AI 판독은 300초, 그 밖의 조회·저장은 120초다. 이미 실행됐을 수 있으니 기록을 확인한 뒤 다시 시도한다. AI 판독이 중단되면 화면은 3분쯤 뒤 사건을 다시 열어 AI 초안이 없으면 다시 요청하라고 안내한다 |
| `GAS_NON_JSON_RESPONSE` | 502 | GAS가 HTML 오류 페이지를 돌려줬다. Apps Script의 실행 로그를 본다 |
| `GAS_HTTP_ERROR` | 502 | 그 밖의 HTTP 오류다. 메시지의 HTTP 상태를 보고 다시 시도한다 |
| `EXECUTION_UNKNOWN` | 500 | 요청이 실행됐는지 알 수 없는 오류다. 기록을 확인한 뒤 다시 시도한다 |
| `RATE_LIMIT_EXCEEDED` | 429 | 한도를 넘었다. 안내된 시간 뒤에 다시 시도한다 |
| `LOCK_TIMEOUT` | 429 | 다른 저장이 스크립트 잠금을 잡고 있어 10초 동안 기다리다 시간이 지났다. 이 요청의 시트 저장은 하지 않았다. 잠시 뒤 다시 요청한다. 같은 요청 번호(`request_id`)로 다시 보내면 GAS가 같은 번호의 기록을 먼저 찾으므로 사건 등록·정보 수정·AI 판독·기준 확인·판단·조치 기록이 겹치지 않는다 |

## 9. NotebookLM 기준 확인 결과 읽기

- 결과에는 인용한 기준, 소스 ID, 인용 문단이 보인다.
  인용한 기준은 인용 문장을 `standards.json`의 기준 원문과 대조해 찾는다. NotebookLM 응답에는 기준 ID가 없다.
- 인용 문장이 고른 기준의 문장이 아니면 "선택한 기준과 다른 기준의 문장입니다"처럼 표시하고 근거를 찾았다고 보지 않는다.
  인용 문장이 여러 기준에 함께 있으면 "어느 기준의 문장인지 정할 수 없습니다"로 표시한다. 두 경우 모두 "확인 필요:" 뒤에 이유가 나온다. 저장되는 판정 값은 바뀌지 않는다.
- 확인 기준을 바꾸면 그 기준으로 확인한 결과만 보인다.
  이 컴퓨터의 로컬 서버가 확인한 기준별 결과와 Google 시트의 최신 결과를 함께 쓴다. 그래서 다른 컴퓨터에서 확인한 예전 기준의 결과는 보이지 않을 수 있다(11절).
- 홈 카드의 "출처 대조" 표시도 같은 판정을 쓴다. 인용한 문장이 확인한 기준의 문장이 아니면 "인용 기준 확인 필요"로 보인다.

## 10. 서버 끄기

- 서버를 띄운 터미널에서 `Ctrl+C`를 누른다. 터미널 창을 닫아도 작업 잠금은 풀린다.
- 실행 중인 작업이 5초 안에 끝나지 않으면 "실행 중인 작업이 5초 안에 끝나지 않아 작업 잠금을 풀고 종료한다"가 나오고 꺼진다.
- `Ctrl+C`를 한 번 더 누르면 기다리지 않고 바로 끈다.
- 다시 켰을 때 서버 콘솔에 `holds the job store lock`이 나오면 다른 서버가 아직 작업 폴더를 쓰고 있는 것이다. 그 상태에서는 AI 판독·기준 대조 요청이 `SERVICE_UNAVAILABLE`로 거절된다.
  - 다른 창에 서버가 떠 있으면 그 서버를 끈 뒤 다시 켠다.
  - 떠 있는 서버가 없는데도 나오면 2분 뒤에 서버를 다시 켠다. 잠금 갱신이 2분 넘게 멈춘 잠금은 새 서버가 넘겨받는다.

## 11. 알려진 제한

- 다른 컴퓨터에서 확인했거나 작업 기록이 지워진 예전 기준의 결과는, Google 시트의 최신 1건이 아니면 "이 기준으로는 아직 확인하지 않았습니다."로 보인다.
- NotebookLM 로그인 상태는 서버가 MCP에 연결한 뒤 첫 기준 확인 때 한 번만 본다. 쓰는 도중 로그인이 만료되면 `nlm login` 안내 대신 "NotebookLM 질의가 실패했습니다" 문구가 나올 수 있다. 그때는 `nlm login --storage protected` 뒤 로컬 서버를 다시 시작한다.
- 없는 사건에 판단·조치를 저장하면 GAS의 문구("기록을 찾지 못했습니다(사건 번호). …")가 나온다. 상세 조회의 404 문구와 사건 번호 표시가 다르다.
- 시트가 날짜·숫자로 바꾸지 않게 `'`를 붙이는 글자는 `=`·`+`·`-`·`@`·탭·줄바꿈 문자(CR)·숫자로 시작하는 것뿐이다. `Jan 5`처럼 다른 글자로 시작해도 시트가 날짜로 읽는 값은 바뀔 수 있다.
- 로컬 서버는 사건 정보(사진 파일 ID 목록·버전)를 60초 동안 기억해 사진을 보여 줄 때 쓴다. 이 PC 밖(다른 PC·시트 편집)에서 사건을 고치면 최대 60초 동안 이전 정보로 확인한다.

## 12. 사진 저장소 받기

홈과 사건 등록 화면의 저장소 사진은 별도 공개 저장소 `startup-life/vision-risk-student-images`에서 읽는다. 사진은 일반 파일이라 `git clone`만으로 받는다. Git LFS는 필요 없다.

- **ZIP으로 받지 않는다.** GitHub의 **Code**, **Download ZIP**으로 받으면 `.git` 폴더가 없다. 대시보드는 git으로 원격 주소(origin)와 커밋을 확인하고 그 커밋의 매니페스트를 읽으므로 ZIP 폴더는 쓰지 못한다.
- 공개 저장소라 GitHub 계정 없이 받는다.
- 받는 양은 약 170MB다. 사진은 210장이고, 대시보드는 그중 Train 사진 180장(품질 90, 산업안전 90)을 쓴다.

### 단계 1. Git for Windows 설치 — 웹(클릭)

1. [git-scm.com/download/win](https://git-scm.com/download/win)에서 설치 파일을 받아 실행한다. 설정은 기본값으로 둔다.
2. 설치가 끝나면 Antigravity를 완전히 닫고 다시 연다. 열려 있던 터미널은 새로 설치한 `git`을 찾지 못한다.

macOS는 Homebrew로 설치한다: `brew install git`.

```powershell
git --version
```

확인: `git version`으로 시작하는 줄이 나온다.

### 단계 2. 받기(clone) — Antigravity(터미널)

대시보드 저장소(`vision-risk-dashboard-student`)와 같은 상위 폴더에 받는다. 그러면 설정 없이 기본 위치에서 찾는다. 아래는 `vision-risk-dashboard-student` 폴더의 터미널에서 실행한다. Windows와 macOS 명령이 같다.

```powershell
cd ..
git clone https://github.com/startup-life/vision-risk-student-images.git
cd vision-risk-dashboard-student
```

- 주소는 위 https 주소를 그대로 쓴다. 대시보드는 origin이 이 저장소인지 확인하고, 다른 주소(fork 등)면 사진을 쓰지 않는다.
- 폴더 이름은 `vision-risk-student-images` 그대로 둔다. 다른 위치나 이름으로 받았으면 6절 설정 파일의 `REPOSITORY_IMAGES_ROOT`에 그 절대 경로를 `C:/work/vision-risk-student-images`처럼 `/`로 적는다.

### 단계 3. 사진 파일 확인 — Antigravity(터미널)

```powershell
# Windows (PowerShell)
cd ../vision-risk-student-images
git status
(Get-ChildItem assets/dataset/images -Filter *.png).Count
cd ../vision-risk-dashboard-student
```

```sh
# macOS
cd ../vision-risk-student-images
git status
ls assets/dataset/images/*.png | wc -l
cd ../vision-risk-dashboard-student
```

- `git status`가 `nothing to commit, working tree clean`이어야 한다.
- 둘째 명령은 사진 수를 센다. `210`이어야 한다.
- 탐색기에서 `vision-risk-student-images/assets/dataset/images`의 PNG 파일을 열어 그림이 보이면 된다.

### 단계 4. 대시보드에서 확인 — Antigravity(터미널)

`npm.cmd start`로 서버를 띄운다. 서버 콘솔에 `[RepositoryImages`로 시작하는 경고가 없고, 홈과 사건 등록 화면에 저장소 사진이 보이면 된다.
경고가 있으면 `불러오지 못했습니다:` 뒤의 원인을 본다.

| 원인 | 할 일 |
| --- | --- |
| 경로 없음 | 단계 2의 위치에 받았는지, `REPOSITORY_IMAGES_ROOT` 경로가 맞는지 본다 |
| git 미설치 | 단계 1을 하고 Antigravity를 다시 연다 |
| git 저장소가 아님 | ZIP으로 받은 폴더다. 지우고 단계 2로 다시 받는다 |
| origin 원격 없음, origin이 … 아님 | 단계 2의 https 주소로 다시 받는다 |
| origin/main 없음(git fetch 필요) | `vision-risk-student-images` 폴더에서 `git fetch origin`을 실행한다 |
| 사진 파일이 없거나 해시가 달라 읽을 수 있는 승인 사진 0장 | 단계 3으로 사진 수와 `git status`를 본다. 사진이 빠졌거나 바뀌었으면 폴더를 지우고 단계 2부터 다시 받는다 |
