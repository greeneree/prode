# Backend

FastAPI + Supabase

## 실행 방법

```bash
# 의존성 설치
pip install -r requirements.txt

# 서버 실행
uvicorn main:app --reload --port 8000
```

포트: http://localhost:8000

## 환경변수

루트의 `.env` 파일에 아래 값을 설정하세요:

```
SUPABASE_URL=...
SUPABASE_KEY=...
ANTHROPIC_API_KEY=...
```

## API 문서

서버 실행 후 http://localhost:8000/docs 에서 확인
