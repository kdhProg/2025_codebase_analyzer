# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware # CORS 미들웨어 추가

app = FastAPI()

# CORS 설정: 프론트엔드(React)와 백엔드가 다른 포트에서 실행되므로 CORS 허용이 필요합니다.
origins = [
    "http://localhost:3000",  # React 개발 서버 기본 포트
    # "http://localhost",
    # "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def read_root():
    return {"message": "Hello from FastAPI Backend!"}

@app.get("/api/data")
async def get_data():
    return {"data": "This is some data from FastAPI!"}