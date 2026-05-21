@echo off
start "Frontend" powershell -NoExit -Command "cd C:\dev\prode\frontend; npm run dev"
start "Backend" powershell -NoExit -Command "cd C:\dev\prode\backend; python -m uvicorn main:app --reload --port 8000"
