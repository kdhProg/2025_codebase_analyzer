import torch
import pickle
from transformers import AutoTokenizer, AutoModel

class SemanticSearcher:
    def __init__(self, embedding_file_path, model_name = "microsoft/codebert-base"):
        print("SemanticSearcher: 초기화 시작...")

        # 1. 미리 계산된 코드 임베딩 로드

        with open(embedding_file_path, "rb") as f:
            self.embedding_dict = pickle.load(f)

        self.node_ids = list(self.embedding_dict.keys())
        self.code_embeddings = torch.stack(list(self.embedding_dict.values()))

        # 2. 검색어 임베딩을 위한 모델 및 토크나이저 로드
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name)
        self.model.eval() # 모델을 추론 모드로 설정
        print("SemanticSearcher 초기화 완료")

    def search(self, query, top_k = 5):
        """자연어 쿼리와 가장 유사한 코드 노드를 찾습니다."""
        print(f"검색 시작: '{query}'")

        # 3. 검색어를 임베딩 벡터로 변환
        inputs = self.tokenizer(query, return_tensors = "pt")
        with torch.no_grad():
            query_embedding = self.model(**inputs).pooler_output

        # 4. 코사인 유사도 계산
        # (1, 768) 크기의 쿼리 임베딩과 (N, 768) 크기의 코드 임베딩 간의 유사도 계산
        cos_scores = torch.nn.functional.cosine_similarity(query_embedding, self.code_embeddings)

        # 5. 가장 높은 점수를 가진 top_k개의 결과 추출
        top_results = torch.topk(cos_scores, k = min(top_k, len(self.code_embeddings)))

        results = []
        for score, idx in zip(top_results.values, top_results.indices):
            results.append({
                "node_id": self.node_ids[idx],
                "score": score.item()
            })
        print(f"검색 완료. {len(results)}개 결과 반환.")
        return results
    
# 테스트용 메인 실행 블록
if __name__ == "__main__":
    embedding_file = "data/embeddings.pkl"
    if not os.path.exists(embedding_file):
        print(f"'{embedding_file}'을 찾을 수 없습니다. 먼저 data_pipeline.py를 실행하세요.")
    else:
        searcher = SemanticSearcher(embedding_file_path=embedding_file)
        
        # 테스트 검색
        test_query = "FastAPI 애플리케이션 실행"
        search_results = searcher.search(test_query)
        
        print("\n--- 검색 결과 ---")
        for result in search_results:
            print(f"Node ID: {result['node_id']}, 유사도: {result['score']:.4f}")

        