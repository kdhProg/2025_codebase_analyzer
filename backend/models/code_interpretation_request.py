# backend/models/code_interpretation_request.py

from pydantic import BaseModel
from typing import Optional

class CodeInterpretationRequest(BaseModel):
    """코드 해석 요청 모델"""
    code_content: str  # 사용자가 입력한 코드
    language: Optional[str] = None  # 프로그래밍 언어 (자동 감지 가능)
    context: Optional[str] = None  # 추가 컨텍스트
    
class CodeInterpretationResponse(BaseModel):
    """코드 해석 응답 모델"""
    status: str
    interpretation: str
    similar_code_examples: list
    code_structure: dict
    suggestions: list




