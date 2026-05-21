from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from utils.supabase_client import get_supabase

router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    name: str
    client: Optional[str] = None
    tag: str = "TBD"
    owner: str = "master"


@router.get("")
def list_projects(owner: Optional[str] = Query(None)):
    sb = get_supabase()
    query = sb.table("projects").select("*").order("created_at", desc=True)
    if owner:
        query = query.eq("owner", owner)
    res = query.execute()
    return res.data


@router.post("")
def create_project(body: ProjectCreate):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="프로젝트명은 필수입니다")
    sb = get_supabase()
    res = sb.table("projects").insert({
        "name": body.name.strip(),
        "client": body.client or None,
        "tag": body.tag,
        "owner": body.owner,
    }).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="프로젝트 생성 실패")
    return res.data[0]


@router.get("/{project_id}")
def get_project(project_id: str):
    sb = get_supabase()
    res = sb.table("projects").select("*").eq("id", project_id).maybe_single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다")
    return res.data


@router.delete("/{project_id}")
def delete_project(project_id: str, owner: Optional[str] = Query(None)):
    sb = get_supabase()
    if owner:
        check = sb.table("projects").select("owner").eq("id", project_id).maybe_single().execute()
        if not check.data:
            raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다")
        if check.data["owner"] != owner:
            raise HTTPException(status_code=403, detail="삭제 권한이 없습니다")
    sb.table("projects").delete().eq("id", project_id).execute()
    return {"ok": True}
