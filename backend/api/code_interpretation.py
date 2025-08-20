# backend/api/code_interpretation.py

from fastapi import APIRouter, HTTPException
from typing import Dict, List, Any
import json

# models와 service는 그대로 유지
from models.code_interpretation_request import CodeInterpretationRequest, CodeInterpretationResponse
# 더 이상 복잡한 파서가 필요 없으므로 주석 처리하거나 제거
# from service.code_parser import parse_code_with_tree_sitter

router = APIRouter(
    tags=["code-interpretation"]
)

class SimpleCodeInterpreter:
    """단순화된 코드 해석 서비스 클래스 (기본 로직만 사용)"""

    def analyze_code_structure(self, code_content: str, language: str) -> Dict[str, Any]:
        """
        코드 구조를 단순하게 분석합니다.
        Tree-sitter 대신 기본 문자열 검색을 사용합니다.
        """
        lines = code_content.split('\n')
        
        # 함수, 클래스, 임포트 개수 세기
        function_count = sum(1 for line in lines if line.strip().startswith('def '))
        class_count = sum(1 for line in lines if line.strip().startswith('class '))
        import_count = sum(1 for line in lines if line.strip().startswith('import '))
        
        # 주석 제거 후 라인 수 계산
        code_lines = [line for line in lines if line.strip() and not line.strip().startswith('#')]
        line_count = len(code_lines)
        
        # 아주 단순한 구조 요약
        structure_summary = {
            "functions_count": function_count,
            "classes_count": class_count,
            "imports_count": import_count,
            "total_lines_of_code": line_count,
            # 유사 코드 찾기 기능 제거로 인해 빈 배열 반환
            "extracted_entities": [],
            "extracted_relationships": [],
        }
        
        return structure_summary
    
    def find_similar_code(self, code_content: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        유사 코드 찾기 기능은 제거되었습니다. 항상 빈 리스트를 반환합니다.
        """
        return []

    def generate_interpretation(self, structure: Dict[str, Any]) -> str:
        """
        단순화된 구조 분석 결과를 바탕으로 해석을 생성합니다.
        """
        interpretation_parts = []
        
        interpretation_parts.append("## Results\n")
        
        # 구조 분석 결과
        interpretation_parts.append("### Code info:")
        interpretation_parts.append(f"- lines: {structure.get('total_lines_of_code', 0)}")
        interpretation_parts.append(f"- function: {structure.get('functions_count', 0)}")
        interpretation_parts.append(f"- class: {structure.get('classes_count', 0)}")
        interpretation_parts.append(f"- import statement: {structure.get('imports_count', 0)}")

        return "\n".join(interpretation_parts)
    
    def generate_suggestions(self, code_content: str) -> List[str]:
        """
        아주 단순한 개선 제안을 생성합니다.
        """
        suggestions = []
        
        if 'def ' in code_content:
            suggestions.append("Improve code documentation by adding a docstring to the function.")
        
        if 'class ' in code_content:
            suggestions.append("Enhance readability by adding a description to the class.")
            
        return suggestions

# 전역 인터프리터 인스턴스
simple_code_interpreter = SimpleCodeInterpreter()

@router.post("/interpret-code")
async def interpret_code(request: CodeInterpretationRequest) -> CodeInterpretationResponse:
    """
    사용자가 입력한 코드를 단순하게 분석하고 해석합니다.
    """
    try:
        code_content = request.code_content.strip()
        if not code_content:
            raise HTTPException(status_code=400, detail="코드 내용이 비어있습니다.")
        
        # 언어 감지 로직은 간단히 유지
        language = request.language
        if not language:
            if code_content.startswith("def ") or "import " in code_content:
                language = "python"
            else:
                language = "unknown"
        
        # 1. 코드 구조 분석 (매우 단순화됨)
        structure = simple_code_interpreter.analyze_code_structure(code_content, language)
        
        # 2. 유사한 코드 찾기 (기능 제거)
        similar_code = simple_code_interpreter.find_similar_code(code_content)
        
        # 3. 해석 생성
        interpretation = simple_code_interpreter.generate_interpretation(structure)
        
        # 4. 개선 제안 생성 (매우 단순화됨)
        suggestions = simple_code_interpreter.generate_suggestions(code_content)
        
        return CodeInterpretationResponse(
            status="success",
            interpretation=interpretation,
            similar_code_examples=similar_code, # 항상 빈 배열
            code_structure=structure,
            suggestions=suggestions
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Code interpretation error: {e}")
        raise HTTPException(status_code=500, detail=f"코드 해석 중 오류가 발생했습니다: {str(e)}")

@router.get("/interpretation/health")
async def health_check():
    """코드 해석 서비스 상태 확인"""
    return {
        "status": "healthy"
    }
