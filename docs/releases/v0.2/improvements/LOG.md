# v0.2 이후 개별 개선 기록

v0.2 backlog 기반 일괄 개선을 마친 뒤, 사용자가 실제 사용해보며 발견한 미반영·추가 개선 사항을 한 건씩 순차적으로 처리하기 위한 로그이다. `../PLAN.md`, `../backlog.json`, `../PRD.md`, `../SPEC.md`, `../reviews/`는 완료된 v0.2 산출물로 이 로그 작업으로 인해 수정하지 않는다.

각 항목은 다음 순서로 처리하고 그 결과를 이 파일에 `## I{3자리 번호}. <제목>` 섹션으로 append한다:

1. 사용자 요청 접수
2. 에이전트가 수정 구현
3. CLAUDE.md의 Adversarial Review Rules에 따른 반대 벤더 CLI 적대적 검증 실행 (Claude Code 구현 시 Codex CLI, Codex 구현 시 Claude Sonnet headless CLI). Critical 지적은 수정 후 동일 벤더로 재검증하며, 재실행 포함 최대 3회로 제한한다.
4. 사용자 재확인 및 피드백
5. 사용자 확정 시 항목 단위로 커밋 승인 요청

## 항목 기록 형식

```
## I{n}. <한 줄 제목>

- 요청 일시 / 요청자:
- 요청 내용:
- 변경 내용 (구현자):
- 반대 벤더 적대적 검증
  | 회차 | 검토자 | 결과 요약 |
  |---|---|---|
  | 심각도 | 건수 | 처리 상태 | 근거 |
  |---|---|---|---|
- Critical 수정 및 재검증 (해당 시):
- 사용자 확인/피드백:
- 상태: 확정 / 보류 / 재작업 필요
```

---

## I001. 상태바가 표시되지 않는 문제 수정 및 파일경로 | 파일크기 | 생성일 형식 반영

- 요청 일시 / 요청자: 2026-08-16 / nampluskr
- 요청 내용: Windows 탐색기에서 mdviewer 폴더의 README.md를 더블클릭해 실행하면 상태바가 보이지 않는다. 먼저 원인을 파악해 보고하고, 상태바가 "파일경로 | 파일크기 | 생성일" 형식으로 표시되도록 수정.
- 원인 분석 (구현자: Claude Code):
  `src/renderer/src/styles.css`의 `#root`와 `.app-shell`이 `height: 100vh`가 아닌 `min-height: 100vh`로 지정되어 있었다. `.document-content`에는 `overflow: auto`가 걸려 있지만, 부모 `.app-shell`이 고정 높이가 아니라 `min-height`만 가지므로 문서 내용이 창 높이보다 길어지면 flex 컬럼 전체가 내용 높이만큼 늘어나 버렸다. 그 결과 `.document-content`가 내부 스크롤을 하지 못하고 `<footer class="status-bar">`가 창의 보이는 영역 밖(문서 맨 아래)으로 밀려나, 실행 직후에는 상태바가 화면에 보이지 않았다. 이 저장소의 README.md(53줄)처럼 창 높이(기본 800px)를 넘는 문서를 열면 항상 재현된다.
  또한 기존 상태바는 `activeTab?.filePath`만 렌더링했고 파일 크기·생성일 정보 자체가 없었다 (`src/main/index.ts`의 `filesystem:read-file`, `filesystem:consume-initial-markdown-file` 핸들러가 `fs.stat` 결과의 size/시간 정보를 반환하지 않았음).
- 재현 확인: `npm run package:win`으로 실제 NSIS 패키지를 빌드하고 `release/win-unpacked/Markdown Browser.exe`를 README.md 인자로 직접 실행(더블클릭과 동일 경로)해 스크린샷으로 상태바 미표시를 먼저 재현한 뒤 수정을 적용했다.
- 변경 내용 (구현자: Claude Code):
  - `src/renderer/src/styles.css`: `#root`, `.app-shell`을 `min-height: 100vh` → `height: 100vh`로 변경해 `.document-content`가 내부에서만 스크롤되고 상태바가 항상 창 하단에 고정되도록 함.
  - `src/main/index.ts`: `filesystem:read-file` IPC 핸들러와 실행 인자 기반 초기 파일 로드(`initialMarkdownFileFromArguments`, `filesystem:consume-initial-markdown-file`)가 `fs.stat` 결과에서 `size`와 `createdAtMs`(`stats.birthtimeMs`)를 함께 반환하도록 확장.
  - `src/shared/markdown-browser.d.ts`: `MarkdownBrowserApi.readFile`과 `InitialMarkdownFile` 타입에 `size`, `createdAtMs` 필드 추가.
  - `src/renderer/src/App.tsx`: `Tab`에 `size`/`createdAtMs` 필드 추가. `formatFileSize`, `formatCreatedDate`, `formatStatusBar` 헬퍼를 추가하고 `<footer className="status-bar">`가 `파일경로 | 파일크기 | 생성일` 형식으로 렌더링하도록 변경. 초기 실행 파일 로드, 파일 열기(`openFilePath`), 재검토(`reloadCurrentState`), 빈 탭 생성(`createEmptyTab`) 등 `Tab`을 생성하는 모든 지점에서 `size`/`createdAtMs`를 일관되게 채우도록 반영.
- 반대 벤더 적대적 검증

  | 회차 | 검토자 | 결과 요약 |
  |---|---|---|
  | 1 | Codex CLI (`gpt-5.6-sol`, `--sandbox read-only`) | Critical 0건, Major 0건, Minor 2건. height:100vh 변경이 포커스 모드/탐색기 리사이즈/최소창 크기에서 스크롤 컨테인을 깨지 않음을 확인. 경로 검증 우회 등 보안 경계 회귀 없음을 확인. |

  | 심각도 | 건수 | 처리 상태 | 근거 |
  |---|---|---|---|
  | Critical | 0 | 해당 없음 | - |
  | Major | 0 | 해당 없음 | - |
  | Minor | 2 | 모두 수정 | (1) `reloadCurrentState`가 재검토 실패 시 `error`만 갱신하고 이전 `size`/`createdAtMs`를 남겨 상태바가 오래된 메타데이터를 계속 표시하던 문제 → 실패·ROOT_UNAVAILABLE 분기에서 `size: null, createdAtMs: null`로 초기화하도록 수정. (2) `birthtimeMs`가 0이거나 유효하지 않은 날짜일 때 "1970. 01. 01." 또는 "Invalid Date"가 표시되던 문제 → `formatCreatedDate`가 유한하고 0보다 크며 유효한 Date인지 검증해 실패 시 생성일 구간을 생략하도록 수정. |

- Critical 수정 및 재검증: 해당 없음 (Critical 지적 없음. Minor 2건만 수정했으며 CLAUDE.md 규칙상 Critical 미해당 시 재검증 의무는 없어 추가 재실행은 생략함)
- 사용자 확인/피드백: 사용자가 새 빌드(`release/win-unpacked/Markdown Browser.exe`)로 직접 재실행해 상태바가 `파일경로 | 파일크기 | 생성일` 형식으로 정상 표시됨을 확인함. 추가 피드백 없음.
- 상태: 확정
