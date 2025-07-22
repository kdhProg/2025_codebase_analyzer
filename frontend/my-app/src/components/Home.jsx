
// import Button from "react-bootstrap/Button";
import { useState } from "react";
import "../css/home.css"
import DirectorySelector from './DirectorySelector';
import FileExplorer from './FileExplorer'; // 새로 생성할 컴포넌트

const Home = () => {
    const [scannedTree, setScannedTree] = useState(null); // FileNode 트리를 저장할 상태

    // DirectorySelector에서 스캔 결과를 받아서 scannedTree 상태에 저장
    const handleScanResult = (data) => {
        setScannedTree(data);
    };
    return (
        <div className="home-entire-container">
            <h1>로컬 코드베이스 탐색 도구</h1>
            <DirectorySelector onScanResult={handleScanResult} />
            {scannedTree && (
                <>
                    <hr style={{ margin: '30px 0' }} />
                    <h2>탐색 범위 설정</h2>
                    {/* FileExplorer 컴포넌트에 스캔된 트리를 props로 전달 */}
                    <FileExplorer node={scannedTree} />
                </>
            )}
        </div>
    );
};

export default Home;