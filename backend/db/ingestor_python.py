# backend/service/db/neo4j_ingester.py

import uuid # 각 엔티티에 고유한 ID를 부여하기 위해 사용
from db.driver_neo4j import run_cypher_query # DB 쿼리 실행 유틸리티 임포트

def ingest_code_graph_data(extracted_entities: list, extracted_relationships: list):
    """
    추출된 엔티티와 관계 정보를 Neo4j 데이터베이스에 삽입합니다.

    Args:
        extracted_entities (list): 각 엔티티를 나타내는 딕셔너리 리스트.
                                   각 딕셔너리는 'type', 'name', 'file_path', 'start_line', 'end_line'
                                   등의 키를 포함해야 합니다.
        extracted_relationships (list): 각 관계를 나타내는 딕셔너리 리스트.
                                        각 딕셔너리는 'source_id', 'target_id', 'type'
                                        키를 포함해야 하며, 선택적으로 'properties' 키를 포함할 수 있습니다.
    """
    print(f"\n--- Neo4j 데이터 삽입 시작 ({len(extracted_entities)} 엔티티, {len(extracted_relationships)} 관계) ---")

    try:
        # 1. 엔티티 (노드) 삽입 또는 업데이트
        # MERGE를 사용하여 엔티티의 'id'를 기준으로 이미 존재하는 노드는 업데이트하고,
        # 존재하지 않는 노드는 새로 생성합니다.
        for entity in extracted_entities:
            # 모든 엔티티에는 고유한 ID가 있어야 합니다.
            # 만약 엔티티 데이터에 이미 'id'가 없다면 새로 생성합니다.
            if 'id' not in entity or entity['id'] is None:
                entity['id'] = str(uuid.uuid4()) # UUID를 사용하여 고유 ID 생성

            # 노드의 레이블은 엔티티의 'type' 값으로 동적으로 설정합니다 (예: 'Function', 'Class').
            node_label = entity.get('type', 'UnknownEntity')
            if not node_label.isalpha(): # 레이블은 알파벳 문자만 포함해야 함
                node_label = "Entity" # 유효하지 않은 레이블은 기본값으로 대체

            # ON CREATE SET: 노드가 새로 생성될 때 설정될 속성
            # ON MATCH SET: 노드가 이미 존재하여 매치될 때 업데이트될 속성
            query = f"""
                MERGE (n:{node_label} {{ id: $id }})
                ON CREATE SET
                    n.name = $name,
                    n.file_path = $file_path,
                    n.start_line = $start_line,
                    n.end_line = $end_line
                ON MATCH SET
                    n.name = $name,
                    n.file_path = $file_path,
                    n.start_line = $start_line,
                    n.end_line = $end_line
            """
            # None 값은 Cypher에서 무시되므로, 없는 속성은 설정되지 않습니다.
            run_cypher_query(query, parameters={
                'id': entity['id'],
                'name': entity.get('name'),
                'file_path': entity.get('file_path'),
                'start_line': entity.get('start_line'),
                'end_line': entity.get('end_line')
            }, write=True)
        print(f"✅ {len(extracted_entities)}개 엔티티(노드) 삽입/업데이트 완료.")

        # 2. 관계 (엣지) 삽입
        # 관계는 항상 존재하는 두 노드 사이에 생성됩니다.
        # MATCH를 사용하여 관계를 연결할 source 노드와 target 노드를 찾습니다.
        # MERGE를 사용하여 관계가 이미 존재하면 찾고, 없으면 새로 생성합니다.
        for rel in extracted_relationships:
            # 관계의 타입은 관계 딕셔너리의 'type' 값으로 동적으로 설정합니다 (예: 'CALLS', 'IMPORTS').
            rel_type = rel.get('type', 'UNKNOWN_RELATIONSHIP')
            if not rel_type.isalpha(): # 관계 타입도 알파벳 문자만 포함해야 함
                rel_type = "RELATED_TO" # 유효하지 않은 타입은 기본값으로 대체

            # 관계에 추가될 속성들을 처리합니다.
            # 'properties' 키가 딕셔너리 형태로 제공되면 그대로 사용합니다.
            rel_properties = rel.get('properties', {})

            query = f"""
                MATCH (source {{ id: $source_id }}), (target {{ id: $target_id }})
                MERGE (source)-[r:{rel_type}]->(target)
                ON CREATE SET r += $properties
                ON MATCH SET r += $properties
            """
            run_cypher_query(query, parameters={
                'source_id': rel['source_id'],
                'target_id': rel['target_id'],
                'properties': rel_properties # 관계에 대한 추가 속성
            }, write=True)
        print(f"✅ {len(extracted_relationships)}개 관계(엣지) 삽입 완료.")

    except Exception as e:
        print(f" Neo4j 데이터 삽입 중 오류 발생: {e}")
        raise # 오류 발생 시 상위 호출자에게 예외를 다시 발생시킵니다.

    print("--- Neo4j 데이터 삽입 완료 ---")