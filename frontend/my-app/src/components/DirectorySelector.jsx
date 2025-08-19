import { useState } from "react";
import apiClient from '../config/apiClient';
import '../css/directorySelector.css';

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
            } else {
                console.error("Invalid backend response format:", responseData);
                if (onError) onError("Did not receive a valid scan result from the server.");
            }
        } catch (err) {
            console.error("Error scanning directory:", err);
            let errorMessage = 'Unknown error occurred while scanning directory';

            if (err.response) {
                errorMessage = err.response.data.detail || err.response.data.message || 'A server error has occurred.';
            } else if (err.request) {
                errorMessage = 'Network error or unable to connect to the server.';
            } else {
                errorMessage = err.message || 'Error occurred while processing the request.';
            }
            
            setError(errorMessage);
            if (onError) onError(errorMessage); 
        } finally {
            setLoading(false);
            if (onLoadingChange) onLoadingChange(false); 
        }
    };

    return (
        <div className="directory-selector-container">
            <form onSubmit={handleSubmit} className="directory-selector-form">
                <label htmlFor="projectPath">
                    Enter project path:
                </label>
                <input
                    type="text"
                    id="projectPath"
                    value={projectPath}
                    onChange={(e) => setProjectPath(e.target.value)}
                    placeholder="e.g. /Users/yourname/my_project"
                />
                <button type="submit" disabled={loading}>
                    {loading ? 'Scanning...' : 'Scan'}
                </button>
            </form>
            {error && <p className="error-message">Error: {error}</p>}
        </div>
    );
};

export default DirectorySelector;
