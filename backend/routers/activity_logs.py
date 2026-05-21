from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel

from utils.supabase_client import get_supabase

router = APIRouter(prefix="/activity-logs", tags=["activity_logs"])


class LogCreate(BaseModel):
    project_id: str
    action: str
    detail: Optional[str] = None


def log_activity(project_id: str, action: str, detail: Optional[str] = None) -> None:
    """다른 라우터에서 import해서 사용하는 헬퍼. 실패해도 예외 전파 안 함."""
    try:
        sb = get_supabase()
        sb.table("activity_logs").insert({
            "project_id": project_id,
            "action": action,
            "detail": detail,
        }).execute()
    except Exception:
        pass


@router.get("")
def list_logs(project_id: str, limit: int = 10):
    sb = get_supabase()
    res = (
        sb.table("activity_logs")
        .select("*")
        .eq("project_id", project_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return res.data


@router.post("")
def create_log(body: LogCreate):
    log_activity(body.project_id, body.action, body.detail)
    return {"ok": True}
