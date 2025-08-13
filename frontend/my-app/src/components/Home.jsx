// src/pages/Home.jsx

import React, { useState, useCallback } from "react";
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

    // 디버깅/테스트 전용: 더미 분석 요약 데이터
    const dummySummary = {
        total_files: 15,
        main_language: "JavaScript",
        analysis_results: [
            {
                file_path: "src/components/MyComponent.js",
                summary: "This component manages user authentication state.",
                code_snippets: [
                    "// src/components/MyComponent.js\n\nimport React, { useState, useEffect } from 'react';\n\nconst MyComponent = () => {\n  const [user, setUser] = useState(null);\n  useEffect(() => {\n    // fetch user data\n  }, []);\n\n  return <div>{user ? 'Logged in' : 'Logged out'}</div>;\n}\n\nexport default MyComponent;"
                ]
            }
        ]
    };

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
        if (errorMessage) {
            setError(errorMessage);
            setIsLoading(false);
            setAppStage('error_display');
        } else {
            setError(null);
        }
    };

    const handleStartAnalysisFromExplorer = (rootPath, paths) => {
        setSelectedAnalysisPaths(paths);
        setAppStage('analysis_progress');
        setError(null);
    };

    const handleAnalysisCompleted = useCallback((summary) => {
        setFinalAnalysisSummary(summary);
        setAppStage('conversation');
        setError(null);
    }, []);

    const handleAnalysisError = useCallback((errorMessage) => {
        setError(errorMessage || "코드 분석 중 알 수 없는 오류가 발생했습니다.");
        setAppStage('error_display');
    }, []);

    // 디버깅용 핸들러: 분석 과정을 건너뛰고 바로 대화 페이지로 이동
    const handleSkipToConversation = () => {
        setFinalAnalysisSummary(dummySummary);
        setAppStage('conversation');
    };

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
                    {/* 디버깅/테스트 전용 버튼 */}
                    <button
                        onClick={handleSkipToConversation}
                        style={{
                            position: 'absolute',
                            bottom: '10px',
                            right: '10px',
                            padding: '5px 10px',
                            fontSize: '12px',
                            background: '#ff6347',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                        }}
                    >
                        테스트: 스킵
                    </button>
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
                            setCurrentProjectRootPath('');
                        }}
                        className="error-retry-button"
                    >
                        재시도
                    </button>
                </div>
            );

        default:
            return <p className="error-message">알 수 없는 애플리케이션 상태입니다.</p>;
    }
}

export default Home;
