// src/components/ConversationPage.jsx
import React, { useState, useEffect, useRef } from 'react';
// axios 인스턴스를 임포트합니다.
import apiClient from '../config/apiClient';
import '../css/ConversationPage.css';
import ReactMarkdown from 'react-markdown';



// ConversationPage 컴포넌트
function ConversationPage({ analysisSummary }) {
    const [messages, setMessages] = useState([]); // 채팅 메시지 목록
    const [input, setInput] = useState(''); // 사용자 입력 텍스트
    const [isLoading, setIsLoading] = useState(false); // API 호출 로딩 상태
    const chatWindowRef = useRef(null); // 채팅창 스크롤을 위한 Ref
    const [visibleEvidenceIndex, setVisibleEvidenceIndex] = useState(null);

    // 컴포넌트가 마운트될 때, 초기 질문과 LLM 응답을 설정합니다.
    useEffect(() => {
        // 분석 결과가 있다면, 초기 메시지를 생성
        if (analysisSummary) {
            // LLM의 첫 번째 응답 (임의로 생성)
            const initialLLMMessage = {
                sender: 'LLM',
                text: `안녕하세요! 분석이 완료되었습니다.`
            };
            setMessages([initialLLMMessage]);
        }
    }, [analysisSummary]);

    // 메시지가 추가될 때마다 스크롤을 맨 아래로 이동
    useEffect(() => {
        if (chatWindowRef.current) {
            chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
        }
    }, [messages]);

    // 시맨틱 검색 API를 호출하는 실제 함수
    const searchSemanticAPI = async (query) => {
        // 백엔드에서 LLM이 생성한 문자열을 직접 반환하므로,
        // 이 함수는 단순히 텍스트 응답을 받아서 반환하면 됩니다.
        try {
            const response = await apiClient.post('/semantic-search', {
                query: query,
                top_k: 10
            });
            return response.data; // 응답 데이터는 LLM의 문자열 응답입니다.
        } catch (error) {
            // API 호출 실패 시 에러를 던집니다.
            console.error("API 호출 중 오류 발생:", error);
            throw error;
        }
    };

    const handleToggleEvidence = (index) => {
        // 현재 인덱스와 같으면 닫고, 다르면 해당 인덱스로 설정
        setVisibleEvidenceIndex(prevIndex => prevIndex === index ? null : index);
    };

    // 메시지 전송 핸들러
    const handleSendMessage = async () => {
        if (input.trim() === '') return; // 입력값이 비어 있으면 전송하지 않음

        const newUserMessage = { sender: 'user', text: input };
        setMessages(prevMessages => [...prevMessages, newUserMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // 시맨틱 검색 API 호출
            // 백엔드에서 문자열 응답을 받습니다.
            const llmResponse= await searchSemanticAPI(newUserMessage.text);

            // LLM 응답 메시지를 생성하고, 받은 텍스트를 그대로 사용합니다.
            const newLLMMessage = {
                sender: 'LLM',
                text: llmResponse.text, // 백엔드에서 받은 문자열을 그대로 사용
                evidence: llmResponse.evidence
            };

            // console.log(llmResponse.evidence);
            setMessages(prevMessages => [...prevMessages, newLLMMessage]);
        } catch (error) {
            console.error("API 호출 중 오류 발생:", error);
            // axios 에러는 error.response.data에 상세 정보가 있을 수 있습니다.
            const errorMessage = {
                sender: 'LLM',
                text: `오류가 발생했습니다. 다시 시도해 주세요.`
            };
            setMessages(prevMessages => [...prevMessages, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    // 엔터 키 입력 시 메시지 전송
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !isLoading) {
            handleSendMessage();
        }
    };

    return (
        <div className="main-container">
            <div className="chat-interface-container">
                {/* Mock Sidebar UI */}
                <div className="sidebar">
                    <div className="sidebar-header">
                        <div className="profile-info">
                            <div className="profile-icon">
                                👤
                            </div>
                            <span className="profile-name">
                                사용자
                            </span>
                        </div>
                    </div>
                    <nav className="sidebar-nav">
                        <ul>
                            <li className="nav-item active">🏠 대시보드</li>
                            <li className="nav-item">💬 대화 목록</li>
                            <li className="nav-item">⚙️ 설정</li>
                            <li className="nav-item">❓ 도움말</li>
                        </ul>
                    </nav>
                    <div className="sidebar-footer">
                        <div className="status-indicator online"></div>
                        <span className="status-text">온라인</span>
                        <div className="logout-button">
                            ➡️
                        </div>
                    </div>
                </div>
                {/* Main chat area */}
                <div className="chat-main">
                    <div className="conversation-header">
                        <h1 className="header-title">새 대화</h1>
                        <div className="header-actions">
                            <button className="new-chat-button">
                                📝<span className="button-text">새 대화</span>
                            </button>
                            <button className="menu-button">
                                ☰
                            </button>
                        </div>
                    </div>
                    <div className="chat-window" ref={chatWindowRef}>
                        {/* LLM 메시지에만 추론 근거 버튼을 표시 */}
                        {messages.map((message, index) => (
                            <div key={index} className={`chat-bubble ${message.sender}`}>
                                <ReactMarkdown>{message.text}</ReactMarkdown>
                                {message.sender === 'LLM' && message.evidence && message.evidence.length > 0 && (
                                    <div className="evidence-section">
                                        <button 
                                            className="toggle-evidence-button" 
                                            onClick={() => handleToggleEvidence(index)}
                                        >
                                            추론 근거 표시 ({visibleEvidenceIndex === index ? '닫기' : '보기'})
                                        </button>
                                        {/* visibleEvidenceIndex가 현재 메시지의 인덱스와 같을 때만 근거를 표시 */}
                                        {visibleEvidenceIndex === index && (
                                            <div className="evidence-list">
                                                <h4>추론에 사용된 노드:</h4>
                                                {message.evidence.map((node, nodeIndex) => (
                                                    <div key={nodeIndex} className="evidence-node">
                                                        {/* 노드 ID와 타입은 항상 표시 */}
                                                        <p className="node-info">
                                                            <span className="node-type">{node.type}</span>: {node.node_id}
                                                        </p>
                                                        {/* 파일 경로가 존재할 때만 렌더링 */}
                                                        {node.file_path && (
                                                            <p className="evidence-filepath">
                                                                <span className="filepath-icon">📄</span>{node.file_path}
                                                            </p>
                                                        )}
                                                        {/* 코드 스니펫이 존재하고 내용이 있을 때만 렌더링 */}
                                                        {node.code_snippet && node.code_snippet.trim() ? (
                                                            <pre className="evidence-codeblock">
                                                                <code>{node.code_snippet}</code>
                                                            </pre>
                                                        ) : (
                                                            <p className="no-snippet-message">
                                                                이 노드에 대한 코드 스니펫을 찾을 수 없습니다.
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="chat-bubble LLM loading">
                                <div className="typing-indicator">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="input-container">
                        <div className="input-group">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="메시지를 입력하세요..."
                                disabled={isLoading}
                            />
                            <div className="input-actions">
                                <button className="mic-button">🎤</button>
                                <button onClick={handleSendMessage} disabled={isLoading} className="send-button">
                                    ✈️
                                </button>
                            </div>
                        </div>
                    </div>
                    {/* Mock Footer Status Bar */}
                    <div className="footer-status-bar">
                        <div className="status-message">
                            현재 연결 상태: <span className="status-dot online"></span> 온라인
                        </div>
                        <div className="footer-links">
                            <span>버전 1.0</span> | <span>피드백</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ConversationPage;
