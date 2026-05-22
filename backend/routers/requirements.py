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
입력된 내용을 분석하여 요건을 정리해주세요.
결과는 반드시 HTML 형식으로만 출력하세요. 다른 텍스트 없이 HTML만.
HTML 구조:
- 인라인 CSS 포함 (배경 흰색, 폰트 14px, line-height 1.8)
- h2로 섹션 구분
- 기능 요건 / 비기능 요건 / 제약사항 테이블로 정리
  테이블 컬럼: 구분 | 요건명 | 설명 | 우선순위(상/중/하)
- AS-IS / TO-BE 내용 있으면 별도 섹션으로
- 우선순위 높음은 빨간색, 중간은 주황, 낮음은 회색으로 표시"""


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
        model="claude-3-5-sonnet-20240620",
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
