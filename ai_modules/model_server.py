from fastapi import FastAPI, HTTPException
from semantic_search import SemanticSearcher
import uvicorn
import os

# 1. FastAPI 애플리케이션 생성
app = FastAPI(
    title = "Code Analysis AI Model Server",
    description = "코드 분석 및 시맨틱 검색을 위한 AI 모델 서빙 API",
    version = "1.0.0"
)

# 2. 모델 로딩
# 서버가 시작될 때 모델을 한 번만 로드하여 메모리에 상주시키기 위함
# 이렇게 하지 않으면 매 요청마다 모델을 로드하여 매우 비효율적임
searcher = None

@app.on_event("startup")
def load_model():
    global searcher
    embedding_file = "data/embeddings.pkl"
    if not os.path.exists(embedding_file):
        raise RuntimeError(f"'{embedding_file}'을 찾을 수 없습니다. data_pipeline.py를 먼저 실행해야 합니다.")
    searcher = SemanticSearcher(embedding_file_path = embedding_file)

# 3. API 엔드포인트 정의
@app.get("/")
def read_root():
    return {"message": "AI 모델 서버가 정상적으로 동작 중입니다."}

@app.get("/search")
def search_code(query: str, top_k: int = 5):
    """
    자연어 쿼리를 받아 시맨틱 검색을 수행하고 결과를 반환합니다.
    예시: /search?query=데이터베이스에 유저 추가&top_k=3
    """
    if not query:
        raise HTTPException(status_code = 400, detail = "'query' 파라미터는 필수입니다.")
    
    if searcher is None:
        raise HTTPException(status_code = 503, detail = "모델이 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.")

    try:
        results = searcher.search(query, top_k=top_k)
        return {"query": query, "results": results}
    except Exception as e:
        raise HTTPException(status_code = 500, detail = f"검색 중 오류 발생: {e}")

# 4. 서버 실행 (개발 환경용)
if __name__ == "__main__":
    # uvicorn model_server:app --reload
    # 위 명령어를 터미널에서 실행하여 서버를 켭니다.
    uvicorn.run(app, host = "0.0.0.0", port = 8081)