import { useState } from 'react';

// Define CSS directly inside the component to prevent file path errors
const Header = () => {
    // State to manage whether the menu is open
    const [isMenuOpen, setIsMenuOpen] = useState(true);

    // Function to toggle the menu state on button click
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
                    position: relative; /* Added for child element positioning */
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
                    pointer-events: none; /* Prevent click events */
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
                    margin-left: 20px; /* Spacing between menu and button */
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
                    <p onClick={() => window.location.href = '/'}>Home</p>
                    <p onClick={() => window.location.href = '/code-interpretation'}>Code Interpretation</p>
                    <p onClick={() => window.location.href = '/project-analysis'}>Project Analysis</p>
                    {/* <p onClick={() => window.location.href = '/conversation'}>Conversation</p> */}
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
