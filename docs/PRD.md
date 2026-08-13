# Markdown Browser PRD

## 1. Product Overview

### Current Implementation Status

Phase 8 is complete. Markdown-file read failures are retained on the affected tab and shown without terminating the application. Explorer listing errors, including an unavailable Root Folder or access denial, are displayed in the Explorer. The main process continues to validate all IPC paths as absolute, Root-contained, real filesystem paths and rejects unsupported file types before reading.

Markdown Browser는 선택한 로컬 폴더와 그 하위 폴더의 Markdown 문서를 탐색하고, 여러 문서를 탭으로 열람할 수 있는 경량 Windows 데스크톱 애플리케이션이다.

핵심 목표는 Markdown 편집기가 아니라, 프로젝트 또는 문서 폴더를 대상으로 빠르게 탐색하고 읽는 전용 브라우저를 제공하는 것이다.

---

## 2. Functional Requirements

| ID | 기능 영역 | 요구사항 | 우선순위 |
|---|---|---|---|
| FR-01 | Root Folder | 하나의 Browser 창은 하나의 Root Folder를 관리한다 | Must |
| FR-02 | Folder Open | 사용자가 임의의 폴더를 Root Folder로 선택할 수 있다 | Must |
| FR-03 | Scope | Root Folder와 그 하위 폴더의 문서만 탐색한다 | Must |
| FR-04 | Explorer | Root 이하 폴더와 Markdown 파일을 트리 형태로 표시한다 | Must |
| FR-05 | Explorer | 폴더 트리를 펼치고 접을 수 있다 | Must |
| FR-06 | Explorer | Explorer 영역을 표시하거나 숨길 수 있다 | Must |
| FR-07 | Tabs | 여러 Markdown 문서를 탭으로 열 수 있다 | Must |
| FR-08 | Tabs | 새 빈 탭을 생성할 수 있다 | Must |
| FR-09 | Tabs | 탭을 선택하고 닫을 수 있다. 마지막 탭을 닫으면 탭이 없는 빈 화면으로 전환한다 | Must |
| FR-09a | Initial State | `mdviewer.exe`를 인자 없이 실행하면 탭이 없는 빈 화면을 표시하고, 새 빈 탭을 만드는 `+` 버튼만 표시한다 | Must |
| FR-10 | Document Open | Explorer의 Markdown 파일 클릭 시 활성 탭에서 문서를 연다 | Must |
| FR-11 | Document Open | 빈 탭에서 문서 선택 시 해당 탭에 문서를 연다 | Must |
| FR-12 | Duplicate | 이미 열린 문서를 선택하면 기존 탭을 활성화한다 | Should |
| FR-13 | Rendering | Markdown 문서를 렌더링하여 표시한다 | Must |
| FR-14 | Rendering | GitHub Flavored Markdown을 지원한다 | Must |
| FR-15 | Windows Open | Windows Explorer에서 `.md` 파일을 직접 실행할 수 있다 | Must |
| FR-16 | File Association | `.md` 파일을 Markdown Browser와 연결할 수 있다 | Must |
| FR-17 | Independent Window | Windows에서 별도의 `.md` 파일 실행 시 독립 Browser를 실행한다 | Must |
| FR-18 | Auto Root | 직접 실행된 `.md` 파일의 부모 폴더를 기본 Root로 설정한다 | Must |
| FR-19 | Multi Window | 여러 Browser 창이 서로 독립적인 Root 및 Tab 상태를 가진다 | Must |
| FR-20 | File Monitoring | 열린 Markdown 파일의 외부 변경을 감지하여 다시 표시한다 | Should |
| FR-21 | Local Assets | Markdown에서 상대경로로 참조하는 로컬 이미지를 표시한다 | Should |
| FR-22 | Links | Markdown 내부 상대경로 `.md` 링크를 Browser 내에서 이동할 수 있다 | Should |
| FR-23 | Keyboard | Explorer 토글, 새 탭, 탭 닫기 등 기본 단축키를 제공한다 | Should |
| FR-24 | Status | 현재 Root Folder 경로를 사용자에게 표시한다 | Could |

---

## 3. Non-Functional Requirements

| ID | 품질 영역 | 요구사항 | 우선순위 |
|---|---|---|---|
| NFR-01 | Usability | 별도 학습 없이 Explorer와 Tab 방식으로 사용할 수 있어야 한다 | Must |
| NFR-02 | Simplicity | Markdown 열람에 집중한 최소 UI를 유지한다 | Must |
| NFR-03 | Performance | 일반적인 프로젝트 폴더를 열 때 UI가 눈에 띄게 멈추지 않아야 한다 | Should |
| NFR-04 | Responsiveness | Explorer 표시/숨김 및 탭 전환이 즉각적으로 동작해야 한다 | Should |
| NFR-05 | Reliability | 하나의 독립 Browser 창 상태가 다른 창 상태에 영향을 주지 않아야 한다 | Should |
| NFR-06 | Security | React Renderer가 Node.js 파일 시스템에 직접 접근하지 않는다 | Must |
| NFR-07 | Security | 파일 접근은 Electron preload 및 IPC 경계를 통해 수행한다 | Must |
| NFR-08 | Maintainability | UI, 파일 시스템, Markdown 렌더링 책임을 분리한다 | Must |
| NFR-09 | Maintainability | Codex가 기능 단위로 쉽게 수정할 수 있는 단순한 구조를 유지한다 | Must |
| NFR-10 | Dependency | 초기 버전의 외부 라이브러리 의존성을 최소화한다 | Should |
| NFR-11 | Compatibility | Windows 11에서 정상 동작해야 한다 | Must |
| NFR-12 | Packaging | 일반 사용자가 실행 가능한 Windows 애플리케이션으로 패키징 가능해야 한다 | Must |
| NFR-13 | Readability | 코드 블록, 표, 제목, 목록 등 Markdown 요소가 명확하게 구분되어야 한다 | Must |
| NFR-14 | Extensibility | 향후 Mermaid, KaTeX, 검색 등을 추가할 수 있는 구조를 유지한다 | Should |
| NFR-15 | Documentation | 저장소의 README는 프로젝트 목적, 현재 구현 상태, 계획된 주요 기능을 외부 사용자가 이해할 수 있도록 간략히 안내한다 | Must |

---

## 4. Constraints

| ID | 구분 | 제약사항 |
|---|---|---|
| CON-01 | Platform | v0.1의 대상 OS는 Windows Desktop으로 제한한다 |
| CON-02 | Application | Desktop App은 Electron을 사용한다 |
| CON-03 | Frontend | UI는 React를 사용한다 |
| CON-04 | Language | 구현 언어는 TypeScript를 사용한다 |
| CON-05 | Build | Frontend 개발 및 빌드는 Vite 기반으로 한다 |
| CON-06 | Markdown | 기본 Markdown Renderer는 react-markdown을 사용한다 |
| CON-07 | GFM | GitHub Flavored Markdown은 remark-gfm을 사용한다 |
| CON-08 | Workspace | 하나의 Browser Window는 하나의 Root Folder만 가진다 |
| CON-09 | File Scope | Browser에서 접근 가능한 파일은 Root Folder 이하로 제한한다 |
| CON-10 | File Type | Explorer의 주요 탐색 대상은 `.md` Markdown 문서이다 |
| CON-11 | Instance | `.md` 파일의 외부 실행 시 기존 Browser Window를 강제로 재사용하지 않는다 |
| CON-12 | Initial Root | Windows에서 `.md` 직접 실행 시 해당 파일의 부모 디렉터리를 Root로 사용한다 |
| CON-13 | Security | Electron `nodeIntegration`에 의존한 Renderer 직접 파일 접근을 사용하지 않는다 |
| CON-14 | State | v0.1에서는 Redux 등 별도 전역 상태관리 프레임워크를 도입하지 않는다 |
| CON-15 | UI Framework | v0.1에서는 대형 UI Component Framework 도입을 지양한다 |
| CON-16 | Network | 핵심 기능은 인터넷 연결 없이 사용할 수 있어야 한다 |
| CON-17 | File Mutation | Markdown Browser는 원본 Markdown 파일을 임의로 수정하지 않는다 |

---

## 5. Non-Goals

| ID | 제외 기능 | v0.1 정책 |
|---|---|---|
| NG-01 | Markdown 편집 | 지원하지 않음 |
| NG-02 | 문서 생성/삭제 | 지원하지 않음 |
| NG-03 | Git 기능 | 지원하지 않음 |
| NG-04 | 터미널 | 지원하지 않음 |
| NG-05 | 코드 실행 | 지원하지 않음 |
| NG-06 | Obsidian Wiki Link | `[[wiki link]]`는 초기 범위에서 제외 |
| NG-07 | Mermaid | 초기 범위에서 제외 |
| NG-08 | LaTeX / KaTeX | 초기 범위에서 제외 |
| NG-09 | Full-text Search | 초기 범위에서 제외 |
| NG-10 | Project Root 자동 탐지 | `.git`, `AGENTS.md` 등을 이용한 Root 추론은 초기 범위에서 제외 |
| NG-11 | Cloud/Sync | OneDrive, GitHub 등의 자체 동기화 기능은 제공하지 않음 |
| NG-12 | Cross-platform | macOS 및 Linux 패키징은 v0.1 범위에서 제외 |

---

## 6. v0.1 Scope Summary

v0.1의 핵심 범위는 다음과 같다.

- Root Folder 선택
- 좌측 Explorer 트리
- Explorer 표시/숨김
- 우측 다중 탭
- 인자 없이 실행하거나 마지막 탭을 닫았을 때의 탭 없는 빈 화면 및 `+` 버튼
- 활성 탭에서 Markdown 문서 열기
- 새 빈 탭 생성 및 닫기
- Markdown 및 GFM 렌더링
- Windows `.md` 파일 연결 및 직접 실행
- `.md` 직접 실행 시 독립 Browser 인스턴스 생성
- 직접 실행된 파일의 부모 디렉터리를 Root Folder로 사용
- Root Folder 이하로 파일 탐색 범위 제한

---

## 7. Change Management

사용자 요청으로 구현 또는 프로젝트 내용이 변경되면 영향받는 문서를 다음 순서로 갱신한다.

1. `PLAN.md`
2. `backlog.json`
3. `PRD.md`
4. `SPEC.md`
