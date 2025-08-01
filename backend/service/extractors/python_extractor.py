# backend/services/extractors/python_extractor.py

from typing import Dict, List, Any, Tuple, Optional
from pathlib import Path
# 🚨 QueryCursor 임포트 추가!
from tree_sitter import Language, Tree, Query, QueryCursor, Node

# 쿼리 파일 경로 설정 (extractors/queries/python/)
QUERY_DIR = Path(__file__).parent / "queries" / "python"

def load_query_source(query_filename: str) -> Optional[str]:
    """지정된 쿼리 파일을 로드합니다."""
    query_path = QUERY_DIR / query_filename
    if query_path.exists():
        with open(query_path, 'r', encoding='utf-8') as f:
            return f.read()
    print(f"WARNING: Query file not found: {query_path}")
    return None

def extract_python_entities_and_relationships(
    tree: Tree,
    language_parser: Language
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Python AST를 Tree-sitter 쿼리를 사용하여 핵심 엔티티와 관계를 추출합니다.
    """
    extracted_entities = []
    extracted_relationships = []

    print(f"DEBUG(PythonExtractor): Starting entity/relationship extraction using queries.")

    definitions_query_source = load_query_source("definitions.scm")

    if not definitions_query_source:
        print("ERROR: Could not load Python definitions query. Skipping extraction.")
        return [], []

    try:
        query = Query(language_parser, definitions_query_source)
        cursor = QueryCursor(query) 
        
        captured_data: dict[str, list[Node]] = cursor.captures(tree.root_node)
        
        for name, nodes in captured_data.items(): # 딕셔너리의 (키, 값) 쌍을 순회
            for node in nodes: # 각 캡처 이름에 해당하는 노드 리스트를 순회
                node_text = node.text.decode('utf8', errors='ignore')
                start_point = {"row": node.start_point[0], "column": node.start_point[1]}
                end_point = {"row": node.end_point[0], "column": node.end_point[1]}
                
                # --- 엔티티 추출 ---
                # 캡처 이름 (name)을 기반으로 로직을 분기합니다.
                if name == "function.name":
                    func_name = node_text
                    # node는 이미 이름 노드이므로, 부모 노드(function_definition)를 찾습니다.
                    func_definition_node = node.parent 
                    # 부모 노드가 decorated_definition일 수도 있으므로,
                    # 실제 function_definition을 찾기 위한 로직이 더 필요할 수 있습니다.
                    # 하지만 현재 쿼리에서 @function.definition으로 전체를 캡처하는 경우를 고려한다면
                    # 이 로직은 괜찮을 수 있습니다. 일단 node.parent로 진행합니다.

                    entity_id = f"func_{func_name}_{start_point['row']}"
                    extracted_entities.append({
                        "type": "function",
                        "id": entity_id,
                        "name": func_name,
                        "file_location": f"{start_point['row']}:{start_point['column']}",
                        "end_location": f"{end_point['row']}:{end_point['column']}",
                        "raw_text": func_definition_node.text.decode('utf8', errors='ignore')
                    })
                    print(f"DEBUG(PythonExtractor): Extracted function: {func_name} at {start_point['row']}")

                elif name == "class.name":
                    class_name = node_text
                    class_definition_node = node.parent
                    entity_id = f"class_{class_name}_{start_point['row']}"
                    extracted_entities.append({
                        "type": "class",
                        "id": entity_id,
                        "name": class_name,
                        "file_location": f"{start_point['row']}:{start_point['column']}",
                        "end_location": f"{end_point['row']}:{end_point['column']}",
                        "raw_text": class_definition_node.text.decode('utf8', errors='ignore')
                    })
                    print(f"DEBUG(PythonExtractor): Extracted class: {class_name} at {start_point['row']}")

                # --- 관계 추출 ---
                elif name == "call.target.name":
                    called_name = node_text
                    source_id = "file_context" 
                    extracted_relationships.append({
                        "source_id": source_id,
                        "target_name": called_name,
                        "type": "CALLS",
                        "file_location": f"{start_point['row']}:{start_point['column']}",
                        "raw_text": node.parent.text.decode('utf8', errors='ignore')
                    })
                    print(f"DEBUG(PythonExtractor): Extracted call to: {called_name} at {start_point['row']}")

                elif name == "import.module":
                    module_name = node_text
                    extracted_relationships.append({
                        "source_id": "file_context",
                        "target_name": module_name,
                        "type": "IMPORTS_MODULE",
                        "file_location": f"{start_point['row']}:{start_point['column']}",
                        "raw_text": node.parent.text.decode('utf8', errors='ignore')
                    })
                    print(f"DEBUG(PythonExtractor): Extracted module import: {module_name}")

                elif name == "import.name": 
                    imported_name = node_text
                    extracted_relationships.append({
                        "source_id": "file_context",
                        "target_name": imported_name,
                        "type": "IMPORTS_NAME",
                        "file_location": f"{start_point['row']}:{start_point['column']}",
                        "raw_text": node.parent.text.decode('utf8', errors='ignore')
                    })
                    print(f"DEBUG(PythonExtractor): Extracted imported name: {imported_name}")

                elif name == "import.name_original": # aliased_import에서 원본 이름
                    original_name = node_text
                    extracted_relationships.append({
                        "source_id": "file_context",
                        "target_name": original_name,
                        "type": "IMPORTS_ALIASED_ORIGINAL",
                        "file_location": f"{start_point['row']}:{start_point['column']}",
                        "raw_text": node.parent.text.decode('utf8', errors='ignore')
                    })
                    print(f"DEBUG(PythonExtractor): Extracted aliased original name: {original_name}")

                elif name == "import.alias": # aliased_import에서 별칭
                    alias_name = node_text
                    extracted_relationships.append({
                        "source_id": "file_context",
                        "target_name": alias_name,
                        "type": "IMPORTS_ALIAS",
                        "file_location": f"{start_point['row']}:{start_point['column']}",
                        "raw_text": node.parent.text.decode('utf8', errors='ignore')
                    })
                    print(f"DEBUG(PythonExtractor): Extracted import alias: {alias_name}")

                elif name == "wildcard_import":
                    extracted_relationships.append({
                        "source_id": "file_context",
                        "target_name": "*",
                        "type": "IMPORTS_WILDCARD",
                        "file_location": f"{start_point['row']}:{start_point['column']}",
                        "raw_text": node.parent.text.decode('utf8', errors='ignore')
                    })
                    print(f"DEBUG(PythonExtractor): Extracted wildcard import.")

                elif name == "variable.name":
                    var_name = node_text
                    var_assignment_node = node.parent
                    entity_id = f"var_{var_name}_{start_point['row']}"
                    extracted_entities.append({
                        "type": "variable",
                        "id": entity_id,
                        "name": var_name,
                        "file_location": f"{start_point['row']}:{start_point['column']}",
                        "end_location": f"{end_point['row']}:{end_point['column']}",
                        "raw_text": var_assignment_node.text.decode('utf8', errors='ignore')
                    })
                    print(f"DEBUG(PythonExtractor): Extracted variable: {var_name} at {start_point['row']}")

    except Exception as e:
        print(f"ERROR(PythonExtractor): Failed to execute Tree-sitter query or process captures: {e}")
        import traceback
        traceback.print_exc()

    print(f"DEBUG(PythonExtractor): Finished extraction. Entities: {len(extracted_entities)}, Relationships: {len(extracted_relationships)}")
    return extracted_entities, extracted_relationships