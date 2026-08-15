# Markdown Browser v0.2 PRD

## 1. 제품 개요

| 항목 | 내용 |
|---|---|
| 제품 | Markdown Browser |
| 릴리스 | v0.2 |
| 목적 | 선택한 Root Folder 안의 Markdown, 텍스트, 코드 파일을 빠르게 탐색하고 읽기 전용으로 열람하는 Windows 데스크톱 Browser를 제공한다. |
| 핵심 사용자 흐름 | Root Folder 선택 또는 `.md` 파일 직접 실행 → 현재 디렉터리 기반 Explorer 탐색 → 탭에서 문서·텍스트·코드 파일 열람 → 수동 Reload로 외부 변경 반영 |
| 제품 원칙 | 읽기 전용, 로컬 우선, Root Folder 범위 제한, 창별 독립성, preload와 Electron IPC를 통한 파일 시스템 접근, 영어 UI |

---

## 2. 기능 요구사항

| ID | 기능 영역 | 요구사항 | 우선순위 |
|---|---|---|---|
| FR-01 | Root Folder | Browser Window마다 하나의 Root Folder를 관리하고, 다른 창과 Root Folder·Explorer 상태·탭·활성 탭을 공유하지 않는다. | Must |
| FR-02 | Folder Open | 사용자는 Open Folder로 임의의 폴더를 Root Folder로 선택할 수 있다. 선택을 취소하면 오류를 표시하지 않고 현재 Root Folder, Explorer, 탭 상태를 유지한다. 대화상자를 열지 못하면 기존 상태를 유지하고 영어 오류 상태를 표시한다. | Must |
| FR-03 | 파일 범위 | Explorer와 파일 열람은 Root Folder 및 그 하위 경로로 제한한다. Root 밖으로의 탐색과 파일 접근은 허용하지 않는다. | Must |
| FR-04 | Explorer | Explorer는 Root Folder의 고정 트리가 아니라 현재 디렉터리의 파일과 하위 폴더 목록을 표시하는 디렉터리 이동형 탐색기로 동작한다. | Must |
| FR-05 | Explorer | 목록 맨 위에 항상 `..` 항목을 표시한다. Root Folder 밖에서는 `..`을 비활성화하고, 그 밖에서는 `..`을 선택해 Root 범위 안의 부모 폴더로 이동할 수 있다. | Must |
| FR-06 | Explorer | `↑`, `↓`로 항목을 선택하고, `→`와 Enter로 하위 폴더에 들어가며, `←`와 `..` Enter로 부모 폴더로 이동할 수 있다. 파일을 선택하고 Enter를 누르면 파일을 연다. | Must |
| FR-07 | Explorer | 키보드 선택·포커스와 마우스 hover 상태를 명확히 구분해 표시한다. | Should |
| FR-08 | Explorer | Explorer는 compact하고 dense한 스타일로 표시하며, 헤더에 영어 `Open`, `Reload` 버튼을 제공한다. 버튼은 hover 또는 키보드 포커스일 때만 약한 배경색을 표시한다. | Must |
| FR-09 | Explorer | Explorer와 문서 영역 사이의 세로 구분선을 드래그하여 Explorer 폭을 조절할 수 있다. 기본 폭은 약 `17rem`, 최소 폭은 약 `12rem`, 최대 폭은 창 너비의 약 45%로 제한한다. | Must |
| FR-10 | Explorer | 구분선 드래그 중에는 가로 크기 조절 커서를 표시하고 텍스트 선택을 막는다. Explorer 폭은 창별 Renderer 런타임 상태로 유지하여 숨김 후 다시 표시해도 마지막 조절 폭을 사용하며, 앱 재실행 후 복원은 제공하지 않는다. | Should |
| FR-11 | Explorer | 파일·폴더 아이콘을 적용할 때 SVG 아이콘을 사용한다. 이때 `Open`, `Reload`는 영어 tooltip과 접근 가능한 이름을 갖는 아이콘 버튼으로 전환한다. | Should |
| FR-12 | Explorer | Explorer를 표시하거나 숨길 수 있다. 다시 표시할 때 마지막으로 조절한 폭을 사용한다. | Must |
| FR-13 | 지원 파일 | Explorer에는 Markdown, 텍스트, 코드, 설정 파일 중 지원 확장자만 표시한다. 이미지 파일은 Explorer 목록에 표시하지 않는다. | Must |
| FR-13a | 지원 파일 | 파일 읽기 결과는 Renderer가 표시 방식을 선택할 수 있도록 파일 종류와 하이라이트 언어 정보를 함께 제공한다. | Must |
| FR-14 | 탭 | 여러 파일을 탭으로 열고 전환·닫기할 수 있다. `Ctrl+T`로 새 빈 탭을 만들고, `Ctrl+Tab` 및 `Ctrl+Shift+Tab`으로 다음·이전 탭으로 이동한다. | Must |
| FR-15 | 탭 | 탭이 없는 초기 상태와 마지막 탭을 닫은 상태에서는 빈 화면을 표시한다. 빈 화면에서는 `+` 버튼으로 새 빈 탭을 만들 수 있다. | Must |
| FR-16 | 탭 | `Tab`은 다음 화면 컨트롤로 키보드 포커스를 이동하며, 문서 탭 전환에는 사용하지 않는다. | Must |
| FR-17 | 파일 열기 | Explorer에서 파일을 열 때 동일 파일이 이미 열린 경우 해당 탭으로 이동하고, 그렇지 않으면 새 탭으로 연다. 빈 탭이 활성화되어 있으면 그 탭에 파일을 연다. 읽기 실패는 기존 탭의 정상 내용을 변경하지 않는다. | Must |
| FR-18 | Markdown | Markdown과 GitHub Flavored Markdown을 렌더링하고, 본문에는 GitHub Markdown과 유사한 읽기 스타일을 적용한다. | Must |
| FR-19 | 코드 하이라이트 | Markdown 코드 블록과 코드 뷰어에서 Python, C++, TypeScript, JavaScript, JSON, PowerShell, YAML, TOML, Bash 문법 하이라이트를 지원한다. | Must |
| FR-20 | 코드 복사 | Markdown 코드 블록과 코드 뷰어에 현재 내용을 제한된 preload IPC를 통해 클립보드로 복사하는 버튼을 제공한다. | Must |
| FR-21 | 텍스트·코드 뷰어 | 지원 텍스트·코드 파일을 선택하면 읽기 전용 텍스트 뷰어로 연다. | Must |
| FR-22 | 대용량·바이너리 파일 | UI 정지를 방지하기 위해 모든 지원 파일에는 파일 크기 상한을 둔다. 상한 초과 파일, 바이너리 파일 징후, 지원하지 않는 인코딩은 열지 않고 원인을 명확히 표시한다. | Must |
| FR-23 | 로컬 이미지 | Markdown에서 상대 경로로 참조한 Root Folder 내부 로컬 이미지를 문서 안에 표시한다. 지원 형식은 `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`이다. | Must |
| FR-24 | 로컬 이미지 | 이미지가 없거나 Root Folder 밖을 가리키면 이미지를 열지 않고 대체 텍스트와 오류 상태를 표시한다. | Must |
| FR-25 | Markdown 링크 | 상대 경로 `.md` 링크는 대상이 Root Folder 내부일 때만 앱 내부에서 연다. 대상이 이미 열린 경우 해당 탭으로 이동하고, 그렇지 않으면 새 탭으로 연다. | Must |
| FR-26 | 수동 Reload | `Reload`, `Ctrl+R`, `F5`로 Explorer와 현재 열린 문서를 다시 불러온다. 외부 파일·폴더 변경은 수동 Reload를 실행했을 때만 반영한다. | Must |
| FR-27 | 파일 감시 | 파일 및 폴더 자동 감시는 제공하지 않는다. | Must |
| FR-28 | Windows 연결 | 설치된 앱의 아이콘 표시와 Windows Explorer의 자동 뷰어 연결은 `.md` 파일에만 적용한다. 텍스트·코드 파일은 mdviewer 내부 Explorer에서만 열 수 있다. | Must |
| FR-29 | 직접 실행 | Windows Explorer에서 `.md` 파일을 직접 열면 파일의 부모 폴더를 Root Folder와 Explorer의 현재 디렉터리로 설정하고 독립 Browser Window에서 연다. 직접 실행 파일에도 일반 파일 열기와 동일한 크기, 바이너리, 인코딩 검증을 적용한다. | Must |
| FR-30 | 테마 | White와 Dark 모드를 제공하며 기본값은 White 모드이다. | Must |
| FR-31 | 테마 | Explorer, 탭, 문서, 상태바, Markdown, 코드 블록, 코드 뷰어, 문법 하이라이트 토큰은 선택한 테마에 맞는 일관된 GitHub 계열 스타일을 적용한다. White는 GitHub Light 계열, Dark는 GitHub Dark 계열을 사용한다. | Must |
| FR-32 | 테마 구현 | 앱 최상위 요소의 `data-theme="light"` 또는 `data-theme="dark"`와 CSS 사용자 정의 속성으로 테마를 전환한다. 문법 하이라이트 토큰을 포함한 색상은 테마별 CSS 사용자 정의 속성으로 정의하며, White와 Dark 화면을 별도로 만들지 않는다. | Must |
| FR-33 | 집중 보기 | `F11`으로 창의 크기와 위치를 유지하는 집중 보기 모드를 전환한다. 운영체제 전체화면으로 전환하지 않는다. | Must |
| FR-34 | 집중 보기 | 집중 보기에서는 프로그램 제목 영역, 탭 영역, Explorer, 상태바를 숨기고 문서 영역만 표시한다. `F11`을 다시 누르면 기존 화면 구성을 복원한다. | Must |
| FR-35 | 집중 보기 | 집중 보기에서도 `Ctrl+Tab` 및 `Ctrl+Shift+Tab`으로 열린 문서를 전환할 수 있다. | Must |
| FR-36 | 상태바 | 일반 보기의 상태바에 활성 탭 파일의 전체 경로를 표시한다. 빈 탭에서는 파일 경로가 없음을 표시하고, 집중 보기에서는 상태바를 숨긴다. | Must |
| FR-37 | 탭 영역 | 문서를 스크롤해도 탭 영역은 창 상단에 고정한다. 탭 영역은 약 `2rem` 수준의 조밀한 높이로 표시한다. | Must |
| FR-38 | UI 언어 | 화면 텍스트, 버튼, 상태 메시지, tooltip을 영어로 표시한다. | Must |
| FR-39 | 글꼴 크기 | Markdown 본문, 텍스트 뷰어, 코드 뷰어, Markdown 코드 블록의 글꼴 크기를 조절할 수 있어야 한다. 확대는 `Ctrl` + `+` 및 `Ctrl` + `=`, 축소는 `Ctrl` + `-`, 기본 크기 복원은 `Ctrl` + `0`으로 실행한다. | Must |
| FR-40 | 글꼴 크기 | `Ctrl` + 마우스 휠 위·아래는 읽기 영역 글꼴 크기를 각각 확대·축소한다. Explorer, 탭, 버튼, 상태바 등 앱 조작 UI는 글꼴 크기 조절 대상에서 제외한다. | Must |

### 2.1 지원 파일 형식

| 구분 | 언어·형식 | 지원 확장자 |
|---|---|---|
| Markdown | Markdown | `.md` |
| 텍스트 | 일반 텍스트 | `.txt`, `.log` |
| 코드 | Python | `.py`, `.pyi` |
| 코드 | C++ | `.cpp`, `.cc`, `.cxx`, `.h`, `.hpp` |
| 코드 | TypeScript | `.ts`, `.tsx` |
| 코드 | JavaScript | `.js`, `.jsx`, `.mjs`, `.cjs` |
| 설정 | JSON | `.json`, `.jsonc` |
| 코드 | PowerShell | `.ps1`, `.psm1`, `.psd1` |
| 설정 | YAML | `.yml`, `.yaml` |
| 설정 | TOML | `.toml` |
| 코드 | Bash | `.sh`, `.bash` |

### 2.2 UI 서체 기준

| 영역 | 글꼴 | 권장 크기와 줄 높이 |
|---|---|---|
| Explorer, 탭, 버튼, 상태 표시 | `"Segoe UI Variable", "Segoe UI", "Malgun Gothic", sans-serif` | `13px`, `20px` |
| Markdown 본문 | `"Segoe UI Variable", "Segoe UI", "Malgun Gothic", sans-serif` | `16px`, `1.6` |
| 코드 블록, 코드 뷰어, 경로 | `"Cascadia Code", Consolas, monospace` | `13px`~`14px`, `1.5` |

---

## 3. 비기능 요구사항

| ID | 품질 영역 | 요구사항 | 우선순위 |
|---|---|---|---|
| NFR-01 | 사용성 | 별도 학습 없이 Explorer, 탭, 일반적인 키보드 동작으로 파일을 탐색하고 읽을 수 있어야 한다. | Must |
| NFR-02 | 단순성 | 제품은 파일 열람에 집중하며, 편집과 범용 파일 관리 기능을 UI에 포함하지 않는다. | Must |
| NFR-03 | 성능 | 일반적인 프로젝트 폴더 탐색, 문서 열기, 탭 전환, 수동 Reload가 UI를 눈에 띄게 멈추게 하지 않아야 한다. | Should |
| NFR-04 | 안정성 | 파일 시스템 오류, Root 경계 위반, 대용량 파일, 바이너리 파일, 인코딩 오류를 안전하게 처리하고 원인을 사용자에게 표시한다. | Must |
| NFR-05 | 보안 | React Renderer는 Node.js 파일 시스템 API에 직접 접근하지 않는다. 모든 파일 접근은 preload와 Electron IPC 경계를 통해 수행한다. | Must |
| NFR-06 | 보안 | Root Folder 검증을 모든 파일 탐색, 파일 읽기, 상대 이미지, 상대 Markdown 링크 처리에 일관되게 적용한다. | Must |
| NFR-07 | 유지보수성 | UI, 파일 시스템 접근, Markdown 렌더링, 텍스트·코드 렌더링의 책임을 분리한다. | Must |
| NFR-08 | 유지보수성 | 기능 단위로 수정 가능한 단순한 구조를 유지한다. | Must |
| NFR-09 | 호환성 | Windows 11에서 정상 동작하고 일반 사용자가 실행 가능한 Windows 데스크톱 애플리케이션으로 패키징할 수 있어야 한다. | Must |
| NFR-10 | 접근성 | 영어 UI의 버튼과 아이콘 버튼은 의미를 전달하는 접근 가능한 이름을 제공하고, 키보드 포커스 상태를 명확히 표시한다. | Must |
| NFR-11 | 로컬 우선 | 핵심 탐색·열람 기능은 인터넷 연결 없이 동작해야 한다. | Must |

---

## 4. 제약사항

| ID | 구분 | 제약사항 |
|---|---|---|
| CON-01 | 플랫폼 | v0.2 지원 운영체제는 Windows Desktop으로 한정한다. |
| CON-02 | 애플리케이션 | Desktop App은 Electron을 사용한다. |
| CON-03 | 프론트엔드 | UI는 React를 사용한다. |
| CON-04 | 언어 | 제품 코드는 TypeScript로 구현한다. |
| CON-05 | 빌드 | 프론트엔드 개발 및 빌드는 Vite 기반으로 구성한다. |
| CON-06 | Markdown | 기본 Markdown 렌더러는 `react-markdown`을 사용한다. |
| CON-07 | GFM | GitHub Flavored Markdown은 `remark-gfm`을 사용한다. |
| CON-08 | 작업 영역 | Browser Window는 하나의 Root Folder만 가진다. |
| CON-09 | 파일 접근 | Browser가 접근 가능한 파일은 Root Folder 및 하위 경로로 제한한다. |
| CON-10 | 인스턴스 | `.md` 파일 직접 실행은 기존 Browser Window 재사용을 강제하지 않고 독립 창을 생성한다. |
| CON-11 | 보안 | Electron `nodeIntegration`과 Renderer의 직접 파일 시스템 접근을 사용하지 않는다. |
| CON-12 | 상태 관리 | 별도 전역 상태 관리 프레임워크 도입은 지양한다. |
| CON-13 | UI 프레임워크 | 범용 UI Component Framework 도입은 지양한다. |
| CON-14 | 파일 변경 | Markdown Browser는 원본 파일을 임의로 수정하지 않는다. |

---

## 5. 비목표

| ID | 제외 기능 | v0.2 방침 |
|---|---|---|
| NG-01 | Markdown 편집 | 지원하지 않는다. |
| NG-02 | 문서 생성·삭제 | 지원하지 않는다. |
| NG-03 | Git 기능 | 지원하지 않는다. |
| NG-04 | 터미널 또는 코드 실행 | 지원하지 않는다. |
| NG-05 | 범용 파일 관리 | 지원하지 않는다. |
| NG-06 | 자동 File Watching | 지원하지 않으며 수동 Reload로 대체한다. |
| NG-07 | Obsidian Wiki Link | v0.2 범위에 포함하지 않는다. |
| NG-08 | Mermaid | v0.2 범위에 포함하지 않는다. |
| NG-09 | LaTeX / KaTeX | v0.2 범위에 포함하지 않는다. |
| NG-10 | 전문 검색 | v0.2 범위에 포함하지 않는다. |
| NG-11 | Session Restore | v0.2 범위에 포함하지 않는다. |
| NG-12 | 클라우드 동기화 | OneDrive, GitHub 등의 동기화 기능을 제공하지 않는다. |
| NG-13 | 교차 플랫폼 | macOS와 Linux 지원은 v0.2 범위에 포함하지 않는다. |

---

## 6. 변경 관리

| 순서 | 갱신 문서 | 역할 |
|---|---|---|
| 1 | `PLAN.md` | 구현 순서와 의존성을 반영한다. |
| 2 | `backlog.json` | Phase별 작업과 완료 상태를 관리한다. |
| 3 | `PRD.md` | 제품 요구사항을 반영한다. |
| 4 | `SPEC.md` | 검증 가능한 기술 명세를 반영한다. |
