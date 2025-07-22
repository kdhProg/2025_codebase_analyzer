from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import file_scan

app = FastAPI()

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

# --- 라우터 포함 ---
app.include_router(file_scan.router) # scan.py의 router 인스턴스를 포함

@app.get("/")
async def read_root():
    return {"message": "Hello from FastAPI Backend!"}

@app.get("/api/data")
async def get_data():
    return {"data": "This is some data from FastAPI!"}