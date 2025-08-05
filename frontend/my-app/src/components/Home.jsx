// src/pages/Home.jsx

import React, { useState } from "react"; 
import "../css/home.css"; 
import DirectorySelector from '../components/DirectorySelector';
import FileExplorer from '../components/FileExplorer'; 
import AnalysisPage from '../components/AnalysisPage';
import ConversationPage from '../components/ConversationPage';

function Home() {
    // 앱의 현재 단계 상태 관리
    const [appStage, setAppStage] = useState('initial_scan'); 
    
    // 디렉토리 스캔 및 분석 관련 상태
    const [scannedTree, setScannedTree] = useState(null);
    const [currentProjectRootPath, setCurrentProjectRootPath] = useState('');
    const [isLoading, setIsLoading] = useState(false); 
    const [error, setError] = useState(null); 
    const [selectedAnalysisPaths, setSelectedAnalysisPaths] = useState([]); 
    const [finalAnalysisSummary, setFinalAnalysisSummary] = useState(null); 

    const handleScanResult = (data) => {
        setIsLoading(false);
        if (data && data.file_structure && data.project_root_path) {
            setScannedTree(data.file_structure);
            setCurrentProjectRootPath(data.project_root_path);
            setError(null);
            setAppStage('file_selection');
        } else {
            setError("스캔 결과 형식이 올바르지 않습니다. 다시 시도해 주세요.");
            setScannedTree(null);
            setCurrentProjectRootPath('');
            setAppStage('error_display');
        }
    };

    const handleDirectorySelectorLoadingChange = (loadingState) => {
        setIsLoading(loadingState);
        setError(null);
        if (loadingState) {
            setAppStage('initial_scan');
        }
    };

    const handleDirectorySelectorError = (errorMessage) => {
        setError(errorMessage);
        setIsLoading(false);
        setAppStage('error_display');
    };

    const handleStartAnalysisFromExplorer = (rootPath, paths) => {
        setSelectedAnalysisPaths(paths);
        setAppStage('analysis_progress');
        setError(null);
    };

    const handleAnalysisCompleted = (summary) => {
        setFinalAnalysisSummary(summary);
        setAppStage('conversation');
        setError(null);
    };

    const handleAnalysisError = (errorMessage) => {
        setError(errorMessage || "코드 분석 중 알 수 없는 오류가 발생했습니다.");
        setAppStage('error_display');
    };

    // 현재 앱 단계에 따라 다른 컴포넌트 렌더링
    switch (appStage) {
        case 'initial_scan':
            return (
                <div className="home-entire-container">
                    <h1>로컬 코드베이스 탐색 도구</h1>
                    <DirectorySelector 
                        onScanResult={handleScanResult} 
                        onLoadingChange={handleDirectorySelectorLoadingChange} 
                        onError={handleDirectorySelectorError} 
                    />
                    {isLoading && <p className="loading-message">파일 구조를 스캔 중입니다. 잠시만 기다려 주세요...</p>}
                    {error && <p className="error-message">오류: {error}</p>}
                    {!isLoading && !error && !scannedTree && (
                        <p className="instruction-message">시작하려면 위에서 프로젝트 디렉토리를 선택하세요.</p>
                    )}
                </div>
            );

        case 'file_selection':
            return (
                <div className="home-entire-container">
                    <h1>로컬 코드베이스 탐색 도구</h1>
                    <DirectorySelector 
                        onScanResult={handleScanResult} 
                        onLoadingChange={handleDirectorySelectorLoadingChange} 
                        onError={handleDirectorySelectorError} 
                    />
                    <hr className="separator" />
                    <h2>탐색 범위 설정</h2>
                    {scannedTree && currentProjectRootPath ? (
                        <FileExplorer 
                            node={scannedTree} 
                            projectRootPath={currentProjectRootPath}
                            onAnalyze={handleStartAnalysisFromExplorer}
                        />
                    ) : (
                        <p className="loading-message">파일 구조를 로드 중입니다...</p>
                    )}
                </div>
            );

        case 'analysis_progress':
            return (
                <AnalysisPage 
                    projectRootPath={currentProjectRootPath}
                    selectedPaths={selectedAnalysisPaths}
                    onAnalysisComplete={handleAnalysisCompleted}
                    onAnalysisError={handleAnalysisError}
                />
            );

        case 'conversation':
            return (
                <ConversationPage 
                    analysisSummary={finalAnalysisSummary} 
                />
            );

        case 'error_display':
            return (
                <div className="error-page-container">
                    <h2>오류 발생!</h2>
                    <p>{error}</p>
                    <button 
                        onClick={() => {
                            setAppStage('initial_scan');
                            setError(null);
                            setScannedTree(null);
                            setCurrentProjectRootPath('');
                        }}
                        className="error-retry-button"
                    >
                        처음으로 돌아가 다시 시도
                    </button>
                </div>
            );

        default:
            return <p className="error-message">알 수 없는 애플리케이션 상태입니다.</p>;
    }
}

export default Home;