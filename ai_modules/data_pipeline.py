import requests
import torch
from transformers import AutoTokenizer, AutoModel
import pickle
import os

BACKEND_API_URL = "http://localhost:8000/api/v1/graph" #서버주소

# 1. 백엔드에서 그래프 데이터 로드

def load_graph_from_backend():
    """친구의 백엔드 API를 호출하여 그래프 데이터를 가져옵니다."""
    print(f"백엔드에서 그래프 데이터 로딩 시작: {BACKEND_API_URL}")
    try:
        response = requests.get(BACKEND_API_URL)
        response.raise_from_status() 
        print("데이터 로딩 성공!")
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"백엔드 API 호출 실패: {e}")
        return None

# 2. 코드 조각을 의미 벡터로 변환

def create_code_embeddings(graph_data, model_name = "microsoft/codebert-base"):
    """그래의 각 노드에 대해 코드 임베딩을 생성합니다."""
    if not graph_data or 'nodes' not in graph_data:
        return None
    
    print(f"{model_name} 모델 로딩 중...")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModel.from_pretrained(model_name)
    print("모델 로딩 완료.")

    node_texts =
    node_ids =

    # 그래프의 모든 노드를 순회하며 텍스트 추출

    for node in graph_data['nodes']:
        # 'Function' 이나 'Files' 노드는 전체 노드를, 나머지는 이름을 사용
        if 'code_text' in node['properties'] and node['properties']['code_text']:
            node_texts.append(node['properties']['code_text'])
        else:
            node_texts.append(node['properties'].get('name', ''))
        node_ids.append(node['id'])

    print(f"총 {len(node_texts)}개의 노드에 대한 임베딩 생성 중...")


    # 토크나이징 및 임베딩
    inputs = tokenizer(node_texts, padding = True, truncation = True, return_tensors = "pt", max_length = 512)
    with torch.no_grad():
        outputs = model(**inputs)

    last_hidden_states = outputs.last_hidden_state
    mask = inputs['attention_mask'].unsqueeze(-1).expand(last_hidden_states.size()).float()
    sum_embeddings = torch.sum(last_hidden_states * mask, 1)
    sum_mask = torch.clamp(mask.sum(1), min=1e-9)
    embeddings = sum_embeddings / sum_mask

    embedding_dict = {node_id: emb for node_id, emb in zip(node_ids, embeddings)}
    print("임베딩 생성 완료!")
    return embedding_dict

# 3. 메인 실행 블록
if __name__ == "__main__":
    graph_data = load_graph_from_backend()

    if graph_data:
        # 생성된 임베딩을 파일로 저장하여 매번 다시 계산하지 않도록 함
        output_dir = "data"
        os.makedirs(output_dir, exist_ok = True)

        # 그래프 원본 데이터 저장
        with open(os.path.join(output_dir, "graph.pkl"), "wb") as f:
            pickle.dump(graph_data, f)
            print("그래프의 데이터가 'data/graph.pkl'에 저장되었습니다.")

        # 임베딩 딕셔너리 생성 및 저장
        embeddings = create_code_embeddings(graph_data)
        if embeddings:
            with open(os.path.join(output_dir, "embeddings.pkl"), "wb") as f:
                pickle.dump(embeddings, f)
                print("코드 임베딩이 'data/embeddings.pkl'에 저장되었습니다.")
                