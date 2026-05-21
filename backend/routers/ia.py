import os
import json
from datetime import datetime, timezone
from typing import Any, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
import anthropic

from utils.supabase_client import get_supabase
from routers.activity_logs import log_activity

load_dotenv()

router = APIRouter(prefix="/ia", tags=["ia"])

SYSTEM_PROMPT = """당신은 IT 서비스 IA(Information Architecture) 전문가입니다.
입력된 서비스 개요를 분석하여 IA를 JSON으로만 출력하세요.
다른 텍스트, 마크다운 코드블록 없이 순수 JSON 배열만 출력합니다.
구조: [{"id":"1","label":"메뉴명","depth":0,"type":"page","children":[...]}]
type 값: page | component | element
depth는 0부터 시작, 최대 3뎁스"""


class GenerateRequest(BaseModel):
    project_id: str
    description: str


class SaveRequest(BaseModel):
    project_id: str
    title: str
    tree_data: List[Any]


@router.post("/generate")
def generate_ia(body: GenerateRequest):
    if not body.description.strip():
        raise HTTPException(status_code=400, detail="설명이 비어있습니다")

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY가 설정되지 않았습니다")

    client = anthropic.Anthropic(api_key=api_key)
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": body.description}],
    )
    raw = message.content[0].text.strip()
    # 혹시 마크다운 코드블록 포함 시 제거
    if raw.startswith("```"):
        lines = raw.splitlines()
        end = len(lines) - 1 if lines[-1].strip() == "```" else len(lines)
        raw = "\n".join(lines[1:end])
    try:
        tree_data = json.loads(raw.strip())
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="IA 생성 결과 파싱 실패")
    return {"tree_data": tree_data}


@router.post("")
def save_ia(body: SaveRequest):
    sb = get_supabase()
    existing = (
        sb.table("ia_docs")
        .select("id")
        .eq("project_id", body.project_id)
        .execute()
    )
    if existing and existing.data and len(existing.data) > 0:
        res = (
            sb.table("ia_docs")
            .update({
                "title": body.title,
                "tree_data": body.tree_data,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })
            .eq("project_id", body.project_id)
            .execute()
        )
    else:
        res = (
            sb.table("ia_docs")
            .insert({
                "project_id": body.project_id,
                "title": body.title,
                "tree_data": body.tree_data,
            })
            .execute()
        )
    if not res.data:
        raise HTTPException(status_code=500, detail="저장 실패")
    log_activity(body.project_id, "IA 업데이트", body.title)
    return res.data[0]


@router.get("")
def get_ia(project_id: str):
    sb = get_supabase()
    res = (
        sb.table("ia_docs")
        .select("*")
        .eq("project_id", project_id)
        .maybe_single()
        .execute()
    )
    return res.data
