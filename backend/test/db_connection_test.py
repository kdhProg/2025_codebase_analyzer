# db_connection_test.py
import os
import sys

# 프로젝트의 루트 경로를 Python 경로에 추가하여 모듈 임포트를 가능하게 합니다.
# 이 스크립트를 프로젝트 루트에서 실행한다면 아래 두 줄은 필요 없을 수 있습니다.
# 예를 들어, mainProject/db_connection_test.py 로 실행한다면 필요하고,
# mainProject/backend/service/db/ 에서 실행한다면 불필요합니다.
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, '..'))
sys.path.append(project_root)


# 작성했던 Neo4j 드라이버 모듈을 임포트합니다.
from db.driver_neo4j import Neo4jConnector, run_cypher_query

def test_neo4j_connection():
    """
    Neo4j 데이터베이스 연결을 테스트하고, 간단한 쿼리를 실행하여 확인합니다.
    """
    print("--- Neo4j 연결 테스트 시작 ---")
    driver = None
    try:
        # Neo4jConnector를 통해 드라이버 인스턴스를 가져옵니다.
        # 이 과정에서 __init__이 호출되어 연결이 시도됩니다.
        driver = Neo4jConnector.get_driver()

        if driver:
            print("\n✅ Neo4j 드라이버 인스턴스 획득 성공.")

            # 간단한 Cypher 쿼리를 실행하여 DB가 응답하는지 확인합니다.
            # 'RETURN 1'은 가장 기본적인 DB 연결 확인 쿼리입니다.
            # read=False 로 설정하여 읽기 트랜잭션으로 실행합니다.
            test_query_result = run_cypher_query("RETURN 1 as result", write=False)

            if test_query_result and test_query_result[0]['result'] == 1:
                print("✅ Cypher 쿼리 실행 성공: DB가 정상적으로 응답합니다.")
                print(f"   쿼리 결과: {test_query_result}")
            else:
                print("❌ Cypher 쿼리 실행 실패: 예상치 못한 결과 또는 응답 없음.")
                print(f"   쿼리 결과: {test_query_result}")

            # DB 정보 확인 쿼리 (버전, 에디션 등)
            db_info_query_result = run_cypher_query("CALL dbms.components() YIELD name, versions, edition RETURN name, versions, edition", write=False)
            if db_info_query_result:
                print("\n✅ Neo4j 데이터베이스 정보:")
                for component in db_info_query_result:
                    print(f"   - Name: {component['name']}, Versions: {component['versions']}, Edition: {component['edition']}")
            else:
                print("❌ DB 정보 쿼리 실행 실패.")

        else:
            print("❌ Neo4j 드라이버 인스턴스를 얻을 수 없습니다. 연결 설정을 확인하세요.")

    except ConnectionError as ce:
        print(f"\n❌ 연결 오류 발생: {ce}")
        print("   - 환경 변수 (NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD)가 올바른지 확인하세요.")
        print("   - Neo4j 데이터베이스가 실행 중인지 확인하세요.")
        print("   - 비밀번호가 올바른지 확인하세요.")
    except Exception as e:
        print(f"\n❌ 예상치 못한 오류 발생: {e}")
    finally:
        # 테스트 완료 후에는 드라이버 연결을 반드시 닫아줍니다.
        if driver:
            Neo4jConnector.close_driver()
            print("\n--- Neo4j 연결 테스트 완료 ---")
        else:
            print("\n--- Neo4j 연결 테스트 종료 (드라이버 미생성) ---")

if __name__ == "__main__":
    test_neo4j_connection()