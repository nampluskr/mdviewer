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

---

## I004. 탐색기 파일·폴더에 아이콘 적용

- 요청 일시 / 요청자: 2026-08-16 / nampluskr
- 요청 내용: v0.2에서 탐색기 영역 파일·폴더 아이콘 적용을 논의했으나 현재 `[Folder]`, `[File]` 텍스트만 표시됨. 작업 규모 문의 후, 아이콘 종류는 v0.2에서 정의한 현재 뷰어가 지원하는 파일 종류(마크다운/텍스트/코드)로 한정해 진행 요청.
- 배경 확인 (구현자: Claude Code): `PRD.md` FR-11(우선순위 Should)과 `SPEC.md` 150행("아이콘 도입 전에는 텍스트 버튼을 사용하고, 아이콘 도입 시 SVG 아이콘과 영어 tooltip 사용")에 따라, 현재 `[Folder]`/`[File]` 텍스트 표시는 버그가 아니라 "아이콘 도입 전" 상태였다. `BRIEF.md` 163행 규칙상 폰트 아이콘 대신 SVG를 써야 함. 사용자 확인 결과 Open/Reload 버튼은 이번 범위에서 제외하고 파일/폴더 엔트리에만 아이콘 적용.
- 변경 내용 (구현자: Claude Code):
  - `src/renderer/src/App.tsx`: `EntryIcon({ type })` 컴포넌트 신규 추가. `DirectoryEntry['type']`(`directory`/`markdown`/`text`/`code`)에 따라 인라인 SVG를 렌더링 — 폴더 윤곽선, 마크다운은 파일 윤곽선 + "M", 코드는 파일 윤곽선 + "</>", 텍스트는 파일 윤곽선 + 가로줄 3개. 새 npm 의존성 없음(`stroke`/`fill="currentColor"`로 테마 색상 자동 상속). 기존 `<span aria-hidden="true">[Folder]/[File]</span>`을 `<EntryIcon type={entry.type} />`로 교체. 파일명도 `<span className="entry-name">`으로 감싸 아이콘과 분리.
  - `src/renderer/src/styles.css`: `.entry-icon`(14×14px, `flex: 0 0 auto`), `.entry-name`(ellipsis 처리) 추가. `.explorer-file, .explorer-directory, .explorer-parent`에 `align-items: center` 추가해 아이콘·파일명 수직 정렬.
  - `..`(상위 폴더 이동) 엔트리는 사용자가 지정한 범위(뷰어가 지원하는 파일 종류)에 해당하지 않아 아이콘 없이 그대로 유지.
- 반대 벤더 적대적 검증

  | 회차 | 검토자 | 결과 요약 |
  |---|---|---|
  | 1 | Codex CLI (`gpt-5.6-sol`, `--sandbox read-only`) | Critical 0건, Major 0건, Minor 2건. `aria-hidden`이 SVG 최상위에 있어 접근성 트리에서 아이콘 내부 "M"/"</>" 텍스트가 정상적으로 제외됨을 확인. `.explorer-parent`(`..`)에는 `align-items: center` 추가로 인한 회귀 없음을 확인. |

  | 심각도 | 건수 | 처리 상태 | 근거 |
  |---|---|---|---|
  | Critical | 0 | 해당 없음 | - |
  | Major | 0 | 해당 없음 | - |
  | Minor | 2 | 모두 수정 | (1) 파일명이 버튼 안의 raw text node라 flex 컨테이너에서 `text-overflow: ellipsis`가 안정적으로 적용되지 않을 수 있다는 지적 → 파일명을 `<span className="entry-name">`으로 감싸고 그 span에 `overflow: hidden; min-width: 0; text-overflow: ellipsis; white-space: nowrap;`을 직접 지정해 해결. 실제로 매우 긴 파일명으로 테스트해 말줄임표가 정상 적용됨을 스크린샷으로 확인. (2) `EntryIcon`의 마지막 분기가 암묵적 `else`라 향후 `DirectoryEntry['type']`에 새 값이 추가되면 조용히 text 아이콘으로 표시될 수 있다는 지적 → `type === 'text'`로 명시하고 그 외 값은 아이콘 없음(`null`)으로 변경해 미래 타입 확장 시 눈에 띄게(아이콘 누락) 만듦. |

- Critical 수정 및 재검증: 해당 없음 (Critical 지적 없음)
- 사용자 확인/피드백: 사용자가 "제대로 잘 적용되었습니다"로 확인함.
- 상태: 확정

---

## I005. UI 글꼴 크기·탭 높이·기본 글꼴 색상 조정

- 요청 일시 / 요청자: 2026-08-16 / nampluskr
- 요청 내용: VS Code UI 기본 글꼴 크기 확인 요청 후, (1) 글꼴 크기 증가, (2) 탭 제목 영역 높이를 글꼴 크기에 맞게 축소, (3) UI 기본 글꼴 색상을 검정 대신 상태바 파일경로에 쓰인 그레이로 변경, (4) UI에는 monospace가 필요 없어 보인다는 4가지 요청. 구현 전 사용자 요청사항을 표로 정리해 보고하고, 탭 높이 목표값과 monospace 범위(경로 포함 여부)를 확인받음.
- 조사 결과 (WebSearch로 확인, 구현자: Claude Code): VS Code 워크벤치 UI(Explorer 트리 등)의 기본 글꼴 크기는 13px(Activity Bar만 예외적으로 16px)이며, 이는 `SPEC.md` 8.2절에 원래 정의된 "Explorer, 탭, 버튼, 상태 표시 | 13px, 20px" 값과 일치. 기존 구현(`.75rem`=12px)이 SPEC 원본보다 1px 작았음.
- 사용자 확인 사항: 탭 높이는 28px(SPEC 원본 약 32px보다 더 촘촘하게), monospace는 경로(상태바·`.current-directory`)에 한해 유지(I003 결정 유지).
- 변경 내용 (구현자: Claude Code):
  - `src/renderer/src/styles.css`:
    - 글꼴 크기: `.75rem`(12px) → `.8125rem`(13px) — `.new-tab-button, .toolbar-button, .explorer-file, .explorer-directory, .explorer-parent` 공통 규칙, `.tab-button`, `.explorer-header-button`, `.root-name`, `.current-directory`, `.status-bar` 모두 적용.
    - 탭 높이: `.tab-bar`, `.tab-button`의 `flex`/`min-height`를 `2.25rem`(36px) → `1.75rem`(28px)로 축소.
    - 기본 글꼴 색상: `.toolbar-button`, `.explorer-header-button`, `.root-name`, `.explorer-file/.explorer-directory/.explorer-parent`의 `color`를 `var(--text)`(거의 검정) → `var(--muted-text)`(그레이, 상태바·경로와 동일 색상 변수)로 변경. 활성 탭 제목(`.tab.is-active .tab-button`)과 "+" 버튼(`.new-tab-button`)은 강조 목적상 `var(--text)`를 의도적으로 유지(판단 근거: 활성 탭 구분과 "+" 버튼의 시각적 눈에 띔 유지).
    - monospace: 경로(상태바·`.current-directory`)는 사용자 확인대로 그대로 유지, 추가 변경 없음.
- 반대 벤더 적대적 검증

  | 회차 | 검토자 | 결과 요약 |
  |---|---|---|
  | 1 | Codex CLI (`gpt-5.6-sol`, `--sandbox read-only`) | Critical 0건, Major 1건, Minor 0건. 탭 텍스트·닫기 버튼은 28px 안에 정상적으로 들어감을 확인. 그레이 색상의 hover/selected 배경 대비도 Light·Dark 모두 WCAG AA 이상(약 4.95~5.48:1)임을 확인. |

  | 심각도 | 건수 | 처리 상태 | 근거 |
  |---|---|---|---|
  | Critical | 0 | 해당 없음 | - |
  | Major | 1 | 수정 | 탭바를 28px로 줄였지만 "+"버튼(`.new-tab-button`)은 여전히 `min-height: 2.5rem`(40px) + `.tab-add-button` 여백 4px로 총 48px여서 탭바 밖으로 넘칠 수 있다는 지적 → `.new-tab-button`을 `min-height/min-width: 1.5rem`(24px), 글자 크기 `1.1rem`으로, `.tab-add-button` 여백을 `.125rem`으로 줄여 28px 탭바 안에 들어가도록 수정. 이 컴포넌트는 I002에서 빈 화면이 제거되며 이제 탭바의 "+" 용도로만 쓰이므로 다른 곳에 영향 없음. |

- Critical 수정 및 재검증: 해당 없음 (Critical 지적 없음). Major 수정 후 CLAUDE.md 규정상 Critical에만 재검증 의무가 있어 추가 반대 벤더 재실행은 생략, 스크린샷으로 직접 확인함.
- 사용자 확인/피드백: 사용자가 "제대로 잘 적용되었습니다"로 확인함.
- 상태: 확정

---

## I006. 탐색기 폴더 경로 표시 제거, 루트/폴더명 bold 적용

- 요청 일시 / 요청자: 2026-08-16 / nampluskr
- 요청 내용: 상태바에 파일 경로가 이미 표시되므로 탐색기의 현재 디렉터리 경로 표시가 중복인지 문의 → 사용자가 (1) 경로 표시 제거, (2) 루트 폴더명 bold, (3) 탐색기 내부 폴더명 bold로 결정.
- 배경 설명 (구현자: Claude Code): `.current-directory`는 실제로는 "루트 경로"가 아니라 `currentDirectoryPath`(탐색기가 지금 보여주는 디렉터리, SPEC.md 32행)였고, 상태바는 활성 탭의 파일 경로를 보여줘 항상 같지는 않지만, Root 폴더를 보고 있는 기본 상태에서는 사실상 중복으로 보일 수 있음을 설명. 사용자가 제거를 확정.
- 변경 내용 (구현자: Claude Code):
  - `src/renderer/src/App.tsx`: `<p className="current-directory" title={currentDirectoryPath}>{currentDirectoryPath}</p>` 표시 요소만 제거. `currentDirectoryPath` 상태 자체와 이를 사용하는 탐색 로직(Reload 활성화 조건, 방향키 탐색, 상위 폴더 이동, 디렉터리 삭제 시 Root 복귀 등)은 전혀 변경하지 않음.
  - `src/renderer/src/styles.css`: 더 이상 쓰이지 않는 `.current-directory` 규칙 삭제. `.root-name`에 `font-weight: 600` 추가. `.explorer-directory`(탐색기 내부 폴더 항목)에 `font-weight: 600`을 추가하는 새 규칙 추가 — `.explorer-file`/`.explorer-parent`는 영향 없음.
- 반대 벤더 적대적 검증

  | 회차 | 검토자 | 결과 요약 |
  |---|---|---|
  | 1 | Codex CLI (`gpt-5.6-sol`, `--sandbox read-only`) | Critical 0건, Major 0건, Minor 0건. `currentDirectoryPath`의 모든 비표시 사용처(Reload 조건, 방향키 탐색, 상위 폴더 이동, 삭제 시 Root 복귀 등)가 그대로 유지됨을 라인별로 확인. 제거된 표시 요소로 인한 레이아웃 공백이나 접근성 참조 끊김 없음을 확인. |

  | 심각도 | 건수 | 처리 상태 | 근거 |
  |---|---|---|---|
  | Critical | 0 | 해당 없음 | - |
  | Major | 0 | 해당 없음 | - |
  | Minor | 0 | 해당 없음 | - |

- Critical 수정 및 재검증: 해당 없음 (지적 없음)
- 사용자 확인/피드백: 사용자가 "제대로 잘 적용되었습니다"로 확인함.
- 상태: 확정

---

## I007. 탭바 상단 버튼을 탐색기 헤더로 이동하고 아이콘 적용

- 요청 일시 / 요청자: 2026-08-16 / nampluskr
- 요청 내용: 상단 탭바의 "Hide Explorer"/"Dark theme" 텍스트 버튼을 탐색기(Explorer) 헤더의 "Open | Reload"와 합쳐 "Open | Reload | Hide | Theme"로 이동하고 아이콘을 적용해달라는 요청.
- 구현 전 확인한 문제 (구현자: Claude Code): "Hide Explorer" 버튼을 탐색기 헤더(`.explorer-header`, `explorerVisible`가 true일 때만 렌더링되는 `<aside>` 내부) 안으로 옮기면, 탐색기를 숨기는 순간 그 버튼 자체가 DOM에서 사라져 다시 켤 방법이 없어지는 문제가 있음을 발견해 사용자에게 보고. VS Code도 같은 이유로 사이드바 토글을 사이드바 안이 아니라 항상 바깥(액티비티 바)에 둔다는 점을 근거로 제시.
- 사용자 확인 사항: Hide/Show 토글은 탭바 맨 앞에 아이콘 전용 버튼으로 유지, Open·Reload·Theme는 탐색기 헤더로 이동. (1차 반대 벤더 검증에서 Theme까지 탐색기 헤더로만 옮기면 탐색기를 숨겼을 때 테마를 바꿀 수 없는 동일 유형의 문제가 재발함을 발견 → 사용자가 Theme 아이콘은 탭바 오른쪽 원래 위치로 재배치하도록 확정. 탭 추가 "+" 버튼도 함께 아이콘화하기로 확정.)
- 변경 내용 (구현자: Claude Code):
  - `src/renderer/src/App.tsx`: `ExplorerToggleIcon`(패널 사각형+분할선, 보임 상태일 때 왼쪽 칸을 채움), `OpenFolderIcon`(폴더 윤곽선, `EntryIcon`의 디렉터리 아이콘과 동일 path 재사용), `ReloadIcon`(원형 화살표), `ThemeIcon`(라이트: 해, 다크: 초승달), `PlusIcon`(십자선) 신규 SVG 아이콘 컴포넌트 추가. 새 npm 의존성 없음.
  - 탭바(`<header className="tab-bar">`) 맨 앞에 `ExplorerToggleIcon` 아이콘 버튼 추가(탐색기 표시 여부와 무관하게 항상 렌더링). 탭 목록 뒤에는 Theme 아이콘 버튼과 "+"(`PlusIcon`) 버튼을 원래 위치대로 유지.
  - 탐색기 헤더(`.explorer-header`)의 "Open"/"Reload" 텍스트 버튼을 `OpenFolderIcon`/`ReloadIcon`으로 교체(각각 `toolbar-icon-button` 클래스 추가, 기존 `aria-label`/`title`은 그대로 유지).
  - `src/renderer/src/styles.css`: `.toolbar-icon-button`(아이콘 중앙 정렬용 flex), `.toolbar-icon`(14×14px) 추가. `.new-tab-button.toolbar-icon-button`, `.explorer-header-button.toolbar-icon-button` 전용 규칙으로 각 버튼의 기존 크기·패딩과 충돌 없이 정확히 오버라이드되도록 함.
- 반대 벤더 적대적 검증

  | 회차 | 검토자 | 결과 요약 |
  |---|---|---|
  | 1 | Codex CLI (`gpt-5.6-sol`, `--sandbox read-only`) | Critical 0건, Major 1건, Minor 1건. 탐색기 토글 버튼이 `explorerVisible` 값과 무관하게 항상 렌더링됨(탭바가 조건부 렌더링 트리 밖에 있음)을 라인별로 확인. 4개 아이콘 전용 버튼 모두 `aria-label`/`title`이 일관되게 유지됨을 확인. |

  | 심각도 | 건수 | 처리 상태 | 근거 |
  |---|---|---|---|
  | Critical | 0 | 해당 없음 | - |
  | Major | 1 | 수정 | Theme 버튼을 탐색기 헤더로만 옮기면 탐색기를 숨겼을 때 테마를 바꿀 방법이 없어진다는 지적(Hide Explorer와 동일한 유형의 회귀) → 사용자 확인 후 Theme 아이콘 버튼을 탭바 오른쪽(원래 위치)으로 재배치해 탐색기 표시 여부와 무관하게 항상 접근 가능하도록 수정. |
  | Minor | 1 | 수정 | `.toolbar-icon-button`의 `padding: .35rem .5rem`이 이후에 선언된 `.explorer-header-button`의 `padding: .35rem .55rem`(동일 우선순위, 소스 순서상 나중)에 밀려 적용되지 않는 문제 → `.explorer-header-button.toolbar-icon-button` 전용 규칙을 추가해 확실히 오버라이드되도록 수정. |

- Critical 수정 및 재검증: 해당 없음 (Critical 지적 없음). Major 수정은 CLAUDE.md 규정상 재검증 의무가 없어 반대 벤더 재실행 대신 실제 실행(탐색기 숨긴 상태에서 테마·"+"·탐색기 토글 버튼이 모두 탭바에 남아 있는지)을 스크린샷으로 직접 확인함.
- 사용자 확인/피드백: 사용자가 "제대로 구현되었습니다"로 확인함.
- 상태: 확정

---

## I008. 툴바·탐색기·상태바·탭 세부 조정 6건

- 요청 일시 / 요청자: 2026-08-16 / nampluskr
- 요청 내용:
  1. 탭추가 "+" 아이콘 배경 색깔 제거 - 다른 아이콘과 동일하게
  2. 탐색기 영역: 폴더 열기/리로드 아이콘 우측 정렬
  3. 탐색기 영역 스크롤바 추가 - 스크롤바 너비 좁게
  4. 탐색기 영역 기본 너비: 최소값으로 적용
  5. 상태바 파일 날짜 형식 YY-MM-DD로 변경
  6. 탭 영역 파일 제목 - 기본은 파일명 크기로 하고, 일정 너비 이상 시 ... 추가
- 변경 내용 (구현자: Claude Code):
  - `src/renderer/src/styles.css`:
    - `.new-tab-button`의 `background: var(--surface-hover)` → `transparent`, hover 배경을 다른 아이콘 버튼과 동일한 `var(--surface-hover)`로 통일.
    - `.explorer-header`에 `justify-content: flex-end` 추가.
    - `.explorer`에 `scrollbar-width: thin`과 `::-webkit-scrollbar`류 규칙(폭 8px, 트랙 투명, thumb는 `var(--border)`/hover 시 `var(--muted-text)`) 추가.
    - `.tab-button`의 고정 `min-width: 9rem` 제거, `max-width: 12rem`으로 대체 — 기본은 파일명 길이에 맞게 축소되고, 12rem을 넘으면 기존 `text-overflow: ellipsis`로 말줄임.
  - `src/renderer/src/App.tsx`: `explorerWidth` 초기값을 `useState(272)` → `useState(192)`로 변경 — 리사이즈 로직의 `minimumWidth`(192) 상수와 동일한 값으로 맞춤(로직 자체는 미변경). `formatCreatedDate`를 `toLocaleDateString`(로케일 의존, 예: "2026. 08. 13.") 대신 `getFullYear`/`getMonth`/`getDate`로 직접 조합한 `YY-MM-DD` 문자열(예: "26-08-13")로 변경.
- 반대 벤더 적대적 검증

  | 회차 | 검토자 | 결과 요약 |
  |---|---|---|
  | 1 | Codex CLI (`gpt-5.6-sol`, `--sandbox read-only`) | Critical 0건, Major 0건, Minor 0건. 지적 사항 없이 클린 패스. 날짜 포맷의 로컬 타임존 일관성, 2자리 연도 변환의 경계값(2005→05, 2099→99), Explorer 기본 너비와 리사이즈 최소값 일치, 탭 제목이 빈 문자열이어도 붕괴하지 않음을 모두 확인. |

  | 심각도 | 건수 | 처리 상태 | 근거 |
  |---|---|---|---|
  | Critical | 0 | 해당 없음 | - |
  | Major | 0 | 해당 없음 | - |
  | Minor | 0 | 해당 없음 | - |

- Critical 수정 및 재검증: 해당 없음 (지적 없음)
- 사용자 확인/피드백: 사용자가 "제대로 구현되었습니다"로 확인함.
- 상태: 확정

---

## I009. 날짜·경로 표시·루트 이동·창 제목·Copy 아이콘·전체 탭 갱신 7건

- 요청 일시 / 요청자: 2026-08-16 / nampluskr
- 요청 내용:
  1. 상태바 날짜 형식 YYYY-MM-DD로 변경 (I008의 YY-MM-DD에서 4자리 연도로 재변경)
  2. 탐색기 영역 루트 폴더 아래 폴더 경로를 상대경로로 표시 (I006에서 제거했던 경로 표시를 상대경로로 재도입)
  3. 탐색기 영역 루트 폴더명 앞에 아이콘 추가 — 하위 폴더 이동 중에도 루트로 바로 이동
  4. 메인창 제목 옆에 버전+날짜 표시: "Markdown Browser v0.2 (2026-08-16)" → 사용자가 "오늘 날짜가 아니라 해당 버전의 배포일/설치파일 날짜"로 정정, `git log`에서 v0.2 마지막 Phase(phase-08) 커밋일 2026-08-15로 확정
  5. 마크다운 코드 블록의 [Copy] 텍스트 버튼을 아이콘으로 변경
  6. Reload 시 탐색기뿐 아니라 열려 있는 모든 탭의 문서 내용도 갱신 (기존은 활성 탭만 갱신 — `SPEC.md` 226-228행에 명시된 v0.2 확정 동작에서 벗어나는 사용자 요청 반영)
  7. 탭 영역 파일 제목 길이를 파일명에 맞추고 초과 시 ...(이미 I008에서 구현 완료 — 재확인만 진행, 추가 변경 없음)
- 변경 내용 (구현자: Claude Code):
  - `src/renderer/src/App.tsx`:
    - `formatCreatedDate`에서 2자리로 자르던 `.slice(-2)` 제거, 4자리 연도(`YYYY-MM-DD`) 그대로 사용.
    - `relativeDirectoryPath(rootPath, currentDirectoryPath, platform)` 헬퍼 추가 — `rootPath` 기준 상대경로 계산. `.current-directory` 표시를 Root 폴더를 보고 있지 않을 때만(하위 폴더 진입 시) 렌더링하도록 재도입.
    - `RootHomeIcon` 신규 추가, `.root-name`을 flex 구조로 변경해 루트 아이콘 버튼(`root-home-button`, 클릭 시 `navigateToDirectory(rootPath)`, 루트에 있을 때 비활성화)과 `root-name-text`(파일명 span)로 분리.
    - `reloadCurrentState`: 활성 탭만 다시 읽던 로직을 열린 파일 탭 전체(`tabsRef.current.filter(tab => tab.filePath !== null)`)를 `Promise.all`로 병렬 재조회하도록 변경.
  - `src/renderer/index.html`: `<title>Markdown Browser</title>` → `<title>Markdown Browser v0.2 (2026-08-15)</title>`.
  - `src/renderer/src/CodePanel.tsx`: `CopyIcon` 신규 추가, Copy 버튼 텍스트를 아이콘으로 교체(`aria-label`/`title` 유지).
- 실제 실행 검증: 매크로/마우스 좌표 클릭 대신 `F5`/`Ctrl+Shift+Tab` 등 키보드 단축키로 정밀하게 재현 — README.md를 활성 탭으로 두고 별도 탭(`_reload_test_a.md`)을 백그라운드에 둔 채 파일을 외부에서 수정 후 `F5` 실행 → 비활성 탭으로 전환해 내용이 실제로 갱신됨을 확인(항목 6). 하위 폴더 진입 시 상대경로 표시, 루트 아이콘 클릭 시 즉시 루트로 복귀함을 스크린샷으로 확인(항목 2·3).
- 반대 벤더 적대적 검증

  | 회차 | 검토자 | 결과 요약 |
  |---|---|---|
  | 1 | Codex CLI (`gpt-5.6-sol`, `--sandbox read-only`) | Critical 0건, Major 1건, Minor 1건. 날짜 형식·재검증 순서(`reloadVersion`)·탭 닫힘 경쟁 상태·기존 테스트 파일과의 충돌 없음을 확인. |

  | 심각도 | 건수 | 처리 상태 | 근거 |
  |---|---|---|---|
  | Critical | 0 | 해당 없음 | - |
  | Major | 1 | 수정 | `relativeDirectoryPath`가 `currentDirectoryPath`가 실제로 `rootPath` 하위인지 검증하지 않고 문자열 길이만큼 무조건 자르는 문제 — `rootPath="D:\foo"`, `currentDirectoryPath="D:\foobar\child"`이면 "bar\child"처럼 엉뚱하게 표시될 수 있음 → Windows 대소문자 무시 prefix 비교와 separator 경계 검증을 추가해, root 하위가 아니면 빈 문자열을 반환하도록 수정. |
  | Minor | 1 | 수정 | 여러 탭을 한 `Promise.all`로 묶어 재조회하면 IPC 호출 하나만 reject해도 전체가 reject되어 모든 탭 갱신이 실패할 수 있는 문제 → 각 `readFile` 호출을 개별 `try/catch`로 감싸 한 파일의 예외가 다른 파일의 갱신을 막지 않도록 수정. |

- Critical 수정 및 재검증: 해당 없음 (Critical 지적 없음). Major/Minor 수정 후 CLAUDE.md 규정상 재검증 의무가 없어 반대 벤더 재실행은 생략, typecheck·테스트 통과와 재빌드 후 스크린샷으로 직접 확인함.
- 사용자 확인/피드백: 사용자가 "제대로 구현되었습니다"로 확인함.
- 상태: 확정

---

## I010. 탭 여백·문서 제목·Tab 포커스 범위·스크롤바·Copy 버튼·탐색기 md 필터 6건

- 요청 일시 / 요청자: 2026-08-16 / nampluskr
- 요청 내용:
  1. 탭영역 파일제목의 앞/뒤 여백 제거해서 최대한 compact 하게
  2. 문서영역의 파일명 제거 - 바로 H1 수준부터 보이게
  3. Tab 으로 탐색기 영역과 뷰어 영역만 이동하게 조정
  4. 탐색기 영역 / 뷰어영역의 스크롤바 스타일 통일 (좁게) - 다크 모드시 스크롤바 색 어둡게 조정
  5. 뷰어 영역의 코드블럭시 복사 아이콘 배경/테두리 제거 - 코드블럭 테두리 통일
  6. 탐색기 영역의 open | reload 아이콘은 우측 정렬, 추가로 좌측 맨 앞에 [v].md 체크박스 추가 - 기본은 선택으로 탐색기 영역에 md 파일로 보이게 하고, 체크박스 해제하면, 나머지 파일도 같이 보이게 함
- 변경 내용 (구현자: Claude Code):
  - `src/renderer/src/styles.css`:
    - `.tab-button`의 좌우 `padding`을 `0 1rem` → `0 .5rem`으로 축소.
    - `.document-content > h1` 규칙 삭제(대상 요소 자체를 제거했으므로).
    - `.explorer`와 `.document-content`가 `--scrollbar-thumb`/`--scrollbar-thumb-hover` CSS 변수를 공유하는 동일한 `scrollbar-width: thin` + `::-webkit-scrollbar` 규칙을 쓰도록 통합. Light 테마는 기존과 동일한 `var(--border)`/`#afb8c1`, Dark 테마는 기존 `var(--muted-text)`(밝은 회색) 대신 더 어두운 `#30363d`/`#484f58`를 `.app-shell[data-theme="dark"]`에 정의.
    - `.copy-button`의 `border`/`background`를 제거해 다른 아이콘 전용 버튼과 동일하게 투명 배경으로 변경, hover만 `var(--surface-hover)`.
    - `.code-panel pre`에 `border: 1px solid var(--border); border-top: 0;` 추가해 코드블록 툴바(위쪽 테두리)와 코드 영역(아래쪽 라운드)이 하나의 연속된 테두리를 이루도록 함.
    - `.explorer-header`를 `justify-content: flex-end` → `space-between`으로 변경하고 `.explorer-header-actions`(Open/Reload를 담는 우측 그룹), `.explorer-filter`(체크박스+".md" 라벨, 좌측) 규칙 추가.
  - `src/renderer/src/App.tsx`:
    - `.document-content` 상단의 `<h1>{activeTab?.title}</h1>` 요소를 제거. 문서 영역은 이제 Markdown/코드/텍스트 내용 자체에서 바로 시작됨(빈 파일·에러·empty 탭 상태 메시지는 기존 그대로 유지).
    - `markdownOnly` 상태(기본 `true`) 추가. `directory.entries`에서 `directory`/`markdown` 타입만 남긴 `visibleEntries` 파생값을 계산해 `activateExplorerEntry`, `handleExplorerKeyDown`의 `maximumIndex`, `explorerEntryRefs` 인덱싱, 탐색기 파일 목록 `.map` 전체가 `directory.entries` 대신 `visibleEntries`를 쓰도록 변경. 탐색기 헤더 좌측에 `.explorer-filter` 체크박스(`aria-label="Show Markdown files only"`)를 추가하고, 토글 시 `selectedEntryIndex`를 0으로 재설정. Open/Reload 버튼은 `.explorer-header-actions`로 묶어 우측에 배치.
    - Tab 키 포커스 범위 축소: 탭바의 탐색기 토글/탭 제목/탭 닫기/테마/새 탭("+") 버튼과, 탐색기 내부의 루트 이동·상위 폴더(`..`)·파일·폴더 항목 버튼, 리사이저(`.explorer-resizer`)에 `tabIndex={-1}`을 지정해 일반 `Tab` 순서에서 제외(마우스 클릭, 그리고 파일·폴더 항목은 탐색기 컨테이너에 포커스가 있을 때 기존 방향키(`ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight`/`Enter`)로 계속 접근 가능). 탐색기 `<aside>`와 문서 영역 `.document-content`에 `tabIndex={0}`을 추가해 `Tab`/`Shift+Tab`이 두 영역 사이를 이동하도록 함. `handleExplorerKeyDown`의 가드 조건을 `event.target.closest('.explorer-tree')` 단독에서 `event.target.classList.contains('explorer') || event.target.closest('.explorer-tree')`로 넓혀, `<aside>` 자체가 `Tab`으로 포커스된 직후에도 방향키 탐색이 바로 동작하도록 함.
- 반대 벤더 적대적 검증

  | 회차 | 검토자 | 결과 요약 |
  |---|---|---|
  | 1 | Codex CLI (`gpt-5.6-sol`, `--sandbox read-only`) | Critical 0건, Minor 0건, Major 1건. `npm run typecheck` 통과 확인(테스트는 읽기 전용 샌드박스에서 Vitest의 임시 디렉터리 생성 권한 문제로 실행 불가했으나 별도로 에이전트가 직접 `npm run test`/`npm run build`를 실행해 통과 확인함). |

  | 심각도 | 건수 | 처리 상태 | 근거 |
  |---|---|---|---|
  | Critical | 0 | 해당 없음 | - |
  | Major | 1 | 수정 | 탭바·탐색기의 거의 모든 조작 버튼에 `tabIndex={-1}`을 지정하면서 이를 대체할 키보드 경로가 전혀 없어, 마우스 없이 `Tab`/`Shift+Tab`/방향키/Enter만으로는 Open Folder 버튼에 영영 도달할 수 없고(=폴더를 열 수조차 없음), Reload·`.md` 필터도 마찬가지로 도달 불가능하다는 지적(재현: 폴더 미선택 상태로 실행 후 마우스 없이 Tab만으로 탐색 시 Open Folder에 포커스가 가지 않음) → 탐색기 헤더의 체크박스, Open, Reload 세 요소에서만 `tabIndex={-1}`을 제거해 기본 Tab 순서로 복귀시킴(탭바의 탐색기 토글·탭 제목·탭 닫기·테마·새 탭 버튼과 탐색기의 항목·루트·상위 폴더·리사이저는 사용자가 명시적으로 요청한 대로 마우스/방향키 전용으로 유지). |
  | Minor | 0 | 해당 없음 | - |

- Critical 수정 및 재검증: 해당 없음 (Critical 지적 없음). Major 수정 후 CLAUDE.md 규정상 동일 벤더 재검증을 1회 재실행(2회차, 재실행 포함 총 2회로 최대 3회 제한 내). 재검증 결과: "Re-verification passed. The previous Major finding is resolved." — `.md` 체크박스와 Open Folder/Reload 버튼이 기본 Tab 순서로 정상 도달 가능함을 라인별로 확인, `handleExplorerKeyDown`이 `Tab` 키 자체를 가로채지 않음을 확인, 새로 도입된 회귀 없음을 확인. Critical/Major/Minor 잔여 지적 없음.
- 남은 위험: 사용자의 명시적 요청대로 탭바의 탐색기 토글·테마·탭 닫기·새 탭 버튼과 탐색기의 루트/상위 폴더 이동·리사이저는 여전히 `Tab` 순서 밖에 있고 대응하는 키보드 단축키도 없어, 마우스 없이는 테마 전환·탭 닫기·탐색기 숨기기·리사이저 조작이 불가능하다(파일 목록 항목은 탐색기 컨테이너에 포커스된 뒤 방향키로 접근 가능하므로 제외). Codex는 이 부분도 원래 함께 지적했으나, Open Folder/Reload/필터만 도달 불가하면 앱 자체를 쓸 수 없는 차단 성격이라 판단해 그 세 곳만 최소 수정했고 나머지는 "Tab은 탐색기·뷰어 영역만 이동"이라는 사용자 요청을 그대로 유지함. 사용자가 이 트레이드오프에 동의하지 않으면 별도 항목으로 조정 가능.
- 사용자 확인/피드백: 사용자가 "탭 제목 영역과 닫기 버튼의 앞/뒤 여백을 더 줄일 수 있는지" 추가 요청.
- 상태: 확정 (아래 후속 반영으로 대체)

### 추가 반영 (같은 I010 항목 내 후속 요청)

- 요청 내용: 탭영역 파일명 제목 영역의 앞/뒤 여백을 더 줄이고, 탭 닫기 "×" 버튼의 앞/뒤 여백도 더 줄여달라는 요청.
- 변경 내용 (구현자: Claude Code): `src/renderer/src/styles.css`에서 `.tab-button`의 `padding`을 `0 .5rem`(8px) → `0 .35rem`(5.6px)으로, `.tab-close-button`의 `padding`을 `0 .75rem`(12px) → `0 .35rem`(5.6px)으로 축소. `.tab-close-button`은 자체 `min-height`가 없어 부모 `.tab`(`align-items` 기본값 `stretch`)을 통해 `.tab-button`의 `min-height: 1.75rem`(28px)에 맞춰 늘어나므로, 좌우 여백만 줄여도 클릭 대상 높이(28px, WCAG 2.2 24px 기준 이상)는 그대로 유지됨.
- 검증: `npm run typecheck`, `npm run test`(13개 통과), `npm run build` 모두 통과.
- 반대 벤더 적대적 검증: 단순 padding 수치 조정(레이아웃·로직 변경 없음)이라 CLAUDE.md 규정상 별도 실행 의무는 없다고 판단해 생략함. I010 항목의 반대 벤더 적대적 검증 실행 횟수는 위 2회(1차 지적 + 2차 재검증)로 재실행 포함 최대 3회 제한 내에서 종료됨.
- 사용자 확인/피드백: 사용자가 "승인"으로 확인함.
- 상태: 확정

---

## I011. .md 필터 아이콘화, 탐색기 행 간격 축소, 코드블록 한글 monospace 반영

- 요청 일시 / 요청자: 2026-08-16 / nampluskr
- 요청 내용:
  1. `.md` 선택 체크박스를 다른 아이콘과 같은 스타일로, 테마 전환처럼 아이콘 토글 방식으로 변경
  2. 탐색기 파일 목록의 폴더/파일 항목 상하 간격을 더 좁게
  3. 뷰어 영역 코드블록 내 한글에 굴림체가 적용되던 것을 같은 monospace로 반영
  - 사용자가 이번 항목은 반대 벤더(Codex CLI) 적대적 검증 없이 반영해달라고 명시적으로 요청함.
- 원인 확인 (구현자: Claude Code, 항목 3): `.markdown-content code`/`.code-panel code`의 `font-family`가 `"Cascadia Code", Consolas, monospace`였는데, 이 셋 모두 한글(Hangul) 글리프를 지원하지 않아 브라우저가 폰트 스택을 벗어나 Windows 기본 대체 글꼴(굴림)로 렌더링했음. 코드 안의 한글이 monospace 계열이 아닌 별도 서체로 보이던 원인.
- 변경 내용 (구현자: Claude Code):
  - `src/renderer/src/App.tsx`: `MarkdownFilterIcon({ active })` 컴포넌트 신규 추가 — `EntryIcon`의 마크다운 파일 아이콘(파일 윤곽선 + "M")과 동일한 형태를 켜짐 상태로, 꺼짐 상태는 `EntryIcon`의 텍스트 파일 아이콘(가로줄 3개)으로 표시. 탐색기 헤더의 `<label><input type="checkbox">...</label>`를 다른 헤더 버튼과 동일한 `explorer-header-button toolbar-icon-button` 클래스의 `<button aria-pressed={markdownOnly}>`로 교체(테마 토글 버튼과 동일한 `aria-pressed` 기반 토글 패턴). 클릭 시 동작(`markdownOnly` 토글, `selectedEntryIndex` 초기화)은 기존과 동일하게 유지. 버튼은 Open/Reload와 마찬가지로 기본 Tab 순서에 남겨 I010에서 확정한 키보드 접근성을 유지함(`tabIndex` 미지정).
  - `src/renderer/src/styles.css`:
    - `.explorer-filter`, `.explorer-filter input` 규칙 삭제(체크박스 제거로 더 이상 사용하지 않음). `.explorer-header-button[aria-pressed="true"]`에 `color: var(--text)` 추가해 켜짐 상태를 다른 아이콘 토글(테마 버튼)과 동일하게 강조.
    - `.explorer-file, .explorer-directory, .explorer-parent`의 `padding`을 `.25rem`(상하 4px) → `.1rem .25rem`(상하 1.6px, 좌우는 4px 유지)으로 축소해 행 높이를 좁힘.
    - `.markdown-content code`, `.code-panel code`의 `font-family`에 `"D2Coding"`(설치돼 있으면 사용)과 `"Malgun Gothic"`(Windows 기본 한글 글꼴, 이미 `:root`의 UI 폰트 스택에서 쓰이고 있어 항상 존재)을 `Consolas`와 `monospace` 사이에 추가. 한글은 `Malgun Gothic`으로, 영문·기호는 계속 `Cascadia Code`/`Consolas`로 렌더링됨(브라우저가 문자 단위로 스택을 순회하며 지원하는 첫 폰트를 선택하므로 혼용 텍스트에서도 영향 없음).
- 검증: `npm run typecheck`, `npm run test`(13개 통과), `npm run build` 모두 통과.
- 반대 벤더 적대적 검증: 사용자 명시적 요청에 따라 생략함(CLAUDE.md 4단계 "Critical 지적은 모두 수정" 절차는 검증을 실행한 경우에 적용되며, 이번 항목은 검증 자체를 생략하기로 사용자가 결정함). 남은 위험은 사용자가 직접 빌드로 확인.
- 남은 위험: 탐색기 행 상하 padding을 `.1rem`(1.6px)까지 줄여 행 높이가 약 20px 아래로 좁아졌다. I003 후속 반영에서 한 차례 다뤘던 WCAG 2.2 24×24px 클릭 대상 권장 기준보다 작아지는 트레이드오프가 있으며, 사용자가 "좀더 좁게"라는 명시적 요청과 함께 이번 항목의 검증 생략을 요청해 그대로 반영함. 실제 사용 중 클릭이 어렵다고 느껴지면 별도 항목으로 조정 가능.
- 사용자 확인/피드백: 사용자가 "승인"으로 확인함.
- 상태: 확정

---

## I012. Tab 포커스 재제한, 탐색기 키보드 조작(방향키/Enter/Backspace), 3단계 테마, Zoom 아이콘 2건

- 요청 일시 / 요청자: 2026-08-16 / nampluskr
- 요청 내용:
  1. Tab으로 탐색기 영역과 뷰어 영역만 이동하도록 다시 강하게 제한
  2. 탐색기 영역 키보드 조작: 상하 화살표로 선택 이동, Enter로 폴더 진입/파일 열기, Backspace로 상위 폴더 이동
  3. 테마를 화이트/다크 2단계에서 화이트/그레이(Dimmed)/다크 3단계로 확장
  4. 탭바의 테마 버튼 앞에 Zoom Out/Zoom In 아이콘 버튼 2개 추가
- 구현 전 확인 사항: 1번을 I010 수준(탐색기·뷰어 2곳만)으로 되돌리면 Open Folder 버튼이 Tab에서 완전히 빠져, I010 1차 Codex 검증에서 지적됐던 "마우스 없이는 폴더 자체를 열 수 없는" 문제가 재발함. 사용자에게 대응 방식을 확인한 결과 "Ctrl+O 단축키 추가" 방식으로 확정(Reload는 기존 F5/Ctrl+R로 이미 충분, `.md` 필터는 단축키 없이 마우스 전용으로 남기기로 함).
- 변경 내용 (구현자: Claude Code):
  - `src/renderer/src/App.tsx`:
    - 전역 키보드 핸들러(`handleKeyDown`)에 `Ctrl+O` 추가 — Open Folder 버튼과 동일한 `selectRootFolder()`를 호출.
    - 탐색기 헤더의 `.md` 필터/Open Folder/Reload 버튼 세 곳에 `tabIndex={-1}`을 다시 지정해, 앱 전체에서 `Tab`이 멈추는 지점을 탐색기 `<aside>`와 `.document-content` 두 곳으로만 유지. Open/Reload 버튼의 `aria-label`/`title`에 `(Ctrl+O)`/`(F5)` 단축키 안내를 추가.
    - `handleExplorerKeyDown`의 상위 폴더 이동 조건을 `event.key === 'ArrowLeft'` 단독에서 `event.key === 'ArrowLeft' || event.key === 'Backspace'`로 확장 — 기존 ArrowUp/ArrowDown(선택 이동)·ArrowRight/Enter(진입·열기) 로직은 변경 없이 그대로 유지.
    - `theme` 상태 타입을 `'light' | 'dark'` → `'light' | 'dim' | 'dark'`로 확장하고, `light → dim → dark → light` 순서로 순환하는 `nextTheme()` 헬퍼 추가. 테마 버튼 클릭이 `setTheme(nextTheme)`(업데이트 함수를 그대로 전달)로 순환하도록 변경. `ThemeIcon`에 `dim` 전용 렌더링 분기(반원 채움 원) 추가.
    - `ZoomOutIcon`/`ZoomInIcon` 신규 SVG 아이콘 컴포넌트 추가(새 의존성 없음). 탭바의 테마 버튼 앞에 두 아이콘 버튼을 추가, 기존 `adjustContentFontScale(-10)`/`adjustContentFontScale(10)`(Ctrl+-/Ctrl++ 단축키와 동일 함수)를 호출. 두 버튼 모두 기존 단축키가 있으므로 `tabIndex={-1}`.
  - `src/renderer/src/styles.css`: `.app-shell[data-theme="dark"]` 블록과 동일한 구조로 `.app-shell[data-theme="dim"]` 블록 신규 추가(중간 톤 회색 팔레트: 배경 `#24292e`, 표면 `#2f363d`, 텍스트 `#d1d5da` 등). 기존 라이트/다크 팔레트는 변경하지 않음.
- 검증: `npm run typecheck`, `npm run test`(13개 통과), `npm run build` 모두 통과.
- 반대 벤더 적대적 검증

  | 회차 | 검토자 | 결과 요약 |
  |---|---|---|
  | 1 | Codex CLI (`gpt-5.6-sol`, `--sandbox read-only`) | Critical 0건, Minor 0건, Major 2건. `npm run typecheck` 통과 확인. |

  | 심각도 | 건수 | 처리 상태 | 근거 |
  |---|---|---|---|
  | Critical | 0 | 해당 없음 | - |
  | Major | 1 | 반박(수정 없음) | "`.document-content`의 `calc(1rem * var(--content-font-scale) / 100)`가 Chromium 140에서 도입된 CSS 타입 연산이라 이 프로젝트의 Electron 35.7.5(Chromium 134)에서는 무효화되어 Zoom 버튼·단축키가 동작하지 않는다"는 지적 → 반박: 해당 `calc()` 선언은 이번 변경과 무관하게 `phase-06`(커밋 `cc64451`, 이번 세션 훨씬 이전)부터 존재해 왔고, 이후 I001~I011 전 기간 동안 Ctrl+/Ctrl-·Ctrl+휠 확대축소 기능에 대한 어떠한 오류 보고도 없었다. `calc()`에서 커스텀 프로퍼티를 곱셈·나눗셈하는 문법은 CSS Custom Properties/Values and Units Level 3 표준 문법으로 Chromium에서 수년간 지원돼 왔으며, "Chromium 140 타입 연산" 같은 특정 버전 게이팅 기능이 아니다. 반대 벤더가 제시한 근거(Electron 릴리스 페이지, Chromium 140 릴리스 노트 일반 링크)도 이 구체적 주장을 직접 뒷받침하지 않아 모델의 환각으로 판단, 코드 수정 없이 반박으로 처리함. |
  | Major | 1 | 처리 상태: 수용(사용자 사전 확정 트레이드오프) | "`.md` 필터·Open Folder·Reload가 모두 `tabIndex={-1}`이며, Open Folder(Ctrl+O)·Reload(F5)에는 단축키가 있지만 `.md` 필터에는 없어 키보드만으로는 켤 수 없다"는 지적 → 이는 본 항목 구현 전 사용자에게 명시적으로 확인한 선택("Ctrl+O 단축키 추가" 옵션 채택 시 `.md` 필터는 마우스 전용으로 남는다는 조건 포함)과 정확히 일치하는 이미 승인된 트레이드오프이므로 추가 수정 없이 그대로 유지. |
  | Minor | 0 | 해당 없음 | - |

- Critical 수정 및 재검증: 해당 없음 (Critical 지적 없음, 두 Major 모두 반박 또는 사전 승인된 트레이드오프로 코드 수정 불필요). I012 항목의 반대 벤더 적대적 검증 실행은 1회로 종료(재실행 없이 최대 3회 제한 내).
- 남은 위험: `.md` 필터를 키보드만으로 켤 수 없다는 점은 사용자가 이미 인지하고 승인한 트레이드오프. Zoom `calc()` 관련 지적은 반박했으나, 만약 실제 패키지 빌드에서 확대/축소가 동작하지 않는 것이 확인되면 별도 항목으로 재조사 필요.
- 사용자 확인/피드백: 사용자가 재확인 중 두 가지 문제를 새로 보고함 — (1) 하위 폴더로 4단계까지만 이동됨, (2) 뷰어 영역에서 Tab을 누르면 코드블록 Copy 아이콘들을 순회함(탐색기·뷰어 2곳만 이동해야 함).
- 상태: 재작업 필요 (아래 I013으로 처리)

---

## I013. 코드블록 Copy·마크다운 링크 Tab 누락 수정, 탐색기 포커스 유실로 인한 키보드 탐색 중단 수정

- 요청 일시 / 요청자: 2026-08-16 / nampluskr
- 요청 내용:
  1. 하위 폴더로 4단계까지 밖에 이동되지 않는 문제
  2. 뷰어 영역에서 Tab을 누르면 문서 내 코드블록의 Copy 아이콘들을 순회함 — Tab은 탐색기·뷰어 두 영역만 오가야 함
- 원인 분석 (구현자: Claude Code):
  - 2번: I010에서 "Tab은 탐색기·뷰어 두 영역만" 규칙을 적용할 때 `App.tsx`의 요소들만 훑었고, `CodePanel.tsx`의 Copy 버튼과 `App.tsx`의 Markdown 링크(`a: ({ href, children }) => <a href={href} onClick={...}>`) 렌더러에는 `tabIndex`를 지정하지 않아 기본값(0)으로 남아 있었다. 문서 안의 코드블록·링크 개수만큼 Tab 정지 지점이 추가로 생기던 원인.
  - 1번: 하위 폴더 이동 후 포커스를 복원하는 로직(`loadDirectory`의 `restoreExplorerFocus.current` 처리)이 `explorerEntryRefs.current.get(0)?.focus()`만 호출했는데, `explorerEntryRefs`는 `visibleEntries`(기본 `.md` 필터 적용 시 폴더+마크다운 파일만) 기준으로만 채워진다. 새로 이동한 폴더에 폴더도 마크다운 파일도 하나도 없으면(예: 코드 파일만 있는 폴더) 포커스를 옮길 대상이 없어 `.focus()`가 아예 호출되지 않고, 방금 언마운트된 이전 폴더의 포커스 엘리먼트는 사라지면서 포커스가 `document.body`로 떨어진다. 이후 `handleExplorerKeyDown`의 가드 조건(포커스가 `<aside>` 자신이거나 `.explorer-tree` 내부여야 함)을 만족하지 못해 화살표·Enter·Backspace가 전부 반응하지 않게 된다. 실제 폴더 구조상 4단계 근처에서 이 조건에 해당하는 폴더를 만났을 가능성이 높다.
- 변경 내용 (구현자: Claude Code):
  - `src/renderer/src/CodePanel.tsx`: Copy 버튼에 `tabIndex={-1}` 추가.
  - `src/renderer/src/App.tsx`: Markdown 링크 `<a>` 렌더러에 `tabIndex={-1}` 추가(클릭 시 내부 `.md` 링크는 `openMarkdownLink`로, 외부 링크는 `openExternalLink`로 여는 기존 로직은 변경 없음).
  - `src/renderer/src/App.tsx`: `parentButtonRef`(".." 상위 폴더 버튼)와 `explorerRef`(탐색기 `<aside>` 자신) 참조를 추가하고, 포커스 복원 로직을 `explorerEntryRefs.current.get(0)` → (비활성화 상태가 아닌) `parentButtonRef.current` → `explorerRef.current` 순서로 대체 지점을 찾도록 확장. 새 폴더에 표시할 항목이 전혀 없어도 최소한 `<aside>` 컨테이너까지는 포커스가 항상 남아, 이후 키보드 입력이 계속 반응하도록 함.
- 검증: `npm run typecheck`, `npm run test`(13개 통과), `npm run build` 모두 통과.
- 반대 벤더 적대적 검증

  | 회차 | 검토자 | 결과 요약 |
  |---|---|---|
  | 1 | Codex CLI (`gpt-5.6-sol`, `--sandbox read-only`) | Critical 0건, Major 2건, Minor 1건. `npm run typecheck` 통과 확인(테스트는 읽기 전용 샌드박스 권한 문제로 미실행, 별도로 에이전트가 직접 실행해 통과 확인). |

  | 심각도 | 건수 | 처리 상태 | 근거 |
  |---|---|---|---|
  | Critical | 0 | 해당 없음 | - |
  | Major | 1 | 수용(사용자 사전 확정 요청) | "Copy 버튼·Markdown 링크가 `tabIndex={-1}`이 되어 키보드만으로는 활성화할 수 없다"는 지적 → 이번 항목 자체가 사용자의 명시적 요청("Tab으로는 오로지 탐색기영역과 뷰어영역만 왔다갔다 해야 함")을 구현한 것이라 의도된 동작. 코드 수정 없이 유지. |
  | Major | 1 | 범위 밖(별도 항목 필요) | "`.document-content`의 `onWheel` 핸들러가 React의 passive wheel 리스너에서 `event.preventDefault()`를 호출해, Ctrl+휠 확대·축소 시 Chromium 기본 페이지 확대와 충돌할 수 있다"는 지적 → 이 코드는 이번 세션 이전(phase-06)부터 있던 기존 로직이며 이번 I013에서 요청받은 두 문제(4단계 이동 제한, Copy 아이콘 Tab 순회)와 무관해 이번 항목 범위 밖으로 판단, 수정하지 않음. 실제 문제가 확인되면 별도 항목으로 처리 필요.|
  | Minor | 1 | 수정 | "포커스 복원이 `explorerEntryRefs.get(0)` 실패 시 상위 폴더 버튼으로 대체하지만, 그 버튼이 Root 폴더에서는 `disabled` 상태라 포커스를 받을 수 없어 같은 문제가 재발할 수 있다"는 지적(예: 하위 폴더에서 Root 목록이 비거나 오류가 나서 Backspace로 Root로 돌아온 경우) → `parentButtonRef.current.disabled` 여부를 확인해 비활성 상태면 건너뛰고 `explorerRef.current`(탐색기 컨테이너 자신)로 한 단계 더 대체하도록 수정. |

- Critical 수정 및 재검증: 해당 없음 (Critical 지적 없음). Minor 수정 후 CLAUDE.md 규정상 재검증 의무는 없어 반대 벤더 재실행은 생략, typecheck·테스트·빌드로 직접 확인함. I013 항목의 반대 벤더 적대적 검증 실행은 1회로 종료(재실행 없이 최대 3회 제한 내).
- 남은 위험: (1) 발견된 Ctrl+휠 페이지 확대 충돌 가능성은 phase-06부터 있던 기존 로직이라 이번 항목에서는 수정하지 않음 — 실제로 재현되면 별도 항목 필요. (2) 4단계 제한의 근본 원인으로 지목한 "빈 visibleEntries" 시나리오는 코드 추적으로 도출한 가장 유력한 원인이며 포커스 유실을 막는 방어 코드로 수정했으나, 사용자 환경에서 정확히 이 시나리오였는지는 재확인 필요.
- 사용자 확인/피드백: 사용자가 재확인 후 4가지 추가 요청 — (1) Tab 전환 시 표시되는 포커스 테두리를 없애고 탐색기의 선택 표시로 대체, (2) 탐색기 선택 항목의 파란 테두리 제거, (3) 4단계 키보드 탐색이 여전히 안 됨(재현 경로 제공), (4) 탐색기에 Home/End 키 추가.
- 상태: 재작업 필요 (아래 I014로 처리)

---

## I014. 4단계 키보드 탐색 재수정(로딩 중 키 입력 가드), Home/End 추가, 포커스 아웃라인을 선택 표시로 대체

- 요청 일시 / 요청자: 2026-08-16 / nampluskr
- 요청 내용:
  1. Tab으로 탐색기·뷰어 전환 시 표시되는 포커스 테두리 제거, 탐색기의 "현재 선택" 표시로 대체
  2. 탐색기 선택 항목의 파란 테두리(outline) 제거
  3. `docs/releases/v0.2/improvements`(Root 기준 4단계) 등 깊은 폴더에서 키보드 탐색이 여전히 안 됨
  4. 탐색기에서 Home(맨 처음)/End(맨 끝) 키 추가
- 원인 재분석 (구현자: Claude Code, 3번): 사용자가 제시한 예시 경로(`docs → releases → v0.2 → improvements`)를 직접 확인한 결과 각 단계 폴더 모두 항목이 있어(I013에서 고친 "빈 폴더" 시나리오가 아님), I013의 수정만으로는 이 경로가 여전히 재현됨을 확인. 대신 유력한 원인으로, 이전 `loadDirectory()` IPC 호출이 끝나기 전에 다음 Enter/ArrowLeft/Backspace가 눌리면 `navigateToDirectory`가 아직 갱신되지 않은 `entry.path`/`currentDirectoryPath` 조합으로 실행되어 탐색 단계가 꼬이거나 건너뛸 수 있는 레이스 컨디션으로 판단(빠른 연속 키 입력일수록, 즉 더 깊이 들어갈수록 재현 확률이 높아짐).
- 변경 내용 (구현자: Claude Code):
  - `src/renderer/src/App.tsx`:
    - `handleExplorerKeyDown`에 `if (directory.loading) return` 가드를 추가해, 디렉터리 로딩 중에는 ArrowLeft/Backspace(상위 이동)·ArrowRight/Enter(진입·열기)를 무시하도록 함(ArrowUp/ArrowDown·Home/End 선택 이동은 로딩 중에도 계속 동작). `activateExplorerEntry`에도 동일 가드를 추가해 로딩 중 마우스 클릭으로 인한 동일 레이스도 함께 차단.
    - `handleExplorerKeyDown`에 Home/End 분기 추가 — 기존 ArrowUp/ArrowDown과 동일한 패턴으로 `selectedEntryIndex`를 각각 0/`maximumIndex`로 설정하고 해당 항목에 포커스.
    - `explorerHasFocus` 상태 추가, 탐색기 `<aside>`의 `onFocus`/`onBlur`(`relatedTarget`이 aside 내부가 아닐 때만 false로 전환)로 갱신. `visibleEntries.length === 0`일 때 `is-empty` 클래스도 함께 부여. `<aside>`의 className이 `explorer`/`is-focused`/`is-empty` 조합으로 구성됨.
  - `src/renderer/src/styles.css`:
    - `.explorer-file:focus-visible`/`.explorer-directory:focus-visible`/`.explorer-parent:focus-visible`/`.explorer:focus-visible`/`.document-content:focus-visible`의 outline을 `none`으로 변경(요청 1·2 반영).
    - `.explorer-file.is-selected`/`.explorer-directory.is-selected`의 기본 강조색을 은은한 `var(--surface-hover)`/`var(--text)`로 낮추고, `.explorer.is-focused .explorer-file.is-selected`/`.explorer.is-focused .explorer-directory.is-selected`에서만 기존의 진한 강조색(`var(--selected-background)`/`var(--selected-text)`)을 적용 — 탐색기가 실제로 키보드 포커스를 가지고 있을 때만 선택 항목이 진하게 보이도록 해, outline 없이도 "지금 탐색기에 포커스가 있는지"를 구분할 수 있게 함.
    - `.explorer.is-empty:focus-visible`, `.explorer.is-empty .explorer-parent:focus-visible`에 한해 outline을 다시 활성화 — 표시할 항목이 전혀 없어 강조할 대상이 없는 경우(빈 하위 폴더의 `..` 버튼, 빈 Root의 `<aside>` 자신)에만 예외적으로 테두리로 포커스 위치를 표시.
- 검증: `npm run typecheck`, `npm run test`(13개 통과), `npm run build` 모두 통과.
- 반대 벤더 적대적 검증 (재실행 포함 총 3회 — 이번 항목의 CLAUDE.md 허용 상한)

  | 회차 | 검토자 | 결과 요약 |
  |---|---|---|
  | 1 | Codex CLI (`gpt-5.6-sol`, `--sandbox read-only`) | Critical 0건, Minor 0건, Major 2건. |
  | 2 | Codex CLI (`gpt-5.6-sol`, `--sandbox read-only`) | 1차 Major #1(".." 버튼 Enter 무반응) 해결 확인. `onFocus`/`onBlur` 판별 로직 정상 확인. Light/Dim/Dark 3개 테마 모두 선택 강조 대비비 WCAG AA(4.5:1) 이상 확인(4.56:1~13.55:1). 잔여 Major 1건(항목이 없는 상태에서는 여전히 포커스 표시가 전혀 없음) 재지적. |
  | 3 | Codex CLI (`gpt-5.6-sol`, `--sandbox read-only`) | `is-empty` 범위 한정 수정 확인. Critical 0 / Major 0 / Minor 0, 잔여 reportable finding 없음. |

  | 심각도 | 건수 | 처리 상태 | 근거 |
  |---|---|---|---|
  | Critical | 0 | 해당 없음 | - |
  | Major | 1 | 수정(1차) | "빈 폴더 진입 후 포커스가 `..` 버튼으로 대체됐을 때 Enter를 눌러도 `activateExplorerEntry(0)`이 항목 없음으로 아무 동작을 하지 않아 상위 폴더로 못 돌아간다"는 지적 → Enter/ArrowRight 분기에서 대상이 `.explorer-parent`이면 `preventDefault()` 없이 즉시 반환해, 버튼의 native Enter-클릭 동작(기존 `onClick`의 상위 이동)이 그대로 실행되도록 수정. 2차 재검증에서 해결 확인. |
  | Major | 1 | 수정(2차) | "탐색기·뷰어 아웃라인을 모두 없애면 항목이 없는 상태(빈 하위 폴더의 `..` 버튼, 빈 Root의 `<aside>` 자신)에서는 포커스 위치를 전혀 알 수 없다"는 지적 → 사용자에게 대응 방식을 확인해 "탐색기에 포커스 있을 때만 선택 항목 색을 달리함" 방식을 우선 적용했으나, 그것만으로는 항목 자체가 없는 경우를 못 덮는다는 재지적을 받아 `is-empty` 클래스로 범위를 한정해 그 경우에만 outline을 복원. 3차 재검증에서 해결 확인. |
  | Minor | 0 | 해당 없음 | - |

- Critical 수정 및 재검증: 해당 없음 (Critical 지적 없음). 두 Major 모두 CLAUDE.md 규정상 요구되는 재검증까지 수행해 해소를 확인했으며, 3회차(최종 허용 회차)에서 Critical/Major/Minor 0건으로 마무리.
- 남은 위험: 3차 검토가 명시한 대로, `:focus-visible` 표시 여부는 Chromium의 입력 모달리티 판정에 최종적으로 의존하므로 실제 UI에서 사용자가 직접 확인하는 것이 가장 확실함. 4단계 키보드 탐색 문제의 근본 원인(로딩 중 레이스 컨디션)은 코드 추적을 통한 가장 유력한 가설로 수정했으며, 사용자가 제시한 정확한 재현 경로로 재확인 필요.
- 사용자 확인/피드백: 사용자가 재확인 후 "4단계 키보드 탐색이 계속 안 된다"고 보고(`docs/releases/v0.2/improvements` 경로에서 키보드 이동·상위/하위 폴더 이동 모두 불가). Codex 검증 없이 Opus 모델로 원인 규명 요청.
- 상태: 재작업 필요 (아래 I015로 처리)

---

## I015. 탐색기 키보드 탐색 불능의 실제 원인 3건 규명 및 수정

- 요청 일시 / 요청자: 2026-08-16 / nampluskr
- 요청 내용: I013·I014에서 두 차례 수정했음에도 `docs/releases/v0.2/improvements` 경로에서 키보드 이동과 상위/하위 폴더 이동이 전혀 되지 않음. 반대 벤더(Codex) 검증 없이 Opus 모델 단독으로 원인을 확인할 것.
- 원인 분석 (구현자: Claude Code / Opus): 코드 정밀 추적 결과, 서로 독립적인 결함 3개가 겹쳐 있었다. I013·I014의 수정이 빗나갔던 이유는 "빈 폴더" 가설(I013)과 "로딩 레이스" 가설(I014)이 모두 실제 원인이 아니었기 때문이다.
  - **결함 A (근본 원인) — 포커스 복원이 React 커밋과 경쟁**: `loadDirectory()`가 새 목록을 그린 뒤 `window.setTimeout(() => explorerEntryRefs.current.get(0)?.focus(), 0)`으로 포커스를 복원했다. 그러나 `setTimeout(0)`(매크로태스크)과 React의 렌더 커밋(Scheduler의 MessageChannel 매크로태스크)은 실행 순서가 보장되지 않는다. 커밋 전에 콜백이 먼저 실행되면 `explorerEntryRefs`에는 **직전 폴더의 (곧 언마운트될) 버튼**이 들어 있어, 이미 DOM에서 분리된 노드에 `.focus()`를 호출하게 되고 이는 아무 효과가 없다. 그 결과 포커스가 `document.body`로 떨어진다. `handleExplorerKeyDown`은 탐색기 `<aside>`에 바인딩된 핸들러이므로, 포커스가 `<aside>` 바깥(body)에 있으면 **keydown 이벤트가 핸들러에 도달조차 하지 않는다.** 이후 모든 키(화살표·Enter·Backspace)가 완전히 무반응이 된다. 폴더 깊이가 깊어질수록(=연속 탐색이 빨라질수록) 이 경쟁에서 지는 빈도가 높아져 "4단계쯤에서 죽는다"는 증상으로 나타난다.
  - **결함 B (증폭 요인) — 대상 가드가 헤더 버튼을 배제**: 핸들러 첫 줄의 가드가 `event.target`이 `.explorer` 자신이거나 `.explorer-tree` 내부일 것을 요구했다. 그런데 `.md` 필터·Open Folder·Reload·루트 이동 버튼은 `tabIndex={-1}`이어도 **마우스 클릭 시에는 DOM 포커스를 획득**한다. 따라서 이 버튼들을 한 번이라도 클릭하면 이후 탐색기 키보드 조작이 전부 차단됐다. 애초에 이 핸들러는 `<aside>`에 붙어 있어 도달하는 이벤트는 이미 탐색기 내부에서 발생한 것이므로, 이 가드는 불필요하면서 해롭기만 했다.
  - **결함 C (I014에서 자초한 위험) — `directory.loading` 가드의 영구 정지 가능성**: I014에서 추가한 `if (directory.loading) return`은, `loadDirectory`/`reloadCurrentState`의 조기 반환 경로(`if (directoryLoadVersion.current !== loadVersion) return` 등)가 `loading: false`를 남기지 않고 빠져나갈 경우 `loading`이 `true`로 고착되면 상위/하위 이동이 영구히 차단된다. 이때 화살표 키는 가드보다 위에 있어 계속 "동작"하지만 눈에 띄는 변화가 없어, 사용자가 보고한 "이동도 안 되고 폴더 진입/복귀도 안 됨" 증상과 정확히 일치한다. 이 가드는 애초에 가설에 근거한 추측성 방어였고, 경쟁 상태는 이미 `directoryLoadVersion` 버전 카운터로 올바르게 처리되고 있었다.
- 변경 내용 (구현자: Claude Code / Opus) — `src/renderer/src/App.tsx`:
  - **A 수정**: `loadDirectory()` 안의 `setTimeout` 기반 포커스 복원을 제거하고, `directory` 상태를 의존성으로 하는 전용 `useEffect`로 옮겼다. `useEffect`는 DOM 커밋과 ref 부착이 모두 끝난 뒤 실행되므로 `explorerEntryRefs`가 항상 새 목록 기준으로 갱신되어 있다. 로딩 중간 렌더에서 조기 복원되지 않도록 `if (directory.loading || !restoreExplorerFocus.current) return` 가드를 두어, 데이터가 실제로 도착한 렌더에서만 복원한다. 대체 순서(`첫 항목 → 비활성 아닌 ".." 버튼 → <aside> 자신`)는 I013·I014에서 정한 그대로 유지.
  - **B 수정**: 핸들러 첫 줄의 `event.target` 가드를 삭제. 이제 탐색기 영역 안 어디에 포커스가 있든(헤더 버튼 포함) 화살표·Home/End·Backspace가 동작한다.
  - **B 후속 처리**: 가드를 없앤 대신 Enter/ArrowRight 분기에서, 대상이 항목 행이 아닌 `<button>`(즉 `..` 및 헤더 버튼)이면 `preventDefault()` 없이 반환해 해당 버튼의 native 클릭 동작이 그대로 실행되도록 했다. I014에서 `.explorer-parent`에 한정해 넣었던 예외를 일반화한 것으로, Reload/Open Folder 등에 포커스가 있을 때 Enter가 엉뚱하게 항목 열기로 가로채이는 것을 막는다.
  - **C 수정**: `handleExplorerKeyDown`과 `activateExplorerEntry`에서 `directory.loading` 가드를 모두 제거.
- 검증: `npm run typecheck`, `npm run test`(13개 통과), `npm run build` 모두 통과.
- 반대 벤더 적대적 검증: 사용자 명시적 요청("코덱스 검증 없이 opus 모델만으로")에 따라 생략함.
- 남은 위험: 결함 A는 타이밍 경쟁이라 재현이 확률적이었고, 이번 수정은 그 경쟁 자체를 제거(선언적 `useEffect`로 전환)해 구조적으로 차단한 것이다. 다만 실제 Electron 실행 환경에서 사용자가 제시한 경로로 재확인이 필요하다. 결함 B·C는 코드 경로가 명확해 재현 조건 없이도 제거가 타당하다. 이번 항목은 반대 벤더 검증을 생략했으므로, 이후 회귀가 발견되면 별도 항목에서 검증을 포함해 처리한다.
- 사용자 확인/피드백: 사용자가 해당 경로(`docs/releases/v0.2/improvements`)에서 직접 재확인해 "제대로 동작하는 것을 확인했습니다"로 확인함.
- 상태: 확정

---

## I016. 코드블록 줄간격 통일, README 단축키 표 추가

- 요청 일시 / 요청자: 2026-08-16 / nampluskr
- 요청 내용:
  1. 마크다운 영역 코드블록의 줄간격이 너무 넓음. 다른 코드 파일(코드 뷰어)과 왜 다른지 확인 요청.
  2. 루트 `README.md`에 단축키 목록을 테이블로 추가.
- 원인 분석 (구현자: Claude Code): `.markdown-content { line-height: 1.65; }`가 마크다운 본문 전체(코드블록 포함)에 상속되는데, `.code-panel pre`/`.code-panel code`에는 자체 `line-height`가 없었다. 그 결과 마크다운 안의 코드블록은 `.markdown-content`의 `1.65`를 상속해 줄간격이 넓고, `.md`가 아닌 코드/텍스트 파일을 직접 여는 코드 뷰어(`.markdown-content` 바깥)는 이 상속을 받지 않아 브라우저 기본값(약 1.2)을 써서 서로 달랐다. 같은 `CodePanel` 컴포넌트인데 렌더링 위치에 따라 결과가 달라지는 문제였다.
- 변경 내용 (구현자: Claude Code):
  - `src/renderer/src/styles.css`: `.code-panel pre`에 `line-height: 1.5`를 명시해, 마크다운 내부·코드 뷰어 어디서 렌더링되든 코드블록 줄간격이 동일하게 고정되도록 함.
  - `README.md`: "단축키" 섹션 신규 추가. `App.tsx`의 실제 `handleKeyDown`/`handleExplorerKeyDown` 구현을 기준으로 전역 단축키 표(Ctrl+O, F5/Ctrl+R, Ctrl+T, Ctrl+Tab/Ctrl+Shift+Tab, Ctrl++/Ctrl+-/Ctrl+0, Ctrl+휠, F11, Tab/Shift+Tab)와 탐색기 전용 키 표(↑/↓, Home/End, Enter/→, Backspace/←)를 작성.
- 검증: `npm run typecheck`, `npm run test`(13개 통과), `npm run build` 모두 통과.
- 반대 벤더 적대적 검증: 구현 시점에는 실행하지 않고 넘어갔음(절차 누락). 사용자에게 이 사실을 알리고, 다음 I017(단축키 4건) 작업 완료 후 이번 항목과 I018(기본 글자 크기)을 묶어 뒤늦게 Codex 검증을 실행함 — 아래 I018 섹션의 검증 결과 참조(코드블록 line-height 변경 포함).
- 사용자 확인/피드백: 사용자가 "제대로 적용된 것을 확인했습니다"로 확인함(I017·I018과 함께 한 번에 확인).
- 상태: 확정

---

## I017. VS Code 스타일 단축키 4건 추가(Ctrl+W, Esc, Ctrl+1/2/3, Alt+F4)

- 요청 일시 / 요청자: 2026-08-16 / nampluskr
- 요청 내용:
  1. `Ctrl+W`: 현재 탭 닫기(VS Code와 동일)
  2. `Esc`: 집중 보기 빠져나오기
  3. `Ctrl+1`/`Ctrl+2`/`Ctrl+3`: 화이트/그레이/다크 테마로 직접 전환
  4. `Alt+F4`: 창 닫기
  - 사용자가 Codex 검증을 생략해달라고 명시적으로 요청함.
- 구현 전 확인 (구현자: Claude Code): `Alt+F4`는 `src/main/index.ts`의 `BrowserWindow` 생성 옵션에 `frame: false`가 없는 표준 프레임 창이고 `globalShortcut`/메뉴 accelerator로 가로채는 코드도 없어, Windows OS가 기본으로 처리하는 동작이라 별도 구현이 필요 없음을 확인.
- 변경 내용 (구현자: Claude Code) — `src/renderer/src/App.tsx`:
  - 전역 `handleKeyDown`에 `Escape`(집중 보기일 때만 해제), `Ctrl+W`(`closeTab(activeTabIdRef.current)`), `Ctrl+1`/`Ctrl+2`/`Ctrl+3`(`setTheme('light'|'dim'|'dark')`) 분기 추가.
  - 구현 중 발견한 버그: 이 `useEffect`의 의존성 배열이 `[tabs, activeTabId, rootPath, currentDirectoryPath]`였고 `focusMode`가 빠져 있어, `Esc` 분기가 `focusMode`를 직접 읽는 방식이라 stale closure로 오작동할 수 있었음(F11은 함수형 업데이트라 문제없었음) → 의존성 배열에 `focusMode` 추가로 수정.
  - `README.md` 단축키 표에 `Ctrl+W`, `Ctrl+1`/`Ctrl+2`/`Ctrl+3`, `Esc`, `Alt+F4` 행 추가.
- 검증: `npm run typecheck`, `npm run test`(13개 통과), `npm run build` 모두 통과.
- 반대 벤더 적대적 검증: 사용자 명시적 요청에 따라 생략함.
- 사용자 확인/피드백: 사용자가 "제대로 적용된 것을 확인했습니다"로 확인함.
- 상태: 확정

---

## I018. 문서 기본 글자 크기 90%로 조정

- 요청 일시 / 요청자: 2026-08-16 / nampluskr
- 요청 내용: 문서 글자 크기 100% 기본값을 한 단계(확대·축소 단위인 10%p) 낮춰 적용.
- 변경 내용 (구현자: Claude Code) — `src/renderer/src/App.tsx`: 모듈 최상위에 `const DEFAULT_CONTENT_FONT_SCALE = 90` 상수를 추가하고, `contentFontScale`의 초기값(`useState(100)` → `useState(DEFAULT_CONTENT_FONT_SCALE)`)과 `Ctrl+0` 리셋값(`setContentFontScale(100)` → `setContentFontScale(DEFAULT_CONTENT_FONT_SCALE)`)을 모두 이 상수로 통일. `adjustContentFontScale`의 확대·축소 범위(80~200, 10 단위)는 변경하지 않음. `src/renderer/src/styles.css`의 `.document-content` `calc()` fallback 값도 100 → 90으로 함께 맞춤(이 fallback은 실제로는 항상 인라인 스타일로 값이 채워져 있어 평상시 쓰이지 않는 방어값).
- 검증: `npm run typecheck`, `npm run test`(13개 통과), `npm run build` 모두 통과.
- 반대 벤더 적대적 검증

  | 회차 | 검토자 | 결과 요약 |
  |---|---|---|
  | 1 | Codex CLI (`gpt-5.6-sol`, `--sandbox read-only`) | Critical 0건, Major 0건, Minor 0건. I016의 `.code-panel pre` `line-height: 1.5`가 `<code>`·문법 강조 `<span>`(색상만 지정, 줄 높이에 영향 없음)을 통해 안전하게 상속됨을 확인. `100`을 특별 취급하는 잔여 비교·퍼센트 라벨이 없음을 확인. 80~200 범위·10 단위 증분에서 90이 도달 불가능하거나 비대칭 상태를 만들지 않음을 확인. `calc()` fallback 값이 런타임 기본값과 일치함을 확인. |

  | 심각도 | 건수 | 처리 상태 | 근거 |
  |---|---|---|---|
  | Critical | 0 | 해당 없음 | - |
  | Major | 0 | 해당 없음 | - |
  | Minor | 0 | 해당 없음 | - |

- Critical 수정 및 재검증: 해당 없음 (지적 없음).
- 남은 위험: 이번 검증 요청 범위를 I016·I018(줄간격, 기본 글자 크기)로 한정했고, 같은 작업 트리에 함께 있던 I017(단축키 4건, 사용자 요청으로 검증 생략)은 이번 회차에서 별도로 검토되지 않았다는 점을 검토자가 스스로 명시함 — I017은 사용자 요청에 따른 의도된 생략이므로 별도 조치 없음.
- 사용자 확인/피드백: 사용자가 "제대로 적용된 것을 확인했습니다"로 확인함.
- 상태: 확정

---

## I019. 집중 보기에서 프로그램 창 테두리(제목표시줄)까지 숨기기

- 요청 일시 / 요청자: 2026-08-16 / nampluskr
- 요청 내용: 집중 보기 실행 시 문서 영역만 순수하게 보이도록, OS가 그리는 창 테두리(제목표시줄과 최소화/최대화/닫기 버튼)까지 없앨 수 있는지.
- 계획 수립 (Plan Mode): 조사 결과 Electron `frame` 옵션은 창 생성 시점에만 정할 수 있어 "F11 때만 프레임 제거"를 하려면 창을 재생성해야 하고, 이는 열린 탭·문서 내용 등 렌더러 상태 전체 손실(약 150~250줄, `windowRoots` 보안 Map 재등록 포함)로 이어짐(A안). 대안으로 처음부터 `frame: false`로 만들고 앱이 직접 그리는 제목표시줄을 기존 `.tab-bar`에 넣어, 기존 `.app-shell.is-focus-mode .tab-bar { display: none; }` 규칙에 자연히 포함시켜 집중 보기에서만 사라지게 하는 B안(약 90~130줄, 창 재생성 없음)을 사용자와 함께 비교하고 채택. 계획 파일(`purrfect-crafting-flask.md`)로 승인받은 뒤 구현.
- 변경 내용 (구현자: Claude Code):
  - `src/main/index.ts`: `createWindow`의 `BrowserWindow` 옵션에 `frame: false` 추가. `registerWindowControlHandlers()` 신규 함수로 `window:minimize`/`window:toggle-maximize`/`window:close`/`window:is-maximized` 4개 IPC 핸들러 등록(모두 `BrowserWindow.fromWebContents(event.sender)`로 "이 창"만 확인, 렌더러가 창 식별자를 넘기지 않음). 창의 `maximize`/`unmaximize` 이벤트를 `window:maximize-changed`로 렌더러에 전달.
  - `src/preload/index.ts`: `windowMinimize`/`windowToggleMaximize`/`windowClose`/`windowIsMaximized`/`onWindowMaximizeChange`(구독 해제 함수 반환, 이 앱 최초의 push-이벤트 API) 추가.
  - `src/shared/markdown-browser.d.ts`: `MarkdownBrowserApi`에 위 5개 타입 추가.
  - `src/renderer/src/App.tsx`: `MinimizeIcon`/`MaximizeIcon`/`RestoreIcon`/`CloseIcon` 신규 SVG 아이콘(기존 패턴 재사용). `isWindowMaximized` 상태를 마운트 시 `windowIsMaximized()`로 초기화하고 이후 `onWindowMaximizeChange` 구독으로만 갱신. `.tab-bar`의 "+" 버튼 뒤에 최소화/최대화-복원/닫기 버튼 3개 추가, 기존 탭바 아이콘들과 동일하게 `tabIndex={-1}`(마우스 전용, 확정된 "Tab은 탐색기·뷰어 영역만 이동" 규칙 유지).
  - `src/renderer/src/styles.css`: `.tab-bar`에 `-webkit-app-region: drag`, `.tab-bar button`과 `.tab-list`에 `-webkit-app-region: no-drag`(탭 목록 스크롤 영역이 드래그에 막히지 않도록). `.window-close-button`에 hover 시 빨간 배경(Windows 관례).
- 검증: `npm run typecheck`, `npm run test`(13개 통과), `npm run build` 모두 통과. `npx electron .` 기동 확인(치명적 오류 없음).
- 반대 벤더 적대적 검증 (main 프로세스 신뢰 경계·새 IPC 추가로 필수 대상 판단)

  | 회차 | 검토자 | 결과 요약 |
  |---|---|---|
  | 1 | Codex CLI (`gpt-5.6-sol`, `--sandbox read-only`) | **보안 진단: 문제 없음** — `event.sender` 기반 창 확인은 스푸핑 불가능하며 각 창은 자기 자신만 제어 가능함을 확인, `frame: false`가 CSP·`will-navigate`·`setWindowOpenHandler`·contextIsolation·sandbox 중 어느 것도 약화시키지 않음을 확인, push 리스너가 창 간 누수되거나 언마운트 후에도 남지 않음을 확인. Critical 0건, Major 1건, Minor 3건. |
  | 2 | Codex CLI (`gpt-5.6-sol`, `--sandbox read-only`) | Minor #2·#3 수정 재검증 — 두 항목 모두 해소 확인, 새로 발견된 문제 없음. |

  | 심각도 | 건수 | 처리 상태 | 근거 |
  |---|---|---|---|
  | Critical | 0 | 해당 없음 | - |
  | Major | 1 | 수용(의도된 사양) | "집중 보기에서 탭바(유일한 드래그 영역+창 조작 버튼) 전체가 사라져 포인터로 창을 옮기거나 최소화·닫을 방법이 없다"는 지적 → 이는 "집중 보기는 문서만 순수하게 보이게" 해달라는 사용자 요청 그 자체이며, F11·Esc로 언제든 집중 보기를 빠져나올 수 있고 Alt+F4는 `frame: false`와 무관하게 OS 레벨에서 계속 동작함을 확인. 코드 수정 없이 의도된 동작으로 기록. |
  | Minor | 1 | 수정 | "최대화 아이콘 초기값이 하드코딩된 `false`이고, 토글 버튼의 invoke 응답과 `maximize`/`unmaximize` 이벤트 알림이라는 두 경로가 상태를 경쟁적으로 갱신해 어긋날 수 있다"는 지적 → `window:toggle-maximize`가 더 이상 boolean을 반환하지 않도록 변경하고, 읽기 전용 조회용 `window:is-maximized` IPC·`windowIsMaximized()`를 신규 추가해 마운트 시 최초 상태를 조회하도록 함. 이후 상태 갱신은 `maximize`/`unmaximize` 이벤트 구독(`onWindowMaximizeChange`) 단일 경로로만 이뤄지도록 정리해 경쟁 자체를 제거. 2차 재검증에서 해소 확인. |
  | Minor | 1 | 수정 | "탭 목록(`.tab-list`)이 넘칠 때 그 영역이 여전히 드래그 영역에 포함되어 있어, 스크롤바를 드래그하거나 빈 공간을 조작하면 스크롤 대신 창이 움직인다"는 지적(버튼 자식에만 `no-drag`가 적용돼 있었음) → `.tab-list` 자체에도 `-webkit-app-region: no-drag`를 추가해 스크롤 컨테이너 전체를 드래그 영역에서 제외. 2차 재검증에서 해소 확인. |
  | Minor | 1 | 수용(기존 확정 규칙과 일치) | "새 창 조작 버튼 3개가 `tabIndex={-1}`이라 키보드만으로는 최소화·최대화·닫기를 실행할 수 없다"는 지적 → 이 앱은 이미 여러 항목(I010~I018)에 걸쳐 "Tab은 탐색기·뷰어 영역만 이동, 탭바 전체는 마우스 전용"으로 확정한 상태이며, 이 버튼들도 같은 규칙을 그대로 따른 것. 코드 수정 없이 유지. |

- Critical 수정 및 재검증: 해당 없음 (Critical 지적 없음). Minor 2건 수정 후 동일 벤더로 2차 재검증까지 실행해 해소 확인(재실행 포함 총 2회, 최대 3회 제한 내).
- 남은 위험: 없음. Major·나머지 Minor 1건은 모두 사용자 요청 또는 기존 확정 규칙과 일치하는 의도된 동작으로 확인됨.
- 사용자 확인/피드백: 사용자가 "제대로 잘 실행됩니다. 사용자가 원하는 바 그대로 입니다."로 확인함.
- 상태: 확정

---

## I020. 창 테두리 색, 테마 아이콘 형태 통일, 탐색기 상위 이동 시 이전 폴더 선택 유지

- 요청 일시 / 요청자: 2026-08-16 / nampluskr
- 요청 내용:
  1. 창 바깥 테두리를 테마에 맞는 그레이 색으로 변경
  2. 테마 전환 아이콘을 그레이(Dim)의 원 형태로 통일 — Dim은 그대로 두고, 화이트/다크는 원 내부를 "빈 원 → 채운 원"으로 변경
  3. 탐색기에서 Enter/→로 하위 폴더 이동 후 Backspace/←로 상위 폴더로 돌아왔을 때, 맨 위 항목이 아니라 방금 나온 폴더가 선택되어 있어야 함
- 변경 내용 (구현자: Claude Code):
  - `src/renderer/src/styles.css`: `.app-shell`에 `border: 1px solid var(--border);` 추가. I019에서 `frame: false`로 전환하며 없어진 OS 창 테두리를 대체해, 테마별 `--border` 변수 색(라이트/딤/다크 각각 다른 회색조)으로 창 전체를 감싸도록 함.
  - `src/renderer/src/App.tsx`: `ThemeIcon`의 `dark` 분기를 초승달 `<path>`에서 채운 원(`fill="currentColor"`)으로, `light` 분기를 해 모양(작은 원+광선 8개)에서 빈 원(`fill="none"`)으로 교체. `dim` 분기(반원 채움 원)는 변경 없이 유지 — 세 상태가 "빈 원 → 반원 채움 → 채운 원"으로 하나의 원 모티프를 공유하도록 통일.
  - `src/renderer/src/App.tsx`: `navigateToDirectory(directoryPath, selectChildPath = null)`에 두 번째 인자 추가. 상위 폴더로 이동하는 두 지점(키보드 ArrowLeft/Backspace, ".." 버튼 클릭)에서만 `navigateToDirectory(parent, currentDirectoryPath)`로 호출해 "방금 나온 폴더 경로"를 새 `pendingSelectChildPath` ref에 전달. 하위 폴더 진입(`activateExplorerEntry`)이나 루트 이동 등 다른 호출부는 변경 없이 인자 없이 호출(기존과 동일하게 첫 항목 선택). 포커스 복원 `useEffect`가 `pendingSelectChildPath`가 있으면 새로 로드된 목록에서 `sameFilePath`로 일치하는 항목의 인덱스를 찾아 그 항목을 선택·포커스하고, 없으면 기존처럼 첫 항목으로 대체.
- 검증: `npm run typecheck`, `npm run test`(13개 통과), `npm run build` 모두 통과.
- 반대 벤더 적대적 검증

  | 회차 | 검토자 | 결과 요약 |
  |---|---|---|
  | 1 | Codex CLI (`gpt-5.6-sol`, `--sandbox read-only`) | Critical 0건, Major 0건, Minor 1건. 상위 이동 선택 복원 로직이 렌더링과 동일한 필터 목록을 사용하고, `markdownOnly` 최신 값을 반영하며, 후속 탐색 시 `pendingSelectChildPath`를 올바르게 덮어쓰고, `directoryLoadVersion`으로 오래된 응답을 거르며, 인덱스 복원 전 0으로 리셋되어 이후 키보드 탐색이 범위를 벗어나지 않음을 확인. 3개 테마 아이콘이 의도한 "빈 원/반원/채운 원" 진행을 정확히 유지함을 확인. |

  | 심각도 | 건수 | 처리 상태 | 근거 |
  |---|---|---|---|
  | Critical | 0 | 해당 없음 | - |
  | Major | 0 | 해당 없음 | - |
  | Minor | 1 | 수정 | "`.app-shell`에 1px 테두리가 추가되면서 탐색기 리사이저의 `event.clientX` 기준 좌표가 실제 문서 영역 시작점(테두리만큼 오른쪽으로 밀림)과 1px 어긋난다"는 지적(오버플로우·클리핑은 없고 리사이저 좌표 정렬만의 문제) → `resizeExplorer`에서 `event.clientX` 대신 `event.clientX - 1`을 사용하도록 수정. |

- Critical 수정 및 재검증: 해당 없음 (Critical 지적 없음). Minor 수정 후 CLAUDE.md 규정상 재검증 의무는 없어 반대 벤더 재실행은 생략, typecheck·테스트·빌드로 직접 확인함. I020 항목의 반대 벤더 적대적 검증 실행은 1회로 종료(재실행 없이 최대 3회 제한 내).
- 남은 위험: 없음.
- 사용자 확인/피드백: 사용자가 "메인 창 바깥에 파란색 테두리가 계속 남아 있다"고 재현 보고.

### 추가 반영 (같은 I020 항목 내 후속 요청)

- 원인 분석 (구현자: Claude Code): 이 파란 테두리는 `.app-shell`에 추가한 CSS 테두리가 아니라, Windows가 `frame: false` 창에 자동으로 그리는 DWM(창 관리자) 액센트색 테두리다. 웹 콘텐츠 바깥, OS 컴포지터가 직접 그리는 것이라 CSS로는 제어할 수 없다.
- 변경 내용 (구현자: Claude Code): `src/main/index.ts`의 `BrowserWindow` 생성 옵션에 `thickFrame: false`(Windows 전용) 추가. 이 옵션이 표준 창 프레임(WS_THICKFRAME — 그림자, DWM 액센트 테두리, 크기 조절 애니메이션 포함)을 비활성화한다.
- 검증: `npm run typecheck`, `npm run build` 통과. (그림자/크기 조절 애니메이션이 함께 사라질 수 있고 드물게 가장자리 드래그 리사이즈에 영향을 줄 수 있다는 트레이드오프를 사용자에게 안내하고 재확인 요청함.)
- 사용자 확인/피드백: 사용자가 "창 테두리 문제는 완전히 해결되었음을 확인했습니다"로 확인함.
- 상태: 확정

### 추가 반영 (같은 I020 항목 내 후속 요청 — thickFrame:false 회귀 원상복구)

- 요청 일시 / 요청자: 2026-08-16 / nampluskr
- 요청 내용: `thickFrame: false` 적용 이후 마우스로 창을 드래그해 이동할 수 없고 `Win + 화살표` 스냅도 동작하지 않는 회귀를 재현 보고.
- 원인 분석 (구현자: Claude Code): Windows에서 `-webkit-app-region: drag`(탭 바에 지정됨, `styles.css:109`)와 `Win + 화살표` 스냅은 모두 `WS_THICKFRAME` 창 스타일에 의존하는 논클라이언트(non-client) 히트테스트 처리로 동작한다. `thickFrame: false`가 이 스타일을 꺼서 DWM 액센트 테두리는 사라졌지만, 그 대가로 창 이동/스냅 기능도 함께 비활성화됐다. 앞선 반영 시점에 안내했던 트레이드오프("가장자리 드래그 리사이즈에 영향을 줄 수 있다")가 실제로는 이동/스냅 전체에 영향을 준 것으로 확인.
- 변경 내용 (구현자: Claude Code): `src/main/index.ts`의 `BrowserWindow` 생성 옵션에서 `thickFrame: false`를 제거. DWM 액센트 테두리는 다시 나타나지만 창 드래그 이동과 `Win + 화살표` 스냅을 우선함.
- 검증: `npm run typecheck`, `npm run build` 통과. 사용자가 실제 앱 실행 상태에서 `Win + 화살표` 스냅 정상 동작, 외곽 파란 테두리 재출현을 직접 확인.
- 남은 위험: DWM 파란 테두리는 트레이드오프로 남아 있으며, CSS로 제어할 수 없는 OS 컴포지터 렌더링이라 별도 해결책이 없는 한 재발이 아닌 확정된 현재 상태임.
- 사용자 확인/피드백: 사용자가 이동/스냅 복구를 우선하는 방향(`thickFrame:false` 제거)을 선택하고 진행을 확인함.
- 상태: 확정

---

## I021. 비-마크다운 텍스트/코드 뷰어를 순수 텍스트+줄번호로 표시, 대용량 파일 응답없음 원인 제거

- 요청 일시 / 요청자: 2026-08-16 / nampluskr
- 요청 내용:
  1. 뷰어 영역에서 마크다운이 아닌 텍스트/코드 파일에 코드블록 틀과 Copy 아이콘이 보이는데, 이를 없애고 텍스트/코드만 보이게 하고 싶음.
  2. 코드/긴 JSON 파일 로딩이 느리고 가끔 "응답 없음"이 뜨는데 원인이 무엇인지, 필연적 문제라면 뷰어에서 마크다운 문서만 보이게 해야 하는지.
  3. (계획 논의 중 추가) 이 텍스트/코드 뷰어에 줄번호를 GitHub 스타일로(토글 없이 항상) 표시하고, 줄번호를 포함해 드래그 선택해도 줄번호는 선택되지 않게.
- 원인 분석 (구현자: Claude Code, Plan Mode): `src/renderer/src/CodePanel.tsx`의 `highlightedCode()`가 정규식 `split()` 결과의 모든 조각(매치된 토큰뿐 아니라 공백·괄호·쉼표 등 매치 안 된 부분까지)을 각각 `<span>`으로 렌더링한다. JSON처럼 토큰이 촘촘한 파일은 이 방식으로 수만 개의 `<span>` DOM 노드가 생성되어 렌더링·레이아웃이 급격히 느려지고 렌더러 프로세스가 멈춰 "응답 없음"으로 이어질 수 있다. `512 * 1024`바이트 이상일 때만 강조를 건너뛰는 기존 가드가 있지만, 그 이하 크기라도 토큰 밀도가 높으면 노드 수가 폭발적으로 늘어나 막지 못한다. 이 비용은 마크다운이 아닌 파일을 직접 여는 "코드 뷰어" 경로에서만 발생하며(마크다운 문서 안의 펜스 코드블록은 대체로 훨씬 작음), 사용자가 원하는 "코드블록 틀·Copy 없이 텍스트만" 요구사항을 그대로 구현(=이 경로에서 `CodePanel` 대신 강조 없는 뷰어 사용)하면 성능 문제도 함께 해결됨을 계획 단계에서 확인. 마크다운 필요 없음 — 문제는 표시 방식 선택으로 해결 가능함을 확인.
- 변경 내용 (구현자: Claude Code):
  - `src/renderer/src/App.tsx`: 신규 `PlainCodeViewer({ content })` 컴포넌트 추가. 줄 단위(`content.split('\n')`)로 나눠 줄번호+텍스트를 렌더링. 마크다운이 아닌 파일을 여는 "코드 뷰어" 분기가 `<CodePanel>` 대신 이 컴포넌트를 쓰도록 교체(강조·툴바·Copy 버튼 없음). 마크다운 문서 안의 펜스 코드블록은 기존처럼 `<CodePanel>`(툴바+Copy+강조) 그대로 유지.
  - `src/renderer/src/styles.css`: `.code-viewer-pre`/`.code-viewer-line-number`(`user-select: none`으로 드래그 선택 시 제외)/`.code-viewer-line-text` 신규 스타일. CSS Grid(`grid-template-columns: auto 1fr`)로 줄번호 열 폭을 파일 전체에서 공유해 정렬을 맞춤.
- 검증: `npm run typecheck`, `npm run test`(13개 통과), `npm run build` 모두 통과.
- 반대 벤더 적대적 검증 (2회)

  | 회차 | 검토자 | 결과 요약 |
  |---|---|---|
  | 1 | Codex CLI (`gpt-5.6-sol`, `--sandbox read-only`) | Critical 1건, Minor 2건. CRLF 줄바꿈 잔여 `\r`은 `white-space: pre`에서 공백처럼 취급되어 문제 없음, 빈 파일 가드 정상, 긴 한 줄도 레이아웃 깨짐 없음을 확인. |
  | 2 | Codex CLI (`gpt-5.6-sol`, `--sandbox read-only`) | Critical·Minor 재검증 — 모두 해소 확인, 남은 지적 없음. |

  | 심각도 | 건수 | 처리 상태 | 근거 |
  |---|---|---|---|
  | Critical | 1 | 수정 | "짧은 줄이 매우 많은 파일(예: 10 MiB `x\n` 반복 ≈ 520만 줄)은 여전히 줄 수만큼(약 1,570만 개) `<div>`/`<span>`을 만들어 동일한 응답없음이 재발한다"는 지적(기존 512KiB 바이트 기준 가드는 줄 수 폭증을 못 막음) → `MAX_NUMBERED_VIEWER_LINES = 20000` 상수를 추가해, 줄 수가 이를 초과하면 줄번호 없이 `<pre><code>{content}</code></pre>` 단일 텍스트 노드로 대체 렌더링하도록 수정(기존 CodePanel의 바이트 기준 강조-생략 가드와 같은 성격의 안전장치를 줄 수 기준으로 추가). 최악의 경우도 20,000줄×2 span=4만 개로 제한됨을 2차 재검증에서 확인. |
  | Minor | 1 | 수정 | "각 줄이 독립된 flex 컨테이너라 줄번호 자릿수가 늘어나면(예: 100,000번째 줄) 그 줄만 밀려나 거터가 줄마다 어긋난다"는 지적 → 줄 단위 `<div>` 래퍼를 제거하고 `<pre>` 직계 자식으로 번호·텍스트 `<span>`을 `Fragment`로 배치, `.code-viewer-pre.code-viewer-numbered`를 CSS Grid(`grid-template-columns: auto 1fr`)로 바꿔 모든 행이 같은 첫 번째 열 폭을 공유하도록 수정. 2차 재검증에서 해소 확인. |
  | Minor | 1 | 수용(의도된 결과) | "`Tab.language`가 더 이상 이 렌더링 경로에서 읽히지 않아 고아 상태처럼 보인다"는 지적 → 마크다운 펜스 코드블록(`CodePanel`)에서는 계속 쓰이고, 표준 파일 뷰어에서 언어 라벨을 없앤 것은 사용자가 명시적으로 요청한 "코드블록 틀 제거"의 직접적 결과이므로 새로운 결함이 아님. 코드 수정 없이 유지. |

- Critical 수정 및 재검증: 1건을 수정하고 CLAUDE.md 규정에 따라 동일 벤더로 2차 재검증까지 실행해 해소 확인(재실행 포함 총 2회, 최대 3회 제한 내).
- 남은 위험: 없음.
- 사용자 확인/피드백: 사용자가 "정상 작동함을 확인했습니다"로 확인함.
- 상태: 확정

### 추가 반영 (같은 I021 항목 내 후속 요청 — 박스 제거)

- 요청 내용: 텍스트/코드 뷰어가 왜 박스(테두리+배경) 형태로 보이는지 문의. 사용자가 "박스 완전히 제거, 문서 배경에 그대로 녹아듦"으로 결정.
- 변경 내용 (구현자: Claude Code, Plan Mode 없이 직접 처리 — 단순 CSS 제거): `src/renderer/src/styles.css`의 `.code-viewer-pre`에서 `border`, `border-radius`, `background`를 제거하고 `color`를 `var(--code-text)` 대신 `var(--text)`로, `padding`을 `1rem 0` → `0`으로 변경. `.code-viewer-pre.code-viewer-plain`의 `padding`도 `1rem` → `0`. `.code-viewer-line-number`/`.code-viewer-line-text`의 박스 인셋용 여백(좌우 `1rem`)도 제거하고 번호-텍스트 사이 간격만(`padding-right: 1em`) 유지.
- 검증: `npm run typecheck`, `npm run test`(13개 통과), `npm run build` 모두 통과.
- 반대 벤더 적대적 검증: 단순 CSS 속성 제거(레이아웃·로직 변경 없음)라 생략함.
- 사용자 확인/피드백: 사용자가 "정상 작동함을 확인했습니다"로 확인함.
- 상태: 확정

---

## I023. 텍스트/코드 뷰어에 안전장치 포함 문법 강조 재도입

- 요청 일시 / 요청자: 2026-08-16 / nampluskr
- 요청 내용: I021에서 강조를 제거했는데, 다시 강조를 넣으면 이전처럼 로딩이 느려지는지 문의. 안전장치를 포함해 다시 추가하기로 결정(Plan Mode로 계획 수립 후 승인).
- 변경 내용 (구현자: Claude Code, Plan Mode 승인 후 구현):
  - `src/renderer/src/CodePanel.tsx`: `normalizedLanguage`, `highlightedCode`를 `export`로 전환해 `App.tsx`에서 재사용. `highlightedCode()`의 근본 원인 수정 — 정규식 `split()` 결과 중 매치되지 않은 조각을 더 이상 `<span>`으로 감싸지 않고 일반 문자열로 반환(React가 별도 DOM 노드 없이 텍스트로 렌더링). 이 수정은 마크다운 펜스 코드블록에도 동일 적용되어 `CodePanel.tsx` 전체의 노드 수가 줄어듦.
  - `src/renderer/src/App.tsx`: `PlainCodeViewer`에 `language` prop 추가. `MAX_HIGHLIGHTED_VIEWER_LINES = 5000`(기존 `MAX_NUMBERED_VIEWER_LINES = 20000`과 별도) 도입해 줄 수가 이 이하일 때만 언어 인식·강조를 시도하도록 함. 각 줄을 `highlightedCode(line, language)`로 개별 강조.
- 검증: `npm run typecheck`, `npm run test`(13개 통과), `npm run build` 모두 통과.
- 반대 벤더 적대적 검증 (3회 — 이번 항목의 CLAUDE.md 허용 상한)

  | 회차 | 검토자 | 결과 요약 |
  |---|---|---|
  | 1 | Codex CLI (`gpt-5.6-sol`, `--sandbox read-only`) | Critical 1건, Major 1건. "매치 안 된 조각을 문자열로 바꿔도, 토큰이 매우 촘촘한 단일 긴 줄(예: 500KB에 약 17만 개 숫자 토큰)은 여전히 약 78만 개 DOM 노드를 만들어 응답없음이 재발할 수 있다"—줄 수·줄 길이 기준만으로는 부족하며 집계 토큰/노드 예산이 필요하다고 지적. |
  | 2 | Codex CLI (`gpt-5.6-sol`, `--sandbox read-only`) | 1차 Critical 수정(전체 파일 기준 토큰 수 집계 `estimateTokenCount`)에 대해 **재검증 실패** — 전체 파일 기준 계산은 여러 줄에 걸친 블록 주석처럼 줄바꿈을 넘나드는 패턴을 "토큰 1개"로 뭉쳐 과소 집계하지만, 실제 렌더링은 줄 단위로 다시 토큰화해 그 안의 숫자·키워드를 전부 강조하므로 안전장치를 우회할 수 있음을 구체적 재현(5,000줄 파일, 전체 추정 1 vs 실제 줄 단위 20,001)으로 확인. |
  | 3 | Codex CLI (`gpt-5.6-sol`, `--sandbox read-only`) | 2차 수정(줄 단위로 정확히 집계하는 `lineHighlightTokensExceedBudget`) 재검증 — Critical·Major·Minor 모두 0건, 남은 지적 없음. |

  | 심각도 | 건수 | 처리 상태 | 근거 |
  |---|---|---|---|
  | Critical | 1 | 수정(2단계) | 1차 시도(`estimateTokenCount`, 전체 파일 1회 매치)가 2차 검증에서 "줄 단위 렌더링과 집계 방식이 달라 안전장치가 우회된다"는 재지적을 받아, `CodePanel.tsx`에 `lineHighlightTokensExceedBudget(lines, maxTokens, maxLineLength=20000)`를 새로 추가 — 실제 렌더링과 동일하게 줄마다 개별 매치해 누적하고, 줄 길이·누적 토큰 수 중 하나라도 초과하면 즉시 중단(조기 종료)하도록 재구현. `MAX_HIGHLIGHTED_TOKENS = 20000`. 3차 재검증에서 완전히 해소 확인. |
  | Major | 1 | 수정 | "`content.match()`가 예산 체크 전에 전체 매치 배열을 미리 만들어, 매우 촘촘한 콘텐츠에서 할당·일시정지를 유발할 수 있다"는 지적 → 위 `lineHighlightTokensExceedBudget`의 줄 길이 사전 체크(20,000자 초과 시 `match()` 호출 자체를 생략)와 누적 조기 종료로 함께 해결. 3차 재검증에서 "1회성 배열 할당 수준으로 허용 가능, 더 이상 Major 아님"으로 확인. |
  | Minor | 1 | 수용(의도된·사전 고지된 트레이드오프) | "줄 단위 강조라 여러 줄에 걸친 블록 주석·템플릿 리터럴 등은 줄 경계에서 강조가 끊겨 내부가 코드처럼 잘못 강조될 수 있다"는 지적 → 구현 전 계획 단계에서 이미 사용자에게 명시적으로 고지하고 승인받은 제약(이 앱의 강조기는 완전한 렉서가 아닌 정규식 근사치). 안전장치(Critical 수정)는 이 부정확성 자체를 고치지 않고, 안전장치가 이 부정확성 때문에 우회되지 않도록만 고침 — 별도로 코드 수정하지 않음. |

- Critical 수정 및 재검증: 총 2회 수정 시도, 반대 벤더 재검증 3회(재실행 포함, 이번 항목의 CLAUDE.md 허용 상한)로 완전히 해소 확인.
- 남은 위험: 3차 검토가 명시한 대로, 예산 초과를 넘는 "그 줄"에 대한 매치 자체는 중단 전에 완료되어야 하므로(줄 원자 단위 처리) 병적으로 긴 단일 줄(줄 길이 상한 2만 자 이내)에서 정규식 계산 자체의 짧은 지연은 있을 수 있으나, 길이 상한으로 유계이며 보고할 수준은 아니라고 검토자가 명시함.
- 사용자 확인/피드백: 사용자가 "정상 작동함을 확인했습니다"로 확인함.
- 상태: 확정

---

## I024. 빈 탐색기 안내 문구 간소화, 상태바 앱 정보 표시, 버전 표기를 v{major}.{minor} 2단계로 통일

- 요청 일시 / 요청자: 2026-08-16 / nampluskr
- 요청 내용:
  1. 루트 폴더 미선택 시 탐색기에 표시되는 안내 문구를 간략히 해달라는 요청.
  2. 상태바 오른쪽에 프로그램 이름/버전/날짜를 표시해달라는 요청.
  3. 위 작업 도중 태그를 `v2.0`으로 잘못 요청했다가 `v0.2`로 정정, 이어서 이 프로젝트는 `docs/releases/v{major}.{minor}/` 관례에 맞춰 버전을 `v{major}.{minor}` 2단계로만 관리한다는 지침을 받아 상태바 표시와 설치 파일명, git 태그를 모두 이 규칙에 맞게 재조정.
  4. 위 변경 전체에 대해 Codex CLI 적대적 검증(코드 오류 포함) 실행 및 로그 기록 요청.
- 변경 내용 (구현자: Claude Code):
  - `src/renderer/src/App.tsx`: 빈 탐색기 문구를 "Select a folder to browse supported files."에서 "Open Folder (Ctrl+O)"로 변경. 상태바 footer를 `status-bar-file`(기존 파일 정보, 왼쪽)과 `status-bar-app`(신규, 오른쪽) 두 span으로 분리하고 `${__APP_NAME__} ${__APP_VERSION__} (${__BUILD_DATE__})` 형식으로 렌더링.
  - `electron.vite.config.ts`: renderer 전용 Vite `define`으로 `__APP_NAME__`(package.json `build.productName`), `__APP_VERSION__`(package.json semver `version`에서 patch를 버리고 `v{major}.{minor}`로 파생), `__BUILD_DATE__`(빌드 시점 로컬 날짜, `YYYY-MM-DD`) 3개 컴파일타임 상수 주입.
  - `src/shared/markdown-browser.d.ts`: 위 3개 전역 상수에 대한 `declare const` 타입 선언 추가.
  - `src/renderer/src/styles.css`: `.markdown-content p, .markdown-content li` line-height를 1.3→1.4로 변경. `.status-bar`를 flex(`justify-content: space-between`)로 전환하고 `.status-bar-file`(ellipsis), `.status-bar-app`(축소 가능, ellipsis) 규칙 추가.
  - `package.json`: electron-builder NSIS `artifactName`을 `${productName}-${version}-Setup.${ext}`(전체 semver 노출)에서 `${productName}-v0.2-Setup.${ext}`(고정 리터럴)로 변경. `"version": "0.2.0"` 필드 자체는 npm/electron-builder가 요구하는 3단계 semver 형식이라 유지하고, 화면·파일명 표시만 2단계로 파생/고정.
  - git 태그: 잘못 생성했던 `v0.2.0` 태그를 로컬/원격에서 삭제하고 `v0.2` 태그를 커밋 `d37fd55`에 새로 생성해 원격에 푸시.
  - `release/`의 설치 파일을 `Markdown Browser-v0.2-Setup.exe`로 재생성(`npm run package:win`)하고, 구 규칙(`0.1.0`, `0.2.0`)으로 만들어진 이전 설치 파일 2개 삭제.
- 검증: `npm run typecheck`, `npm run build` 통과.
- 반대 벤더 적대적 검증 (1회)
  | 회차 | 검토자 | 결과 요약 |
  |---|---|---|
  | 1 | Codex CLI (`gpt-5.6-sol`, `--sandbox read-only`) | Critical 0건, Major 0건, Minor 3건. |

  | 심각도 | 건수 | 처리 상태 | 근거 |
  |---|---|---|---|
  | Critical | 0 | 해당 없음 | - |
  | Major | 0 | 해당 없음 | - |
  | Minor | 3 | 2건 수정, 1건 수용 | ① "`__BUILD_DATE__`가 `toISOString()`으로 UTC 기준 날짜를 사용해, 양의 UTC 오프셋 시간대에서 자정 직후 빌드 시 하루 전 날짜가 표시될 수 있다" → `electron.vite.config.ts`에서 `getFullYear()/getMonth()/getDate()` 기반 로컬 날짜 조합으로 수정. ② "상태바 우측 앱 정보(`.status-bar-app`)가 `flex: 0 0 auto`로 축소되지 않아, 창이 매우 좁아지면 ellipsis 없이 그대로 잘릴 수 있다" → `flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis;`로 변경해 축소 시 말줄임 처리되도록 수정. ③ "설치 파일명의 `v0.2`가 `package.json`의 `version`과 별도로 하드코딩되어 있어, 다음 버전 업(`0.3.0` 등)이나 patch 릴리스(`0.2.1`) 시 수동으로 함께 갱신하지 않으면 파일명이 실제 버전과 어긋나거나 동일 파일명이 재사용돼 산출물을 덮어쓸 수 있다" → 이 프로젝트가 이미 `v{major}.{minor}` 2단계 수동 버전 관리를 문서 체계(`docs/releases/v{major}.{minor}/`)의 원칙으로 채택하고 있어 의도된 트레이드오프로 수용, 별도 코드 수정 없음. 다음 마이너 버전 업 시 `package.json`의 `artifactName`을 함께 갱신해야 함을 여기 기록으로 남김. |
- Critical 수정 및 재검증: 해당 없음(Critical 0건).
- 남은 위험: 다음 마이너 버전(`v0.3` 등)으로 넘어갈 때 `package.json`의 `build.nsis.artifactName` 리터럴을 수동으로 갱신해야 하며, 잊으면 설치 파일명이 실제 버전과 불일치할 수 있음(Minor ③, 의도된 수용 사항).
- 사용자 확인/피드백: 사용자가 Codex 검증 실행과 로그 기록을 요청함(진행 중).
- 상태: 확정
