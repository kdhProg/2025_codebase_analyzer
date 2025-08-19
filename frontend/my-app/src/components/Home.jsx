// src/pages/Home.jsx

import React, { useState, useCallback } from "react";
import "../css/home.css";
import DirectorySelector from '../components/DirectorySelector';
import FileExplorer from '../components/FileExplorer';
import AnalysisPage from '../components/AnalysisPage';
import ConversationPage from '../components/ConversationPage';

function Home() {
    // Manage current app stage state
    const [appStage, setAppStage] = useState('initial_scan');

    // Directory scan and analysis related state
    const [scannedTree, setScannedTree] = useState(null);
    const [currentProjectRootPath, setCurrentProjectRootPath] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedAnalysisPaths, setSelectedAnalysisPaths] = useState([]);
    const [finalAnalysisSummary, setFinalAnalysisSummary] = useState(null);

    // Debug/Test only: dummy analysis summary data
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
            setError("The scan result format is invalid. Please try again.");
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
        setError(errorMessage || "An unknown error occurred during code analysis.");
        setAppStage('error_display');
    }, []);

    // Debug handler: skip analysis process and go directly to conversation page
    const handleSkipToConversation = () => {
        setFinalAnalysisSummary(dummySummary);
        setAppStage('conversation');
    };

    switch (appStage) {
        case 'initial_scan':
            return (
                <div className="home-entire-container">
                    <h1>Codebase Explorer</h1>
                    <DirectorySelector
                        onScanResult={handleScanResult}
                        onLoadingChange={handleDirectorySelectorLoadingChange}
                        onError={handleDirectorySelectorError}
                    />
                    {isLoading && <p className="loading-message">Scanning file structure. Please wait...</p>}
                    {error && <p className="error-message">Error: {error}</p>}
                    {!isLoading && !error && !scannedTree && (
                        <p className="instruction-message">To get started, select a project directory above.</p>
                    )}
                    {/* Debug/Test only button */}
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
                        Test: Skip
                    </button>
                </div>
            );

        case 'file_selection':
            return (
                <div className="home-entire-container">
                    <h1>Codebase Explorer</h1>
                    <DirectorySelector
                        onScanResult={handleScanResult}
                        onLoadingChange={handleDirectorySelectorLoadingChange}
                        onError={handleDirectorySelectorError}
                    />
                    <hr className="separator" />
                    <h2>Set Exploration Scope</h2>
                    {scannedTree && currentProjectRootPath ? (
                        <FileExplorer
                            node={scannedTree}
                            projectRootPath={currentProjectRootPath}
                            onAnalyze={handleStartAnalysisFromExplorer}
                        />
                    ) : (
                        <p className="loading-message">Loading file structure...</p>
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
                    <h2>Error occurred!</h2>
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
                        Retry
                    </button>
                </div>
            );

        default:
            return <p className="error-message">Unknown application state.</p>;
    }
}

export default Home;
