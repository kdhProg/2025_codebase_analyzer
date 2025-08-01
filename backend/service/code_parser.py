# backend/services/code_parser.py

import os
from typing import Dict, List, Any, Optional
from tree_sitter import Language, Parser
from tree_sitter_language_pack import get_language
import traceback

from service.extractors.python_extractor import extract_python_entities_and_relationships

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
    # s_exp_representation = tree.root_node.sexp()
    # print(f"DEBUG: S-Expression for {language} file (first 500 chars):\n{s_exp_representation[:500]}...")

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

    if language == 'python':
        extracted_entities, extracted_relationships = \
            extract_python_entities_and_relationships(tree, _LANGUAGES[language])
            # extract_python_entities_and_relationships(parsed_nodes, nodes_map)
    # TODO: elif language == 'javascript':
    #           extracted_entities, extracted_relationships = \
    #               extract_javascript_entities_and_relationships(parsed_nodes, nodes_map)
    # TODO: 다른 언어에 대한 처리 추가

    print(f"DEBUG: Final extracted entities count: {len(extracted_entities)}")
    print(f"DEBUG: Final extracted relationships count: {len(extracted_relationships)}")

    return {
        "root_node_id": f"{tree.root_node.id}",
        "nodes": parsed_nodes, # 전체 AST 노드 (디버깅/세부 분석용)
        "extracted_entities": extracted_entities,
        "extracted_relationships": extracted_relationships
    }