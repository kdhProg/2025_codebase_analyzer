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
            const response = await axios.post('http://localhost:8000/scan-project-path', {
                project_path: projectPath,
            });
            onScanResult(response.data);

        } catch (err) {
            console.error("Error scanning directory:", err);
            if (err.response) {
                setError(err.response.data.detail || 'server error occurred');
            } else if (err.request) {
                setError('server connection error occurred');
            } else {
                // 그 외 오류
                setError(err.message || 'error occurred');
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
                    {loading ? '스캔 중' : '스캔'}
                </button>
            </form>
            {error && <p style={{ color: 'red' }}>에러: {error}</p>}
        </div>
    );
};

export default DirectorySelector;