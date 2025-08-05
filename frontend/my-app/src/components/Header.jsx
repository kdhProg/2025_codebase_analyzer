import { useState } from 'react';

// CSS를 컴포넌트 내부에 직접 정의하여 파일 경로 오류를 방지합니다.
const Header = () => {
    // 메뉴가 펼쳐져 있는지 여부를 관리하는 상태
    const [isMenuOpen, setIsMenuOpen] = useState(true);

    // 버튼 클릭 시 상태를 토글하는 함수
    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <>
            <style>
                {`
                .header-entire-container {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background-color: #252526;
                    color: #e0e0e0;
                    height: 80px;
                    padding: 0 50px;
                    min-width: 1000px;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
                    position: relative; /* 자식 요소의 위치를 위해 추가 */
                }

                .logo-section h1 {
                    margin: 0;
                    font-size: 1.8em;
                    font-weight: 600;
                    color: #ffffff;
                }

                .menu-section {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    transition: opacity 0.3s ease-in-out;
                }
                
                .menu-section.hidden {
                    opacity: 0;
                    pointer-events: none; /* 클릭 이벤트 방지 */
                }

                .menu-section p {
                    color: #cccccc;
                    font-size: 1em;
                    margin: 0;
                    cursor: pointer;
                    transition: color 0.3s;
                }

                .menu-section p:hover {
                    color: #ffffff;
                }

                .toggle-button {
                    background: none;
                    border: none;
                    color: #cccccc;
                    font-size: 1.5em;
                    cursor: pointer;
                    transition: color 0.3s, transform 0.3s;
                    padding: 0;
                    margin-left: 20px; /* 메뉴와 버튼 간 간격 */
                }

                .toggle-button:hover {
                    color: #ffffff;
                    transform: scale(1.1);
                }
                `}
            </style>
            <div className="header-entire-container">
                <div className="logo-section">
                    <h1>Codebase Insight</h1>
                </div>
                <div className={`menu-section ${isMenuOpen ? '' : 'hidden'}`}>
                    <p>프로젝트</p>
                    <p>대화</p>
                </div>
                <div className="toggle-button-section">
                    <button
                        className="toggle-button"
                        onClick={toggleMenu}
                        aria-expanded={isMenuOpen}
                        aria-controls="header-menu"
                    >
                        {isMenuOpen ? '▲' : '▼'}
                    </button>
                </div>
            </div>
        </>
    );
};

export default Header;
