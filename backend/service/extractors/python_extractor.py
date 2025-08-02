import uuid
from typing import Dict, List, Any, Tuple, Optional
from pathlib import Path
from tree_sitter import Language, Tree, Query, QueryCursor, Node # QueryCursor와 Node 임포트 확인

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
    language_parser: Language,
    file_path: Path # 파일 경로를 인자로 받도록 유지합니다.
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Python AST를 Tree-sitter 쿼리를 사용하여 핵심 엔티티와 관계를 추출합니다.
    """
    extracted_entities = []
    extracted_relationships = []
    
    # 엔티티의 고유 ID를 매핑하기 위한 딕셔너리 (UUID 사용)
    # 키: (엔티티 타입, 이름, 파일 경로 또는 None), 값: UUID 문자열
    entity_id_map: Dict[Tuple[str, str, Optional[str]], str] = {}

    try:
        with open(file_path, 'rb') as f:
            code_bytes = f.read()
            total_lines = len(code_bytes.splitlines())
    except Exception as e:
        print(f"WARNING: Could not read file {file_path} to determine total lines: {e}")
        total_lines = 0

    print(f"DEBUG(PythonExtractor): Starting entity/relationship extraction for {file_path}.")

    definitions_query_source = load_query_source("definitions.scm")

    if not definitions_query_source:
        print("ERROR: Could not load Python definitions query. Skipping extraction.")
        return [], []

    try:
        query = Query(language_parser, definitions_query_source)
        cursor = QueryCursor(query) 
        
        # 🚨 중요 수정: captures()의 반환 시그니처에 맞춰 타입 힌트와 순회 방식을 변경합니다.
        # 이 시점에서 captured_data는 {캡처_이름_str: [노드1, 노드2, ...]} 형태의 딕셔너리입니다.
        captured_data: dict[str, list[Node]] = cursor.captures(tree.root_node) 
        
        # 디버그: 캡처된 데이터의 전체 개수를 확인합니다.
        total_captures_count = sum(len(nodes) for nodes in captured_data.values())
        print(f"DEBUG(PythonExtractor): Total captures found (from dict values): {total_captures_count}")
        if not captured_data:
            print("DEBUG(PythonExtractor): No captures found. Check your query or input code.")

        # 1. 파일 엔티티 (루트 노드) 생성 - 쿼리 결과와 상관없이 항상 생성
        file_id = str(uuid.uuid4())
        extracted_entities.append({
            "id": file_id,
            "type": "File",
            "name": file_path.name,
            "file_path": str(file_path),
            "start_line": 0,
            "end_line": total_lines
        })
        entity_id_map[("File", str(file_path), None)] = file_id 
        print(f"DEBUG(PythonExtractor): Created File entity: {file_path.name} (ID: {file_id})")

        # 이제 딕셔너리의 key-value 쌍을 순회합니다. key는 캡처 이름, value는 노드 리스트입니다.
        for name, nodes_list in captured_data.items():
            for node in nodes_list: # 각 캡처 이름에 해당하는 노드 리스트를 순회
                node_text = node.text.decode('utf8', errors='ignore')
                start_point = {"row": node.start_point[0], "column": node.start_point[1]}
                end_point = {"row": node.end_point[0], "column": node.end_point[1]}
                
                # --- 엔티티 추출 및 ID 매핑 ---
                if name == "function.name":
                    func_name = node_text
                    func_definition_node = node.parent 
                    
                    func_id = str(uuid.uuid4())
                    entity_id_map[("Function", func_name, str(file_path))] = func_id
                    
                    extracted_entities.append({
                        "type": "Function",
                        "id": func_id,
                        "name": func_name,
                        "file_path": str(file_path),
                        "start_line": start_point['row'],
                        "end_line": end_point['row'],
                        "raw_text": func_definition_node.text.decode('utf8', errors='ignore')
                    })
                    extracted_relationships.append({
                        "source_id": file_id,
                        "target_id": func_id,
                        "type": "CONTAINS",
                        "properties": {
                            "line": start_point['row']
                        }
                    })
                    print(f"DEBUG(PythonExtractor): Extracted Function: {func_name} (ID: {func_id}) at {file_path}:{start_point['row']}")

                elif name == "class.name":
                    class_name = node_text
                    class_definition_node = node.parent
                    
                    class_id = str(uuid.uuid4())
                    entity_id_map[("Class", class_name, str(file_path))] = class_id

                    extracted_entities.append({
                        "type": "Class",
                        "id": class_id,
                        "name": class_name,
                        "file_path": str(file_path),
                        "start_line": start_point['row'],
                        "end_line": end_point['row'],
                        "raw_text": class_definition_node.text.decode('utf8', errors='ignore')
                    })
                    extracted_relationships.append({
                        "source_id": file_id,
                        "target_id": class_id,
                        "type": "CONTAINS",
                        "properties": {
                            "line": start_point['row']
                        }
                    })
                    print(f"DEBUG(PythonExtractor): Extracted Class: {class_name} (ID: {class_id}) at {file_path}:{start_point['row']}")

                elif name == "variable.name":
                    var_name = node_text
                    var_assignment_node = node.parent
                    
                    var_id = str(uuid.uuid4())
                    entity_id_map[("Variable", var_name, str(file_path))] = var_id

                    extracted_entities.append({
                        "type": "Variable",
                        "id": var_id,
                        "name": var_name,
                        "file_path": str(file_path),
                        "start_line": start_point['row'],
                        "end_line": end_point['row'],
                        "raw_text": var_assignment_node.text.decode('utf8', errors='ignore')
                    })
                    extracted_relationships.append({
                        "source_id": file_id,
                        "target_id": var_id,
                        "type": "CONTAINS",
                        "properties": {
                            "line": start_point['row']
                        }
                    })
                    print(f"DEBUG(PythonExtractor): Extracted Variable: {var_name} (ID: {var_id}) at {start_point['row']}")

                # --- 관계 추출 (target_id 처리 포함) ---
                elif name == "call.target.name":
                    called_name = node_text
                    source_id = file_id 

                    target_id = entity_id_map.get(("Function", called_name, str(file_path)))
                    if not target_id:
                        target_id = entity_id_map.get(("Class", called_name, str(file_path)))
                    
                    if not target_id:
                        target_id = entity_id_map.get(("ExternalCallTarget", called_name, None))
                        if not target_id:
                            target_id = str(uuid.uuid4())
                            extracted_entities.append({
                                "id": target_id,
                                "type": "ExternalCallTarget",
                                "name": called_name
                            })
                            entity_id_map[("ExternalCallTarget", called_name, None)] = target_id
                            print(f"DEBUG(PythonExtractor): Created new ExternalCallTarget: {called_name} (ID: {target_id})")

                    extracted_relationships.append({
                        "source_id": source_id,
                        "target_id": target_id,
                        "type": "CALLS",
                        "properties": {
                            "file_location": f"{start_point['row']}:{start_point['column']}",
                            "raw_text": node.parent.text.decode('utf8', errors='ignore'),
                            "called_name_str": called_name
                        }
                    })
                    print(f"DEBUG(PythonExtractor): Extracted CALLS from {file_path.name} to {called_name} (ID: {target_id}) at {start_point['row']}")

                elif name == "import.module":
                    module_name = node_text
                    source_id = file_id 

                    target_id = entity_id_map.get(("Module", module_name, None))
                    if not target_id:
                        target_id = str(uuid.uuid4())
                        extracted_entities.append({
                            "id": target_id,
                            "type": "Module",
                            "name": module_name
                        })
                        entity_id_map[("Module", module_name, None)] = target_id
                        print(f"DEBUG(PythonExtractor): Created new Module entity: {module_name} (ID: {target_id})")

                    extracted_relationships.append({
                        "source_id": source_id,
                        "target_id": target_id,
                        "type": "IMPORTS_MODULE",
                        "properties": {
                            "file_location": f"{start_point['row']}:{start_point['column']}",
                            "raw_text": node.parent.text.decode('utf8', errors='ignore')
                        }
                    })
                    print(f"DEBUG(PythonExtractor): Extracted IMPORTS_MODULE from {file_path.name} to {module_name} (ID: {target_id})")

                elif name == "import.name": 
                    imported_name = node_text
                    source_id = file_id

                    target_id = entity_id_map.get(("ImportedName", imported_name, None))
                    if not target_id:
                        target_id = str(uuid.uuid4())
                        extracted_entities.append({
                            "id": target_id,
                            "type": "ImportedName",
                            "name": imported_name
                        })
                        entity_id_map[("ImportedName", imported_name, None)] = target_id
                        print(f"DEBUG(PythonExtractor): Created new ImportedName entity: {imported_name} (ID: {target_id})")

                    extracted_relationships.append({
                        "source_id": source_id,
                        "target_id": target_id,
                        "type": "IMPORTS_NAME",
                        "properties": {
                            "file_location": f"{start_point['row']}:{start_point['column']}",
                            "raw_text": node.parent.text.decode('utf8', errors='ignore')
                        }
                    })
                    print(f"DEBUG(PythonExtractor): Extracted IMPORTS_NAME from {file_path.name} to {imported_name} (ID: {target_id})")

                elif name == "import.name_original":
                    original_name = node_text
                    source_id = file_id

                    target_id = entity_id_map.get(("ImportedName", original_name, None))
                    if not target_id:
                        target_id = str(uuid.uuid4())
                        extracted_entities.append({
                            "id": target_id,
                            "type": "ImportedName",
                            "name": original_name
                        })
                        entity_id_map[("ImportedName", original_name, None)] = target_id
                        print(f"DEBUG(PythonExtractor): Created new ImportedName entity for original: {original_name} (ID: {target_id})")

                    extracted_relationships.append({
                        "source_id": source_id,
                        "target_id": target_id,
                        "type": "IMPORTS_ALIASED_ORIGINAL",
                        "properties": {
                            "file_location": f"{start_point['row']}:{start_point['column']}",
                            "raw_text": node.parent.text.decode('utf8', errors='ignore'),
                            "original_name_str": original_name
                        }
                    })
                    print(f"DEBUG(PythonExtractor): Extracted IMPORTS_ALIASED_ORIGINAL from {file_path.name} to {original_name} (ID: {target_id})")

                elif name == "import.alias":
                    alias_name = node_text
                    source_id = file_id

                    target_id = entity_id_map.get(("ImportedName", alias_name, None))
                    if not target_id:
                        target_id = str(uuid.uuid4())
                        extracted_entities.append({
                            "id": target_id,
                            "type": "ImportedName",
                            "name": alias_name,
                            "is_alias": True
                        })
                        entity_id_map[("ImportedName", alias_name, None)] = target_id
                        print(f"DEBUG(PythonExtractor): Created new ImportedName entity for alias: {alias_name} (ID: {target_id})")

                    extracted_relationships.append({
                        "source_id": source_id,
                        "target_id": target_id,
                        "type": "IMPORTS_ALIAS",
                        "properties": {
                            "file_location": f"{start_point['row']}:{start_point['column']}",
                            "raw_text": node.parent.text.decode('utf8', errors='ignore'),
                            "alias_name_str": alias_name
                        }
                    })
                    print(f"DEBUG(PythonExtractor): Extracted import alias: {alias_name} (ID: {target_id})")

                elif name == "wildcard_import":
                    source_id = file_id

                    target_id = entity_id_map.get(("Module", "*", None))
                    if not target_id:
                        target_id = str(uuid.uuid4())
                        extracted_entities.append({
                            "id": target_id,
                            "type": "Module",
                            "name": "*"
                        })
                        entity_id_map[("Module", "*", None)] = target_id
                        print(f"DEBUG(PythonExtractor): Created new Module entity for wildcard: * (ID: {target_id})")

                    extracted_relationships.append({
                        "source_id": source_id,
                        "target_id": target_id,
                        "type": "IMPORTS_WILDCARD",
                        "properties": {
                            "file_location": f"{start_point['row']}:{start_point['column']}",
                            "raw_text": node.parent.text.decode('utf8', errors='ignore')
                        }
                    })
                    print(f"DEBUG(PythonExtractor): Extracted wildcard import from {file_path.name} (ID: {target_id})")

    except Exception as e:
        print(f"ERROR(PythonExtractor): Failed to execute Tree-sitter query or process captures: {e}")
        import traceback
        traceback.print_exc()

    print(f"DEBUG(PythonExtractor): Finished extraction. Entities: {len(extracted_entities)}, Relationships: {len(extracted_relationships)}")
    return extracted_entities, extracted_relationships