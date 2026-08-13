# Markdown Browser

## Release documents

The completed v0.1 plan, product requirements, specification, and backlog are preserved in `docs/releases/v0.1/`. Future releases use their own `docs/releases/v{major}.{minor}/` directory.

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
## Windows 패키지 만들기

Windows 설치 프로그램은 다음 명령으로 생성합니다.

```powershell
npm run package:win
```

생성된 NSIS 설치 프로그램은 `release` 폴더에 저장되며, 설치 시 `.md` 파일을 Markdown Browser와 연결합니다.
