# 로컬 실행 준비

로컬 대시보드를 이 PC에서 실행하는 방법이다.

**Windows에서 명령 입력하기**
- 창의 줄 맨 앞이 `C:\...>`로 시작하면 명령 프롬프트, `PS C:\...>`로 시작하면 PowerShell입니다.
- 명령 프롬프트에서는 안내한 명령을 그대로 칩니다. 예: `npm start`
- PowerShell에서는 `npm`을 `npm.cmd`로 바꿔 칩니다. 예: `npm.cmd start`
- PowerShell에서 `.cmd` 없이 쳤다가 "이 시스템에서 스크립트를 실행할 수 없으므로 … npm.ps1 파일을 로드할 수 없습니다" 오류가 나면 `npm.cmd`로 다시 칩니다.
- 매번 바꿔 치기 번거로우면 PowerShell에서 아래 명령을 한 번만 실행합니다. 확인을 물으면 `Y`를 누르고, PowerShell 창을 닫았다가 새로 엽니다. 지금 로그인한 사용자 계정에만 적용되고, 그 뒤로는 `npm`을 그대로 쳐도 됩니다.
  `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`
- 학교·회사 PC에서 이 명령이 "더 구체적인 범위에서 정의된 정책" 같은 문구로 적용되지 않으면 관리자 정책 때문입니다. 그때는 계속 `npm.cmd`로 칩니다.

이 문서의 `npm` 명령은 위 안내대로 입력한다.

1절은 로컬 설정 파일, 2절은 서버가 떴는지 확인하는 법, 3절은 서버를 끄는 법, 4절은 사진 저장소(이미지 레포)를 받는 법이다.

단계마다 **할 곳**을 적었다.

- **Antigravity(터미널)**: 저장소 폴더의 터미널에서 명령으로 끝난다. Antigravity 에이전트가 명령을 대신 실행해도 된다.
- **웹(클릭)**: 브라우저에서 본인이 직접 누른다.

단계 끝의 「확인:」 줄은 그 단계가 끝났을 때 보이는 것이다.

## 1. 로컬 설정 파일

`npm start`는 저장소의 `config/local-connection.json`을 읽는다.
어느 폴더에서 실행해도 이 위치는 같다. 이 파일은 Git이 추적하지 않는다.
만드는 방법은 [README](../README.md)의 "설정 파일 만들기"를 따른다. 설정 파일이 없어도 서버는 시작한다.

| 키 | 값 | 얻는 곳 |
| --- | --- | --- |
| `REPOSITORY_IMAGES_ROOT` | 이미지 레포 폴더. 기본 위치에 두었으면 비워 둔다 | 4절 |

- 쓰지 않는 항목은 빈 문자열(`""`)로 둔다. 빈 값은 "이 파일에서 정하지 않음"이다. 같은 이름의 환경 변수가 있으면 그 값을 쓰고, 없으면 기본값을 쓴다.
- Windows 경로는 `C:/vision/images`처럼 `/`로 쓰거나 `C:\\vision\\images`처럼 역슬래시를 두 번 쓴다.
  역슬래시를 하나만 쓰면 서버가 JSON 형식 오류로 멈추거나, 그 값을 경고하고 무시한다.
- 파일은 UTF-8로 저장한다(메모장의 기본값이다). 파일 맨 앞의 BOM 표시는 서버가 떼고 읽는다.
  UTF-16으로 저장하면 서버가 알려 주고 시작하지 않는다. ANSI로 저장하면 한글 경로가 다른 글자로 바뀐다.

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
| … 값은 문자열이어야 한다 | 값을 따옴표로 감싼다 |
| … 값에 줄바꿈·탭 같은 제어 문자가 있다 | 경로의 역슬래시를 `/`나 두 번 쓴 역슬래시로 바꾼다 |
| … 값이 예시 자리표시자 그대로다 | `/absolute/path/…` 같은 예시 값을 실제 경로나 `""`로 바꾼다 |
| 예시 파일에 값이 들어 있다 | 예시 파일은 Git이 추적하므로 값을 넣지 않는다. 예시 파일의 값은 빈 문자열로 되돌리고, 값은 `config/local-connection.json`에만 넣는다 |

알림:

| 터미널 메시지 | 뜻과 할 일 |
| --- | --- |
| 설정 파일 없이 시작한다 | `config/local-connection.json`이 없다. 사진 저장소를 기본 위치에 받았으면 그대로 둔다 |
| 예전 위치의 설정 파일을 읽었다 | `courses/vision-96h-v2/scratch/local-connection.json`을 `config/local-connection.json`으로 옮긴다 |
| 예전 위치의 설정 파일은 읽지 않는다 | 새 위치 파일을 쓰고 있다. 예전 위치 파일은 지워도 된다 |

## 2. 연결 확인

1. `npm start`로 서버를 띄운다.
2. 브라우저에서 `http://127.0.0.1:8765/api/health`를 연다. `"status":"ok"`가 보이면 서버가 떠 있다.
3. 브라우저에서 `http://127.0.0.1:8765/api/records`를 연다. `"success":true`가 보이면 로컬 저장소를 읽은 것이다. 처음에는 `"records":[]`로 나온다.

사건 기록은 `courses/vision-96h-v2/preview/_synthetic_store.json`에, 사진은 `courses/vision-96h-v2/preview/_synthetic_store_images/`에 한 장씩 저장되어 서버를 다시 시작해도 남는다. 둘 다 Git이 추적하지 않는다.

## 3. 서버 끄기

- 서버를 띄운 터미널에서 `Ctrl+C`를 누른다. 터미널 창을 닫아도 서버는 꺼진다.

## 4. 사진 저장소 받기

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
- 폴더 이름은 `vision-risk-student-images` 그대로 둔다. 다른 위치나 이름으로 받았으면 1절 설정 파일의 `REPOSITORY_IMAGES_ROOT`에 그 절대 경로를 `C:/work/vision-risk-student-images`처럼 `/`로 적는다.

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
