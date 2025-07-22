import axios from "axios";
import { useState } from "react";

const DirectorySelector = ({ onScanResult }) => {

    const [projectPath, setProjectPath] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // axios.post를 사용하여 POST 요청 보냄
            const response = await axios.post('http://localhost:8000/scan-project-path', {
                project_path: projectPath, // 객체를 직접 전송, axios가 자동으로 JSON.stringify 처리
            });

            // axios는 기본적으로 2xx 범위의 응답에 대해 .then()을 실행하고,
            // 4xx, 5xx 응답은 .catch() 블록으로 넘어갑니다.
            // 따라서 response.ok 체크가 필요 없습니다.
            // 응답 데이터는 response.data에 자동으로 파싱되어 들어있습니다.
            onScanResult(response.data); // 스캔 결과 전달

        } catch (err) {
            console.error("Error scanning directory:", err);
            // axios 오류 객체는 `err.response` (서버 응답 오류), `err.request` (요청은 갔으나 응답 없음), `err.message` (기타)를 포함합니다.
            if (err.response) {
                // 서버 응답 오류 (HTTP 상태 코드 4xx, 5xx)
                setError(err.response.data.detail || '서버 오류 발생');
            } else if (err.request) {
                // 요청은 보냈으나 응답을 받지 못함 (네트워크 오류 등)
                setError('네트워크 오류: 서버에 연결할 수 없습니다.');
            } else {
                // 그 외 오류
                setError(err.message || '알 수 없는 오류 발생');
            }
        } finally {
            setLoading(false);
        }
    };


    return (
        <div>
            <h2>프로젝트 폴더 선택</h2>
            <form onSubmit={handleSubmit}>
                <label htmlFor="projectPath">
                    프로젝트 경로 입력:
                </label>
                <input
                    type="text"
                    id="projectPath"
                    value={projectPath}
                    onChange={(e) => setProjectPath(e.target.value)}
                    placeholder="예: /Users/yourname/my_project"
                    style={{ width: '300px', padding: '8px', marginRight: '10px' }}
                />
                <button type="submit" disabled={loading}>
                    {loading ? '스캔 중...' : '스캔'}
                </button>
            </form>
            {error && <p style={{ color: 'red' }}>에러: {error}</p>}
        </div>
    );
};

export default DirectorySelector;