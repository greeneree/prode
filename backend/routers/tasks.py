import os
import json
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
import anthropic

from utils.supabase_client import get_supabase
from routers.activity_logs import log_activity

STATUS_KO = {'todo': '투두', 'in_progress': '진행중', 'done': '완료'}

load_dotenv()

router = APIRouter(prefix="/tasks", tags=["tasks"])

TASK_EXTRACT_SYSTEM = """아래 요건 HTML에서 실행 가능한 태스크를 추출해줘.
JSON 배열만 출력. 다른 텍스트 없이.
형식: [{"title":"태스크명","description":"구체적인 설명"}]
태스크는 최대 10개, 개발/기획 실행 단위로 구체적으로."""


class TaskCreate(BaseModel):
    project_id: str
    title: str
    description: Optional[str] = None
    status: str = "todo"
    due_date: Optional[str] = None
    source: str = "manual"


class TaskUpdate(BaseModel):
    status: Optional[str] = None
    due_date: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None


class GenerateTasksRequest(BaseModel):
    project_id: str
    result_html: str


# 1. GET /tasks
@router.get("")
def list_tasks(project_id: Optional[str] = None):
    sb = get_supabase()
    query = sb.table("tasks").select("*").order("created_at", desc=True)
    if project_id:
        query = query.eq("project_id", project_id)
    res = query.execute()
    return res.data


# 2. POST /tasks
@router.post("")
def create_task(body: TaskCreate):
    sb = get_supabase()
    data: dict = {
        "project_id": body.project_id,
        "title": body.title,
        "status": body.status,
        "source": body.source,
    }
    if body.description:
        data["description"] = body.description
    if body.due_date:
        data["due_date"] = body.due_date
    res = sb.table("tasks").insert(data).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="태스크 생성 실패")
    log_activity(body.project_id, "태스크 생성", body.title)
    return res.data[0]


# 3. POST /tasks/generate  ← /{task_id} 라우터보다 반드시 위에 선언
@router.post("/generate")
def generate_tasks(body: GenerateTasksRequest):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY가 설정되지 않았습니다")

    client = anthropic.Anthropic(api_key=api_key)
    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=2048,
        system=TASK_EXTRACT_SYSTEM,
        messages=[{"role": "user", "content": body.result_html}],
    )

    raw = message.content[0].text.strip()
    # 마크다운 코드블록 제거
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()
    try:
        tasks_data = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="태스크 파싱 실패: " + raw[:200])

    sb = get_supabase()
    inserted = []
    for t in tasks_data:
        res = sb.table("tasks").insert({
            "project_id": body.project_id,
            "title": t.get("title", "").strip(),
            "description": t.get("description"),
            "status": "todo",
            "source": "auto",
        }).execute()
        if res.data:
            inserted.append(res.data[0])

    log_activity(body.project_id, "태스크 자동 생성", f"{len(inserted)}개 생성")
    return {"tasks": inserted, "count": len(inserted)}


# 4. PATCH /tasks/{task_id}
@router.patch("/{task_id}")
def update_task(task_id: str, body: TaskUpdate):
    update_data: dict = {}
    if body.status is not None:
        update_data["status"] = body.status
    if body.due_date is not None:
        # 빈 문자열은 null로 처리
        update_data["due_date"] = body.due_date if body.due_date else None
    if body.title is not None:
        update_data["title"] = body.title
    if body.description is not None:
        update_data["description"] = body.description
    if not update_data:
        raise HTTPException(status_code=400, detail="수정할 필드가 없습니다")

    sb = get_supabase()
    res = sb.table("tasks").update(update_data).eq("id", task_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="태스크를 찾을 수 없습니다")
    task = res.data[0]
    if body.status is not None:
        status_ko = STATUS_KO.get(body.status, body.status)
        log_activity(task["project_id"], "태스크 상태 변경",
                     f"{task['title']} → {status_ko}")
    return task


# 5. DELETE /tasks/{task_id}
@router.delete("/{task_id}")
def delete_task(task_id: str):
    sb = get_supabase()
    sb.table("tasks").delete().eq("id", task_id).execute()
    return {"ok": True}
