# 현장 리스크 대시보드 따라하기

6회차 수업에서 AI 도구에 프롬프트를 하나씩 붙여 넣으며 '현장 리스크 대시보드' 웹앱을 만듭니다.
프롬프트는 한 번에 1~2줄이고, 화면에서 무엇이 되어야 하는지만 쉬운 말로 적었습니다. 화면 색과 배치는 사람마다 조금씩 달라도 괜찮습니다. 각 번호의 "확인"에 적힌 글과 동작만 되면 됩니다.

| 회차 | 파일 | 단계 | 끝나면 되는 것 | 완료 브랜치 |
|---|---|---|---|---|
| 1 | [session-1.md](session-1.md) | 30 | 서버를 켜면 화면 틀이 뜨고 확인 기준 목록이 보인다 | `milestone-1` |
| 2 | [session-2.md](session-2.md) | 42 | 파일이나 저장소 사진으로 사건을 등록하면 목록과 홈에 나온다 (내 컴퓨터 저장) | `milestone-2` |
| 3 | [session-3.md](session-3.md) | 48 | 사건 상세에서 정보 수정·판단·조치를 기록하면 상태에 반영된다 | `milestone-3` |
| 4 | [session-4.md](session-4.md) | 56 | 관련 기준 확인을 요청하면 NotebookLM 인용이 나온다 | `milestone-4` |
| 5 | [session-5.md](session-5.md) | 88 | 사건이 Google 시트에 저장되고 Gemini 사진 판독 초안이 나온다 | `milestone-5` |
| 6 | [session-6.md](session-6.md) | 69 | 직접 학습한 Teachable Machine 모델의 예측이 상세와 홈에 나온다 | `main` |

## 준비물

- Windows 10·11 PC, Chrome
- Node.js 24 LTS(22.9 이상), Git for Windows
- AI 도구 하나: Antigravity 또는 Cline(둘 다 됩니다)
- 수업에 쓸 Google 계정 하나(4회차부터 NotebookLM, 5회차부터 Google 시트·Apps Script·Gemini에 씁니다)

설치 방법은 1회차 파일의 "시작 전에"에 있습니다.

## 먼저 알아 둘 말

- **AI**: 프롬프트를 붙여 넣는 AI 도구(Antigravity나 Cline)입니다. 회차 파일에서는 그냥 "AI"라고 부릅니다.
- **서버**: 앱 뒤에서 일하는 프로그램입니다. 서버를 켜 두면 Chrome에서 http://127.0.0.1:8765 로 앱을 엽니다.
- **터미널**: 명령을 치는 검은 창입니다. Windows에서는 PowerShell을 씁니다.
- **서버 창**: 서버를 켜 두는 터미널입니다. 다른 명령은 서버 창이 아닌 터미널에서 칩니다.
- **직접 하기**: AI에게 보내지 않고 내가 손으로 하는 일입니다. 설치, 로그인, 권한 승인, 키 만들기, 서버 켜고 끄기가 여기에 들어갑니다.
- **확인**: 그 단계가 잘 됐는지 화면이나 서버 창에서 보는 방법입니다.

## 폴더와 사진 저장소

- 수업 폴더는 `C:\vision-ai`, 프로젝트 폴더는 `C:\vision-ai\vision-risk-dashboard-student`입니다. 바탕 화면이나 문서 폴더(OneDrive가 동기화하는 곳), 한글이 든 경로는 피합니다.
- 사건 등록에 쓰는 사진은 프로젝트 폴더 바로 옆에 받습니다(2회차부터 씁니다). ZIP으로 받으면 쓰지 못하니 아래처럼 `git clone`으로 받고, 폴더 이름은 바꾸지 않습니다.

```powershell
cd C:\vision-ai
git clone https://github.com/startup-life/vision-risk-student-images.git
```

## 진행 방법

1. AI 도구에서 프로젝트 폴더 `C:\vision-ai\vision-risk-dashboard-student`를 엽니다.
2. 회차 파일의 "시작 전에"를 먼저 합니다.
3. 프롬프트 상자 하나를 통째로 복사해 AI에게 붙여 넣습니다. 앞 번호가 끝난 뒤에 다음 번호를 보냅니다. 두 번호를 한꺼번에 보내지 않습니다.
4. AI가 파일을 고치거나 명령을 실행해도 되는지 물으면, 보낸 프롬프트와 관계있는 일인지 보고 승인합니다. 서버를 켜겠다고 하면 거절합니다. 컴퓨터 설정이나 프로그램 버전을 바꾸는 명령(`Set-ExecutionPolicy`, `npm audit fix` 같은 것)은 승인하지 말고 강사에게 알립니다.
5. 각 번호의 "확인"을 해 봅니다. 다르게 나오면 화면의 오류 문장이나 서버 창의 빨간 줄을 그대로 복사해 "이렇게 나와요. 고쳐 주세요."와 함께 AI에게 붙여 넣습니다.
6. 서버는 내가 서버 창에서 직접 끄고 켭니다(Ctrl+C로 끄고 `npm.cmd start`로 켬). "일괄 작업을 끝내시겠습니까 (Y/N)?"가 나오면 `Y`를 칩니다.

### 프로젝트 규칙 파일(AGENTS.md)

1회차 첫 단계(1-1)가 프로젝트 폴더 맨 위에 `AGENTS.md`를 만듭니다. Antigravity와 Cline 모두 대화할 때마다 이 파일을 읽습니다. 2~6회차는 각 회차 첫 단계에서 그 회차의 약속을 이 파일 끝에 덧붙입니다. 그래서 프롬프트가 짧아도 AI가 정해 둔 방식대로 만듭니다. 이 파일은 내용을 이해할 필요 없이 복사해 넣기만 하면 됩니다.

### 비밀 값

설정 파일 `config/local-connection.json`에는 Gemini API 키, Google 웹앱 주소, NotebookLM 노트북·소스 ID 같은 비밀 값이 들어갑니다. 이 값은 설정 파일에만 두고 화면 공유·메신저·문서에 옮기지 않습니다. 설정 파일은 Git에 올라가지 않습니다.
Gemini 키만은 5회차 안내대로 AI 대화에 붙여 넣고, AI가 설정 파일의 그 줄만 바꿉니다. AI는 답에 키 값을 다시 쓰지 않습니다.

## 회차를 다 못 끝냈을 때: 완료 브랜치로 옮기기

다음 회차를 시작하기 전에 직전 회차의 완료 브랜치로 옮겨 같은 출발선에서 시작합니다. 예를 들어 2회차를 못 끝냈으면 3회차 전에 `milestone-2`로 옮깁니다. 서버를 끄고 터미널에서 아래를 한 줄씩 칩니다.

```powershell
cd C:\vision-ai\vision-risk-dashboard-student
git add -A
git commit -m "내 작업 남기기"
git fetch origin
git switch milestone-2
npm.cmd install
```

- `milestone-2` 자리에 옮길 브랜치 이름을 넣습니다(6회차 완료본은 `main`).
- 내가 만든 코드는 지금 브랜치(처음엔 `my-work`)에 커밋으로 남습니다. `git commit`에서 "nothing to commit"이 나와도 그대로 다음 줄을 칩니다.
- 완료 브랜치에는 그 회차까지의 약속이 든 `AGENTS.md`가 들어 있습니다. 다음 회차 첫 단계는 그대로 하면 됩니다.
- 설정 파일 `config/local-connection.json`과 옆 폴더의 사진 저장소는 Git에 들어 있지 않아 브랜치를 옮겨도 그대로 남습니다. 다시 만들거나 받지 않아도 됩니다.
- 5회차에 Google 쪽 코드를 올려 두었다면, 완료 브랜치의 Google 쪽 코드를 다시 올려야 하는지는 그 회차 파일 끝의 안내를 봅니다.
- 그다음 서버를 켜서 http://127.0.0.1:8765 가 열리는지 확인한 뒤 다음 회차를 시작합니다.
