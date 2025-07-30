import { useState } from "react";
import apiClient from '../config/apiClient';

const DirectorySelector = ({ onScanResult, onLoadingChange, onError }) => { 

    const [projectPath, setProjectPath] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (onLoadingChange) onLoadingChange(true); 
        if (onError) onError(null); 

        setLoading(true);
        setError(null);

        try {
            const response = await apiClient.post('/scan-project-path', {
                project_path: projectPath,
            });
            const responseData = response.data;
            if (responseData && responseData.file_structure && responseData.project_root_absolute_path) {
                onScanResult({
                    file_structure: responseData.file_structure,
                    project_root_path: responseData.project_root_absolute_path 
                });
                // alert( responseData.project_root_absolute_path );
            } else {
                console.error("백엔드 /scan-project-path 응답 형식이 올바르지 않습니다:", responseData);
                if (onError) onError("서버로부터 유효한 스캔 결과를 받지 못했습니다. (필드 누락)");
            }

        } catch (err) {
            console.error("Error scanning directory:", err);
            let errorMessage = '디렉토리 스캔 중 알 수 없는 오류 발생';

            if (err.response) {
                errorMessage = err.response.data.detail || err.response.data.message || '서버 오류가 발생했습니다.';
            } else if (err.request) {
                errorMessage = '네트워크 오류 또는 서버에 연결할 수 없습니다.';
            } else {
                errorMessage = err.message || '요청 처리 중 오류 발생';
            }
            
            setError(errorMessage);
            if (onError) onError(errorMessage); 

        } finally {
            setLoading(false);
            if (onLoadingChange) onLoadingChange(false); 
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
                    {loading ? '스캔 중' : '스캔'}
                </button>
            </form>
            {error && <p style={{ color: 'red' }}>에러: {error}</p>}
        </div>
    );
};

export default DirectorySelector;