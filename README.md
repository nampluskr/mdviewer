# Markdown Browser

## 릴리스 문서

v0.1 계획, 제품 요구사항, 명세, 백로그, 릴리스 노트는 `docs/releases/v0.1/`에 보관합니다. 이후 릴리스는 각각 `docs/releases/v{major}.{minor}/` 경로를 사용합니다.

Markdown Browser는 Windows에서 로컬 Markdown 문서를 탐색하고 읽기 위한 경량 데스크톱 애플리케이션입니다. 문서 폴더를 열어 Markdown 파일을 Explorer에서 찾고, 여러 문서를 탭으로 전환하며 읽을 수 있습니다.

## 주요 기능

- Root Folder와 하위 폴더의 Markdown 문서 탐색
- 여러 문서를 탭으로 열고 전환
- GitHub Flavored Markdown(GFM) 렌더링
- Windows Explorer에서 `.md` 파일 직접 열기

## 사용 방법

1. Markdown Browser를 실행합니다.
2. **Open Folder**를 선택하고 Markdown 문서가 있는 폴더를 엽니다.
3. 좌측 Explorer에서 문서를 선택하면 활성 탭에서 내용을 읽을 수 있습니다.
4. `+` 버튼으로 새 탭을 만들고, 탭을 선택하거나 닫아 문서를 관리합니다.

Windows Explorer에서 `.md` 파일을 직접 열어 Markdown Browser를 시작할 수도 있습니다.

## 단축키

| 단축키 | 동작 |
| --- | --- |
| `Ctrl+O` | 폴더 열기 |
| `F5` / `Ctrl+R` | 현재 탐색기 목록과 열린 문서 새로고침 |
| `Ctrl+T` | 새 빈 탭 만들기 |
| `Ctrl+W` | 현재 탭 닫기 |
| `Ctrl+Tab` | 다음 탭으로 전환 |
| `Ctrl+Shift+Tab` | 이전 탭으로 전환 |
| `Ctrl++` / `Ctrl+-` | 문서 글자 크기 확대 / 축소 |
| `Ctrl+0` | 문서 글자 크기 100%로 초기화 |
| `Ctrl+휠 스크롤` | 문서 글자 크기 확대 / 축소 |
| `Ctrl+1` / `Ctrl+2` / `Ctrl+3` | 화이트 / 그레이(Dimmed) / 다크 테마로 전환 |
| `F11` | 집중 보기 전환(탐색기·탭바·상태 표시줄 숨김) |
| `Esc` | 집중 보기에서 빠져나오기 |
| `Tab` / `Shift+Tab` | 탐색기 영역 ↔ 문서 영역 간 포커스 이동 |
| `Alt+F4` | 창 닫기(Windows 기본 동작) |

탐색기 영역에 포커스가 있을 때는 아래 키로 폴더를 탐색할 수 있습니다.

| 단축키 | 동작 |
| --- | --- |
| `↑` / `↓` | 이전 / 다음 항목 선택 |
| `Home` / `End` | 첫 항목 / 마지막 항목 선택 |
| `Enter` / `→` | 선택한 폴더로 이동하거나 파일 열기 |
| `Backspace` / `←` | 상위 폴더로 이동 |

## Windows 패키지 만들기

Windows 설치 프로그램은 다음 명령으로 생성합니다.

```powershell
npm run package:win
```

생성된 NSIS 설치 프로그램은 `release` 폴더에 저장되며, 설치 시 `.md` 파일을 Markdown Browser와 연결합니다.

## 클론 후 Windows 패키지 생성

Git에 패키징에 필요한 소스 코드와 설정 파일이 모두 포함되어 있으므로, 새 클론에서도 Windows 설치 프로그램을 만들 수 있습니다.

```powershell
git clone https://github.com/nampluskr/mdviewer.git
cd mdviewer
npm ci
npm run package:win
```

`npm ci`와 `npm run package:win`은 Electron 및 NSIS 패키징 도구를 내려받을 수 있으므로 네트워크 연결이 필요할 수 있습니다.

다음 폴더는 의존성 또는 빌드·패키징 과정에서 생성되며 Git에서 제외됩니다.

```text
node_modules/  # npm ci로 재생성되는 의존성
out/           # 애플리케이션 빌드 산출물
release/       # NSIS 설치 프로그램과 패키징 산출물
```
