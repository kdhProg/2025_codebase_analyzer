
// import Button from "react-bootstrap/Button";
import { useState } from "react";
import "../css/home.css"
import DirectorySelector from './DirectorySelector';
import FileExplorer from './FileExplorer';

const Home = () => {
    const [scannedTree, setScannedTree] = useState(null);

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
                    <FileExplorer node={scannedTree} />
                </>
            )}
        </div>
    );
};

export default Home;