# # backend/api/code_interpretation.py

# from fastapi import APIRouter, HTTPException
# from typing import Dict, List, Any
# import json
# import sys
# import os

# # AI 모듈 경로 추가
# # sys.path.append('/app/ai_modules')

# from models.code_interpretation_request import CodeInterpretationRequest, CodeInterpretationResponse
# from service.code_parser import parse_code_with_tree_sitter, detect_language_from_filename
# from db.ingestor_python import ingest_code_graph_data
# from api.graph import get_all_graph_data

# try:
#     from ai_modules.semantic_search import SemanticSearcher
#     # from ai_modules.data_pipeline import generate_code_embedding, load_graph_from_backend
# except ImportError as e:
#     print(f"Warning: AI modules not available: {e}")
#     SemanticSearcher = None

# router = APIRouter(
#     tags=["code-interpretation"]
# )

# class CodeInterpreter:
#     """코드 해석 서비스 클래스"""
    
#     def __init__(self):
#         self.semantic_searcher = None
#         self._initialize_searcher()
    
#     def _initialize_searcher(self):
#         """시맨틱 서처 초기화"""
#         try:
#             embedding_file = "embeddings.pkl"
#             if os.path.exists(embedding_file) and SemanticSearcher:
#                 try:
#                     self.semantic_searcher = SemanticSearcher(embedding_file)
#                     print("Semantic searcher initialized successfully")
#                 except Exception as searcher_e:
#                     print(f"SemanticSearcher initialization failed: {searcher_e}")
#                     # numpy 배열 변환 문제일 수 있으므로 임시로 None 설정
#                     self.semantic_searcher = None
#             else:
#                 print("Embedding file not found or SemanticSearcher not available")
#                 # 임베딩 파일 초기화 시도
#                 try:
#                     from ai_modules.initialize_embeddings import initialize_embeddings_if_needed
#                     if initialize_embeddings_if_needed() and SemanticSearcher:
#                         try:
#                             self.semantic_searcher = SemanticSearcher(embedding_file)
#                             print("Semantic searcher initialized after creating embeddings")
#                         except Exception as searcher_e:
#                             print(f"SemanticSearcher initialization failed after embedding creation: {searcher_e}")
#                             self.semantic_searcher = None
#                 except Exception as init_e:
#                     print(f"Failed to initialize embeddings: {init_e}")
#         except Exception as e:
#             print(f"Failed to initialize semantic searcher: {e}")
#             self.semantic_searcher = None
    
#     def analyze_code_structure(self, code_content: str, language: str) -> Dict[str, Any]:
#         """코드 구조 분석"""
#         try:
#             # Tree-sitter로 코드 파싱
#             parsed_data = parse_code_with_tree_sitter(code_content, language, "user_input.py")
            
#             if not parsed_data:
#                 return {"error": "Failed to parse code"}
            
#             # 추출된 엔티티들을 분석
#             entities = parsed_data.get("extracted_entities", [])
#             relationships = parsed_data.get("extracted_relationships", [])
            
#             # 구조 요약
#             structure_summary = {
#                 "functions": [e for e in entities if e.get("type") == "function"],
#                 "classes": [e for e in entities if e.get("type") == "class"],
#                 "variables": [e for e in entities if e.get("type") == "variable"],
#                 "imports": [e for e in entities if e.get("type") == "import"],
#                 "relationships": relationships,
#                 "total_entities": len(entities),
#                 "total_relationships": len(relationships)
#             }
            
#             return structure_summary
            
#         except Exception as e:
#             return {"error": f"Code structure analysis failed: {str(e)}"}
    
#     def find_similar_code(self, code_content: str, top_k: int = 3) -> List[Dict[str, Any]]:
#         """유사한 코드 찾기"""
#         if not self.semantic_searcher:
#             print("SemanticSearcher not available, returning empty results")
#             return []
        
#         try:
#             # 코드 내용을 검색 쿼리로 사용
#             search_results = self.semantic_searcher.search(code_content, top_k=top_k)
            
#             # 그래프에서 노드 정보 가져오기
#             similar_examples = []
#             graph_data = get_all_graph_data()
#             nodes = {node['id']: node for node in graph_data.get('nodes', [])}
            
#             for result in search_results:
#                 node_id = result['node_id']
#                 if node_id in nodes:
#                     node = nodes[node_id]
#                     similar_examples.append({
#                         "node_id": node_id,
#                         "similarity_score": result['score'],
#                         "code_type": node.get('labels', []),
#                         "name": node.get('properties', {}).get('name', 'Unknown'),
#                         "file_path": node.get('properties', {}).get('file_path', 'Unknown')
#                     })
            
#             return similar_examples
            
#         except Exception as e:
#             print(f"Error finding similar code: {e}")
#             return []
    
#     def generate_interpretation(self, code_content: str, structure: Dict[str, Any], 
#                               similar_code: List[Dict[str, Any]]) -> str:
#         """코드 해석 생성"""
#         interpretation_parts = []
        
#         # 1. 코드 개요
#         interpretation_parts.append("## 코드 분석 결과\n")
        
#         # 2. 구조 분석
#         if "error" not in structure:
#             interpretation_parts.append("### 코드 구조:")
#             interpretation_parts.append(f"- 함수: {len(structure.get('functions', []))}개")
#             interpretation_parts.append(f"- 클래스: {len(structure.get('classes', []))}개")
#             interpretation_parts.append(f"- 변수: {len(structure.get('variables', []))}개")
#             interpretation_parts.append(f"- 임포트: {len(structure.get('imports', []))}개")
            
#             # 주요 함수들 나열
#             functions = structure.get('functions', [])
#             if functions:
#                 interpretation_parts.append("\n### 주요 함수들:")
#                 for func in functions[:5]:  # 최대 5개
#                     name = func.get('name', 'Unknown')
#                     interpretation_parts.append(f"- `{name}()`")
            
#             # 주요 클래스들 나열
#             classes = structure.get('classes', [])
#             if classes:
#                 interpretation_parts.append("\n### 주요 클래스들:")
#                 for cls in classes[:5]:  # 최대 5개
#                     name = cls.get('name', 'Unknown')
#                     interpretation_parts.append(f"- `{name}`")
        
#         # 3. 유사한 코드 패턴
#         if similar_code:
#             interpretation_parts.append("\n### 유사한 코드 패턴:")
#             for similar in similar_code:
#                 score = similar.get('similarity_score', 0)
#                 name = similar.get('name', 'Unknown')
#                 interpretation_parts.append(f"- `{name}` (유사도: {score:.2f})")
        
#         return "\n".join(interpretation_parts)
    
#     def generate_suggestions(self, code_content: str, structure: Dict[str, Any]) -> List[str]:
#         """개선 제안 생성"""
#         suggestions = []
        
#         if "error" not in structure:
#             # 함수 개수 기반 제안
#             functions = structure.get('functions', [])
#             if len(functions) == 0:
#                 suggestions.append("함수를 사용하여 코드를 모듈화하는 것을 고려해보세요.")
#             elif len(functions) > 10:
#                 suggestions.append("함수가 많습니다. 관련 함수들을 클래스로 그룹화하는 것을 고려해보세요.")
            
#             # 클래스 기반 제안
#             classes = structure.get('classes', [])
#             if len(classes) > 0:
#                 suggestions.append("객체지향 프로그래밍 패턴을 잘 활용하고 있습니다.")
            
#             # 임포트 기반 제안
#             imports = structure.get('imports', [])
#             if len(imports) > 20:
#                 suggestions.append("많은 라이브러리를 임포트하고 있습니다. 필요한 것만 임포트하는지 검토해보세요.")
        
#         # 기본 제안들
#         if "def " in code_content:
#             suggestions.append("함수에 docstring을 추가하여 문서화를 개선하세요.")
        
#         if "class " in code_content:
#             suggestions.append("클래스 메서드에 타입 힌트를 추가하는 것을 고려해보세요.")
        
#         return suggestions

# # 전역 인터프리터 인스턴스
# code_interpreter = CodeInterpreter()

# @router.post("/interpret-code")
# async def interpret_code(request: CodeInterpretationRequest) -> CodeInterpretationResponse:
#     """
#     사용자가 입력한 코드를 분석하고 해석합니다.
    
#     Args:
#         request: 코드 해석 요청
        
#     Returns:
#         CodeInterpretationResponse: 해석 결과
#     """
#     try:
#         code_content = request.code_content.strip()
#         if not code_content:
#             raise HTTPException(status_code=400, detail="코드 내용이 비어있습니다.")
        
#         # 언어 감지
#         language = request.language
#         if not language:
#             # 코드 내용으로부터 언어 감지 시도
#             if code_content.startswith("def ") or "import " in code_content:
#                 language = "python"
#             elif "function " in code_content or "const " in code_content:
#                 language = "javascript"
#             else:
#                 language = "python"  # 기본값
        
#         # 1. 코드 구조 분석
#         structure = code_interpreter.analyze_code_structure(code_content, language)
        
#         # 2. 유사한 코드 찾기
#         similar_code = code_interpreter.find_similar_code(code_content)
        
#         # 3. 해석 생성
#         interpretation = code_interpreter.generate_interpretation(
#             code_content, structure, similar_code
#         )
        
#         # 4. 개선 제안 생성
#         suggestions = code_interpreter.generate_suggestions(code_content, structure)
        
#         return CodeInterpretationResponse(
#             status="success",
#             interpretation=interpretation,
#             similar_code_examples=similar_code,
#             code_structure=structure,
#             suggestions=suggestions
#         )
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         print(f"Code interpretation error: {e}")
#         raise HTTPException(status_code=500, detail=f"코드 해석 중 오류가 발생했습니다: {str(e)}")

# @router.get("/interpretation/health")
# async def health_check():
#     """코드 해석 서비스 상태 확인"""
#     return {
#         "status": "healthy",
#         "semantic_searcher_available": code_interpreter.semantic_searcher is not None,
#         "graph_connection": "available"
#     }
