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
입력된 내용을 분석하여 JSON만 출력하세요.
다른 텍스트, 마크다운 코드블록 없이 순수 JSON만 출력합니다.

형식:
{
  "service_overview": {
    "title": "서비스명",
    "description": "서비스 설명",
    "cards": [
      {"icon": "🎯", "title": "서비스 목적", "description": "내용", "badge": "뱃지텍스트"}
    ]
  },
  "flow_steps": [
    {"number": 1, "title": "단계명", "owner": "담당자"}
  ],
  "functional_requirements": [
    {"group": "그룹명", "name": "기능명", "description": "설명", "priority": "상"}
  ],
  "non_functional_requirements": [
    {"name": "항목명", "description": "설명"}
  ],
  "as_is_to_be": [
    {"as_is": "현재 상황", "to_be": "개선 방향"}
  ]
}

없는 항목은 빈 배열로. priority는 상/중/하 중 하나."""


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
    result_json = message.content[0].text.strip()
    return {"result_html": result_json}


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
