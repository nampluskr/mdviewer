# Markdown Browser Agent Instructions

## General Rules

- 이모지를 사용하지 않는다.
- 코드는 Python을 우선으로 고려한다. 프로젝트 제약으로 TypeScript가 필요한 경우 TypeScript를 사용한다.
- 앱 기능 자체는 Python으로 구현하지 않는다. Electron main/preload와 React renderer를 포함한 제품 코드는 TypeScript로 구현한다.
- Python은 테스트 데이터 생성, 검증 자동화 등 제품 기능과 분리된 보조 개발 도구에만 선택적으로 사용한다.
- Python 보조 작업에는 `C:\winpython\WPy64-31180\python-3.11.8.amd64\python.exe` 인터프리터를 사용한다.
- 경로 표기는 `os.path` 방식을 사용하며 `Path`를 사용하지 않는다.
- 코드 내 주석은 영어로 작성한다.
- 사용자의 명시적인 요청 없이 코드나 아티팩트 문서를 생성하지 않는다.
- Markdown 문서는 한국어로 작성한다. 다만 코드, 명령어, 파일 경로, 제품·라이브러리의 고유 이름은 원문 표기를 유지한다.

## Phase Execution Workflow

릴리스별 `docs/releases/v{major}.{minor}/backlog.json`과 `docs/releases/v{major}.{minor}/PLAN.md`의 Phase는 정의된 순서와 의존성을 지켜 진행한다.

사용자 요청으로 구현 또는 프로젝트 내용이 변경되면, 해당 릴리스 폴더의 문서를 반드시 `PLAN.md → backlog.json → PRD.md → SPEC.md` 순서로 갱신한다.

Phase 완료 여부는 해당 릴리스의 `backlog.json`에 있는 각 Phase의 `status` 필드에서만 관리한다. `README.md`, `PLAN.md`, `PRD.md`, `SPEC.md`에는 현재 또는 완료된 Phase 상태를 기록하지 않는다.

각 Phase는 다음 순서로 완료한다.

1. 해당 Phase의 작업 범위와 완료 기준을 구현하고 검증한다.
2. 별도 서브 에이전트에게 Claude Sonnet 적대적 교차 검증을 1회만 위임한다. 요구사항 누락, 보안 경계, 오류 처리, 회귀, 테스트 누락을 중심으로 검토한다.
3. 지적사항을 검토하고 유효한 문제를 모두 수정한 뒤 관련 검증을 다시 실행한다. 수정 후에는 Claude 적대적 교차 검증을 다시 실행하지 않는다.
4. 변경 내용, 검증 결과, Claude 검토 결과와 보완 조치, 남은 위험을 사용자에게 보고하고 해당 Phase의 커밋 및 푸시 승인을 요청한다. Claude 검토 결과와 보완 조치는 지적사항별 심각도, 근거, 처리 상태를 포함한 Markdown 표로 제시한다.
5. 사용자의 명시적 승인을 받은 후에만 해당 Phase 변경을 커밋하고 `origin` 원격 저장소에 푸시한다.

Claude Sonnet을 사용할 수 없는 환경이면 그 사실과 사유를 사용자에게 알리고, 대체 검증 방안을 제시한 뒤 승인을 요청한다. 교차 검증을 생략하거나 사용자 승인 전에 커밋 또는 푸시하지 않는다.

## Claude Sonnet Adversarial Review Sub-agent

- 메인 에이전트는 Phase 구현을 끝낸 뒤, Claude 검증만 담당하는 별도 서브 에이전트를 실행한다.
- 서브 에이전트는 작업 폴더를 기준으로 Claude CLI를 읽기 전용 모드로 실행한다.
- 서브 에이전트는 현재 Phase, 생성된 제품 소스 코드 파일, 관련 PRD·SPEC 완료 기준을 프롬프트에 포함하고, 심각도 순서의 지적사항과 근거를 반환한다.
- Claude 검토는 현재 작업 폴더의 지정된 생성 제품 소스 코드만 대상으로 한다. 문서, 설정, 테스트 산출물, Git 상태·브랜치·원격 저장소·커밋 이력과 Bash, PowerShell 등 셸 도구 호출을 요청하거나 허용하지 않는다.
- Claude의 지적사항은 메인 에이전트가 검토한다. 유효한 지적사항은 수정 및 재검증하고, 유효하지 않은 지적사항은 근거와 함께 사용자 보고에 남긴다.
- Claude CLI의 응답 지연, 인증 실패, 네트워크 오류 등으로 검증하지 못하면 서브 에이전트는 오류 내용과 대체 검증안을 메인 에이전트에 반환한다.

서브 에이전트가 PowerShell에서 실행할 기본 명령은 다음과 같다. `<phase>`, `<changed-files>`, `<acceptance-criteria>`는 현재 작업 내용으로 대체한다.

```powershell
claude -p "You are an adversarial reviewer for <phase>. Review only these generated product source-code files in the current working folder: <changed-files>. Validate against: <acceptance-criteria>. Do not inspect documentation, configuration, test artifacts, Git status, branches, remotes, commit history, or use Bash, PowerShell, or any shell tool. Identify requirement gaps, security-boundary violations, error-handling defects, regressions, and missing tests. Return findings ordered by severity with concrete evidence. Do not modify files." --model sonnet --allowedTools "Read,Glob,Grep" --disallowedTools "Edit,Write" --max-turns 5 --output-format json
```

이 명령은 `Read`, `Glob`, `Grep`만 허용하며 파일 변경 도구를 금지한다. 메인 에이전트는 Claude 검증 결과를 받은 후에만 수정, 재검증, 사용자 승인 요청 단계로 진행한다.
Claude CLI 검토를 실행하는 외부 명령의 시간 제한은 기본 10분으로 설정한다.

## Commit and Push Rules

- 원격 저장소는 `https://github.com/nampluskr/mdviewer.git`이며 `origin`으로 등록한다.
- 커밋은 하나의 완료된 Phase에 대응하도록 만든다.
- 커밋 메시지에는 Phase 번호와 핵심 변경 사항을 포함한다.
- 커밋 전에는 해당 Phase의 관련 검증을 실행한다.
- Phase 완료, Claude Opus 교차 검증, 지적사항 수정 및 재검증을 마친 뒤 사용자에게 커밋 및 푸시 승인을 요청한다.
- 사용자의 명시적 승인 이후에만 해당 Phase 커밋을 `origin`에 푸시한다.
- 다른 작업의 변경 사항을 임의로 포함, 되돌리기, 삭제하지 않는다.
