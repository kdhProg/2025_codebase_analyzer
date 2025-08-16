# app/services/llm_service.py (Gemini API 버전)

import logging
from typing import List, Dict, Any
import requests
import json
import os

# 로거 설정
logger = logging.getLogger(__name__)

# 환경 변수에서 API 키를 가져옵니다.
API_KEY = os.getenv("GEMINI_API_KEY")

# API 호출 URL
API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent"

def generate_natural_language_response(query: str, contexts: List[Dict[str, Any]]) -> str:
    """
    사용자 쿼리와 코드 컨텍스트(노드 및 릴레이션 정보)를 기반으로 Gemini API를 사용하여 자연어 답변을 생성합니다.
    """
    if not API_KEY:
        logger.error("GEMINI_API_KEY 환경 변수가 설정되지 않았습니다. 답변을 생성할 수 없습니다.")
        return "API 키가 없어 답변을 생성할 수 없습니다. 시스템 관리자에게 문의해주세요."

    logger.info("Gemini API에 요청 전송 중...")

    # 코드 스니펫이 존재하는지 확인합니다.
    is_code_present = any(context.get("code_snippet", "").strip() for context in contexts)

    if is_code_present:
        # 코드 스니펫이 포함된 경우의 템플릿
        system_prompt = "너는 코드 스니펫과 코드 그래프의 관계 정보를 바탕으로 질문에 답변하는 유용한 코드 어시스턴트야. 주어진 정보와 질문을 바탕으로 완전하고 친절한 답변을 생성해줘."
        user_content = f"다음은 쿼리와 관련 코드 컨텍스트(코드 스니펫 및 관계)입니다.\n\n**쿼리:**\n{query}\n\n**관련 코드 컨텍스트:**\n---"
        
        # 검색된 코드 컨텍스트를 프롬프트에 추가합니다.
        for context in contexts:
            user_content += f"\n\n**파일 경로:** {context.get('file_path', 'N/A')}"
            user_content += f"\n**노드 유형:** {context.get('type', 'N/A')}"
            
            # 코드 스니펫 추가
            snippet = context.get('code_snippet', '').strip()
            if snippet:
                user_content += f"\n**코드 스니펫:**\n```python\n{snippet}\n```"
            else:
                user_content += f"\n**코드 스니펫:** 없음"
            
            # 릴레이션 정보 추가
            relations = context.get('relations', [])
            if relations:
                user_content += "\n**관련 관계 및 노드:**"
                for rel in relations:
                    user_content += (
                        f"\n- **관계 유형:** {rel.get('rel_type', 'N/A')}, "
                        f"**대상 노드:** {rel.get('target_node_name', 'N/A')}, "
                        f"**대상 유형:** {rel.get('target_node_type', 'N/A')}"
                    )
            user_content += "\n---"

    else:
        # 코드 스니펫이 없는 경우의 템플릿 (구조적 정보만 존재)
        system_prompt = "너는 코드의 구조적 정보에 대한 질문에 답변하는 유용한 코드 어시스턴트야. 주어진 정보는 실제 코드가 아닌 그래프 구조적 정보이므로, 왜 스니펫을 제공할 수 없는지 설명하고 실제 코드가 필요함을 사용자에게 친절하게 안내해줘. 답변은 주어진 구조적 정보와 함께 제공되어야 해."
        user_content = f"다음은 쿼리와 관련 구조적 정보입니다.\n\n**쿼리:**\n{query}\n\n**관련 구조적 정보:**\n---"
        
        # 검색된 구조적 컨텍스트를 프롬프트에 추가합니다.
        for context in contexts:
            user_content += f"\n\n**파일 경로:** {context.get('file_path', 'N/A')}"
            user_content += f"\n**노드 유형:** {context.get('type', 'N/A')}"
            
            # 릴레이션 정보 추가
            relations = context.get('relations', [])
            if relations:
                user_content += "\n**관련 관계 및 노드:**"
                for rel in relations:
                    user_content += (
                        f"\n- **관계 유형:** {rel.get('rel_type', 'N/A')}, "
                        f"**대상 노드:** {rel.get('target_node_name', 'N/A')}, "
                        f"**대상 유형:** {rel.get('target_node_type', 'N/A')}"
                    )
            user_content += "\n---"

    try:
        payload = {
            "contents": [
                {"role": "user", "parts": [{"text": f"{system_prompt}\n\n{user_content}"}]}
            ]
        }
        
        response = requests.post(f"{API_URL}?key={API_KEY}", json=payload)
        response.raise_for_status()
        
        result = response.json()

        response_text = result["candidates"][0]["content"]["parts"][0]["text"]
        
        logger.info("API 답변 성공적으로 수신.")
        return response_text

    except requests.exceptions.HTTPError as err:
        logger.error(f"HTTP 오류 발생: {err}", exc_info=True)
        return f"API 호출 중 HTTP 오류가 발생했습니다: {err.response.text}"
    except Exception as e:
        logger.error(f"Gemini API로 답변 생성 중 오류 발생: {e}", exc_info=True)
        return "자연어 답변을 생성하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
