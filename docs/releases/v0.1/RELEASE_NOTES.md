# Markdown Browser v0.1 릴리스 노트

## 주요 기능

- Electron, React, TypeScript, Vite 기반 데스크톱 애플리케이션
- 파일 시스템 경계 검증을 포함한 Root Folder 기반 Markdown Explorer
- 다중 탭 Markdown 문서 보기와 GitHub Flavored Markdown 렌더링
- 독립 Browser Window에서 `.md` 파일 직접 실행
- 파일 접근, 삭제, 권한, 유효하지 않은 Root 오류 표시
- NSIS Windows 설치 프로그램과 `.md` Viewer 파일 연결
- 검증된 main process 처리기를 통한 HTTP·HTTPS Markdown 링크 열기

## 검증

- 파일 시스템 경계 자동 테스트
- TypeScript 타입 검사
- 프로덕션 Electron 빌드
- Windows NSIS 설치 프로그램 생성

## 알려진 제한 사항

- Explorer에서는 `.md` 파일만 표시하고 열 수 있다.
- Markdown 코드 블록 문법 하이라이트를 지원하지 않는다.
- 외부 파일 변경이 열린 탭에 자동으로 반영되지 않는다.
- 패키지 애플리케이션은 기본 Electron 아이콘을 사용하며 코드 서명이 적용되지 않았다.
