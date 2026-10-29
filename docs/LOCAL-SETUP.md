# 로컬 실행 준비

로컬 대시보드를 NotebookLM과 연결하는 방법이다. 사건·판단·조치 기록은 이 PC의 로컬 저장소에 남는다.

**Windows에서 명령 입력하기**
- 창의 줄 맨 앞이 `C:\...>`로 시작하면 명령 프롬프트, `PS C:\...>`로 시작하면 PowerShell입니다.
- 명령 프롬프트에서는 안내한 명령을 그대로 칩니다. 예: `npm start`
- PowerShell에서는 `npm`을 `npm.cmd`로, `npx`를 `npx.cmd`로 바꿔 칩니다. 예: `npm.cmd start`
- PowerShell에서 `.cmd` 없이 쳤다가 "이 시스템에서 스크립트를 실행할 수 없으므로 … npm.ps1 파일을 로드할 수 없습니다" 오류가 나면 `npm.cmd`로 다시 칩니다.
- 매번 바꿔 치기 번거로우면 PowerShell에서 아래 명령을 한 번만 실행합니다. 확인을 물으면 `Y`를 누르고, PowerShell 창을 닫았다가 새로 엽니다. 지금 로그인한 사용자 계정에만 적용되고, 그 뒤로는 `npm`을 그대로 쳐도 됩니다.
  `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`
- 학교·회사 PC에서 이 명령이 "더 구체적인 범위에서 정의된 정책" 같은 문구로 적용되지 않으면 관리자 정책 때문입니다. 그때는 계속 `npm.cmd`로 칩니다.

이 문서의 `npm` 명령은 위 안내대로 입력한다.

로컬 대시보드는 두 곳과 연결된다.

| 연결 | 하는 일 | 준비하는 곳 |
| --- | --- | --- |
| NotebookLM MCP | 검사 기준 원문과 사건 정보를 대조한다 | 내 PC |
| 로컬 설정 파일 | NotebookLM 노트북·소스 ID와 실행 파일 위치를 서버에 알려 준다 | `config/local-connection.json` |

1절부터 3절까지가 연결 준비다. 4절은 연동을 켜고 끄는 스위치, 5절은 연결 확인, 6절은 NotebookLM 결과를 읽는 법, 7절은 서버를 끄는 법, 8절은 알려진 제한, 9절은 사진 저장소(이미지 레포)를 받는 법이다.
노트북 ID와 소스 ID는 3절의 설정 파일에만 둔다. 문서·메신저·커밋에는 붙여 넣지 않는다. 설정 파일에 넣을 때는 Antigravity 채팅에 붙여 넣어 맡겨도 된다.

단계마다 **할 곳**을 적었다.

- **Antigravity(터미널)**: 저장소 폴더의 터미널에서 명령으로 끝난다. Antigravity 에이전트가 명령을 대신 실행해도 된다.
- **웹(클릭)**: 브라우저의 Google 화면에서 본인이 직접 로그인하고 누른다. 에이전트가 대신하지 않는다.
- **설정 파일**: `config/local-connection.json`의 값을 바꾼다. 값을 Antigravity 채팅에 붙여 넣으면 Antigravity가 그 파일의 해당 한 줄만 바꾸고, 값을 화면이나 대화에 다시 출력하지 않는다. 본인이 파일을 열어 고쳐도 된다.

단계 끝의 「확인:」 줄은 그 단계가 끝났을 때 보이는 것이다.

## 1. NotebookLM MCP

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
   로컬 서버는 `notebooklm-mcp`를 PATH에서 찾으므로 따로 등록하지 않아도 된다(2절). 설치한 뒤 새로 연 터미널에서 서버를 시작한다.
   Windows에서 `nlm`을 찾지 못하면 uv의 설치 폴더(`%USERPROFILE%\.local\bin`)가 PATH에 들어 있는지 본다.
   `nlm setup add antigravity`는 Antigravity에서 NotebookLM을 MCP 도구로 쓰려고 Antigravity 설정 파일(`~/.gemini/antigravity/mcp_config.json`)에 등록하는 명령이다. 대시보드를 실행하는 데는 필요 없다. 등록해 두면 로컬 서버도 그 항목을 쓴다(2절 2번).
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

노트북 ID와 소스 ID는 3절 설정 파일에 넣는다.
대시보드는 여기서 허용한 소스에서 나온 인용만 근거로 인정한다.

## 2. NotebookLM 실행 파일 찾기 규칙

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
4. 모두 없어도 서버는 시작한다. 서버를 시작할 때 터미널의 `연동 상태:` 줄에 `NotebookLM live(실행 파일을 찾지 못함, docs/LOCAL-SETUP.md 2절)`가 나온다.
   기준 대조는 실행 파일을 설치하거나 설정하라는 안내와 함께 실패한다. `/api/health`의 `mcp_status.error`에 확인한 위치마다 무엇이 없었는지 나온다.

실행 인자는 찾은 곳에 따라 다르다.

- `NOTEBOOKLM_MCP_COMMAND`를 쓰면 `--transport stdio`를 붙여 실행한다.
- Antigravity 항목을 쓰면 그 항목의 `args`로 실행한다. `args`가 없으면 인자 없이 실행한다.
  `"command": "uvx", "args": ["--from", "notebooklm-mcp-cli", "notebooklm-mcp"]` 형식도 된다.
- PATH에서 찾으면 `--transport stdio`를 붙여 실행한다.

MCP 실행 파일에는 아래 환경 변수만 넘긴다. `REPOSITORY_IMAGES_ROOT` 같은 서버 설정값은 넘기지 않는다.

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

## 3. 로컬 설정 파일

`npm start`는 저장소의 `config/local-connection.json`을 읽는다.
어느 폴더에서 실행해도 이 위치는 같다. 이 파일은 Git이 추적하지 않는다.
만드는 방법은 [README](../README.md)의 "연결 설정 파일 만들기"를 따른다.

| 키 | 값 | 얻는 곳 |
| --- | --- | --- |
| `NOTEBOOKLM_NOTEBOOK_ID` | 노트북 ID | 1절 |
| `NOTEBOOKLM_SOURCE_IDS` | 소스 ID. 여러 개면 쉼표로 구분한 문자열 하나(`"ID1,ID2"`) | 1절 |
| `NOTEBOOKLM_MCP_COMMAND` | MCP 실행 파일 경로나 명령 이름. Antigravity 설정을 쓰면 비워 둔다 | 2절 |
| `REPOSITORY_IMAGES_ROOT` | 이미지 레포 폴더. 기본 위치에 두었으면 비워 둔다 | 9절 |
| `NOTEBOOKLM_MODE` | 연동 스위치. 비워 두면 기본값을 쓴다 | 4절 |

- 쓰지 않는 항목은 빈 문자열(`""`)로 둔다. 빈 값은 "이 파일에서 정하지 않음"이다. 같은 이름의 환경 변수가 있으면 그 값을 쓰고, 없으면 기본값을 쓴다.
- Windows 경로는 `C:/vision/models`처럼 `/`로 쓰거나 `C:\\vision\\models`처럼 역슬래시를 두 번 쓴다.
  역슬래시를 하나만 쓰면 서버가 JSON 형식 오류로 멈추거나, 그 값을 경고하고 무시한다.
- 파일은 UTF-8로 저장한다(메모장의 기본값이다). 파일 맨 앞의 BOM 표시는 서버가 떼고 읽는다.
  UTF-16으로 저장하면 서버가 알려 주고 시작하지 않는다. ANSI로 저장하면 한글 경로가 다른 글자로 바뀐다.
- 노트북·소스 ID는 이 파일에만 둔다. 이 파일을 커밋하거나 다른 사람에게 보내지 않는다.

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

## 4. 연동 스위치

사건·판단·조치 기록은 늘 로컬 저장소(`preview/_synthetic_store.json`)에 저장한다. 스위치는 NotebookLM 하나이고, 실제 연결(`live`), 모의 결과(`mock`), 끄기(`off`)로 정한다.

| 이름 | 값 | 기본값 | 수업에서 쓰는 값 |
| --- | --- | --- | --- |
| `NOTEBOOKLM_MODE` | `off`, `mock`, `live` | `live` | `live` |

- 스위치는 설정 파일 키와 환경 변수가 같은 이름이다. 설정 파일에 비어 있지 않은 값이 있으면 그 값이 먼저다. 빈 값은 "정하지 않음"이다.
- 값의 대소문자와 앞뒤 공백은 따지지 않는다.
- 로컬 저장소의 사진은 `preview/_synthetic_store_images/`에 한 장씩 저장되어 서버를 다시 시작해도 남는다. 기록 파일과 함께 git에서 제외된다.
- `NOTEBOOKLM_MODE=live`에는 `nlm login`, `NOTEBOOKLM_NOTEBOOK_ID`, `NOTEBOOKLM_SOURCE_IDS`가 필요하다(1절). 준비 전에 화면만 시험하려면 `mock`으로 둔다.

알 수 없는 값이 있으면 서버는 시작하지 않고 종료 코드 1로 끝난다. 터미널에 이유와 고칠 방법이 한 줄로 나온다.

| 경우 | 터미널 메시지 |
| --- | --- |
| 알 수 없는 값 | `NOTEBOOKLM_MODE` 값을 알아볼 수 없다. 허용 값은 off, mock, live이다. 설정 파일이나 환경 변수의 `NOTEBOOKLM_MODE`를 고친다. |

연동을 `off`로 두면 관련 기준 확인 버튼이 꺼지고 화면에 이유가 보인다.
API로 요청하면 HTTP 409와 `error_code` `INTEGRATION_OFF`를 돌려준다.

지금 쓰는 조합은 상태 줄로 확인한다.
상태 줄은 서버를 시작할 때 터미널과 `/api/health`의 `integration_status`, 화면 상단에 나온다.

```text
연동 상태: 저장소 로컬 저장 · NotebookLM live
```

`off`인 연동은 상태 줄에 `꺼짐`으로 나온다.

## 5. 연결 확인

1. `npm start`로 서버를 띄운다.
2. 브라우저에서 `http://127.0.0.1:8765/api/health`를 연다.
   - `mcp_status.connected`가 `true`면 MCP 실행 파일을 찾아 실행한 것이다.
   - `mcp_status.authStatus`가 `configured`여야 기준 대조가 동작한다.
     `not_configured`·`stale`이면 `nlm login --storage protected`를 다시 한 뒤 로컬 서버를 다시 시작한다. 로그인 상태는 서버가 켜진 뒤 첫 기준 확인 때 한 번 확인한다.
     `unknown`·`error`이면 `nlm login`으로 해결되지 않을 수 있다. MCP가 로그인 상태를 알려 주지 않았거나 그 응답을 읽지 못한 경우다.
   - `NOTEBOOKLM_MODE=off`이면 MCP를 실행하지 않고 `mcp_status.authStatus`가 `off`로 나온다.
   - `modes`와 `integration_status`에 지금 쓰는 연동 스위치가 나온다.
   - `mcp_status.authStatus`가 `unreachable`이면 MCP를 실행하지 못한 것이다. `mcp_status.error_code`와 `mcp_status.error`를 본다.

     | `error_code` | 뜻 |
     | --- | --- |
     | `MCP_NOT_CONFIGURED` | 설정한 곳에도 PATH에도 실행 파일이 없다. 2절의 찾는 순서를 확인한다 |
     | `MCP_EXECUTABLE_NOT_FOUND` | 설정한 경로나 명령 이름으로 실행 파일을 찾지 못했다 |
     | `MCP_EXITED` | 실행은 됐지만 연결 중에 종료됐다. 터미널에서 같은 명령과 인자가 실행되는지 본다 |
     | `MCP_UNREACHABLE` | 그 밖의 이유로 연결하지 못했다. `error`를 본다 |

   `mcp_status.serverInfo`의 메일 주소는 로컬 서버가 빼고 보낸다. 프로필 이름 같은 나머지 로그인 프로필 정보는 남으므로 화면을 공유할 때는 가린다.

## 6. NotebookLM 기준 확인 결과 읽기

- 결과에는 인용한 기준, 소스 ID, 인용 문단이 보인다.
  인용한 기준은 인용 문장을 `standards.json`의 기준 원문과 대조해 찾는다. NotebookLM 응답에는 기준 ID가 없다.
- 인용 문장이 고른 기준의 문장이 아니면 "선택한 기준과 다른 기준의 문장입니다"처럼 표시하고 근거를 찾았다고 보지 않는다.
  인용 문장이 여러 기준에 함께 있으면 "어느 기준의 문장인지 정할 수 없습니다"로 표시한다. 두 경우 모두 "확인 필요:" 뒤에 이유가 나온다. 저장되는 판정 값은 바뀌지 않는다.
- 확인 기준을 바꾸면 그 기준으로 확인한 결과만 보인다.
  이 컴퓨터의 로컬 서버가 확인한 기준별 결과와 로컬 저장소의 최신 결과를 함께 쓴다. 그래서 작업 기록을 지운 예전 기준의 결과는 보이지 않을 수 있다(8절).
- 홈 카드의 "출처 대조" 표시도 같은 판정을 쓴다. 인용한 문장이 확인한 기준의 문장이 아니면 "인용 기준 확인 필요"로 보인다.

## 7. 서버 끄기

- 서버를 띄운 터미널에서 `Ctrl+C`를 누른다. 터미널 창을 닫아도 작업 잠금은 풀린다.
- 실행 중인 작업이 5초 안에 끝나지 않으면 "실행 중인 작업이 5초 안에 끝나지 않아 작업 잠금을 풀고 종료한다"가 나오고 꺼진다.
- `Ctrl+C`를 한 번 더 누르면 기다리지 않고 바로 끈다.
- 다시 켰을 때 서버 콘솔에 `holds the job store lock`이 나오면 다른 서버가 아직 작업 폴더를 쓰고 있는 것이다. 그 상태에서는 기준 대조 요청이 `SERVICE_UNAVAILABLE`로 거절된다.
  - 다른 창에 서버가 떠 있으면 그 서버를 끈 뒤 다시 켠다.
  - 떠 있는 서버가 없는데도 나오면 2분 뒤에 서버를 다시 켠다. 잠금 갱신이 2분 넘게 멈춘 잠금은 새 서버가 넘겨받는다.

## 8. 알려진 제한

- 작업 기록이 지워진 예전 기준의 결과는, 로컬 저장소의 최신 1건이 아니면 "이 기준으로는 아직 확인하지 않았습니다."로 보인다.
- NotebookLM 로그인 상태는 서버가 MCP에 연결한 뒤 첫 기준 확인 때 한 번만 본다. 쓰는 도중 로그인이 만료되면 `nlm login` 안내 대신 "NotebookLM 질의가 실패했습니다" 문구가 나올 수 있다. 그때는 `nlm login --storage protected` 뒤 로컬 서버를 다시 시작한다.
- 로컬 서버는 사건 정보(사진 장수·버전)를 60초 동안 기억해 사진을 보여 줄 때 쓴다. 서버 밖에서 기록 파일을 직접 고치면 최대 60초 동안 이전 정보로 확인한다.

## 9. 사진 저장소 받기

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
- 폴더 이름은 `vision-risk-student-images` 그대로 둔다. 다른 위치나 이름으로 받았으면 3절 설정 파일의 `REPOSITORY_IMAGES_ROOT`에 그 절대 경로를 `C:/work/vision-risk-student-images`처럼 `/`로 적는다.

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
