# app/services/semantic_search_service.py

import torch
import pickle
import os
import logging
from typing import List, Dict, Any, Optional
from transformers import AutoTokenizer, AutoModel
from db.driver_neo4j import Neo4jConnector, run_cypher_query
import sys

# 로거 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("debug_log.log", encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# CodeBERT 모델과 토크나이저를 애플리케이션 시작 시점에 한 번만 로드합니다.
# 이렇게 하면 매번 호출할 때마다 모델을 로드하는 비효율을 방지할 수 있습니다.
try:
    logger.info("CodeBERT 모델과 토크나이저 로드 시작...")
    tokenizer = AutoTokenizer.from_pretrained("microsoft/codebert-base")
    model = AutoModel.from_pretrained("microsoft/codebert-base")
    model.eval()
    logger.info("CodeBERT 모델과 토크나이저가 성공적으로 로드되었습니다.")
except Exception as e:
    logger.critical(f"CodeBERT 모델 로드 실패: {e}", exc_info=True)
    tokenizer = None
    model = None

def search(query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """
    자연어 쿼리와 가장 유사한 코드 노드 ID를 찾습니다.
    이 함수는 호출될 때마다 최신 임베딩 파일을 로드합니다.
    """
    if tokenizer is None or model is None:
        logger.error("CodeBERT 모델 또는 토크나이저가 로드되지 않았습니다. 검색을 수행할 수 없습니다.")
        return []

    embedding_file_path = "embedding_data.pkl"
    if not os.path.exists(embedding_file_path):
        logger.warning(f"임베딩 파일이 존재하지 않습니다: {embedding_file_path}")
        return []

    try:
        with open(embedding_file_path, "rb") as f:
            embedding_dict = pickle.load(f)
    except Exception as e:
        logger.error(f"임베딩 파일 로드 실패: {e}", exc_info=True)
        return []

    if not embedding_dict:
        logger.warning("임베딩 파일이 비어 있습니다. 검색을 수행하지 않습니다.")
        return []
    
    node_ids = list(embedding_dict.keys())
    # pickle 파일의 값은 리스트이므로 텐서로 변환합니다.
    tensor_values = [torch.tensor(val) for val in embedding_dict.values()]
    code_embeddings = torch.stack(tensor_values)

    # 쿼리를 임베딩으로 변환
    inputs = tokenizer(query, return_tensors="pt")
    with torch.no_grad():
        query_embedding = model(**inputs).pooler_output

    # 코사인 유사도 계산
    cos_scores = torch.nn.functional.cosine_similarity(query_embedding, code_embeddings)
    top_results = torch.topk(cos_scores, k=min(top_k, len(code_embeddings)))

    logger.info(f'DEBUG // semantic search service node_ids >>>>> {node_ids}')
    results = []
    for score, idx in zip(top_results.values, top_results.indices):
        results.append({
            "node_id": node_ids[idx],
            "score": score.item()
        })
    return results

def initialize_search_service():
    """애플리케이션 시작 시점에 Neo4j 드라이버를 로드하는 함수"""
    logger.info("initialize_search_service 함수 시작")
    try:
        Neo4jConnector.get_driver()
        logger.info("Neo4j 드라이버 초기화 성공.")
    except Exception as e:
        logger.error(f"Neo4j 드라이버 초기화 실패: {e}", exc_info=True)
        raise RuntimeError("Neo4j 드라이버 초기화 실패. 서비스를 사용할 수 없습니다.")
    logger.info("initialize_search_service 함수 종료")

def _get_snippet_from_file(file_path: str, start_line: int, end_line: int) -> str:
    """파일 경로와 라인 범위를 기반으로 코드 스니펫을 추출하는 내부 헬퍼 함수."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            snippet_lines = lines[start_line - 1:end_line]
            return "".join(snippet_lines).strip()
    except FileNotFoundError:
        logger.error(f"파일을 찾을 수 없습니다: {file_path}")
        return f"ERROR: 파일을 찾을 수 없습니다: {file_path}"
    except Exception as e:
        logger.error(f"파일을 읽는 중 오류 발생: {e}")
        return f"ERROR: 파일을 읽는 중 오류 발생: {e}"


def get_code_snippets_from_neo4j(node_ids: List[str]) -> List[Dict[str, Any]]:
    """
    Neo4j에서 주어진 노드 ID에 해당하는 코드의 파일 경로와 라인 정보를 가져와,
    파일 시스템에서 실제 스니펫을 추출하여 반환합니다.
    """
    code_snippets = []
    
    query = """
        UNWIND $ids AS node_id
        MATCH (n)
        WHERE n.id = node_id AND n.file_path IS NOT NULL AND n.start_line IS NOT NULL AND n.end_line IS NOT NULL
        RETURN 
            n.file_path AS file_path, 
            n.start_line AS start_line, 
            n.end_line AS end_line,
            n.id AS node_id
    """
    
    logger.info(f"get_code_snippets_from_neo4j: Neo4j 쿼리 실행 시도 - Query: '{query.strip()}', Params: '{node_ids}'")
    
    try:
        results = run_cypher_query(query, parameters={"ids": node_ids}, write=False)
        
        if not results:
            logger.warning(f"Neo4j 쿼리 결과가 비어 있습니다. 노드 ID {node_ids}에 해당하는 유효한 노드가 존재하지 않을 수 있습니다.")
            return []

        for record in results:
            node_id = record["node_id"]
            file_path = record.get("file_path")
            start_line = record.get("start_line")
            end_line = record.get("end_line")
            
            code_snippet = _get_snippet_from_file(file_path, start_line, end_line)
            
            code_snippets.append({
                "node_id": node_id,
                "file_path": file_path,
                "code_snippet": code_snippet
            })
    except RuntimeError as e:
        logger.error(f"Neo4j에서 코드 스니펫 정보를 가져오는 중 오류 발생: {e}")
        raise
    except Exception as e:
        logger.error(f"알 수 없는 오류가 발생했습니다: {e}", exc_info=True)
        raise RuntimeError("알 수 없는 오류로 Neo4j 쿼리 실행 실패.")

    return code_snippets


def close_neo4j_driver():
    """애플리케이션 종료 시 Neo4j 드라이버를 닫습니다."""
    Neo4jConnector.close_driver()
