import axios from 'axios';
// 백엔드 API의 기본 URL 설정
// 개발 환경에서는 localhost, 배포 환경에서는 실제 도메인으로 변경
const API_BASE_URL = 'http://localhost:8000'; 

// axios 인스턴스 생성
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default apiClient;