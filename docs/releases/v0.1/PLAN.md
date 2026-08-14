# Markdown Browser Implementation Plan

## Phase Overview

| Phase | 제목 | 내용 |
|---|---|---|
| 0 | 환경 구성과 Git 초기화 | 개발에 필요한 Node.js, npm, Git, Python 보조 도구를 확인하고 프로젝트 Git 저장소와 기본 `.gitignore`, 외부 사용자를 위한 README를 준비한다. |
| 1 | 프로젝트 기반 구성 | Electron, React, TypeScript, Vite 기반 프로젝트를 구성하고 main·preload·renderer 프로세스의 기본 경계를 설정한다. |
| 2 | 보안 파일 시스템 API | preload와 IPC를 통해 Root Folder 선택, 폴더 탐색, Markdown 파일 읽기 API를 구현한다. Root 외부 접근을 검증한다. |
| 3 | 애플리케이션 상태와 빈 화면 | Root, Explorer 표시 여부, 탭 목록, 활성 탭 상태를 구성한다. 무인자 실행 및 마지막 탭 종료 시 `+` 버튼만 보이는 빈 화면을 구현한다. |
| 4 | Explorer와 파일 열기 | Root Folder 하위의 Markdown 파일과 폴더 트리를 표시하고, 폴더 펼침·접힘 및 활성 탭에서의 문서 열기를 구현한다. |
| 5 | 탭 관리 | 빈 탭 생성, 탭 전환·닫기, 중복 문서 탭 활성화, 활성 탭 문서 교체 규칙을 구현한다. |
| 6 | Markdown 렌더링 | `react-markdown`, `remark-gfm`을 적용하고 제목, 표, 체크박스, 코드 블록 등 GFM 요소의 가독성을 위한 스타일을 구성한다. |
| 7 | Windows 실행 연동 | `.md` 파일 직접 실행 시 부모 폴더를 Root로 설정하고 해당 파일을 활성 탭으로 여는 흐름 및 독립 창 동작을 구현한다. |
| 8 | 오류 처리와 검증 | 파일 삭제·권한 오류·유효하지 않은 Root를 처리하고, 핵심 사용자 흐름과 보안 경계를 검증한다. |
| 9 | 패키징 | Windows 배포용 패키징, `.md` 파일 연결, 설치 후 실행 검증을 수행한다. |

## 교차 적대적 검증 프로토콜

각 Phase의 마지막 실질 구현자와 다른 벤더의 CLI가 검토한다. Codex가 마지막 구현자이면 Claude Sonnet headless CLI가, Claude Code가 마지막 구현자이면 Codex CLI(`gpt-5.6-sol`)가 담당한다. 토큰 한도로 구현자가 교체되어도 검토자는 마지막 실질 구현자를 기준으로 선택한다.

검토자는 지정 제품 소스, `backlog.json`의 Phase별 `adversarialFocus`, `specRefs`만 읽는다. 세션 대화, 구현 근거, 문서·설정·테스트 산출물, Git 정보, 셸 도구는 검토 컨텍스트에서 제외한다. 결과는 `reviews/A{n}.md`에 Critical/Major/Minor, 재현 조건, SPEC 조항, 처리 상태를 기록한다. Critical 수정 뒤에는 같은 반대 벤더 검토를 재실행한다.

| Phase | 검토 ID | 공격 초점 | 필수 통과 |
|---|---|---|---|
| 0 | A0 | 도구·문서·Git 초기화의 재현성 | 아니오 |
| 1 | A1 | Renderer/Preload/Main 보안 경계와 빌드 진입점 | 아니오 |
| 2 | A2 | Root 경계 우회, 심볼릭 링크, IPC 입력 검증, 권한·오류 처리 | 예 |
| 3 | A3 | 빈 상태, 마지막 탭 종료, 창별 상태 격리 | 아니오 |
| 4 | A4 | 트리 순회, Root 외부 노출, 활성 탭 파일 교체 | 아니오 |
| 5 | A5 | 중복 탭, 활성 탭 선택, 마지막 탭 전환 | 아니오 |
| 6 | A6 | 비신뢰 Markdown 렌더링, GFM 실패, 긴 문서 가독성 | 아니오 |
| 7 | A7 | 실행 인자 검증, 파일 연결, 독립 창과 Root 격리 | 예 |
| 8 | A8 | 삭제·권한·잘못된 Root 오류, IPC 경계 회귀 | 예 |
| 9 | A9 | 설치·연결 등록·배포 산출물의 Windows 실행 경로 | 아니오 |

## Phase 0. 환경 구성과 Git 초기화

### 목표

개발과 검증에 필요한 도구를 확인하고, 이후 Phase의 변경 이력을 관리할 Git 저장소를 준비한다.

### 작업 범위

- Node.js, npm, Git의 설치 및 버전 확인
- 보조 작업이 필요한 경우 지정된 Python 인터프리터의 실행 확인
- 프로젝트 루트에서 Git 저장소 초기화
- GitHub 원격 저장소 `https://github.com/nampluskr/mdviewer.git` 등록
- Electron 및 Node.js 산출물에 적합한 기본 `.gitignore` 구성
- 외부 사용자를 위한 간략한 `README.md` 작성
- 초기 문서와 설정을 기준으로 첫 커밋 준비
- 사용자 요청으로 구현 또는 프로젝트 내용이 변경될 때의 문서 갱신 순서 정의

### 완료 기준

- Node.js, npm, Git을 개발 환경에서 사용할 수 있다.
- 지정된 Python 인터프리터를 보조 도구로 실행할 수 있다.
- 프로젝트 루트가 Git 저장소로 초기화되어 있다.
- `origin` 원격 저장소가 `https://github.com/nampluskr/mdviewer.git`을 가리킨다.
- 불필요한 의존성 및 빌드 산출물이 Git 추적 대상에서 제외된다.
- `README.md`가 프로젝트 목적, 현재 구현 상태, 계획된 주요 기능을 간략히 안내한다.
- 이후 Phase별 커밋과 푸시를 수행할 수 있는 상태다.
- 요구사항 변경 시 `PLAN.md → backlog.json → PRD.md → SPEC.md` 순서로 문서를 갱신한다.

## Phase 1. 프로젝트 기반 구성

### 목표

Windows용 Electron 애플리케이션의 개발·빌드 기반을 마련하고, 프로세스 간 책임을 분리한다.

앱 기능은 Python을 사용하지 않고 TypeScript로 구현한다. Python은 필요할 때 테스트 및 검증을 위한 보조 도구로만 사용한다.

### 작업 범위

- Electron, React, TypeScript, Vite 기반 프로젝트 구성
- Electron main process, preload, renderer 진입점 구성
- 개발 실행과 배포 빌드 스크립트 구성
- Renderer에서 Node.js API에 직접 접근하지 않도록 기본 보안 옵션 설정

### 완료 기준

- 개발 환경에서 빈 Electron 창이 실행된다.
- renderer, preload, main process가 분리되어 동작한다.
- production 빌드를 생성할 수 있다.

## Phase 2. 보안 파일 시스템 API

### 목표

파일 시스템 접근을 main process로 제한하고, Renderer에는 필요한 최소 기능만 제공한다.

### 작업 범위

- 시스템 Folder Picker를 통한 Root Folder 선택
- Root Folder 하위의 폴더 및 Markdown 파일 목록 조회
- Markdown 파일 내용 읽기
- 요청 경로가 Root Folder 범위 안에 있는지 검증
- 경로 오류, 권한 오류, 존재하지 않는 파일 오류를 구조화하여 반환

### 완료 기준

- Renderer가 preload API를 통해서만 파일 시스템 기능을 호출한다.
- Root 밖의 파일 읽기 요청이 거부된다.
- 정상·오류 결과를 UI가 구분하여 처리할 수 있다.

## Phase 3. 애플리케이션 상태와 빈 화면

### 목표

창별 상태 모델을 구성하고, 탭이 없는 유효한 초기 상태를 구현한다.

### 작업 범위

- `rootPath`, `explorerVisible`, `tabs`, `activeTabId` 상태 관리
- `mdviewer.exe`를 인자 없이 실행했을 때의 초기 상태 구현
- 마지막 탭을 닫았을 때 탭 목록과 활성 탭을 비우는 처리
- 탭이 없을 때 Markdown 문서와 Explorer를 숨기고 `+` 버튼만 표시하는 빈 화면 구현
- `+` 버튼으로 새 빈 탭 생성

### 완료 기준

- 초기 상태에서 `tabs`는 빈 배열이고 `activeTabId`는 `null`이다.
- 마지막 탭을 닫아도 애플리케이션이 종료되지 않는다.
- 빈 화면의 `+` 버튼으로 빈 탭을 생성할 수 있다.

## Phase 4. Explorer와 파일 열기

### 목표

사용자가 Root Folder 하위의 Markdown 문서를 탐색하고 활성 탭에서 열 수 있게 한다.

### 작업 범위

- Root Folder와 하위 폴더의 트리 표시
- `.md` 파일 중심의 탐색 목록 구성
- 폴더 펼침 및 접힘 상태 관리
- Explorer 표시 및 숨김
- 활성 탭에서 선택한 Markdown 파일 열기

### 완료 기준

- 선택한 Root Folder의 하위 폴더와 Markdown 파일을 탐색할 수 있다.
- Explorer에서 파일을 선택하면 활성 탭의 문서가 바뀐다.
- Explorer의 표시 상태와 펼침 상태가 창 안에서 유지된다.

## Phase 5. 탭 관리

### 목표

문서 열람에 필요한 다중 탭 동작을 일관된 규칙으로 제공한다.

### 작업 범위

- 새 빈 탭 생성 및 활성화
- 탭 선택과 닫기
- 활성 탭을 닫을 때 인접 탭 활성화
- 빈 탭에서 선택한 문서를 해당 탭에 연결
- 열린 문서를 다시 선택하면 기존 탭 활성화
- 문서가 연결된 활성 탭에서 다른 파일 선택 시 문서 교체

### 완료 기준

- 사용자가 여러 문서를 탭 단위로 전환할 수 있다.
- 같은 문서의 중복 탭이 생성되지 않는다.
- 마지막 탭 종료는 Phase 3의 빈 화면 상태로 연결된다.

## Phase 6. Markdown 렌더링

### 목표

Markdown과 GitHub Flavored Markdown 문서를 읽기 쉬운 화면으로 렌더링한다.

### 작업 범위

- `react-markdown`과 `remark-gfm` 적용
- 제목, 문단, 목록, 체크박스, 인용문, 표, 코드 블록, 링크, 취소선 렌더링
- 코드 블록, 표, 긴 문서에 대한 기본 가독성 스타일 구성
- Markdown 렌더링 실패 또는 빈 파일 상태 표시

### 완료 기준

- PRD의 Must Markdown 요소가 올바르게 표시된다.
- GFM 표와 체크박스를 렌더링할 수 있다.
- 일반 문서에서 가로·세로 스크롤과 텍스트 가독성이 유지된다.

## Phase 7. Windows 실행 연동

### 목표

Windows Explorer에서 `.md` 파일을 직접 실행하는 흐름을 제공한다.

### 작업 범위

- 실행 인자로 전달된 Markdown 파일 경로 처리
- 전달된 파일의 부모 폴더를 Root Folder로 설정
- 전달된 파일을 최초이자 활성 탭으로 생성
- 기존 창 재사용 없이 파일 실행마다 독립 Browser Window 생성
- `.md` 파일 연결에 필요한 패키징 설정 준비

### 완료 기준

- `.md` 파일 직접 실행 시 해당 문서가 열린 새 창이 시작된다.
- Root Folder가 해당 파일의 부모 디렉터리로 설정된다.
- 여러 파일을 별도로 실행하면 각 창의 탭과 Root 상태가 분리된다.

## Phase 8. 오류 처리와 검증

### 목표

예상 가능한 파일 시스템 오류를 안전하게 보여 주고, 핵심 요구사항을 검증한다.

### 작업 범위

- 열린 파일이 삭제된 경우의 Tab 오류 상태
- 파일 또는 폴더 권한 오류 상태
- Root Folder가 삭제·이동된 경우 Explorer 오류 상태
- 지원하지 않는 파일을 Markdown Renderer로 열지 않는 처리
- Root 경로 경계와 IPC 입력 검증
- 핵심 사용자 흐름의 수동 및 자동 검증

### 완료 기준

- 오류 발생 시 앱이 비정상 종료되지 않는다.
- 사용자가 오류 원인을 식별할 수 있는 상태 메시지가 표시된다.
- Root Folder 외부 접근이 검증 절차에서 차단된다.

## Phase 9. 패키징

### 목표

일반 사용자가 설치하고 실행할 수 있는 Windows 애플리케이션을 만든다.

### 작업 범위

- Windows 설치 파일 또는 실행 패키지 생성
- `.md` 파일 연결 등록 구성
- 설치 환경에서 직접 실행, 폴더 열기, 탭 및 렌더링 흐름 검증
- 버전, 아이콘, 배포 산출물 정리

### 완료 기준

- Windows 11에서 설치 또는 실행할 수 있는 배포 산출물이 생성된다.
- 연결된 `.md` 파일을 더블클릭해 Markdown Browser를 실행할 수 있다.
- 설치 환경에서 핵심 v0.1 요구사항이 동작한다.
