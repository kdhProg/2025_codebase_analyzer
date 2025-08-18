# """
# AI 임베딩 초기화 스크립트
# - 백엔드가 시작될 때 임베딩 파일이 없으면 초기화
# - 기본 더미 데이터로 임베딩 파일 생성
# - Hugging Face 모델 캐시 디렉토리 설정
# """

# import os
# import pickle
# import torch
# import numpy as np
# from pathlib import Path
# import logging

# # 로깅 설정
# logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
# logger = logging.getLogger(__name__)

# def setup_directories():
#     """필요한 디렉토리들을 생성합니다."""
#     directories = [
#         "/app/data",
#         "/app/data/huggingface",
#         "/app/data/transformers"
#     ]
    
#     for directory in directories:
#         Path(directory).mkdir(parents=True, exist_ok=True)
#         logger.info(f"디렉토리 생성/확인: {directory}")

# def create_dummy_embeddings():
#     """더미 임베딩 데이터 생성"""
#     logger.info("더미 임베딩 데이터 생성 중...")
    
#     dummy_embeddings = {
#         "function_example_1": torch.randn(768).numpy(),
#         "class_example_1": torch.randn(768).numpy(),
#         "variable_example_1": torch.randn(768).numpy(),
#         "api_endpoint_1": torch.randn(768).numpy(),
#         "database_query_1": torch.randn(768).numpy(),
#     }
    
#     logger.info(f"{len(dummy_embeddings)}개의 더미 임베딩 생성 완료")
#     return dummy_embeddings

# def check_torch_availability():
#     """PyTorch 사용 가능 여부를 확인합니다."""
#     try:
#         logger.info(f"PyTorch 버전: {torch.__version__}")
#         logger.info(f"CUDA 사용 가능: {torch.cuda.is_available()}")
#         if torch.cuda.is_available():
#             logger.info(f"CUDA 디바이스: {torch.cuda.get_device_name(0)}")
#         return True
#     except Exception as e:
#         logger.error(f"PyTorch 확인 실패: {e}")
#         return False

# def initialize_embeddings_if_needed():
#     """필요한 경우 임베딩 파일 초기화"""
#     try:
#         logger.info("=== AI 임베딩 초기화 시작 ===")
        
#         # 디렉토리 설정
#         setup_directories()
        
#         # PyTorch 확인
#         if not check_torch_availability():
#             logger.warning("PyTorch를 사용할 수 없습니다. 기본 모드로 진행합니다.")
        
#         # data_dir = Path("/app/data")
#         # embeddings_file = data_dir / "embeddings.pkl"
#         embeddings_file = "embeddings.pkl"
        
#         # 임베딩 파일이 없으면 생성
#         if not embeddings_file.exists():
#             logger.info("임베딩 파일이 없습니다. 새로 생성합니다...")
#             dummy_embeddings = create_dummy_embeddings()
            
#             with open(embeddings_file, "wb") as f:
#                 pickle.dump(dummy_embeddings, f)
            
#             logger.info(f"임베딩 파일 생성 완료: {embeddings_file}")
#             return True
#         else:
#             logger.info(f"임베딩 파일이 이미 존재합니다: {embeddings_file}")
            
#             # 파일 크기 확인
#             file_size = embeddings_file.stat().st_size
#             logger.info(f"파일 크기: {file_size} bytes")
            
#             return False
            
#     except Exception as e:
#         logger.error(f"임베딩 초기화 중 오류 발생: {e}")
#         return False

# # def main():
# #     """메인 함수"""
# #     try:
# #         success = initialize_embeddings_if_needed()
# #         if success:
# #             logger.info("✅ AI 임베딩 초기화 성공")
# #         else:
# #             logger.info("ℹ️ AI 임베딩 초기화 불필요 또는 실패")
        
# #         logger.info("=== AI 임베딩 초기화 완료 ===")
        
# #     except Exception as e:
# #         logger.error(f"메인 함수 실행 중 오류: {e}")
# #         return 1
    
# #     return 0

# # if __name__ == "__main__":
# #     exit_code = main()
# #     exit(exit_code)




