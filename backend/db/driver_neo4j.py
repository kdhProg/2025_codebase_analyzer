from neo4j import GraphDatabase
import os

class Neo4jConnector:
    _driver = None

    def __init__(self):
        if Neo4jConnector._driver is not None:
            return

        uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        username = os.getenv("NEO4J_USERNAME", "neo4j")
        password = os.getenv("NEO4J_PASSWORD", "qwerqwer")

        try:
            Neo4jConnector._driver = GraphDatabase.driver(uri, auth=(username, password))
            Neo4jConnector._driver.verify_connectivity()
            print("Neo4j connection established successfully.")
        except Exception as e:
            print(f"Error connecting to Neo4j: {e}")
            Neo4jConnector._driver = None
            raise

    @classmethod
    def get_driver(cls):
        if cls._driver is None:
            cls()
        return cls._driver

    @classmethod
    def close_driver(cls):
        if cls._driver:
            cls._driver.close()
            print("Neo4j connection closed.")
            cls._driver = None
            
            
def run_cypher_query(query, parameters=None, write=True):
    """
    Neo4j 데이터베이스에 Cypher 쿼리를 실행합니다.

    Args:
        query (str): 실행할 Cypher 쿼리 문자열.
        parameters (dict, optional): 쿼리에 전달할 파라미터 딕셔너리. 기본값은 None.
        write (bool, optional): 쿼리가 데이터를 변경하는 쓰기 작업이면 True, 읽기 작업이면 False. 기본값은 True.

    Returns:
        list: 쿼리 결과의 레코드 리스트 (딕셔너리 형태).

    Raises:
        ConnectionError: Neo4j 드라이버가 초기화되지 않았을 때 발생.
        Exception: Cypher 쿼리 실행 중 오류 발생 시 발생.
    """
    driver = Neo4jConnector.get_driver()
    if not driver:
        raise ConnectionError("Neo4j driver not initialized. Please check your connection settings.")

    with driver.session() as session:
        try:
            if write:
                result = session.execute_write(lambda tx: tx.run(query, parameters).data())
            else:
                result = session.execute_read(lambda tx: tx.run(query, parameters).data())
            return result
        except Exception as e:
            print(f"Error executing Cypher query: {e}")
            raise
        
        
def get_all_nodes_with_enriched_text():
    """
    Neo4j에서 모든 노드를 가져오고, 관계 정보를 포함하여 텍스트를 보강합니다.
    이는 임베딩 생성을 위해 데이터를 준비하는 과정입니다.
    """
    cypher_query = """
    MATCH (n)
    OPTIONAL MATCH (n)-[r]-(m)
    RETURN
        elementId(n) AS id, 
        properties(n) AS properties,
        COLLECT(DISTINCT {rel_type: type(r), neighbor_name: m.name}) AS relationships
    """
    
    print("임베딩을 위해 Neo4j에서 노드와 관계를 가져오는 중...")
    try:
        results = run_cypher_query(cypher_query, write=False)
        
        nodes_list = []
        for record in results:
            # elementId는 이미 문자열이므로 별도 변환이 필요하지 않습니다.
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