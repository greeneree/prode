import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    password: str


@router.post("/login")
def login(body: LoginRequest):
    pw = body.password
    if pw and pw == os.environ.get("MASTER_PASSWORD"):
        return {"role": "master"}
    if pw and pw == os.environ.get("USER1_PASSWORD"):
        return {"role": "user1"}
    if pw and pw == os.environ.get("USER2_PASSWORD"):
        return {"role": "user2"}
    raise HTTPException(status_code=401, detail="비밀번호가 올바르지 않습니다")
