from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import file_scan
from api import file_analysis
from api import semantic_search_api
from api import code_interpretation
from api import graph

app = FastAPI(lifespan=semantic_search_api.lifespan)

origins = [
    "http://localhost:3000",
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
app.include_router(file_scan.router)
app.include_router(file_analysis.router)
app.include_router(semantic_search_api.router)
app.include_router(graph.router)
app.include_router(code_interpretation.router)

@app.get("/")
async def read_root():
    return {"message": "backend server test"}