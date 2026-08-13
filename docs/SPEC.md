# Markdown Browser Specification

## 1. Overview

### 1.1 Current Implementation Status

Phase 9 is complete. electron-builder packages the compiled Electron application as an NSIS Windows installer. The installer uses the Markdown Browser application identifier, permits installation-directory selection, writes artifacts to the ignored `release` directory, and declares a Viewer association for `.md` Markdown documents. HTTP and HTTPS Markdown links are passed through preload IPC to a main-process URL validator before opening in the default browser; in-window navigation remains blocked. File launches continue to pass the selected document path to the secure main-process launch handling.

Markdown Browser는 로컬 Markdown 문서를 읽기 위한 경량 Windows 데스크톱 애플리케이션이다.

애플리케이션은 Markdown 편집기가 아니라 문서 탐색 및 열람에 집중한다. 사용자는 하나의 Root Folder를 기준으로 하위 폴더의 Markdown 문서를 Explorer에서 탐색하고, 우측 Tab 영역에서 여러 문서를 전환하며 읽는다.

하나의 Browser Window는 하나의 Root Folder를 담당하며, 서로 다른 Browser Window는 독립적으로 동작한다.

### 1.2 Repository README

저장소 루트의 `README.md`는 외부 사용자를 위한 프로젝트 안내 문서다. README에는 다음을 간략히 포함한다.

- Markdown Browser의 목적
- 현재 구현 상태
- 계획된 주요 기능

---

## 2. Application Model

### 2.1 Browser Window

하나의 Markdown Browser Window는 다음 상태를 독립적으로 가진다.

- Root Folder
- Explorer 표시 상태
- Explorer의 폴더 펼침 상태
- 열린 Tab 목록
- Active Tab
- 각 Tab에 연결된 Markdown 파일

다른 Browser Window와 이 상태를 공유하지 않는다.

### 2.2 Root Folder

모든 파일 탐색은 Root Folder를 기준으로 한다.

사용자가 직접 폴더를 열면 선택한 폴더가 Root Folder가 된다.

Windows Explorer에서 Markdown 파일을 직접 실행한 경우에는 해당 Markdown 파일의 부모 디렉터리가 Root Folder가 된다.

예:

```text
D:\projects\project-a\docs\guide.md
```

를 Windows Explorer에서 실행하면 초기 Root Folder는 다음과 같다.

```text
D:\projects\project-a\docs
```

### 2.3 Scope Boundary

Markdown Browser는 Root Folder보다 상위 경로를 Explorer에서 탐색하지 않는다.

Root Folder 외부의 경로는 기본 탐색 범위에 포함하지 않는다.

v0.1에서는 `.git`, `package.json`, `AGENTS.md` 등의 파일을 이용해 프로젝트 Root를 자동 추론하지 않는다.

---

## 3. User Interface

### 3.1 Main Layout

기본 레이아웃은 좌측 Explorer와 우측 Tab 영역으로 구성한다.

```text
┌──────────────────┬─────────────────────────────────────┐
│ Explorer         │ README.md │ guide.md │ +           │
│                  ├─────────────────────────────────────┤
│ root/            │                                     │
│ ├─ README.md     │        Markdown rendered view       │
│ └─ docs/         │                                     │
│    └─ guide.md   │                                     │
└──────────────────┴─────────────────────────────────────┘
```

### 3.2 Explorer Visibility

Explorer는 표시하거나 숨길 수 있다.

기본 단축키는 다음을 권장한다.

```text
Ctrl+B
```

Explorer를 숨기더라도 Root Folder와 열린 Tab 상태는 유지된다.

### 3.3 Tab Area

우측 영역은 여러 Markdown 문서를 Tab으로 관리한다.

각 Tab은 다음 정보를 가진다.

- 고유 ID
- 제목
- 연결된 파일 경로
- Markdown 내용

파일이 아직 연결되지 않은 Tab은 빈 Tab 상태를 가진다.

---

## 4. Folder and File Behavior

### 4.1 Open Folder

사용자가 Open Folder 명령을 실행하면 시스템 Folder Picker를 표시한다.

선택된 폴더는 현재 Browser Window의 Root Folder가 된다.

Root 변경 시 기존 Tab 처리 정책은 v0.1 구현 시 명시적으로 결정해야 한다. 기본 권장 정책은 기존 Tab을 닫고 Root Folder에 대한 새 상태를 시작하는 것이다.

### 4.2 Explorer Tree

Explorer는 Root Folder 및 하위 폴더를 트리로 표시한다.

v0.1에서는 사용자가 탐색할 파일 대상으로 Markdown 파일을 우선 표시한다.

폴더는 펼치거나 접을 수 있다.

### 4.3 Markdown File Selection

Explorer에서 Markdown 파일을 클릭하면 현재 Active Tab에서 해당 문서를 연다.

예:

```text
현재 Tab:
README.md
```

상태에서 Explorer의 `guide.md`를 클릭하면 현재 Tab은 `guide.md`로 변경된다.

새 Tab을 자동으로 생성하지 않는다.

---

## 5. Tab Behavior

### 5.1 Active Tab

열린 Tab이 하나 이상이면 그중 하나를 Active Tab으로 간주한다.

Explorer에서 선택된 Markdown 문서는 Active Tab에 로드한다.

열린 Tab이 없으면 Active Tab도 없다.

### 5.2 Initial and Empty State

`mdviewer.exe`를 인자 없이 실행한 초기 상태와 마지막 Tab을 닫은 상태는 동일하다.

이 상태에서는 Markdown 문서와 Explorer를 표시하지 않고 빈 화면을 표시한다. 화면에는 새 빈 Tab을 만들기 위한 `+` 버튼만 표시한다.

사용자가 `+` 버튼을 선택하면 새 빈 Tab을 생성한다.

### 5.3 New Tab

사용자는 `+` 버튼 또는 단축키로 빈 Tab을 생성할 수 있다.

권장 단축키:

```text
Ctrl+T
```

새 Tab은 생성 직후 Active Tab이 된다.

빈 Tab 상태에서 Explorer의 Markdown 문서를 선택하면 해당 문서가 그 Tab에 연결된다.

### 5.4 Close Tab

Tab은 닫을 수 있다.

권장 단축키:

```text
Ctrl+W
```

Active Tab을 닫았을 때 다른 Tab이 남아 있으면 인접 Tab 중 하나를 새로운 Active Tab으로 선택한다.

마지막 Tab을 닫으면 열린 Tab과 Active Tab이 없는 빈 화면 상태로 전환한다.

### 5.5 Existing Document

Explorer에서 선택한 Markdown 파일이 다른 Tab에 이미 열려 있는 경우, v0.1의 권장 동작은 기존 Tab을 활성화하는 것이다.

중복 Tab을 새로 생성하지 않는다.

### 5.6 Tab Replacement

현재 Active Tab에 문서가 연결되어 있는 상태에서 Explorer의 다른 Markdown 파일을 클릭하면 Active Tab의 문서를 새 파일로 교체한다.

예:

```text
README.md │ architecture.md
             ▲ Active
```

상태에서 `guide.md`를 선택하면:

```text
README.md │ guide.md
             ▲ Active
```

가 된다.

---

## 6. Windows Integration

### 6.1 File Association

설치 또는 사용자 설정을 통해 `.md` 확장자를 Markdown Browser와 연결할 수 있어야 한다.

Windows Explorer에서 `.md` 파일을 더블클릭하면 Markdown Browser가 실행된다.

### 6.2 Direct Markdown Launch

다음 파일을 Windows Explorer에서 실행했다고 가정한다.

```text
D:\notes\study\python.md
```

새로운 Markdown Browser Window가 실행되고:

- Root Folder는 `D:\notes\study`
- 최초 Tab은 `python.md`
- `python.md`가 Active Tab

상태로 시작한다.

### 6.3 Independent Instance

기존 Markdown Browser가 실행 중이더라도 다른 `.md` 파일을 Windows Explorer에서 실행하면 기존 창을 재사용하지 않는다.

예:

```text
A.md 실행
→ Browser A

B.md 실행
→ Browser B
```

Browser A와 Browser B는 서로 독립적이다.

다음 상태를 공유하지 않는다.

- Root Folder
- 열린 Tabs
- Active Tab
- Explorer 표시 여부
- Explorer 트리 상태

Electron 구현 시 기존 창으로 전달하기 위한 single-instance 동작을 강제하지 않는다.

---

## 7. Markdown Rendering

### 7.1 Base Rendering

Markdown 문서는 HTML 형태로 렌더링하여 표시한다.

기본 구현은 다음 조합을 사용한다.

- `react-markdown`
- `remark-gfm`

### 7.2 Supported Elements

v0.1에서 최소한 다음 Markdown 요소를 읽기 쉽게 표시한다.

- Heading
- Paragraph
- Ordered / unordered list
- Checkbox
- Blockquote
- Inline code
- Code block
- Link
- Table
- Horizontal rule
- Strikethrough

### 7.3 Local Images

Markdown 문서가 상대경로로 참조하는 로컬 이미지는 Root Folder 범위 내에서 정상 표시하는 것을 권장한다.

예:

```markdown
![diagram](./images/diagram.png)
```

### 7.4 Relative Markdown Links

Markdown 문서 내부의 상대경로 `.md` 링크는 Browser 내부 문서 이동으로 처리하는 것을 권장한다.

예:

```markdown
[Architecture](./architecture.md)
```

v0.1 Must 범위가 아니라면 후속 단계로 구현할 수 있다.

---

## 8. External File Changes

Markdown Browser는 원본 파일을 편집하지 않는다.

VS Code, Codex, Obsidian 또는 다른 편집기에서 현재 열린 Markdown 파일이 변경될 수 있다.

Should 요구사항으로 파일 변경 감지를 지원한다.

변경이 감지되면 현재 Tab의 Markdown 내용을 다시 읽어 화면에 반영한다.

사용자가 수동 Reload를 수행할 수 있는 기능도 둘 수 있다.

---

## 9. Application State

권장 최소 상태 모델은 다음과 같다.

```ts
interface AppState {
  rootPath: string | null;
  explorerVisible: boolean;
  tabs: Tab[];
  activeTabId: string | null;
}

interface Tab {
  id: string;
  filePath: string | null;
  title: string;
  content: string;
}
```

초기 상태와 마지막 Tab을 닫은 상태에서는 `tabs`가 빈 배열이고 `activeTabId`는 `null`이다.

v0.1에서는 Redux와 같은 별도 전역 상태 관리 프레임워크 없이 React의 기본 상태 관리 기능을 우선 사용한다.

---

## 10. Security Boundary

React Renderer는 Node.js 파일 시스템 API를 직접 호출하지 않는다.

파일 시스템 접근은 다음 경계를 따른다.

```text
React Renderer
      │
      ▼
preload.ts
      │
      ▼
Electron IPC
      │
      ▼
main.ts
      │
      ▼
Node.js fs
```

Electron Renderer에서 `nodeIntegration`을 활성화하여 직접 `fs`를 사용하는 방식은 사용하지 않는다.

Root Folder 범위를 벗어나는 경로 접근은 가능한 한 main process 수준에서 검증한다.

---

## 11. Error Handling

최소한 다음 상황을 안전하게 처리한다.

### 11.1 Missing File

열린 Markdown 파일이 외부에서 삭제된 경우 앱이 비정상 종료되지 않아야 한다.

해당 Tab에는 파일을 찾을 수 없다는 상태를 표시한다.

### 11.2 Permission Error

파일 또는 폴더 접근 권한이 없는 경우 사용자에게 오류 상태를 표시한다.

### 11.3 Invalid Root

Root Folder가 삭제되거나 이동된 경우 Explorer를 비우고 해당 경로를 사용할 수 없음을 표시한다.

### 11.4 Unsupported File

Explorer의 기본 대상이 아닌 파일은 Markdown Renderer로 직접 열지 않는다.

---

## 12. Keyboard Shortcuts

v0.1에서 권장하는 기본 단축키는 다음과 같다.

| 기능 | 단축키 |
|---|---|
| Explorer 표시/숨김 | `Ctrl+B` |
| Open Folder | `Ctrl+O` |
| New Tab | `Ctrl+T` |
| Close Tab | `Ctrl+W` |
| Next Tab | `Ctrl+Tab` |
| Reload | `Ctrl+R` |

---

## 13. Technology Baseline

초기 구현 기술은 다음을 기준으로 한다.

```text
Application : Electron
Frontend    : React
Language    : TypeScript
Build       : Vite
Markdown    : react-markdown
GFM         : remark-gfm
State       : React built-in state
Target      : Windows Desktop
```

초기 버전에서는 대형 UI Framework 및 별도 전역 상태관리 라이브러리 도입을 지양한다.

---

## 14. v0.1 Scope

v0.1에서는 다음 기능을 우선 구현한다.

1. Windows Desktop Electron App
2. Root Folder 선택
3. Root Folder 이하 Markdown 탐색
4. Explorer 트리
5. Explorer 표시/숨김
6. 다중 Tab
7. 새 빈 Tab
8. Tab이 없는 초기/빈 화면 및 `+` 버튼 표시
9. Active Tab에서 Markdown 문서 열기
10. Tab 닫기
11. Markdown 및 GFM 렌더링
12. Windows `.md` 파일 직접 실행
13. `.md` 실행 시 부모 폴더를 Root로 사용
14. 파일 실행마다 독립 Browser Instance 생성
15. preload + IPC 기반 파일 시스템 접근

다음 기능은 후속 단계로 확장한다.

- 자동 File Watching
- Local Image 처리 고도화
- Relative Markdown Link Navigation
- Session Restore
- Search
- Mermaid
- KaTeX
- Obsidian Wiki Link

---

## 15. Change Management

사용자 요청으로 구현 또는 프로젝트 내용이 변경되면 영향받는 문서를 다음 순서로 갱신한다.

1. `PLAN.md`
2. `backlog.json`
3. `PRD.md`
4. `SPEC.md`
