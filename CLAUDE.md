# Markdown Browser Agent Instructions

Claude Code가 이 저장소에서 작업할 때 매 턴 지켜야 하는 규칙이다. 배경과 근거는 `docs/releases/v0.1/` 문서에 둔다.

## General Rules

- 이모지를 사용하지 않는다.
- 제품 코드는 TypeScript로 구현한다. Electron main/preload와 React renderer를 포함한 애플리케이션 기능에 Python을 사용하지 않는다.
- Python은 테스트 데이터 생성과 검증 자동화처럼 제품 기능과 분리된 보조 도구에만 사용한다. Python 경로 표기는 `os.path` 방식을 사용하며 `Path`를 사용하지 않는다.
- 코드 내 주석은 영어로 작성한다. Markdown 문서는 한국어로 작성한다. 코드, 명령어, 파일 경로, 제품·라이브러리 고유 이름은 원문 표기를 유지한다.
- 사용자의 명시적인 요청 없이 코드나 문서를 생성하지 않는다.
- 대상 OS는 Windows이며 셸은 PowerShell을 우선 사용한다.

## Project Rules

- Renderer에서 `node:fs`를 직접 호출하지 않는다. 파일 시스템 접근은 preload와 typed IPC를 경유한다.
- `src/main/filesystem/*`에서 `electron`을 import하지 않는다. `node:fs`, `node:path`만 사용하고 Electron 의존은 IPC 계층에서 주입한다.
- Root Folder 밖의 경로 접근은 main process에서 검증한다.
- 외부 프로세스 실행이 필요하면 인자를 배열로 전달하고 문자열 조합을 금지한다.
- 새 의존성을 추가하기 전 기본 API로 구현 가능한지 확인하고 사용자 승인을 받는다.
- v0.1 범위, 확정 단축키, 기술 기준을 임의로 변경하지 않고 불필요한 추상화 계층을 추가하지 않는다.

## Document Rules

- 릴리스 문서는 `docs/releases/v{major}.{minor}/`에 둔다.
- 사용자 요청으로 구현 또는 프로젝트 내용이 변경되면 `PLAN.md → backlog.json → PRD.md → SPEC.md` 순서로 갱신한다.
- 완료된 릴리스 문서는 참조 전용으로 유지하며, 사용자의 명시적 요청 없이는 수정하지 않는다. 문서와 구현 작업은 현재 진행 중인 릴리스 폴더에만 반영한다. 현재 진행 중인 릴리스가 v0.2이면 `docs/releases/v0.2/`만 갱신하고, `docs/releases/v0.1/` 문서는 형식과 과거 결정의 참고 목적으로만 읽는다.
- Phase 완료 상태는 `backlog.json`의 각 Phase `status` 필드에서만 관리한다.

## Phase Execution Workflow

1. 해당 Phase의 `scope`, `acceptanceCriteria`, `selfVerification`을 구현·검증한다.
2. 마지막 실질 구현자의 **반대 벤더 CLI**에 적대적 검증을 위임한다. Codex 구현은 Claude Sonnet headless CLI가, Claude Code 구현은 Codex CLI가 검토한다. 토큰 한도로 구현자가 Phase 중간에 바뀌면 마지막 실질 구현자를 기준으로 다시 정한다.
3. Critical 지적은 모두 수정하고 관련 검증을 재실행한다. Major와 Minor는 처리 여부와 근거를 기록한다. Critical을 수정했다면 같은 반대 벤더 검토를 한 번 더 실행해 해소를 확인한다. Phase별 적대적 검증 실행은 실패·재실행을 포함해 최대 3회로 제한하며, 3회 이후에는 추가 실행 대신 마지막 결과와 남은 위험을 기록한다.
4. `docs/releases/v0.1/reviews/A{n}.md`에 구현자, 검토 모델, 대상 파일, 실행 일시, 심각도별 건수, 지적·재현 조건·관련 SPEC 조항·처리 상태를 기록한다. 유효하지 않은 지적의 반박 근거도 기록한다.
5. 변경 내용, 검증 결과, 검토 결과와 남은 위험을 사용자에게 보고하고 커밋·푸시 승인을 요청한다. 승인 전에는 커밋 또는 푸시하지 않는다.

`phase-02`, `phase-07`, `phase-08`은 적대적 검증 필수 통과 대상이다. 미해결 Critical이 있으면 다음 Phase로 진행하지 않는다. 필요한 반대 벤더 CLI를 사용할 수 없으면 오류와 대체 검증안을 사용자에게 보고하고 승인 없이 생략하지 않는다.

## Adversarial Review Rules

- 검토자는 제품 소스 파일, 해당 Phase의 `adversarialFocus`, `specRefs`만 사용한다. 구현 세션 대화, 구현 판단 근거, 문서, 설정, 테스트 산출물, Git 상태·이력·원격 저장소, 셸 도구는 요청하거나 사용하지 않는다.
- 검토자는 파일을 수정하지 않는다. 지적은 `Critical / Major / Minor`, 정확한 재현 조건, 위반한 SPEC 조항을 포함해 심각도순으로 반환한다.
- 실패·재실행을 포함한 Phase별 적대적 검증 실행은 최대 3회다.
- Claude Sonnet 검토는 `claude -p`에 `--model sonnet --safe-mode --allowedTools "Read,Glob,Grep" --disallowedTools "Edit,Write,Bash" --permission-mode dontAsk --max-turns 5 --output-format json --no-session-persistence`를 사용한다. 필요하면 `--max-budget-usd`로 호출별 비용 상한을 둔다.
- Codex 검토는 `codex.cmd exec --model gpt-5.6-sol --sandbox read-only --cd "D:\projects\tools\mdviewer"`를 사용한다. 모델 접근이 거부되면 기본 모델로 조용히 폴백하지 않고 오류와 대체안을 보고한다.

## Commit and Push Rules

- 원격 저장소는 `https://github.com/nampluskr/mdviewer.git`이며 이름은 `origin`이다.
- 커밋은 하나의 완료된 Phase에 대응하며, Phase 번호와 핵심 변경 사항을 포함한다.
- 다른 작업의 변경 사항을 임의로 포함, 되돌리기, 삭제하지 않는다.
