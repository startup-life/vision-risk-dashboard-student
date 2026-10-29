# 비전 리스크 대시보드 — 수강생 저장소

현장 사진으로 위험을 확인하고 판단·조치를 기록하는 대시보드를 6회차 수업에서 함께 만듭니다.
이 브랜치(`milestone-0`)는 출발점이라 이 안내 파일만 있습니다.

## 브랜치

| 브랜치 | 이 회차가 끝나면 되는 것 |
|---|---|
| `milestone-0` | 출발점 |
| `milestone-1` | 서버를 켜면 화면 틀이 뜨고, 메뉴로 이동하며 확인 기준 목록이 보인다 |
| `milestone-2` | 파일이나 저장소 사진으로 사건을 등록하면 목록과 홈에 나온다 (로컬 저장) |
| `milestone-3` | 사건 상세에서 정보 수정·판단·조치를 기록하면 상태에 반영된다 |
| `milestone-4` | 상세에서 관련 기준 확인을 요청하면 NotebookLM 인용이 나온다 |
| `milestone-5` | 사건이 Google 시트에 저장되고, Gemini 사진 판독 초안이 나온다 |
| `main` | Teachable Machine으로 학습한 모델의 예측이 상세와 홈에 나온다 (완성본) |

## 받기

```bash
git clone https://github.com/startup-life/vision-risk-dashboard-student.git
cd vision-risk-dashboard-student
```

## 따라하기 자료

- 따라하기 프롬프트는 `main` 브랜치의 `follow-along/` 폴더에 있습니다.
- 공통 규칙은 `.agent/rules/class-rules.md`, 원문 자료는 `materials/`에 있습니다.

## 회차를 놓쳤을 때

다음 회차는 지난 회차 완료 브랜치에서 시작합니다. 예를 들어 3회차를 시작할 때는 이렇게 받습니다.

```bash
git fetch origin
git switch milestone-2
```

내가 만든 코드를 남겨 두고 싶으면 먼저 내 브랜치로 커밋해 둡니다.

```bash
git switch -c my-work
git add -A
git commit -m "my work"
git switch milestone-2
```

설치와 실행 방법은 `milestone-1`부터 그 브랜치의 `README.md`에 있습니다.
