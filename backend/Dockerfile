# backend/Dockerfile
FROM python:3.10-slim-buster

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 코드를 복사
COPY . .

# Uvicorn 서버를 실행하기 위한 명령을 정의합니다.
# 0.0.0.0:8000으로 모든 네트워크 인터페이스에서 접근 가능하게 합니다.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]