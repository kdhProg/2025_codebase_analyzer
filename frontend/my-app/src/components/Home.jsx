// src/pages/Home.jsx

import React, { useState } from "react"; 
import "../css/home.css"; // CSS 파일 임포트
import DirectorySelector from '../components/DirectorySelector'; // 디렉토리 선택 컴포넌트
import FileExplorer from '../components/FileExplorer';     // 파일 탐색기 컴포넌트
import AnalysisPage from '../components/AnalysisPage';     // 분석 진행도 컴포넌트
import ConversationPage from '../components/ConversationPage'; // 대화 컴포넌트

function Home() {
    // 앱의 현재 단계를 나타내는 상태
    // 'initial_scan': 초기 상태, DirectorySelector 표시
    // 'file_selection': 파일 탐색기 표시
    // 'analysis_progress': 분석 진행 페이지 표시
    // 'conversation': 대화 페이지 표시
    // 'error_display': 오류 메시지 표시 (필요시)
    const [appStage, setAppStage] = useState('initial_scan'); 
    
    // DirectorySelector에서 받아온 스캔 결과
    const [scannedTree, setScannedTree] = useState(null);
    const [currentProjectRootPath, setCurrentProjectRootPath] = useState('');
    
    // DirectorySelector 및 AnalysisPage의 로딩/에러 상태
    const [isLoading, setIsLoading] = useState(false); 
    const [error, setError] = useState(null); 

    // FileExplorer에서 AnalysisPage로 전달할 데이터
    const [selectedAnalysisPaths, setSelectedAnalysisPaths] = useState([]); 

    // AnalysisPage에서 받아올 최종 분석 요약 데이터
    const [finalAnalysisSummary, setFinalAnalysisSummary] = useState(null); 

    // DirectorySelector로부터 스캔 결과 처리
    const handleScanResult = (data) => {
        setIsLoading(false); // 스캔 완료 후 로딩 해제
        if (data && data.file_structure && data.project_root_path) {
            setScannedTree(data.file_structure);
            setCurrentProjectRootPath(data.project_root_path);
            setError(null); // 성공 시 에러 초기화
            setAppStage('file_selection'); // 스캔 성공 시 파일 선택 단계로 전환
        } else {
            setError("스캔 결과 형식이 올바르지 않습니다. 다시 시도해 주세요.");
            setScannedTree(null);
            setCurrentProjectRootPath('');
            setAppStage('error_display'); // 스캔 실패 시 에러 표시 단계로 전환
        }
    };

    // DirectorySelector의 로딩 상태 업데이트
    const handleDirectorySelectorLoadingChange = (loadingState) => {
        setIsLoading(loadingState);
        setError(null); // 새로운 시도 시 에러 초기화
        if (loadingState) {
            setAppStage('initial_scan'); // 로딩 중이면 초기 스캔 단계로 유지
        }
    };

    // DirectorySelector의 에러 상태 업데이트
    const handleDirectorySelectorError = (errorMessage) => {
        setError(errorMessage);
        setIsLoading(false);
        setAppStage('error_display'); // 에러 발생 시 에러 표시 단계로 전환
    };

    // FileExplorer에서 '분석 시작' 버튼 클릭 시 호출될 함수
    const handleStartAnalysisFromExplorer = (rootPath, paths) => {
        setSelectedAnalysisPaths(paths); // FileExplorer에서 선택된 경로 저장
        setAppStage('analysis_progress'); // 분석 진행 단계로 전환
        setError(null); // 새 분석 시작 시 에러 초기화
    };

    // AnalysisPage에서 분석 완료 시 호출될 함수
    const handleAnalysisCompleted = (summary) => {
        setFinalAnalysisSummary(summary);
        setAppStage('conversation'); // 대화 단계로 전환
        setError(null); // 성공 시 에러 초기화
    };

    // AnalysisPage에서 오류 발생 시 호출될 함수
    const handleAnalysisError = (errorMessage) => {
        setError(errorMessage || "코드 분석 중 알 수 없는 오류가 발생했습니다.");
        setAppStage('error_display'); // 오류 발생 시 에러 표시 단계로 전환
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
                    <DirectorySelector // 스캔 버튼을 다시 보여줄 수 있도록 유지
                        onScanResult={handleScanResult} 
                        onLoadingChange={handleDirectorySelectorLoadingChange} 
                        onError={handleDirectorySelectorError} 
                    />
                    <hr style={{ margin: '30px 0' }} />
                    <h2>탐색 범위 설정</h2>
                    {scannedTree && currentProjectRootPath ? (
                        <FileExplorer 
                            node={scannedTree} 
                            projectRootPath={currentProjectRootPath}
                            onAnalyze={handleStartAnalysisFromExplorer} // 분석 시작 핸들러 전달
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
                    onAnalysisError={handleAnalysisError} // 오류 발생 시 Home으로 알림
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
                <div className="home-entire-container" style={{ textAlign: 'center', padding: '50px', color: 'red', background: '#fff3f3', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <h2 style={{ color: '#cc0000' }}>오류 발생!</h2>
                    <p style={{ fontSize: '1.1em' }}>{error}</p>
                    <button 
                        onClick={() => {
                            setAppStage('initial_scan'); // 초기 스캔 단계로 돌아가 다시 시도
                            setError(null); // 에러 메시지 초기화
                            setScannedTree(null); // 스캔 결과 초기화
                            setCurrentProjectRootPath(''); // 프로젝트 루트 초기화
                        }}
                        style={{ 
                            marginTop: '20px', 
                            padding: '10px 20px', 
                            fontSize: '16px', 
                            backgroundColor: '#dc3545', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '5px', 
                            cursor: 'pointer', 
                            transition: 'background-color 0.3s' 
                        }}
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