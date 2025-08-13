# app/api/semantic_search_api.py

from fastapi import APIRouter, HTTPException
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import List, Dict, Any
from service import semantic_search_service
import logging

# Pydantic을 사용한 요청 및 응답 데이터 모델 정의
class SearchRequest(BaseModel):
    query: str
    top_k: int = 5

class SearchResult(BaseModel):
    score: float
    file_path: str
    code_snippet: str

# APIRouter 인스턴스 생성
router = APIRouter()

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --------------------
# lifespan 이벤트 핸들러 정의
# --------------------
@asynccontextmanager
async def lifespan(app: APIRouter):
    """
    애플리케이션의 생명주기를 관리합니다.
    서버 시작 시 초기화 작업을 수행하고, 서버 종료 시 정리 작업을 수행합니다.
    """
    print("애플리케이션 시작: 서비스 초기화 중...")
    semantic_search_service.initialize_search_service()
    yield
    print("애플리케이션 종료: 정리 작업 실행 중...")
    semantic_search_service.close_neo4j_driver()


@router.post("/semantic-search", response_model=List[SearchResult])
async def semantic_search_endpoint(request: SearchRequest):
    """
    자연어 쿼리를 받아 관련성이 높은 코드 스니펫을 반환합니다.
    """
    
    # 1. 자연어 쿼리로 유사한 노드 ID를 찾습니다.
    logger.info(f"Received query: '{request.query}' with top_k={request.top_k}")
    
    # NOTE: semantic_search_service.py 변경에 따라 searcher 객체 대신 함수를 직접 호출
    try:
        results_with_ids = semantic_search_service.search(request.query, top_k=request.top_k)
        logger.info(f"Found {len(results_with_ids)} similar node IDs from CodeBERT.")
    except Exception as e:
        logger.error(f"Failed to perform semantic search: {e}")
        raise HTTPException(status_code=500, detail=f"시맨틱 검색 중 오류 발생: {e}")

    if not results_with_ids:
        logger.warning("No similar code snippets found.")
        return []
        
    # 2. 찾은 노드 ID로 Neo4j에서 실제 코드 스니펫을 가져옵니다.
    node_ids = [result["node_id"] for result in results_with_ids]
    try:
        code_snippets_from_db = semantic_search_service.get_code_snippets_from_neo4j(node_ids)
        logger.info(f"Fetched {len(code_snippets_from_db)} code snippets from Neo4j.")
    except RuntimeError as e:
        logger.error(f"Failed to fetch code snippets from Neo4j: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    # 3. 임베딩 스코어와 코드 스니펫 정보를 합쳐 최종 결과를 만듭니다.
    code_map = {result["node_id"]: result for result in results_with_ids}
    
    final_results = []
    for snippet_data in code_snippets_from_db:
        node_id = snippet_data["node_id"]
        score = code_map.get(node_id, {}).get("score", 0.0)
        final_results.append(
            SearchResult(
                score=score,
                file_path=snippet_data["file_path"],
                code_snippet=snippet_data["code_snippet"]
            )
        )
    
    # --- 디버깅을 위해 final_results 내용 출력 ---
    print("--- [DEBUGGING] final_results 내용 ---")
    for i, result in enumerate(final_results):
        print(f"Result {i+1} | File Path: {result.file_path}, Score: {result.score:.4f}")
    print("--- [DEBUGGING] final_results 종료 ---")
    # ----------------------------------------------------
    
    return final_results
