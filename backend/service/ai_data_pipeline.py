# app/services/ai_data_pipeline.py

import torch
import pickle
import os
import logging
import inspect
from typing import List, Dict, Any, Callable, Optional
from transformers import AutoTokenizer, AutoModel
from db.driver_neo4j import run_cypher_query

logger = logging.getLogger(__name__)

MODEL_NAME = "microsoft/CodeBERT-base"
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModel.from_pretrained(MODEL_NAME)

def get_all_nodes_with_enriched_text():
    """
    Neo4j에서 모든 노드를 가져오고, 관계 정보를 포함하여 텍스트를 보강합니다.
    (ID를 사용하여 노드를 식별합니다.)
    """
    cypher_query = """
    MATCH (n)
    WHERE n.id IS NOT NULL
    OPTIONAL MATCH (n)-[r]-(m)
    RETURN
        n.id AS id,
        properties(n) AS properties,
        COLLECT(DISTINCT {rel_type: type(r), neighbor_name: m.name}) AS relationships
    """

    print("임베딩을 위해 Neo4j에서 노드와 관계를 가져오는 중...")
    try:
        results = run_cypher_query(cypher_query, write=False)
        # print(f'Debug | ai_data_pipeline results >>>>> {results}')
        nodes_list = []
        for record in results:
            node_id = record['id']
            properties = record['properties']
            relationships = record['relationships']

            base_text = properties.get('code_text', properties.get('name', ''))

            rel_texts = []
            if relationships:
                for rel in relationships:
                    rel_type = rel['rel_type']
                    neighbor_name = rel.get('neighbor_name')
                    if neighbor_name:
                        rel_texts.append(f"이것은 '{neighbor_name}'와 '{rel_type}' 관계를 가지고 있습니다.")

            full_text = f"{base_text} {' '.join(rel_texts)}" if rel_texts else base_text

            if full_text:
                nodes_list.append({
                    "id": node_id,
                    "text": full_text
                })

        print(f"AI 데이터 파이프라인을 위해 {len(nodes_list)}개의 노드를 가져왔습니다.")
        return nodes_list
    except Exception as e:
        print(f"Neo4j에서 노드 데이터를 가져오는 중 오류 발생: {e}")
        return None

def run_embedding_pipeline(progress_callback: Optional[Callable] = None, project_root_path: str = "."):
    logger.info("임베딩 파이프라인 실행 시작...")
    try:
        nodes = get_all_nodes_with_enriched_text()

        if not nodes:
            logger.warning("가져올 노드가 없습니다. 임베딩 파이프라인을 건너뜁니다.")
            if progress_callback:
                callback_args = inspect.signature(progress_callback).parameters
                if len(callback_args) == 2:
                    progress_callback(100, "임베딩 파이프라인 완료 (노드 없음).")
                else:
                    progress_callback(100)
            return

        total = len(nodes)
        embeddings_with_ids = {}
        batch_size = 32

        for i in range(0, total, batch_size):
            batch_nodes = nodes[i:i + batch_size]
            batch_texts = [node['text'] for node in batch_nodes]
            batch_ids = [node['id'] for node in batch_nodes]

            inputs = tokenizer(batch_texts, padding=True, truncation=True, return_tensors="pt")
            with torch.no_grad():
                batch_embeddings = model(**inputs).pooler_output

            for j in range(len(batch_ids)):
                embeddings_with_ids[batch_ids[j]] = batch_embeddings[j].tolist()

            percent_completed = min(100, (i + batch_size) / total * 100)

            if progress_callback:
                callback_args = inspect.signature(progress_callback).parameters
                if len(callback_args) == 2:
                    progress_callback(percent_completed, f"임베딩 진행 중: {int(percent_completed)}%")
                else:
                    progress_callback(percent_completed)

        with open("embedding_data.pkl", "wb") as f:
            pickle.dump(embeddings_with_ids, f)

        logger.info(f"임베딩 파일 'embedding_data.pkl'에 {len(embeddings_with_ids)}개 노드의 임베딩 저장 완료.")
        if progress_callback:
            callback_args = inspect.signature(progress_callback).parameters
            if len(callback_args) == 2:
                progress_callback(100, "임베딩 파이프라인 완료.")
            else:
                progress_callback(100)

    except Exception as e:
        logger.error(f"임베딩 파이프라인 실행 중 오류 발생: {e}", exc_info=True)
        if progress_callback:
            callback_args = inspect.signature(progress_callback).parameters
            if len(callback_args) == 2:
                progress_callback(100, f"오류 발생: {str(e)}")
            else:
                progress_callback(100)
