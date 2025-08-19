// src/components/ConversationPage.jsx
import React, { useState, useEffect, useRef } from 'react';
// Import axios instance
import apiClient from '../config/apiClient';
import '../css/ConversationPage.css';
import ReactMarkdown from 'react-markdown';

// ConversationPage Component
function ConversationPage({ analysisSummary }) {
    const [messages, setMessages] = useState([]); // Chat messages
    const [input, setInput] = useState(''); // User input text
    const [isLoading, setIsLoading] = useState(false); // API loading state
    const chatWindowRef = useRef(null); // Ref for scrolling chat window
    const [visibleEvidenceIndex, setVisibleEvidenceIndex] = useState(null);

    // On mount, set initial message if analysis summary exists
    useEffect(() => {
        if (analysisSummary) {
            const initialLLMMessage = {
                sender: 'LLM',
                text: `Hello! The analysis is complete.`
            };
            setMessages([initialLLMMessage]);
        }
    }, [analysisSummary]);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        if (chatWindowRef.current) {
            chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
        }
    }, [messages]);

    // Semantic search API
    const searchSemanticAPI = async (query) => {
        try {
            const response = await apiClient.post('/semantic-search', {
                query: query,
                top_k: 10
            });
            return response.data; // The response is a string from LLM
        } catch (error) {
            console.error("Error while calling API:", error);
            throw error;
        }
    };

    const handleToggleEvidence = (index) => {
        setVisibleEvidenceIndex(prevIndex => prevIndex === index ? null : index);
    };

    // Message send handler
    const handleSendMessage = async () => {
        if (input.trim() === '') return; // Do not send if input is empty

        const newUserMessage = { sender: 'user', text: input };
        setMessages(prevMessages => [...prevMessages, newUserMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const llmResponse = await searchSemanticAPI(newUserMessage.text);

            const newLLMMessage = {
                sender: 'LLM',
                text: llmResponse.text,
                evidence: llmResponse.evidence
            };

            setMessages(prevMessages => [...prevMessages, newLLMMessage]);
        } catch (error) {
            console.error("Error while calling API:", error);
            const errorMessage = {
                sender: 'LLM',
                text: `An error occurred. Please try again.`
            };
            setMessages(prevMessages => [...prevMessages, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    // Send message when pressing Enter
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
                                User
                            </span>
                        </div>
                    </div>
                    <nav className="sidebar-nav">
                        <ul>
                            <li className="nav-item active">🏠 Dashboard</li>
                            <li className="nav-item">💬 Conversations</li>
                            <li className="nav-item">⚙️ Settings</li>
                            <li className="nav-item">❓ Help</li>
                        </ul>
                    </nav>
                    <div className="sidebar-footer">
                        <div className="status-indicator online"></div>
                        <span className="status-text">Online</span>
                        <div className="logout-button">
                            ➡️
                        </div>
                    </div>
                </div>
                {/* Main chat area */}
                <div className="chat-main">
                    <div className="conversation-header">
                        <h1 className="header-title">New Conversation</h1>
                        <div className="header-actions">
                            <button className="new-chat-button">
                                📝<span className="button-text">New Chat</span>
                            </button>
                            <button className="menu-button">
                                ☰
                            </button>
                        </div>
                    </div>
                    <div className="chat-window" ref={chatWindowRef}>
                        {/* Show evidence toggle button only for LLM messages */}
                        {messages.map((message, index) => (
                            <div key={index} className={`chat-bubble ${message.sender}`}>
                                <ReactMarkdown>{message.text}</ReactMarkdown>
                                {message.sender === 'LLM' && message.evidence && message.evidence.length > 0 && (
                                    <div className="evidence-section">
                                        <button 
                                            className="toggle-evidence-button" 
                                            onClick={() => handleToggleEvidence(index)}
                                        >
                                            Show Evidence ({visibleEvidenceIndex === index ? 'Close' : 'View'})
                                        </button>
                                        {/* Show evidence only if index matches */}
                                        {visibleEvidenceIndex === index && (
                                            <div className="evidence-list">
                                                <h4>Nodes used for reasoning:</h4>
                                                {message.evidence.map((node, nodeIndex) => (
                                                    <div key={nodeIndex} className="evidence-node">
                                                        {/* Always show node type and id */}
                                                        <p className="node-info">
                                                            <span className="node-type">{node.type}</span>: {node.node_id}
                                                        </p>
                                                        {/* Render file path only if exists */}
                                                        {node.file_path && (
                                                            <p className="evidence-filepath">
                                                                <span className="filepath-icon">📄</span>{node.file_path}
                                                            </p>
                                                        )}
                                                        {/* Render code snippet if exists and not empty */}
                                                        {node.code_snippet && node.code_snippet.trim() ? (
                                                            <pre className="evidence-codeblock">
                                                                <code>{node.code_snippet}</code>
                                                            </pre>
                                                        ) : (
                                                            <p className="no-snippet-message">
                                                                No code snippet found for this node.
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
                                placeholder="Type a message..."
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
                            Connection status: <span className="status-dot online"></span> Online
                        </div>
                        <div className="footer-links">
                            <span>Version 1.0</span> | <span>Feedback</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ConversationPage;
