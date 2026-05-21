from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from utils.supabase_client import get_supabase

router = APIRouter(prefix="/project-notes", tags=["project_notes"])


class NotesUpsert(BaseModel):
    project_id: str
    memo: str


@router.get("")
def get_notes(project_id: str):
    sb = get_supabase()
    res = (
        sb.table("project_notes")
        .select("*")
        .eq("project_id", project_id)
        .maybe_single()
        .execute()
    )
    return res.data


@router.post("")
def upsert_notes(body: NotesUpsert):
    sb = get_supabase()
    existing = (
        sb.table("project_notes")
        .select("id")
        .eq("project_id", body.project_id)
        .execute()
    )
    if existing.data:
        res = (
            sb.table("project_notes")
            .update({
                "memo": body.memo,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })
            .eq("project_id", body.project_id)
            .execute()
        )
    else:
        res = (
            sb.table("project_notes")
            .insert({
                "project_id": body.project_id,
                "memo": body.memo,
            })
            .execute()
        )
    if not res.data:
        raise HTTPException(status_code=500, detail="저장 실패")
    return res.data[0]
