import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
import anthropic

from utils.supabase_client import get_supabase
from routers.activity_logs import log_activity

load_dotenv()

router = APIRouter(prefix="/requirements", tags=["requirements"])

SYSTEM_PROMPT = """당신은 IT 프로젝트 기획 전문가입니다.
입력된 내용을 분석하여 기획 문서 허브 형태의 HTML을 생성하세요.
반드시 HTML만 출력하고 다른 텍스트는 없어야 합니다.

HTML 구조 및 스타일 가이드:
- 전체 배경: 흰색, 폰트: 14px, line-height: 1.8
- 인라인 CSS 포함하여 바로 렌더링 가능하게

1) 서비스 개요 섹션
   - 2~3열 카드 그리드
   - 각 카드: 이모지 아이콘 + 제목 + 설명 + 상태 뱃지
   - 카드 배경: #f8f9ff, 테두리: 1px solid #e0e0f0, border-radius: 12px
   - 주요 항목: 서비스 목적, 사용자 역할, 핵심 기능, 제약사항 등

2) 전체 서비스 흐름 섹션
   - 가로 스텝 형태 (번호 + 제목 + 담당자)
   - 화살표로 연결
   - 스텝 배경: #7B68EE, 텍스트: white

3) 기능 요건 섹션
   - 기능 그룹별 카드
   - 각 카드: 기능명 + 설명 + 우선순위 뱃지(상/중/하)
   - 상: #ff4444, 중: #ff9800, 하: #888888

4) 비기능 요건 / 제약사항 섹션
   - 간결한 리스트 형태
   - 아이콘 불릿 사용

5) AS-IS / TO-BE 있으면 2열 비교 카드로 표시

입력 내용에 없는 섹션은 생략하고
있는 내용만 최대한 구조화해서 보여주세요."""


class GenerateRequest(BaseModel):
    project_id: str
    raw_input: str


class SaveRequest(BaseModel):
    project_id: str
    raw_input: str
    result_html: str


@router.post("/generate")
def generate_requirements(body: GenerateRequest):
    if not body.raw_input.strip():
        raise HTTPException(status_code=400, detail="입력 내용이 비어있습니다")

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY가 설정되지 않았습니다")

    client = anthropic.Anthropic(api_key=api_key)
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": body.raw_input}],
    )
    result_html = message.content[0].text
    return {"result_html": result_html}


@router.post("")
def save_requirement(body: SaveRequest):
    sb = get_supabase()
    res = sb.table("requirements").insert({
        "project_id": body.project_id,
        "raw_input": body.raw_input,
        "result_html": body.result_html,
    }).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="저장 실패")
    log_activity(body.project_id, "요건 정리 저장")
    return res.data[0]


@router.get("")
def list_requirements(project_id: str):
    sb = get_supabase()
    res = (
        sb.table("requirements")
        .select("*")
        .eq("project_id", project_id)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data
