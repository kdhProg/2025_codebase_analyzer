# backend/api/graph.py

from fastapi import APIRouter, HTTPException
from typing import Dict, List, Any, Optional
from db.driver_neo4j import run_cypher_query

router = APIRouter(
    tags=["graph"]
)

def get_all_graph_data() -> Dict[str, Any]:
    """
    Neo4j 데이터베이스에서 모든 노드와 관계를 조회하여 그래프 데이터를 반환합니다.
    ai_modules/data_pipeline.py에서 사용할 수 있는 형태로 구조화합니다.
    
    Returns:
        Dict: {'nodes': [...], 'relationships': [...]} 형태의 그래프 데이터
    """
    try:
        # 1. 모든 노드 조회
        nodes_query = """
            MATCH (n)
            RETURN 
                id(n) as internal_id,
                n.id as id,
                labels(n) as labels,
                properties(n) as properties
        """
        nodes_result = run_cypher_query(nodes_query, write=False)
        
        # 2. 모든 관계 조회
        relationships_query = """
            MATCH (source)-[r]->(target)
            RETURN 
                id(r) as internal_id,
                source.id as source_id,
                target.id as target_id,
                type(r) as type,
                properties(r) as properties
        """
        relationships_result = run_cypher_query(relationships_query, write=False)
        
        # 3. 노드 데이터 포맷팅
        formatted_nodes = []
        for node in nodes_result:
            # 노드의 모든 속성을 properties에 포함
            node_properties = node.get('properties', {})
            
            # 코드 텍스트가 있는 경우 code_text 필드로 설정
            # (ai_modules/data_pipeline.py의 42번째 줄에서 사용)
            if 'name' in node_properties:
                # 함수나 클래스의 경우 이름을 code_text로 사용
                node_properties['code_text'] = node_properties['name']
            
            formatted_node = {
                'id': node.get('id'),
                'internal_id': node.get('internal_id'),
                'labels': node.get('labels', []),
                'properties': node_properties
            }
            formatted_nodes.append(formatted_node)
        
        # 4. 관계 데이터 포맷팅
        formatted_relationships = []
        for rel in relationships_result:
            formatted_rel = {
                'internal_id': rel.get('internal_id'),
                'source_id': rel.get('source_id'),
                'target_id': rel.get('target_id'),
                'type': rel.get('type'),
                'properties': rel.get('properties', {})
            }
            formatted_relationships.append(formatted_rel)
        
        return {
            'nodes': formatted_nodes,
            'relationships': formatted_relationships,
            'summary': {
                'total_nodes': len(formatted_nodes),
                'total_relationships': len(formatted_relationships)
            }
        }
        
    except Exception as e:
        print(f"Error retrieving graph data: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve graph data: {str(e)}")

@router.get("/graph")
async def get_graph_data():
    """
    Neo4j 데이터베이스에서 전체 그래프 데이터를 조회하여 반환합니다.
    ai_modules/data_pipeline.py에서 호출하는 엔드포인트입니다.
    
    Returns:
        Dict: 노드와 관계가 포함된 그래프 데이터
    """
    try:
        graph_data = get_all_graph_data()
        return {
            "status": "success",
            "message": "Graph data retrieved successfully",
            "data": graph_data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/graph/summary")
async def get_graph_summary():
    """
    그래프 데이터의 요약 정보를 반환합니다.
    
    Returns:
        Dict: 노드 수, 관계 수, 노드 타입별 통계 등
    """
    try:
        # 노드 타입별 카운트
        node_types_query = """
            MATCH (n)
            RETURN labels(n) as labels, count(n) as count
        """
        node_types_result = run_cypher_query(node_types_query, write=False)
        
        # 관계 타입별 카운트  
        rel_types_query = """
            MATCH ()-[r]->()
            RETURN type(r) as type, count(r) as count
        """
        rel_types_result = run_cypher_query(rel_types_query, write=False)
        
        return {
            "status": "success",
            "summary": {
                "node_types": node_types_result,
                "relationship_types": rel_types_result
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get graph summary: {str(e)}")

@router.get("/graph/nodes/{node_id}")
async def get_node_details(node_id: str):
    """
    특정 노드의 상세 정보를 조회합니다.
    
    Args:
        node_id: 조회할 노드의 ID
        
    Returns:
        Dict: 노드 상세 정보와 연결된 관계들
    """
    try:
        query = """
            MATCH (n {id: $node_id})
            OPTIONAL MATCH (n)-[r]-(connected)
            RETURN 
                n as node,
                collect({
                    relationship: r,
                    connected_node: connected,
                    direction: CASE 
                        WHEN startNode(r) = n THEN 'outgoing'
                        ELSE 'incoming'
                    END
                }) as connections
        """
        
        result = run_cypher_query(query, parameters={'node_id': node_id}, write=False)
        
        if not result:
            raise HTTPException(status_code=404, detail=f"Node with ID '{node_id}' not found")
            
        return {
            "status": "success",
            "data": result[0]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get node details: {str(e)}")
