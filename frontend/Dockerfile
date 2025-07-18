# frontend/Dockerfile
# Node.js 공식 이미지를 사용합니다.
FROM node:18-alpine

# 컨테이너 내의 루트 작업 디렉토리를 /app으로 설정합니다.
# 이 /app 디렉토리 안에 호스트의 frontend 디렉토리 내용이 복사될 것입니다.
WORKDIR /app

# 호스트의 'my-app' 디렉토리 전체를 컨테이너의 '/app/my-app'으로 복사합니다.
# 이 단계에서 package.json도 함께 복사됩니다.
COPY my-app ./my-app

# 이제 작업 디렉토리를 React 프로젝트의 루트인 /app/my-app으로 변경합니다.
# 이렇게 해야 npm install 및 npm start 명령이 package.json을 찾을 수 있습니다.
WORKDIR /app/my-app

# 의존성을 설치합니다. (이제 package.json을 찾을 수 있습니다)
RUN npm install

# React 개발 서버를 시작합니다.
CMD ["npm", "start"]