import React, { useState, useEffect } from "react"; // useEffect 임포트 추가
import "../css/home.css";
import DirectorySelector from './DirectorySelector';
import FileExplorer from './FileExplorer';
// apiClient 경로는 제공해주신 config/apiClient로 변경했습니다.
import apiClient from '../config/apiClient'; 

const Home = () => {
    const [scannedTree, setScannedTree] = useState(null);
    const [currentProjectRootPath, setCurrentProjectRootPath] = useState('');
    const [isLoading, setIsLoading] = useState(false); // 로딩 상태 추가
    const [error, setError] = useState(null); // 에러 상태 추가

    // DirectorySelector로부터 스캔 결과
    const handleScanResult = (data) => {
        if (data && data.file_structure && data.project_root_path) {
            setScannedTree(data.file_structure);
            setCurrentProjectRootPath(data.project_root_path);
            setError(null); // 성공 시 에러 초기화
            // alert(currentProjectRootPath);
        } else {
            setError("스캔 결과 형식이 올바르지 않습니다.");
            setScannedTree(null);
            setCurrentProjectRootPath('');
        }
        setIsLoading(false); // 스캔 완료 후 로딩 해제
    };

    // 만약 DirectorySelector가 직접 project_root_path를 반환하지 않고,
    // scannedTree 객체 안에 해당 정보가 포함되어 있다면, 아래 useEffect를 사용할 수 있습니다.
    // (이 경우 DirectorySelector 내부 로직에 따라 선택적으로 사용)
    // useEffect(() => {
    //     if (scannedTree && scannedTree.path && scannedTree.type === 'directory') {
    //         // scannedTree의 path가 프로젝트의 루트 경로라고 가정합니다.
    //         setCurrentProjectRootPath(scannedTree.path);
    //     }
    // }, [scannedTree]); // scannedTree가 변경될 때마다 projectRootPath 업데이트

    // DirectorySelector 컴포넌트 내부에서 API 호출을 담당한다고 가정하므로,
    // Home 컴포트넌트에서는 별도의 초기 API 호출을 하지 않습니다.
    // 만약 Home에서 직접 초기 스캔을 시작하고 싶다면 아래 주석 처리된 useEffect를 활성화하고,
    // DirectorySelector가 단순 경로 선택자 역할만 하도록 조정해야 합니다.
    
    /*
    useEffect(() => {
        const fetchInitialScan = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // 이 API는 프로젝트 루트 경로와 초기 파일 구조를 반환해야 합니다.
                // 예를 들어, 마지막으로 작업했던 폴더의 스캔 결과를 가져오는 API일 수 있습니다.
                // 또는 DirectorySelector의 기본 동작을 트리거하는 API일 수도 있습니다.
                const response = await apiClient.get('/initial-scan-or-last-project'); 
                const data = response.data;
                
                if (data && data.file_structure && data.project_root_path) {
                    setScannedTree(data.file_structure);
                    setCurrentProjectRootPath(data.project_root_path);
                } else {
                    setError("초기 스캔 결과가 유효하지 않습니다.");
                }
            } catch (err) {
                console.error("초기 스캔 중 오류 발생:", err);
                let errorMessage = '초기 프로젝트 정보 로드 실패';
                if (err.response) {
                    errorMessage = err.response.data.detail || err.response.data.message || errorMessage;
                } else if (err.request) {
                    errorMessage = '네트워크 오류: 서버에 연결할 수 없습니다.';
                } else {
                    errorMessage = '오류 발생: ' + err.message;
                }
                setError(errorMessage);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInitialScan();
    }, []); // 컴포넌트 마운트 시 한 번만 실행
    */

    return (
        <div className="home-entire-container">
            <h1>로컬 코드베이스 탐색 도구</h1>
            <DirectorySelector onScanResult={handleScanResult} onLoadingChange={setIsLoading} onError={setError} />
            {isLoading && <p>파일 구조를 스캔 중입니다. 잠시만 기다려 주세요...</p>}
            {error && <p style={{ color: 'red' }}>오류: {error}</p>}

            {scannedTree && currentProjectRootPath && ( // scannedTree와 projectRootPath 모두 유효할 때만 렌더링
                <>
                    <hr style={{ margin: '30px 0' }} />
                    <h2>탐색 범위 설정</h2>
                    {/* scannedTree와 currentProjectRootPath를 FileExplorer에 전달 */}
                    <FileExplorer node={scannedTree} projectRootPath={currentProjectRootPath}/>
                </>
            )}
        </div>
    );
};

export default Home;