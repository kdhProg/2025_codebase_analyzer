import "../css/header.css";

const Header =()=>{
    return(
        <div className="header-entire-container">
            <div>
                <p>로고</p>
            </div>
            <div>
                <p>프로젝트명</p>
            </div>
            <div>
                <p>프로젝트 목록 드롭다운</p>
            </div>
            <div>
                <p>설정</p>
            </div>
            <div>
                <p>도움말</p>
            </div>
        </div>
    );
}

export default Header;