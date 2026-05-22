import os
import json
import logging
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
import anthropic

from utils.supabase_client import get_supabase

load_dotenv()

router = APIRouter(prefix="/screen-descs", tags=["screen_descs"])

ANALYZE_SYSTEM = """당신은 UI/UX 기획 전문가입니다.
첨부된 화면 이미지를 분석하여 화면 디스크립션을 작성해주세요.
JSON 배열만 출력하세요. 다른 텍스트 없이.
형식: [{"구분":"헤더","컴포넌트명":"GNB","설명":"서비스 상단 네비게이션","인터랙션":"메뉴 클릭 시 해당 페이지로 이동"}]
구분 값: 헤더 | 네비게이션 | 콘텐츠 | 버튼 | 폼 | 모달 | 기타"""

VALID_MEDIA_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}


class AnalyzeRequest(BaseModel):
    project_id: str
    ia_node_id: str
    ia_node_label: str
    image_base64: str


class SaveRequest(BaseModel):
    project_id: str
    ia_node_id: str
    ia_node_label: str
    image_base64: str
    result_json: Any


def parse_image_base64(image_base64: str) -> tuple[str, str]:
    """data URL에서 media_type과 순수 base64 데이터 분리"""
    if image_base64.startswith("data:"):
        header, data = image_base64.split(",", 1)
        media_type = header.split(";")[0].split(":")[1]
        if media_type not in VALID_MEDIA_TYPES:
            media_type = "image/png"
    else:
        data = image_base64
        media_type = "image/png"
    return media_type, data


@router.post("/analyze")
def analyze_screen(body: AnalyzeRequest):
    logging.info(f"image_base64 length: {len(body.image_base64)}")
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY가 설정되지 않았습니다")

    media_type, image_data = parse_image_base64(body.image_base64)

    client = anthropic.Anthropic(api_key=api_key)
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2048,
        system=ANALYZE_SYSTEM,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": image_data,
                    },
                },
                {"type": "text", "text": "이 화면을 분석해주세요."},
            ],
        }],
    )

    raw = message.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()
    try:
        result_json = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="분석 결과 파싱 실패: " + raw[:200])

    return {"result_json": result_json}


@router.post("")
def save_screen_desc(body: SaveRequest):
    sb = get_supabase()
    res = sb.table("screen_descs").insert({
        "project_id": body.project_id,
        "ia_node_id": body.ia_node_id,
        "ia_node_label": body.ia_node_label,
        "image_base64": body.image_base64,
        "result_json": body.result_json,
    }).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="저장 실패")
    return res.data[0]


@router.get("")
def get_screen_descs(project_id: str, ia_node_id: Optional[str] = None):
    sb = get_supabase()
    query = sb.table("screen_descs").select("*").eq("project_id", project_id)
    if ia_node_id:
        query = query.eq("ia_node_id", ia_node_id)
    res = query.order("created_at", desc=True).execute()
    return res.data
