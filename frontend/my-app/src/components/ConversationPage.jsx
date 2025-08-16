// ConversationPage.jsx (수정된 버전)

import React, { useState, useEffect, useRef } from 'react';
// axios 인스턴스를 임포트합니다.
import apiClient from '../config/apiClient'; 
import '../css/ConversationPage.css';

// ConversationPage 컴포넌트
function ConversationPage({ analysisSummary }) {
  const [messages, setMessages] = useState([]); // 채팅 메시지 목록
  const [input, setInput] = useState(''); // 사용자 입력 텍스트
  const [isLoading, setIsLoading] = useState(false); // API 호출 로딩 상태
  const chatWindowRef = useRef(null); // 채팅창 스크롤을 위한 Ref

  // 컴포넌트가 마운트될 때, 초기 질문과 LLM 응답을 설정합니다.
  useEffect(() => {
    // 분석 결과가 있다면, 초기 메시지를 생성
    if (analysisSummary) {
      // LLM의 첫 번째 응답 (임의로 생성)
      const initialLLMMessage = {
        sender: 'LLM',
        text: `안녕하세요! 분석이 완료되었습니다. 프로젝트의 총 파일 수는 ${analysisSummary.total_files}개이며, 주요 언어는 ${analysisSummary.main_language}입니다. 무엇을 도와드릴까요?`,
        evidence: analysisSummary.analysis_results && analysisSummary.analysis_results.length > 0
          ? {
              title: "분석 요약",
              snippet: JSON.stringify(analysisSummary.analysis_results[0], null, 2)
            }
          : null
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
      const llmResponseText = await searchSemanticAPI(newUserMessage.text);

      // LLM 응답 메시지를 생성하고, 받은 텍스트를 그대로 사용합니다.
      const newLLMMessage = {
        sender: 'LLM',
        text: llmResponseText, // 백엔드에서 받은 문자열을 그대로 사용
        evidence: null // 더 이상 증거 코드를 백엔드에서 받지 않으므로 null로 설정
      };

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
    <div className="conversation-container">
      <div className="conversation-header">
        <h1>코드베이스 문답</h1>
      </div>
      <div className="chat-window" ref={chatWindowRef}>
        {messages.map((message, index) => (
          <div key={index} className={`chat-bubble ${message.sender}`}>
            <p>{message.text}</p>
            {message.evidence && (
              <div className="evidence-box">
                <h4>{message.evidence.title}</h4>
                <pre>{message.evidence.snippet}</pre>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="chat-bubble llm loading">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
      </div>
      <div className="input-container">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="질문 입력"
          disabled={isLoading}
        />
        <button onClick={handleSendMessage} disabled={isLoading}>
          전송
        </button>
      </div>
    </div>
  );
}

export default ConversationPage;
