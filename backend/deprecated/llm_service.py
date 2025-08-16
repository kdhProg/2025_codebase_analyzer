# # app/services/llm_service.py (수정된 버전)

# import logging
# from typing import List, Dict, Any
# from transformers import AutoTokenizer, AutoModelForCausalLM
# import torch
# import time

# # 로거 설정
# logger = logging.getLogger(__name__)

# # Phi-3 모델과 토크나이저를 애플리케이션 시작 시점에 한 번만 로드합니다.
# try:
#     logger.info("Phi-3-mini 모델과 토크나이저 로드 시작...")
#     model_name = "microsoft/Phi-3-mini-4k-instruct"
    
#     # CUDA가 사용 가능하면 GPU를, 아니면 CPU를 사용하도록 설정
#     # 사용자의 개발 환경(GPU 없음)에서는 'cpu'로 설정됩니다.
#     device = "cuda" if torch.cuda.is_available() else "cpu"
#     logger.info(f"모델 실행 디바이스: {device}")
    
#     # 모델과 토크나이저 로드
#     # GPU가 없는 환경에서 bitsandbytes/accelerate 충돌을 피하기 위해
#     # 양자화 관련 설정을 제거하고 torch_dtype=None으로 로드합니다.
#     tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
#     if tokenizer.pad_token is None:
#         tokenizer.pad_token = tokenizer.eos_token
    
#     logger.info("모델 로딩 중... 양자화 없이 로드됩니다.")
#     model = AutoModelForCausalLM.from_pretrained(
#         model_name,
#         device_map=device,
#         trust_remote_code=True
#     )
#     model.eval() # 모델을 평가 모드로 설정
    
#     logger.info("Phi-3-mini 모델이 성공적으로 로드되었습니다.")
    
# except Exception as e:
#     logger.critical(f"Phi-3-mini 모델 로드 실패: {e}", exc_info=True)
#     tokenizer = None
#     model = None

# def generate_natural_language_response(query: str, snippets: List[Dict[str, Any]]) -> str:
#     """
#     사용자 쿼리와 코드 스니펫을 기반으로 Phi-3 모델을 사용하여 자연어 답변을 생성합니다.
#     """
#     if tokenizer is None or model is None:
#         logger.error("Phi-3 모델 또는 토크나이저가 로드되지 않았습니다. 답변을 생성할 수 없습니다.")
#         return "모델 로드에 실패하여 답변을 생성할 수 없습니다."
    
#     # Phi-3 모델에 최적화된 프롬프트 템플릿을 사용합니다.
#     system_prompt = "너는 코드 스니펫에 대한 질문에 답변하는 유용한 코드 어시스턴트야. 주어진 코드와 질문을 바탕으로 완전하고 친절한 답변을 생성해줘."
#     user_content = f"다음은 쿼리와 관련 코드 스니펫입니다. \n\n**쿼리:**\n{query}\n\n**관련 코드 스니펫:**\n---"
    
#     for snippet in snippets:
#         user_content += f"\n파일: {snippet['file_path']}\n```python\n{snippet['code_snippet']}\n```\n---"
    
#     messages = [
#         {"role": "system", "content": system_prompt},
#         {"role": "user", "content": user_content}
#     ]

#     try:
#         # 모델에 프롬프트를 입력으로 전달하여 답변을 생성합니다.
#         inputs = tokenizer.apply_chat_template(
#             messages,
#             tokenize=True,
#             add_generation_prompt=True,
#             return_tensors="pt"
#         ).to(model.device)

#         logger.info("모델 답변 생성 시작...")
#         start_time = time.time()  # 시간 측정 시작
        
#         with torch.no_grad():
#             outputs = model.generate(
#                 inputs,
#                 max_new_tokens=1024,
#                 pad_token_id=tokenizer.pad_token_id,
#                 eos_token_id=tokenizer.eos_token_id,
#                 use_cache=False, 
#                 do_sample=True,
#                 temperature=0.7,
#                 top_p=0.9
#             )
        
#         end_time = time.time()  # 시간 측정 종료
#         logger.info(f"모델 답변 생성 완료. 소요 시간: {end_time - start_time:.2f}초")
        
#         response_text = tokenizer.decode(outputs[0][inputs.shape[-1]:], skip_special_tokens=True)
#         return response_text
    
#     except Exception as e:
#         logger.error(f"Phi-3 모델로 답변 생성 중 오류 발생: {e}", exc_info=True)
#         return f"자연어 답변 생성 중 오류가 발생했습니다: {e}"
