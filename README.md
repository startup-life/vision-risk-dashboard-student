# 비전 리스크 대시보드

가상 물류창고의 택배 발송·산업안전 상황을 확인하는 현장 대시보드다.
로컬 서버를 켜면 화면 틀과 택배 발송·산업안전 확인 기준 목록을 볼 수 있다.

## 준비물

- Node.js 22.9 이상과 npm
- Git
- 인터넷 연결(저장소를 받을 때 필요하다)

**Windows에서 명령 입력하기**
- 창의 줄 맨 앞이 `C:\...>`로 시작하면 명령 프롬프트, `PS C:\...>`로 시작하면 PowerShell입니다.
- 명령 프롬프트에서는 안내한 명령을 그대로 칩니다. 예: `npm start`
- PowerShell에서는 `npm`을 `npm.cmd`로, `npx`를 `npx.cmd`로 바꿔 칩니다. 예: `npm.cmd start`
- PowerShell에서 `.cmd` 없이 쳤다가 "이 시스템에서 스크립트를 실행할 수 없으므로 … npm.ps1 파일을 로드할 수 없습니다" 오류가 나면 `npm.cmd`로 다시 칩니다.
- 매번 바꿔 치기 번거로우면 PowerShell에서 아래 명령을 한 번만 실행합니다. 확인을 물으면 `Y`를 누르고, PowerShell 창을 닫았다가 새로 엽니다. 지금 로그인한 사용자 계정에만 적용되고, 그 뒤로는 `npm`을 그대로 쳐도 됩니다.
  `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`
- 학교·회사 PC에서 이 명령이 "더 구체적인 범위에서 정의된 정책" 같은 문구로 적용되지 않으면 관리자 정책 때문입니다. 그때는 계속 `npm.cmd`로 칩니다.

## 1. 저장소 받기

```sh
git clone https://github.com/startup-life/vision-risk-dashboard-student.git
cd vision-risk-dashboard-student
```

## 2. 실행

이 저장소 폴더에서 실행한다.

```sh
npm start
```

- 브라우저에서 `http://127.0.0.1:8765`를 연다.
- 홈에서 "확인 기준 보기"를 누르면 확인 기준 목록이 나온다.
- 끌 때는 서버를 띄운 터미널에서 `Ctrl+C`를 누른다.
- 다른 프로그램이 이미 8765 포트를 쓰고 있으면 서버가 시작하지 않는다. 그 프로그램(다른 창에 띄운 대시보드 등)을 끈 뒤 다시 실행한다.
- 서버가 읽는 설정 파일과 터미널에 나오는 설정 메시지는 [로컬 실행 준비 1절](docs/LOCAL-SETUP.md#1-로컬-설정-파일)에, 서버가 켜졌는지 확인하는 방법은 [2절](docs/LOCAL-SETUP.md#2-연결-확인)에 있다.

## 폴더 구조

- `courses/vision-96h-v2/preview/`: 브라우저 화면, 검사 기준(`standards.json`)
- `courses/vision-96h-v2/tools/`: 로컬 Node 서버
- `config/`: 설정 예시 파일
- `docs/LOCAL-SETUP.md`: 로컬 실행의 자세한 안내
- `AGENTS.md`·`materials/`: 수업 공통 규칙·기술 약속과 지급 원문 자료. 따라하기 프롬프트는 `main` 브랜치의 `follow-along/` 폴더에 있다.

## 라이선스

[LICENSE.md](LICENSE.md)를 따른다.
