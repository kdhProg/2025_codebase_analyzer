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
    (이 함수는 변경하지 않습니다.)
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
    tensor_values = [torch.tensor(val) for val in embedding_dict.values()]
    code_embeddings = torch.stack(tensor_values)

    inputs = tokenizer(query, return_tensors="pt")
    with torch.no_grad():
        query_embedding = model(**inputs).pooler_output

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


def get_rich_code_contexts_from_neo4j(node_ids: List[str]) -> List[Dict[str, Any]]:
    """
    주어진 노드 ID에 대한 정보와, 해당 노드에 연결된 릴레이션 및 인접 노드를 함께 가져옵니다.
    """
    code_contexts = []
    
    # 노드 ID를 통해 해당 노드와 인접한 모든 관계 및 노드를 찾는 Cypher 쿼리
    # 이는 '유사하다고 판정된 노드'로부터 시작하는 1-hop 탐색입니다.
    # r.id는 릴레이션의 고유 ID입니다.
    query = """
        UNWIND $ids AS node_id
        MATCH (n)-[r]-(m)
        WHERE n.id = node_id
        RETURN 
            n.id AS main_node_id, 
            n.file_path AS main_file_path,
            n.start_line AS main_start_line,
            n.end_line AS main_end_line,
            labels(n) AS main_labels,
            type(r) AS rel_type,
            r.id AS rel_id,
            m.id AS related_node_id,
            labels(m) AS related_labels,
            m.name AS related_node_name,
            m.file_path AS related_file_path
    """
    
    logger.info(f"get_rich_code_contexts_from_neo4j: Neo4j 쿼리 실행 시도. Params: '{node_ids}'")
    
    try:
        results = run_cypher_query(query, parameters={"ids": node_ids}, write=False)
        
        # 결과를 노드 ID별로 그룹화
        grouped_results = {}
        for record in results:
            main_node_id = record["main_node_id"]
            if main_node_id not in grouped_results:
                grouped_results[main_node_id] = {
                    "node_id": main_node_id,
                    "file_path": record.get("main_file_path"),
                    "start_line": record.get("main_start_line"),
                    "end_line": record.get("main_end_line"),
                    "type": record["main_labels"][0] if record["main_labels"] else "Unknown",
                    "code_snippet": "",  # 나중에 채워질 값
                    "relations": []
                }
            
            # 관계 정보 추가
            grouped_results[main_node_id]["relations"].append({
                "rel_type": record["rel_type"],
                "rel_id": record["rel_id"],
                "target_node_id": record["related_node_id"],
                "target_node_name": record["related_node_name"],
                "target_node_type": record["related_labels"][0] if record["related_labels"] else "Unknown",
                "target_file_path": record.get("related_file_path")
            })

        # 코드 스니펫 추출
        for node_id, data in grouped_results.items():
            if data["start_line"] is not None and data["end_line"] is not None and data["file_path"] is not None:
                snippet = _get_snippet_from_file(data["file_path"], data["start_line"], data["end_line"])
                data["code_snippet"] = snippet
            else:
                data["code_snippet"] = f"No code snippet available. This is a {data['type']} node."
                
            code_contexts.append(data)

        # 릴레이션이 없는 단독 노드 처리 (선택적으로 추가)
        # 쿼리로 찾지 못한 노드 ID들을 따로 처리하여 결과에 포함
        found_node_ids = set(grouped_results.keys())
        not_found_ids = [id for id in node_ids if id not in found_node_ids]
        if not_found_ids:
            isolated_query = """
                UNWIND $ids AS node_id
                MATCH (n) WHERE n.id = node_id
                RETURN n.id AS node_id, labels(n) AS labels, n.file_path AS file_path, n.start_line AS start_line, n.end_line AS end_line
            """
            isolated_results = run_cypher_query(isolated_query, parameters={"ids": not_found_ids}, write=False)
            for record in isolated_results:
                snippet = _get_snippet_from_file(record['file_path'], record['start_line'], record['end_line'])
                code_contexts.append({
                    "node_id": record['node_id'],
                    "file_path": record['file_path'],
                    "type": record["labels"][0] if record["labels"] else "Unknown",
                    "code_snippet": snippet,
                    "relations": []
                })

    except Exception as e:
        logger.error(f"Neo4j에서 풍부한 코드 컨텍스트를 가져오는 중 오류 발생: {e}", exc_info=True)
        raise RuntimeError("Neo4j 쿼리 실행 실패.")
        
    return code_contexts

def close_neo4j_driver():
    """애플리케이션 종료 시 Neo4j 드라이버를 닫습니다."""
    Neo4jConnector.close_driver()
