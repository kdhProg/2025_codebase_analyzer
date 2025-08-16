# app/api/semantic_search_api.py

from fastapi import APIRouter, HTTPException
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import List, Dict, Any
from service import semantic_search_service
from service import llm_service
import logging

# Pydantic을 사용한 요청 데이터 모델 정의
class SearchRequest(BaseModel):
    query: str
    top_k: int = 5

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


@router.post("/semantic-search", response_model=str)
async def semantic_search_endpoint(request: SearchRequest):
    """
    자연어 쿼리를 받아 관련성이 높은 코드 컨텍스트를 찾고, 이를 기반으로 자연어 답변을 생성합니다.
    """
    
    # 1. 자연어 쿼리로 유사한 노드 ID를 찾습니다.
    logger.info(f"Received query: '{request.query}' with top_k={request.top_k}")
    
    try:
        results_with_ids = semantic_search_service.search(request.query, top_k=request.top_k)
        logger.info(f"Found {len(results_with_ids)} similar node IDs from CodeBERT.")
    except Exception as e:
        logger.error(f"Failed to perform semantic search: {e}")
        raise HTTPException(status_code=500, detail=f"시맨틱 검색 중 오류 발생: {e}")

    if not results_with_ids:
        logger.warning("No similar code snippets found.")
        return "유사한 코드 스니펫을 찾을 수 없습니다. 다른 쿼리로 다시 시도해주세요."
        
    # 2. 찾은 노드 ID로 Neo4j에서 실제 코드 컨텍스트(노드 + 릴레이션)를 가져옵니다.
    node_ids = [result["node_id"] for result in results_with_ids]
    try:
        # 변경된 함수 호출: get_code_snippets_from_neo4j -> get_rich_code_contexts_from_neo4j
        code_contexts_from_db = semantic_search_service.get_rich_code_contexts_from_neo4j(node_ids)
        logger.info(f"Fetched {len(code_contexts_from_db)} rich code contexts from Neo4j.")
    except RuntimeError as e:
        logger.error(f"Failed to fetch code contexts from Neo4j: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    # 3. LLM 모델을 사용하여 자연어 답변을 생성합니다.
    # LLM 서비스는 이제 노드와 릴레이션이 포함된 더 풍부한 데이터를 받게 됩니다.
    if not code_contexts_from_db:
        return "유사한 코드는 찾았으나, 해당 코드를 추출하는 데 실패했습니다. 데이터베이스를 확인해주세요."
        
    # generate_natural_language_response 함수도 새로운 데이터 구조를 처리하도록 수정해야 합니다.
    final_response = llm_service.generate_natural_language_response(request.query, code_contexts_from_db)
    
    return final_response
