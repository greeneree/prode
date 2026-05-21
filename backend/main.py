from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import projects, requirements, ia, tasks, screen_descs, auth, project_notes, activity_logs

app = FastAPI(title="PRODE API", version="0.1.0")

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
