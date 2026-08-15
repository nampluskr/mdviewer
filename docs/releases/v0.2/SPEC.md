# Markdown Browser v0.2 Specification

## 1. 개요

Markdown Browser v0.2는 Windows에서 Root Folder 내부의 Markdown, 텍스트, 코드 파일을 탐색하고 읽기 전용으로 열람하는 Electron 애플리케이션이다. 이 명세는 `docs/releases/v0.2/PRD.md`의 요구사항을 구현과 검증이 가능한 동작으로 정의한다.

| 항목 | 명세 |
|---|---|
| 대상 플랫폼 | Windows 11 Desktop |
| 애플리케이션 | Electron + React + TypeScript + Vite |
| Markdown | `react-markdown`과 `remark-gfm` |
| 파일 접근 경계 | React Renderer → preload → Electron IPC → main process → Node.js `fs` |
| 기본 테마 | White (`data-theme="light"`) |
| 파일 변경 반영 | 사용자 수동 Reload만 지원하며 자동 File Watching은 사용하지 않음 |
| 지원 파일 상한 | 기본 `10 MiB` (`10 × 1024 × 1024` bytes) |

## 2. 애플리케이션 상태

### 2.1 창별 상태

각 Browser Window는 다음 상태를 독립적으로 관리한다. 다른 창으로 상태를 복제하거나 공유하지 않는다.

| 상태 | 형식 | 초기값 | 설명 |
|---|---|---|---|
| `rootPath` | 절대 경로 또는 `null` | `null` | 선택한 Root Folder |
| `currentDirectoryPath` | 절대 경로 또는 `null` | `null` | Explorer가 표시하는 현재 디렉터리 |
| `explorerVisible` | Boolean | `true` | Explorer 표시 여부 |
| `explorerWidthPx` | Number | 창 기준 약 `17rem` | 현재 창에서 유지할 Explorer 폭 |
| `tabs` | Tab 목록 | 빈 배열 | 열린 빈 탭 또는 파일 탭 목록 |
| `activeTabId` | 탭 ID 또는 `null` | `null` | 활성 탭 |
| `theme` | `light` 또는 `dark` | `light` | 현재 테마 |
| `contentFontScale` | Number | `100` | 읽기 영역 글꼴 크기의 백분율 배율 |
| `focusMode` | Boolean | `false` | 집중 보기 여부 |

### 2.2 탭 상태

| 필드 | 형식 | 설명 |
|---|---|---|
| `id` | 고유 문자열 | 탭 식별자 |
| `kind` | `empty`, `markdown`, `text`, `code` | 렌더링 방식 |
| `filePath` | 절대 경로 또는 `null` | 빈 탭에서는 `null` |
| `title` | 문자열 | 파일명 또는 빈 탭 제목 |
| `content` | 문자열 | 마지막으로 성공적으로 읽은 파일 내용 |
| `language` | 문자열 또는 `null` | 코드 하이라이트 언어 |
| `error` | 오류 정보 또는 `null` | 파일을 읽거나 검증하지 못한 이유 |

`tabs`가 빈 배열이면 `activeTabId`는 반드시 `null`이다. `tabs`에 하나 이상의 항목이 있으면 `activeTabId`는 목록 안의 탭 ID여야 한다.

### 2.3 Root Folder 변경 정책

Open Folder를 성공적으로 완료했을 때 기존 탭 문서를 유지할지 닫을지는 v0.2 구현 Phase를 시작하기 전에 확정한다. 이 정책은 Root 경계와 탭 상태에 영향을 주므로, 확정 전에는 해당 동작을 구현하거나 테스트 완료로 표시하지 않는다. Folder Picker 취소 동작은 기존 상태를 변경하지 않는 것으로 확정한다.

## 3. 파일 접근과 Root 경계

### 3.1 경로 검증

모든 파일 시스템 요청은 main process에서 다음 순서로 검증한다.

1. 요청 경로와 Root Folder를 절대 경로로 정규화한다.
2. 존재하는 Root Folder와 대상은 실제 경로를 확인하여 심볼릭 링크·junction 우회를 방지한다.
3. 대상의 실제 경로가 Root Folder 실제 경로와 같거나 그 하위 경로인지 확인한다.
4. 검증 실패 시 파일을 읽거나 목록에 표시하지 않고 `OUTSIDE_ROOT` 오류를 반환한다.

대상이 존재하지 않는 상대 이미지·링크는 정규화된 경로가 Root Folder 밖을 가리키는지 먼저 확인한다. Root Folder 밖을 가리키면 `OUTSIDE_ROOT`, Root 안이지만 존재하지 않으면 `NOT_FOUND`로 처리한다.

### 3.2 Renderer와 IPC

| 구분 | 허용 동작 | 금지 동작 |
|---|---|---|
| React Renderer | UI 상태 관리, preload가 공개한 API 호출, 렌더링 | Node.js `fs` 직접 호출, 임의 IPC 채널 호출 |
| preload | 제한된 IPC API 노출과 인수 형태 검증 | Node.js API 또는 일반 IPC 객체를 Renderer에 노출 |
| main process | 경로 검증, 디렉터리 목록, 파일 읽기, 오류 분류 | 검증 전 파일 읽기, Root 밖 파일 반환 |

`nodeIntegration`은 비활성화한다. IPC는 디렉터리 목록 조회, 파일 읽기, Folder Picker, 클립보드 복사에 필요한 최소 채널만 제공한다.

파일 읽기 IPC는 지원 파일의 `content`, `kind`(`markdown`·`text`·`code`), `language`을 반환한다. 상대 리소스 IPC는 기준 Markdown 파일, 상대 경로, 기대 종류(`image` 또는 `markdown`)만 받고, 성공 시 검증된 기존 파일 경로만 반환한다.

### 3.3 오류 결과

파일 관련 IPC 결과는 성공 여부와 오류 코드를 구분해 반환한다.

| 코드 | 발생 조건 | UI 처리 |
|---|---|---|
| `NOT_FOUND` | 파일 또는 폴더가 삭제되었거나 존재하지 않음 | 영어 오류 상태와 대상 경로 표시 |
| `ACCESS_DENIED` | 읽기 또는 목록 권한이 없음 | 영어 권한 오류 상태 표시 |
| `OUTSIDE_ROOT` | Root 밖 경로 또는 링크 우회 경로 | 접근 거부 상태 표시 |
| `ROOT_UNAVAILABLE` | Root Folder가 삭제·이동되었거나 읽을 수 없음 | Explorer를 비우고 Root 사용 불가 상태 표시 |
| `FILE_TOO_LARGE` | 텍스트·코드 파일이 `10 MiB` 초과 | 파일을 열지 않고 상한 초과 상태 표시 |
| `BINARY_FILE` | NUL byte 등 바이너리 파일 징후가 발견됨 | 파일을 열지 않고 바이너리 파일 상태 표시 |
| `UNSUPPORTED_ENCODING` | UTF-8로 해석할 수 없는 텍스트·코드 파일 | 파일을 열지 않고 인코딩 오류 상태 표시 |
| `UNSUPPORTED_TYPE` | 지원 확장자가 아님 | Explorer에 표시하지 않으며 직접 열기 요청도 거부 |

오류 메시지와 상태 표시는 영어로 제공한다.

## 4. Explorer

### 4.1 목록 모델과 정렬

Explorer는 `currentDirectoryPath`의 직접 자식만 표시한다. 하위 폴더 전체를 재귀적으로 표시하는 트리 UI를 사용하지 않는다.

| 항목 | 표시 규칙 | 선택·실행 규칙 |
|---|---|---|
| `..` | 항상 목록 첫 번째 항목 | Root에서는 비활성화, Root 밖에서는 부모 폴더로 이동 |
| 폴더 | `currentDirectoryPath`의 직접 자식 폴더 | 클릭, Enter, `→`로 해당 폴더로 이동 |
| 지원 파일 | 표 4.2의 직접 자식 파일 | 클릭 또는 Enter로 탭에서 열기 |
| 이미지·미지원 파일 | 표시하지 않음 | 직접 열기 불가 |

`..` 다음에는 폴더를 이름 오름차순으로 표시하고, 그 다음에 지원 파일을 이름 오름차순으로 표시한다. 이름 비교는 Windows의 대소문자 비구분 동작을 따른다.

### 4.2 지원 확장자와 언어

| 종류 | 확장자 | 탭 `kind` | 하이라이트 언어 |
|---|---|---|---|
| Markdown | `.md` | `markdown` | 코드 fence의 언어 정보 사용 |
| 일반 텍스트 | `.txt`, `.log` | `text` | 없음 |
| Python | `.py`, `.pyi` | `code` | Python |
| C++ | `.cpp`, `.cc`, `.cxx`, `.h`, `.hpp` | `code` | C++ |
| TypeScript | `.ts`, `.tsx` | `code` | TypeScript |
| JavaScript | `.js`, `.jsx`, `.mjs`, `.cjs` | `code` | JavaScript |
| JSON | `.json`, `.jsonc` | `code` | JSON |
| PowerShell | `.ps1`, `.psm1`, `.psd1` | `code` | PowerShell |
| YAML | `.yml`, `.yaml` | `code` | YAML |
| TOML | `.toml` | `code` | TOML |
| Bash | `.sh`, `.bash` | `code` | Bash |

확장자 비교는 대소문자를 구분하지 않는다. 이미지 확장자 `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`는 Markdown 안에서만 렌더링할 수 있고 Explorer에는 표시하지 않는다.

### 4.3 키보드와 포커스

Explorer에 키보드 포커스가 있을 때 다음 동작을 적용한다.

| 입력 | 동작 |
|---|---|
| `↑`, `↓` | 목록 내 이전·다음 선택 가능 항목으로 이동 |
| `→` | 선택한 폴더로 이동. 파일과 비활성 `..`에서는 동작 없음 |
| `←` | Root 밖인 경우 부모 폴더로 이동. Root에서는 동작 없음 |
| `Enter` | 폴더 또는 `..`이면 이동, 파일이면 열기 |
| `Tab` | Explorer 다음 화면 컨트롤로 포커스를 이동 |

키보드 선택 항목은 지속적인 선택 색상과 focus 표시를 사용한다. 마우스 hover는 별도 색상으로 표현하고 선택 상태를 대체하지 않는다.

### 4.4 헤더, 폭, 표시 상태

Explorer 헤더는 `Open`, `Reload`를 영어로 표시한다. 아이콘 도입 전에는 텍스트 버튼을 사용하고, 아이콘 도입 시 SVG 아이콘 버튼과 영어 tooltip·접근 가능한 이름을 사용한다.

폭은 기본 약 `17rem`이다. 드래그 시 최소 약 `12rem`, 최대 창 너비의 45%로 제한한다. 드래그 중에는 `col-resize` 커서를 사용하고 텍스트 선택을 금지한다. Explorer를 숨겼다가 표시할 때는 현재 창의 마지막 폭을 복원하지만, 앱 종료 후에는 복원하지 않는다.

## 5. 탭과 파일 열기

### 5.1 탭 생성과 닫기

| 동작 | 결과 |
|---|---|
| 인자 없는 앱 시작 | 탭 없는 빈 화면과 `+` 버튼 표시 |
| `+` 또는 `Ctrl+T` | 새 `empty` 탭 생성 후 활성화 |
| 탭 닫기 | 다른 탭이 있으면 인접 탭을 활성화, 없으면 빈 화면으로 전환 |
| `Ctrl+Tab` | 다음 탭 활성화. 마지막 탭에서는 첫 탭으로 순환 |
| `Ctrl+Shift+Tab` | 이전 탭 활성화. 첫 탭에서는 마지막 탭으로 순환 |

### 5.2 파일 열기 규칙

1. 파일 경로와 확장자를 검증하고 내용을 읽는다.
2. 같은 절대 경로의 파일 탭이 있으면 해당 탭을 활성화하고 새 탭을 만들지 않는다.
3. 활성 탭이 `empty`이면 그 탭을 파일 탭으로 바꾼다.
4. 그 외에는 새 파일 탭을 생성하고 활성화한다.
5. 읽기 실패 시 기존 탭의 정상 내용을 덮어쓰지 않는다. 요청에 연결된 탭에는 오류 상태를 표시할 수 있다.

Markdown 탭은 Markdown과 GFM으로 렌더링하고, 텍스트·코드 탭은 읽기 전용 텍스트 뷰어로 렌더링한다. 어떠한 탭도 원본 파일을 변경하지 않는다.

### 5.3 직접 실행

Windows Explorer에서 `.md` 파일을 직접 실행하면 새 Browser Window를 생성한다. 새 창은 다음 상태로 시작한다.

직접 실행 파일은 Renderer에 전달하기 전에 일반 파일 읽기와 동일하게 `10 MiB` 상한, NUL byte 바이너리 징후, UTF-8 fatal decoding 검증을 통과해야 한다. 실패하면 새 창은 해당 구조화된 오류 상태로 시작한다.

| 상태 | 값 |
|---|---|
| `rootPath` | 실행한 `.md` 파일의 부모 폴더 |
| `currentDirectoryPath` | `rootPath`와 동일 |
| `tabs` | 실행 파일 하나를 가진 Markdown 탭 |
| `activeTabId` | 실행 파일 탭의 ID |

텍스트·코드 확장자는 Windows 파일 연결 대상으로 등록하지 않는다. `.md` 직접 실행은 기존 창 재사용이나 single-instance 전달을 강제하지 않는다.

## 6. 렌더링

### 6.1 Markdown

Markdown 렌더링은 `react-markdown`과 `remark-gfm`을 사용한다. Heading, paragraph, 목록, task list, blockquote, inline code, code block, link, table, horizontal rule, strikethrough를 읽기 쉬운 GitHub Markdown 계열 스타일로 표시한다.

Markdown 원문 HTML을 신뢰하지 않으며, HTML 실행을 위한 위험한 렌더러 또는 Renderer의 임의 Node.js 접근을 추가하지 않는다.

### 6.2 코드 블록과 코드 뷰어

코드 fence 언어 정보와 표 4.2의 확장자 언어에 대해 Python, C++, TypeScript, JavaScript, JSON, PowerShell, YAML, TOML, Bash 하이라이트를 적용한다. 알 수 없는 코드 fence는 하이라이트 없이 읽기 전용 코드 블록으로 표시한다.

각 코드 블록과 코드 뷰어에는 영어 접근 가능한 이름을 가진 Copy 버튼을 제공한다. Copy가 성공하면 영어 성공 상태를, 실패하면 영어 오류 상태를 표시한다. 복사 동작은 파일을 변경하지 않는다.

### 6.3 상대 로컬 이미지

Markdown 이미지 URL이 상대 경로이고 허용 확장자에 해당하면 현재 Markdown 파일의 부모 폴더를 기준으로 해석한다. 경로 검증을 통과한 Root Folder 내부 기존 파일만 표시한다.

| 조건 | 렌더링 결과 |
|---|---|
| 지원 형식, 존재, Root 내부 | 이미지 표시 |
| 파일 없음 | Markdown 대체 텍스트와 `NOT_FOUND` 상태 표시 |
| Root 밖 또는 링크 우회 | Markdown 대체 텍스트와 `OUTSIDE_ROOT` 상태 표시 |
| 미지원 형식 | 이미지 로드하지 않고 대체 텍스트와 오류 상태 표시 |

### 6.4 상대 Markdown 링크

상대 경로 `.md` 링크는 현재 Markdown 파일의 부모 폴더를 기준으로 해석한다. 대상이 존재하고 Root Folder 내부이면 기본 브라우저를 열지 않고 앱 내부 파일 열기 규칙을 적용한다. 존재하지 않거나 Root 밖이면 탭을 열지 않고 영어 오류 상태를 표시한다.

## 7. 수동 Reload와 오류 복구

### 7.1 Reload

`Reload` 버튼, `Ctrl+R`, `F5`는 동일한 수동 Reload 동작을 실행한다.

1. `currentDirectoryPath`의 목록을 다시 읽어 Explorer를 갱신한다.
2. 활성 탭에 연결된 파일이 있으면 해당 파일을 다시 읽어 렌더링 내용을 갱신한다.
3. 읽기 실패 시 앱을 종료하지 않고 오류 상태를 표시한다.

활성 탭 이외의 열린 파일은 Reload로 다시 읽지 않는다. 파일·폴더 자동 감시, debounce 감시, 백그라운드 재읽기는 구현하지 않는다.

### 7.2 Root 및 파일 오류 복구

| 상황 | 처리 |
|---|---|
| 활성 파일이 삭제됨 | 탭을 유지하고 `NOT_FOUND` 오류 상태 표시 |
| 현재 디렉터리가 삭제됨 | Root가 유효하면 `currentDirectoryPath`를 Root로 되돌리고 목록을 다시 읽음 |
| Root가 삭제·이동됨 | Explorer를 비우고 `ROOT_UNAVAILABLE` 상태 표시 |
| 권한 오류 | 기존 성공 상태를 유지할 수 있으면 유지하고, 실패 대상에 `ACCESS_DENIED` 표시 |

## 8. 테마와 레이아웃

### 8.1 테마

앱 최상위 요소에 `data-theme="light"` 또는 `data-theme="dark"`를 설정한다. 색상은 CSS 사용자 정의 속성으로 정의하고, 테마별 별도 화면을 만들지 않는다.

| 영역 | Light | Dark |
|---|---|---|
| Markdown, 코드 블록, 코드 뷰어 | GitHub Light 계열 | GitHub Dark 계열 |
| Explorer, 탭, 상태바, 경계선 | Light CSS 변수 | Dark CSS 변수 |
| 문법 하이라이트 토큰 | Light CSS 변수 | Dark CSS 변수 |

기본값은 `light`이다. 테마 전환을 제공하는 컨트롤은 영어 접근 가능한 이름과 현재 선택 상태를 제공해야 한다.

### 8.2 서체와 탭 영역

| 영역 | 글꼴 | 크기·줄 높이 |
|---|---|---|
| Explorer, 탭, 버튼, 상태 표시 | `"Segoe UI Variable", "Segoe UI", "Malgun Gothic", sans-serif` | `13px`, `20px` |
| Markdown 본문 | `"Segoe UI Variable", "Segoe UI", "Malgun Gothic", sans-serif` | `16px`, `1.6` |
| 코드 블록, 코드 뷰어, 경로 | `"Cascadia Code", Consolas, monospace` | `13px`~`14px`, `1.5` |

탭 영역은 문서 스크롤 영역 바깥의 창 상단에 두고 약 `2rem` 높이로 유지한다. 문서 본문 스크롤 중에도 탭 영역은 이동하지 않는다.

### 8.3 읽기 영역 글꼴 크기

글꼴 크기 조절은 Markdown 본문, 텍스트 뷰어, 코드 뷰어, Markdown 코드 블록에만 적용한다. Explorer, 탭, 버튼, 상태바 등 앱 조작 UI의 글꼴 크기와 레이아웃 크기는 변경하지 않는다.

| 입력 | 동작 |
|---|---|
| `Ctrl` + `+`, `Ctrl` + `=` | `contentFontScale`을 한 단계 확대 |
| `Ctrl` + `-` | `contentFontScale`을 한 단계 축소 |
| `Ctrl` + 마우스 휠 위 | `contentFontScale`을 한 단계 확대 |
| `Ctrl` + 마우스 휠 아래 | `contentFontScale`을 한 단계 축소 |
| `Ctrl` + `0` | `contentFontScale`을 기본값 `100`으로 복원 |

한 단계는 기본 글꼴 크기의 10%로 한다. `contentFontScale`은 80%보다 작아지거나 200%보다 커질 수 없다. 단축키 또는 `Ctrl` + 휠 입력이 배율 한계에 도달하면 해당 입력은 추가 변경을 일으키지 않는다. 이 설정은 Browser Window별 런타임 상태이며 앱 종료 후 복원하지 않는다.

### 8.4 집중 보기와 상태바

`F11`은 운영체제 전체화면 API를 호출하지 않고 `focusMode`만 전환한다.

| 모드 | 표시 요소 |
|---|---|
| 일반 보기 | 제목 영역, 탭 영역, Explorer, 문서 영역, 상태바 |
| 집중 보기 | 문서 영역만 |

집중 보기에서도 `Ctrl+Tab` 및 `Ctrl+Shift+Tab`으로 탭을 전환한다. `F11`을 다시 누르면 집중 보기 전의 Explorer 표시 상태와 폭을 포함한 일반 레이아웃을 복원한다. 상태바는 일반 보기에서 활성 파일의 전체 경로를, 빈 탭에서는 경로 없음 상태를 영어로 표시한다.

## 9. 비목표

v0.2에서는 Markdown 편집, 문서 생성·삭제, Git, 터미널·코드 실행, 범용 파일 관리, 자동 File Watching, Obsidian Wiki Link, Mermaid, LaTeX/KaTeX, 전문 검색, Session Restore, 클라우드 동기화, macOS 및 Linux 지원을 구현하지 않는다.

## 10. 검증 기준

| 범주 | 완료 기준 |
|---|---|
| Root 경계 | Root 밖 경로와 symlink·junction 우회 경로의 목록·읽기·이미지·링크 접근이 모두 거부된다. |
| Explorer | 지원 파일만 표시되고, `..`의 Root 경계, 키보드 이동, 정렬, 폭 제한, 숨김 후 폭 유지가 동작한다. |
| 탭 | 빈 상태, 새 빈 탭, 중복 파일 탭 활성화, 키보드 순환 전환, 파일 열기 규칙이 동작한다. |
| 렌더링 | Markdown/GFM, 지원 코드 하이라이트, 코드 복사, 상대 이미지, 상대 Markdown 링크가 명세대로 동작한다. |
| Reload | `Reload`, `Ctrl+R`, `F5`가 Explorer와 활성 파일만 갱신하며 자동 감시는 발생하지 않는다. |
| 오류 | 표 3.3의 오류가 앱 비정상 종료 없이 영어 상태로 표시된다. |
| 테마·글꼴·집중 보기 | 기본 Light 테마, CSS 변수 전환, 읽기 영역 글꼴 크기 단축키·`Ctrl` + 휠·기본값 복원, F11 집중 보기, 일반 보기 복원이 동작한다. |
| 보안 | Renderer의 Node.js 직접 접근이 없고, 모든 파일 시스템 작업이 preload와 IPC를 통해 main process 검증을 거친다. |

## 11. 교차 벤더 적대적 검증

구현 Phase가 완료되면 마지막 실질 구현자와 반대 벤더의 읽기 전용 CLI가 해당 Phase의 제품 소스만 검토한다. Codex 구현은 Claude Sonnet headless CLI가, Claude Code 구현은 Codex CLI `gpt-5.6-sol`이 검토한다.

검토 결과는 `docs/releases/v0.2/reviews/A{n}.md`에 기록한다. 각 지적은 Critical, Major, Minor 등급, 재현 조건, 위반 SPEC 조항, 처리 상태를 포함해야 한다. 유효한 Critical을 모두 수정하고 검증을 다시 실행한 뒤 동일 반대 벤더 검토로 해소를 확인한다.

## 12. 변경 관리

사용자 요청으로 구현 또는 프로젝트 내용이 변경되면 영향받는 문서를 다음 순서로 갱신한다.

1. `PLAN.md`
2. `docs/releases/v0.2/backlog.json`
3. `PRD.md`
4. `SPEC.md`
