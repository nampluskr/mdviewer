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

---

## I002. 탭 없음 상태의 무의미한 "+" 전용 화면 제거

- 요청 일시 / 요청자: 2026-08-16 / nampluskr
- 요청 내용: `mdviewer.exe`를 인자 없이 실행하면 화면 중앙에 "+" 버튼만 있는 화면이 나오는데, 이 "+"는 탭바의 새 탭 추가용 "+"가 아니라 뷰어 영역 중앙에 별도로 있는 "+"이며, 눌러도 파일/폴더를 여는 게 아니라 빈 탭만 하나 생성해 실질적으로 쓸모가 없다. 이 화면이 꼭 필요한지, 없애는 게 낫지 않은지 검토 요청.

  (참고: 같은 대화에서 먼저 "mdviewer . / mdviewer <path> 터미널 실행"을 I002로 논의했으나 사용자가 "이번엔 구현하지 않겠다"고 결정해 로그에 기록하지 않았다. 이후 이 항목을 사용자가 "I002로 진행"이라고 지정해 번호를 재사용했다.)

- 원인/현황 분석 (구현자: Claude Code):
  `App.tsx`에서 `tabs.length === 0`일 때 `<main className="empty-state">` 별도 화면으로 조기 반환하고 있었다. 이 화면에는 중앙 "+" 버튼 하나만 있고, Explorer의 "Open" 버튼이나 폴더 열기 안내는 전혀 보이지 않는다. "+"를 누르면 `createEmptyTab()`으로 빈 탭이 생성되어야 비로소 탭바·Explorer(Open 버튼 포함)·뷰어 영역을 갖춘 정상 레이아웃으로 전환된다. 즉 앱을 처음 켰을 때 실제 진입점(Open 버튼)에 도달하려면 쓸모없는 클릭을 한 번 더 거쳐야 했다. `PRD.md` FR-15("빈 화면에서는 + 버튼으로 새 빈 탭을 만들 수 있다", Must)에 명시된 v0.2 확정 동작이었으나, 사용자 확인 결과 이 화면 자체가 불필요하다고 판단해 v0.2 문서는 그대로 두고(참조 전용) 이 로그에서 동작을 변경하기로 함.
- 변경 내용 (구현자: Claude Code):
  - `src/renderer/src/App.tsx`: `tabs.length === 0`일 때의 `.empty-state` 조기 반환 분기를 제거. 탭이 0개여도 처음부터 정상 레이아웃(탭바, Explorer의 Open/Reload 버튼과 "Select a folder to browse supported files." 안내, 문서 영역의 "This tab is ready for a Markdown document." 안내)을 바로 렌더링하도록 변경. `activeTab`이 `null`인 경우의 렌더링 처리는 기존에 "빈 탭(kind: 'empty')" 상태를 위해 이미 구현되어 있던 것을 그대로 재사용.
  - 제거된 화면에만 있던 `initialLaunchPending`("Opening Markdown file...")과 `launchError` 메시지를 `document-content` 상단으로 이동.
  - `src/renderer/src/styles.css`: 더 이상 어떤 요소도 사용하지 않는 `.empty-state` 규칙 삭제.
- 반대 벤더 적대적 검증

  | 회차 | 검토자 | 결과 요약 |
  |---|---|---|
  | 1 | Codex CLI (`gpt-5.6-sol`, `--sandbox read-only`) | Critical 0건, Major 1건, Minor 3건. Hooks 순서·Explorer 키보드 탐색·중복 aria-label 문제는 없음을 확인. |

  | 심각도 | 건수 | 처리 상태 | 근거 |
  |---|---|---|---|
  | Critical | 0 | 해당 없음 | - |
  | Major | 1 | 수정 | `launchError`가 화면 이동 후에는 탭이 열리거나 파일을 성공적으로 연 뒤에도 계속 표시되는 문제(이전에는 `tabs.length===0` 분기 자체가 사라지면서 자연히 사라졌음) → `initialLaunchPending`/`launchError` 표시 조건에 `tabs.length === 0`을 추가해 이전과 동일하게 탭이 없을 때만 보이도록 수정. |
  | Minor | 3 | 미수정 (근거 기록) | (1) 초기 로딩 중 "Opening Markdown file..."과 "This tab is ready..."가 동시에 보일 수 있음 — Major 수정으로 tabs.length===0 조건이 추가되며 대부분 완화되었고 잔여 영향은 경미해 별도 처리하지 않음. (2) 탭이 0개일 때 `role="tabpanel"`과 빈 `<h1>`이 렌더링되어 접근성 트리에 이름 없는 헤딩이 남음 — 이는 기존에도 "빈 탭(kind: empty)"이 활성화된 상태에서 이미 존재하던 패턴이며 이번 변경으로 새로 생긴 회귀가 아니라 이번 항목 범위 밖의 별도 접근성 개선 과제로 남김. (3) 좁은 창 폭(약 400px 미만)에서 Explorer 리사이저의 `aria-valuemax`가 `aria-valuemin`보다 작아지는 경우가 있음 — 이 역시 기존 정상 레이아웃(탭이 있을 때)에서도 동일하게 존재하던 문제로, 이번 변경으로 도달 시점이 앞당겨졌을 뿐 새로 만든 결함이 아니라 별도 항목으로 처리. |

- Critical 수정 및 재검증: 해당 없음 (Critical 지적 없음)
- 사용자 확인/피드백: 사용자가 새 빌드로 직접 재실행해 인자 없이 실행 시 정상 레이아웃이 바로 표시됨을 확인함. 추가 피드백 없음.
- 상태: 확정

---

## I003. Explorer 파일명·조작 버튼에 VSCode 스타일 monospace 폰트 적용

- 요청 일시 / 요청자: 2026-08-16 / nampluskr
- 요청 내용: v0.2에서 글꼴을 VSCode 타입으로 적용 요청했었는데, 상태바/프로그램 이름/탐색기 상단 폴더명·폴더 경로는 반영된 것 같지만, 탐색기 영역 내 폴더·파일명과 상단 Open, Reload, Hide Explorer, Dark theme에는 반영되지 않았다며 원인 확인 및 반영을 요청.
- 원인 분석 (구현자: Claude Code):
  버그가 아니라 `docs/releases/v0.2/SPEC.md` 8.2절("서체와 탭 영역")에 확정된 설계였다. SPEC 8.2 표는 "Explorer, 탭, 버튼, 상태 표시" 영역을 Segoe UI(sans-serif)로, "코드 블록, 코드 뷰어, 경로"만 `"Cascadia Code", Consolas, monospace`로 지정한다. 실제 구현(`styles.css`)도 이 표를 그대로 따라 상태바·탐색기 경로 텍스트(`.status-bar`, `.current-directory`, "경로"에 해당)만 monospace이고, 탐색기 파일·폴더 이름 버튼(`.explorer-file`, `.explorer-directory`, `.explorer-parent`)과 조작 버튼(`.explorer-header-button`, `.toolbar-button`, `.new-tab-button`)은 `font: inherit`로 조상(:root)의 Segoe UI를 그대로 상속하고 있었다. 다만 초기 기획 문서 `BRIEF.md` 97행에는 "Explorer는 글꼴, 여백, 항목 높이를 포함해 VS Code와 유사한 compact하고 dense한 스타일로 표시되어야 한다"는 더 넓은 요청이 있었고, SPEC 확정 과정에서 "경로만 monospace"로 범위가 좁혀진 것으로 보인다. 사용자 확인 결과 애초 의도대로 Explorer 전체에 monospace를 적용하기로 결정.
- 변경 내용 (구현자: Claude Code):
  - `src/renderer/src/styles.css`: 기존에 이미 쓰이던 `"Cascadia Code", Consolas, monospace` 폰트 스택을 재사용해 아래에 `font-family`를 추가 (새 폰트/의존성 도입 없음).
    - `.new-tab-button, .toolbar-button, .explorer-file, .explorer-directory, .explorer-parent` (탭 추가 "+", Hide Explorer/Dark theme, 탐색기 파일·폴더 이름)
    - `.tab-button` (열린 문서 탭 제목 — 사용자가 "전부 다 포함" 요청 시 함께 포함)
    - `.explorer-header-button` (Open, Reload 버튼)
    - `.root-name` (탐색기 상단 루트 폴더명 — 기존에는 font-family가 없어 실제로는 sans-serif였음에도 사용자가 "반영된 것 같다"고 인지했던 부분이라, 일관성을 위해 함께 monospace로 전환)
  - Markdown 본문(`.markdown-content`)은 SPEC 8.2 "Markdown 본문" 행 그대로 sans-serif 유지, 변경하지 않음.
- 반대 벤더 적대적 검증

  | 회차 | 검토자 | 결과 요약 |
  |---|---|---|
  | 1 | Codex CLI (`gpt-5.6-sol`, `--sandbox read-only`) | Critical 0건, Major 0건, Minor 1건. `font: inherit` 뒤에 `font-family`를 추가하는 방식이 Chromium에서 family만 올바르게 override함을 확인. 이후 규칙에서 대상 셀렉터를 다시 sans-serif로 되돌리는 선언 없음을 확인. |

  | 심각도 | 건수 | 처리 상태 | 근거 |
  |---|---|---|---|
  | Critical | 0 | 해당 없음 | - |
  | Major | 0 | 해당 없음 | - |
  | Minor | 1 | 수정 | `.explorer-file`/`.explorer-directory`/`.explorer-parent`에 `overflow`/`text-overflow`/`white-space` 제어가 없어, monospace 전환으로 글자폭이 넓어지면서 긴 파일·폴더 이름이 탐색기 폭(17rem)을 넘어 가로 스크롤을 유발할 수 있는 문제 → 이미 `.current-directory`/`.root-name`/`.tab-button`에 쓰이던 것과 동일한 `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` 패턴을 추가해 수정. |

- Critical 수정 및 재검증: 해당 없음 (Critical 지적 없음)

### 추가 반영 (같은 I003 항목 내 후속 요청)

- 요청 내용: 적용된 monospace 글꼴 크기가 너무 크다며, 탐색기 상단 폴더 경로(`.current-directory`)와 같은 크기로 맞추고, `.root-name`(루트 폴더명)의 bold도 제거해달라는 요청. 이어서 탐색기 파일/폴더 리스트의 줄간격이 너무 넓다며 dense하게 조정 요청.
- 확인 답변: `.current-directory`의 글꼴 크기는 `.75rem`(16px 기준 12px)이라고 안내. 탐색기 파일/폴더 리스트(`.explorer-file`/`.explorer-directory`/`.explorer-parent`)에는 `line-height`가 지정되어 있지 않아 브라우저 기본값(`normal`, 약 1.2배)이 적용되고 있었고, `padding: .25rem`으로 상하 4px씩 더해져 있었다고 안내. VS Code의 dense 모드 한 줄 높이(약 22px)를 기준으로 `line-height: 1.2` 명시를 권장.
- 변경 내용 (구현자: Claude Code):
  - `.new-tab-button, .toolbar-button, .explorer-file, .explorer-directory, .explorer-parent`, `.tab-button`, `.explorer-header-button`, `.root-name`에 `font-size: .75rem` 추가 (`.current-directory`/`.status-bar`와 동일 크기로 통일). `.new-tab-button`은 자신의 후속 규칙(`font-size: 1.5rem`)이 source order상 뒤에 있어 "+" 글리프 크기는 그대로 유지됨.
  - `.root-name`에서 `font-weight: 600`(bold) 제거.
  - `.explorer-file, .explorer-directory, .explorer-parent`에 `line-height: 1.2` 추가로 행 높이를 명시적으로 고정.
- 반대 벤더 적대적 검증 (2회차)

  | 회차 | 검토자 | 결과 요약 |
  |---|---|---|
  | 2 | Codex CLI (`gpt-5.6-sol`, `--sandbox read-only`) | Critical 0건, Major 1건, Minor 0건. `.new-tab-button`의 1.5rem 유지, 이후 규칙에서 재정의 없음, `.explorer-header-button` clipping 없음을 확인. |

  | 심각도 | 건수 | 처리 상태 | 근거 |
  |---|---|---|---|
  | Critical | 0 | 해당 없음 | - |
  | Major | 1 | 수정 | 최초 시도에서 `padding: .2rem .25rem`으로 줄여 행 높이가 약 20.8px가 되어 WCAG 2.2의 24×24px 클릭 대상 기준에 못 미친다는 지적 → `padding`을 `.25rem`(원래 값)으로 되돌려 행 높이를 약 22.4px로 조정. 이는 VS Code 자체의 dense 목록 한 줄 높이(약 22px)와 유사한 수준이며, 변경 전(약 27px)보다는 확실히 촘촘해져 "dense" 요청을 만족하면서 클릭 대상 크기 우려를 완화함. |

- Critical 수정 및 재검증: 해당 없음 (Critical 지적 없음)

### 두 번째 후속 반영: monospace 적용 범위 축소 (VS Code 실제 동작 조사 결과 반영)

- 요청 내용: monospace 폰트가 너무 넓게 늘어져 보인다며, VS Code가 탐색기 영역에 실제로 어떤 폰트를 쓰는지 확인 요청.
- 조사 결과 (WebSearch로 확인, 구현자: Claude Code): VS Code는 워크벤치 UI(탐색기·사이드바·탭·상태바·버튼 등 전체)와 에디터/터미널 콘텐츠에 서로 다른 폰트를 쓴다. 워크벤치 UI는 `system-ui, -apple-system, BlinkMacSystemFont, "Segoe WPC", "Segoe UI", "Ubuntu", "Droid Sans", sans-serif`(Windows에서 사실상 Segoe UI)이고, monospace(`editor.fontFamily`, 기본값 `Consolas, "Courier New", monospace`)는 에디터 본문과 터미널에만 적용된다. 즉 **VS Code 탐색기는 monospace가 아니라 sans-serif**이며, 이번 I003에서 Explorer 파일/폴더명·탭 제목·버튼까지 monospace로 확장한 것은 실제 VS Code 동작과 어긋난 방향이었다. 오히려 v0.2 SPEC.md 8.2("Explorer, 탭, 버튼, 상태 표시"는 sans-serif, "코드 블록·코드 뷰어·경로"만 monospace)가 VS Code 실제 동작과 더 정확히 일치했다.
- 변경 내용 (구현자: Claude Code): 앞서 추가했던 `font-family: "Cascadia Code", Consolas, monospace;`를 아래 4곳에서 제거해 `:root`의 sans-serif(`"Segoe UI Variable", "Segoe UI", "Malgun Gothic", sans-serif`)를 다시 상속하도록 되돌림. 이전 라운드에서 적용한 `font-size: .75rem`과 dense 행 간격(`line-height: 1.2`, `padding: .25rem`)은 폰트 종류와 무관하게 유효한 개선이라 그대로 유지.
  - `.new-tab-button, .toolbar-button, .explorer-file, .explorer-directory, .explorer-parent`
  - `.tab-button`
  - `.explorer-header-button`
  - `.root-name`
  - `.current-directory`, `.status-bar`, 코드 블록·코드 뷰어(`.markdown-content code`, `.code-language`, `.code-panel code`)는 SPEC 8.2 "경로"·"코드"에 해당하므로 monospace 유지, 변경하지 않음.
- 반대 벤더 적대적 검증 (3회차 — CLAUDE.md 규정상 이 항목의 마지막 허용 실행)

  | 회차 | 검토자 | 결과 요약 |
  |---|---|---|
  | 3 | Codex CLI (`gpt-5.6-sol`, `--sandbox read-only`) | Critical 0건, Major 0건, Minor 1건. `.root-name`이 조상 체인을 통해 sans-serif를 정상 상속함을 확인. 이전 라운드에서 고친 ellipsis 처리와 dense 행 높이가 이번 되돌리기로 회귀하지 않았음을 확인. 남은 monospace 선언(`.current-directory`, `.status-bar`, 코드 관련)이 의도된 대상과 정확히 일치함을 확인. |

  | 심각도 | 건수 | 처리 상태 | 근거 |
  |---|---|---|---|
  | Critical | 0 | 해당 없음 | - |
  | Major | 0 | 해당 없음 | - |
  | Minor | 1 | 수정 | `.tab-button`에서 `font-family`만 제거하고 `font: inherit`가 없어, Chromium의 `<button>` 사용자 에이전트 기본 글꼴(Segoe UI가 아닌 브라우저 기본 버튼 글꼴)이 적용될 수 있다는 지적 → 다른 버튼 셀렉터들과 동일하게 `font: inherit`를 추가해 `:root`의 sans-serif 스택을 명시적으로 상속하도록 수정. |

- Critical 수정 및 재검증: 해당 없음 (Critical 지적 없음)
- 남은 위험: 이 항목에 대한 반대 벤더 적대적 검증은 CLAUDE.md 규정(재실행 포함 최대 3회)에 따라 3회차로 종료함. 3회차에서 발견된 Minor 1건은 즉시 수정 완료했고 추가 재검증은 실행하지 않음. 현재 알려진 잔여 위험 없음.
- 사용자 확인/피드백: 사용자가 새 빌드로 직접 재실행해 Explorer 파일/폴더명·탭 제목·버튼이 sans-serif로, 상태바 경로는 monospace로 정상 표시됨을 확인함. 추가 피드백 없음.
- 상태: 확정
