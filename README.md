# 비전 리스크 대시보드

가상 물류창고의 택배 발송·산업안전 상황을 사진으로 확인하고, 판단과 조치를 기록하는 현장 대시보드다.
사진과 검사 기준을 살펴본 뒤 사람이 최종 판단을 남긴다.

사건 상세는 세 단계로 진행한다.

1. 사진
2. 관련 기준 확인 (NotebookLM)
3. 내 판단 남기기

위험을 확인했다면 판단을 남긴 뒤 조치 기록으로 이어 간다.
NotebookLM 결과는 참고 자료다. 발송 승인이나 안전 인증을 대신하지 않는다.

## 준비물

- Node.js 22.9 이상과 npm
- Git
- 인터넷 연결(설치, 사진 저장소 받기, 외부 연결에 필요하다)

**Windows에서 명령 입력하기**
- 창의 줄 맨 앞이 `C:\...>`로 시작하면 명령 프롬프트, `PS C:\...>`로 시작하면 PowerShell입니다.
- 명령 프롬프트에서는 안내한 명령을 그대로 칩니다. 예: `npm start`
- PowerShell에서는 `npm`을 `npm.cmd`로, `npx`를 `npx.cmd`로 바꿔 칩니다. 예: `npm.cmd start`
- PowerShell에서 `.cmd` 없이 쳤다가 "이 시스템에서 스크립트를 실행할 수 없으므로 … npm.ps1 파일을 로드할 수 없습니다" 오류가 나면 `npm.cmd`로 다시 칩니다.
- 매번 바꿔 치기 번거로우면 PowerShell에서 아래 명령을 한 번만 실행합니다. 확인을 물으면 `Y`를 누르고, PowerShell 창을 닫았다가 새로 엽니다. 지금 로그인한 사용자 계정에만 적용되고, 그 뒤로는 `npm`을 그대로 쳐도 됩니다.
  `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`
- 학교·회사 PC에서 이 명령이 "더 구체적인 범위에서 정의된 정책" 같은 문구로 적용되지 않으면 관리자 정책 때문입니다. 그때는 계속 `npm.cmd`로 칩니다.

## 1. 저장소 두 개 받기

이 저장소와 사진 저장소를 **같은 상위 폴더**에 나란히 받는다.

```sh
git clone https://github.com/startup-life/vision-risk-dashboard-student.git
git clone https://github.com/startup-life/vision-risk-student-images.git
cd vision-risk-dashboard-student
```

받고 나면 폴더가 이렇게 놓인다.

```text
작업 폴더/
├─ vision-risk-dashboard-student/   (이 저장소)
└─ vision-risk-student-images/      (사진 저장소)
```

- 사진 저장소는 공개 저장소라 GitHub 계정 없이 받는다. 사진은 일반 파일이라 Git LFS는 필요 없다.
- **ZIP으로 받지 않는다.** 대시보드는 git으로 사진 저장소의 원격 주소와 커밋을 확인한 뒤 사진을 읽는다. ZIP으로 받은 폴더에는 `.git`이 없어 쓰지 못한다.
- 사진 저장소 주소는 위 https 주소를 그대로 쓴다. 다른 주소(fork 등)에서 받은 폴더는 쓰지 않는다.
- 사진 저장소를 다른 위치에 두었으면 아래 설정 파일의 `REPOSITORY_IMAGES_ROOT`에 그 폴더의 절대 경로를 `C:/work/vision-risk-student-images`처럼 `/`로 적는다.
- Git 설치, 사진 수 확인, 사진을 읽지 못할 때의 원인은 [로컬 실행 준비 9절](docs/LOCAL-SETUP.md#9-사진-저장소-받기)에 적었다.

## 2. 설치

이 저장소 폴더에서 실행한다.

```sh
npm ci
```

`npm ci`는 `package-lock.json`에 적힌 버전 그대로 라이브러리를 설치한다.

## 3. 연결 설정 파일 만들기

`npm start`는 `config/local-connection.json`을 읽는다. 이 파일은 Git이 추적하지 않는다.
처음에는 [예시 파일](config/local-connection.example.json)을 복사해서 만든다. 아래 명령은 파일이 이미 있으면 덮어쓰지 않는다.

```powershell
# Windows (PowerShell)
if (-not (Test-Path config/local-connection.json)) { Copy-Item config/local-connection.example.json config/local-connection.json }
```

```bat
:: Windows (명령 프롬프트)
if not exist config\local-connection.json copy config\local-connection.example.json config\local-connection.json
```

```sh
# macOS
cp -n config/local-connection.example.json config/local-connection.json
```

- 값은 복사한 `config/local-connection.json`에만 넣는다. 예시 파일은 고치지 않는다.
- 쓰지 않는 항목은 빈 문자열(`""`)로 둔다.
- 노트북·소스 ID는 이 파일에만 둔다. 이 파일을 커밋하거나 메신저에 붙여 넣지 않는다.
- ID는 Antigravity 채팅에 붙여 넣어 이 파일에 넣게 해도 된다. Antigravity는 이 파일의 해당 한 줄만 바꾸고 값을 화면이나 대화에 다시 출력하지 않는다. 직접 파일을 열어 고쳐도 된다.
- 각 키의 뜻과 터미널에 나오는 설정 메시지는 [로컬 실행 준비 3절](docs/LOCAL-SETUP.md#3-로컬-설정-파일)에 있다.

## 4. 실행

처음에는 외부 연결 없이 띄운다. `config/local-connection.json`에서 `NOTEBOOKLM_MODE`만 `mock`(예시 결과)으로 바꾼다.

```json
"NOTEBOOKLM_MODE": "mock"
```

```sh
npm start
```

- 브라우저에서 `http://127.0.0.1:8765`를 연다.
- 터미널에 `연동 상태: 저장소 로컬 저장 · NotebookLM mock`처럼 지금 쓰는 조합이 나온다.
- 사건 기록은 늘 이 PC의 로컬 파일에 저장된다. 모의 모드에서는 NotebookLM이 예시 결과를 돌려준다.
- 끌 때는 서버를 띄운 터미널에서 `Ctrl+C`를 누른다.
- 다른 프로그램이 이미 8765 포트를 쓰고 있으면 서버가 시작하지 않는다. 그 프로그램(다른 창에 띄운 대시보드 등)을 끈 뒤 다시 실행한다.

## 5. NotebookLM 연결 켜기 (관련 기준 확인)

`NOTEBOOKLM_MODE` 스위치로 실제 연결(`live`), 모의 결과(`mock`), 끄기(`off`)를 정한다. 비워 두면 `live`다.
꺼진 연동은 화면의 버튼이 꺼진다. 자세한 규칙은 [로컬 실행 준비 4절](docs/LOCAL-SETUP.md#4-연동-스위치)에 있다. 연결이 됐는지는 [5절](docs/LOCAL-SETUP.md#5-연결-확인)대로 `http://127.0.0.1:8765/api/health`에서 본다.

검사 기준 원문(`courses/vision-96h-v2/preview/factory-criteria-v1.txt`)을 NotebookLM 노트북에 올려 두고, 사건 정보(분류·장소·메모·사진 장수)와 대조한다. 로컬 서버가 내 PC에 설치한 NotebookLM MCP를 직접 실행한다.

1. `uv`를 설치하고 `uv tool install notebooklm-mcp-cli`로 `nlm`과 `notebooklm-mcp`를 설치한다.
2. 터미널에 본인이 직접 `nlm login --storage protected`를 입력해 로그인한다.
3. 노트북을 만들고 기준 문서를 소스로 올린 뒤, 노트북 ID와 소스 ID를 설정 파일의 `NOTEBOOKLM_NOTEBOOK_ID`·`NOTEBOOKLM_SOURCE_IDS`에 넣는다.
4. `NOTEBOOKLM_MODE`를 `live`로 바꾸고 서버를 다시 시작한다.

명령과 화면은 [로컬 실행 준비 1절](docs/LOCAL-SETUP.md#1-notebooklm-mcp)에, 실행 파일을 찾는 순서는 [2절](docs/LOCAL-SETUP.md#2-notebooklm-실행-파일-찾기-규칙)에, 결과를 읽는 법은 [6절](docs/LOCAL-SETUP.md#6-notebooklm-기준-확인-결과-읽기)에 있다.

## 이 PC에 생기는 파일

아래 파일은 모두 Git이 추적하지 않는다. 지우면 그 기록이 없어진다.

| 위치 | 내용 |
| --- | --- |
| `config/local-connection.json` | 연결 설정 |
| `courses/vision-96h-v2/preview/_synthetic_store.json`, `_synthetic_store_images/` | 로컬 저장소의 사건 기록과 사진 |
| `courses/vision-96h-v2/preview/_synthetic_jobs/` | 기준 확인 작업 기록 |

## 폴더 구조

- `courses/vision-96h-v2/preview/`: 브라우저 화면, 검사 기준(`standards.json`, `factory-criteria-v1.txt`)
- `courses/vision-96h-v2/tools/`: 로컬 Node 서버, NotebookLM 연결
- `config/`: 연결 설정 예시 파일
- `docs/LOCAL-SETUP.md`: 외부 연결 준비의 자세한 안내
- `.agent/rules/class-rules.md`·`materials/`: 수업 공통 규칙과 지급 원문 자료. 따라하기 프롬프트는 `main` 브랜치의 `prompts/` 폴더에 있다.

## 라이선스

[LICENSE.md](LICENSE.md)를 따른다.
