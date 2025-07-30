# backend/services/code_parser.py

import os
from typing import Dict, List, Any, Optional
from tree_sitter import Language, Parser
from tree_sitter_language_pack import get_language
import traceback

# Tree-sitter 언어 로드 (애플리케이션 시작 시 한 번만 실행되도록 관리하는 것이 좋음)
# 실제 애플리케이션에서는 FastAPI의 startup 이벤트나 의존성 주입을 통해
# 파서를 초기화하고 재사용하는 것이 효율적입니다.
try:
    # 예시로 Python과 JavaScript만 로드. 필요에 따라 더 추가하세요.
    PYTHON_LANGUAGE = get_language('python')
    JAVASCRIPT_LANGUAGE = get_language('javascript')
    _LANGUAGES = {
        "python": PYTHON_LANGUAGE,
        "javascript": JAVASCRIPT_LANGUAGE,
    }
    print("Tree-sitter languages loaded successfully.")
except Exception as e:
    print(f"Error loading Tree-sitter languages: {e}. Code parsing will be limited.")
    traceback.print_exc()
    _LANGUAGES = {}


# 한 확장자가 여러 언어에 포함될 수도 있으므로, 리스트나 셋을 사용합니다.
LANGUAGE_EXTENSIONS = {
    'python': ['.py'],
    'javascript': ['.js', '.jsx', '.ts', '.tsx'],
    'java': ['.java'],
    'c': ['.c'],
    'cpp': ['.cpp', '.hpp', '.h'],
    'go': ['.go'],
    'ruby': ['.rb'],
    'php': ['.php'],
    'rust': ['.rs'],
    'swift': ['.swift'],
    'kotlin': ['.kt'],
    'csharp': ['.cs'],
    'bash': ['.sh'],
    # TODO: 여기에 더 많은 언어와 확장자를 추가하세요.
    # 예: 'html': ['.html', '.htm'],
    #     'css': ['.css'],
    #     'json': ['.json'],
    #     'xml': ['.xml'],
    #     'yaml': ['.yml', '.yaml'],
    #     'markdown': ['.md'],
    # 필요하다면 여기에 '프로그래밍 언어는 아니지만 분석 대상에 포함할' 확장자를 추가할 수 있습니다.
}

_EXT_TO_LANGUAGE_MAP = {}
for lang, extensions in LANGUAGE_EXTENSIONS.items():
    for ext in extensions:
        _EXT_TO_LANGUAGE_MAP[ext] = lang

def detect_language_from_filename(file_path: str) -> Optional[str]:
    """
    파일 확장자를 기반으로 프로그래밍 언어를 감지합니다.
    """
    ext = os.path.splitext(file_path)[1].lower()
    
    return _EXT_TO_LANGUAGE_MAP.get(ext)


def parse_code_with_tree_sitter(code_content: str, language: str) -> Optional[Dict[str, Any]]:
    """
    주어진 코드 내용을 Tree-sitter로 파싱하여 AST 정보를 반환합니다.
    반환되는 AST 정보는 JSON 직렬화를 위해 단순화된 형태입니다.
    이 함수에서 지식 그래프 노드와 엣지로 변환하기 위한 데이터를 추출합니다.
    """
    if language not in _LANGUAGES:
        print(f"Warning: Tree-sitter parser not available for language: {language}")
        return None

    parser = Parser(language=_LANGUAGES[language]) 

    tree = parser.parse(bytes(code_content, "utf8"))
    # -----------------tree object debug start-----------------
    if tree is None:
        print(f"DEBUG: Parsing returned None for {language} file. Content length: {len(code_content)}")
        return FileNotFoundError

    if not tree.root_node:
        print(f"DEBUG: Parsing successful but root_node is None for {language} file. Content length: {len(code_content)}")
        return None
    
    print(f"DEBUG: Successfully parsed {language} file. Root node type: {tree.root_node.type}, Text length: {len(tree.root_node.text)}")
     # -----------------tree object debug end-----------------

    parsed_nodes: List[Dict[str, Any]] = []

    def traverse_node(node, parent_id=None):
        node_id = f"{node.id}"
        node_info = {
            "id": node_id,
            "type": node.type,
            "text": node.text.decode('utf8', errors='ignore'),
            "start_point": {"row": node.start_point[0], "column": node.start_point[1]},
            "end_point": {"row": node.end_point[0], "column": node.end_point[1]},
            "is_named": node.is_named,
            "children_ids": []
        }
        if parent_id:
            node_info["parent_id"] = parent_id
            
        parsed_nodes.append(node_info)

        for child in node.children:
            child_node_id = f"{child.id}"
            node_info["children_ids"].append(child_node_id)
            traverse_node(child, node_id)

    traverse_node(tree.root_node)

    nodes_map = {node["id"]: node for node in parsed_nodes}
    
    # 이 부분에서 핵심 엔티티와 관계를 더욱 구체적으로 정의하고 파싱해야 합니다.
    # 예: 함수 정의, 함수 호출, 변수 선언/사용 등
    extracted_entities = []
    extracted_relationships = []

    # AST를 다시 순회하며 특정 패턴 추출 (예시)
    for node_info in parsed_nodes:
        if node_info['is_named']:
            # Python 함수 정의 예시
            if language == 'python' and node_info['type'] == 'function_definition':
                # 함수 이름을 정확히 추출하는 로직은 Tree-sitter 쿼리를 사용하면 더 견고합니다.
                # 여기서는 간단한 예시로 'identifier' 타입의 자식 노드를 찾습니다.
                name_node = next((nodes_map[cid] for cid in node_info['children_ids'] if nodes_map[cid]['type'] == 'identifier'), None)
                func_name = name_node['text'] if name_node else f"unknown_func_{node_info['id']}"
                extracted_entities.append({
                    "type": "function",
                    "id": f"func_{func_name}_{node_info['start_point']['row']}", # 고유 ID 생성
                    "name": func_name,
                    "file_location": f"{node_info['start_point']['row']}:{node_info['start_point']['column']}"
                })
            # 함수 호출 예시 (더 복잡한 로직 필요)
            elif language == 'python' and node_info['type'] == 'call':
                function_called_node = next((nodes_map[cid] for cid in node_info['children_ids'] if nodes_map[cid]['type'] == 'identifier'), None)
                if function_called_node:
                    called_name = function_called_node['text']
                    extracted_relationships.append({
                        "source_id": "current_context", # 호출이 일어난 현재 함수/클래스 ID (외부에서 주입 필요)
                        "target_id": f"func_{called_name}", # 호출 대상 함수 ID (매칭 로직 필요)
                        "type": "CALLS"
                    })
            # TODO: 클래스, 변수, 상속 등 다른 엔티티 및 관계 추출 로직 추가

    return {
        "root_node_id": f"{tree.root_node.id}",
        "nodes": parsed_nodes, # 전체 AST 노드 (디버깅/세부 분석용)
        "extracted_entities": extracted_entities,
        "extracted_relationships": extracted_relationships
    }