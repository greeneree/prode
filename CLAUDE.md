# 프로젝트: PRODE 기획 자동화 툴

## 기술 스택
- Frontend: React + Vite + Tailwind CSS (포트 5173)
- Backend: FastAPI Python (포트 8000)
- DB: Supabase (PostgreSQL)
- AI: Anthropic API claude-sonnet-4-20250514
- 엑셀: SheetJS (클라이언트 처리)

## 폴더 구조
ssmc/
├── frontend/   # React + Vite
├── backend/    # FastAPI
├── CLAUDE.md
└── .env        # 루트에 환경변수 통합 관리

## 환경변수 (.env)
SUPABASE_URL=
SUPABASE_KEY=
ANTHROPIC_API_KEY=

## 코딩 규칙
- 컴포넌트는 frontend/src/components/ 에
- API 라우터는 backend/routers/ 에 기능별 분리
- 모든 Claude API 호출은 backend에서만 처리
- 에러 핸들링 항상 포함
- 한국어 주석 허용

## DB 테이블
- projects: 프로젝트 기본 정보
- requirements: 요건 정리 결과
- ia_docs: IA 트리 구조 (jsonb)

## 현재 개발 단계
MVP — M1(프로젝트 관리) + M2(요건 정리) + M3(IA 편집/엑셀)