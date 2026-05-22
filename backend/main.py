from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from routers import projects, requirements, ia, tasks, screen_descs, auth, project_notes, activity_logs

MAX_UPLOAD_SIZE = 50 * 1024 * 1024  # 50MB


class LimitUploadSizeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_UPLOAD_SIZE:
            return Response("Request body too large (max 50MB)", status_code=413)
        return await call_next(request)


app = FastAPI(title="PRODE API", version="0.1.0")

app.add_middleware(LimitUploadSizeMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://prode-theta-ten.vercel.app",
        "https://prode-git-main-jink30s-projects.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router)
app.include_router(requirements.router)
app.include_router(ia.router)
app.include_router(tasks.router)
app.include_router(screen_descs.router)
app.include_router(auth.router)
app.include_router(project_notes.router)
app.include_router(activity_logs.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
