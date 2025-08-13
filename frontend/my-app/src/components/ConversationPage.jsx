// ConversationPage.jsx
import React, { useState, useEffect, useRef } from 'react';
// axios 인스턴스를 임포트합니다. 이 파일은 프로젝트 루트나 api 디렉토리에 정의되어 있습니다.
// 예: import apiClient from '../api/apiClient';
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
    // axios를 사용하여 POST 요청을 보냅니다.
    // apiClient는 이미 'http://localhost:8000'과 같은 기본 URL이 설정되어 있다고 가정합니다.
    const response = await apiClient.post('/semantic-search', {
      query: query,
      top_k: 5
    });
    // axios는 응답 데이터를 response.data에 담아 반환합니다.
    return response.data;
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
      const searchResults = await searchSemanticAPI(newUserMessage.text);

      let newLLMMessage;

      if (searchResults && searchResults.length > 0) {
        // 가장 점수가 높은 첫 번째 결과를 가져옵니다.
        const topResult = searchResults[0];

        // LLM 응답 메시지 생성
        newLLMMessage = {
          sender: 'LLM',
          text: '다음은 귀하의 질문과 가장 관련성이 높은 코드 스니펫입니다.',
          evidence: {
            title: `코드 스니펫: ${topResult.file_path} (점수: ${topResult.score.toFixed(2)})`,
            snippet: topResult.code_snippet
          }
        };
      } else {
        // 검색 결과가 없는 경우
        newLLMMessage = {
          sender: 'LLM',
          text: '죄송합니다. 프로젝트에서 해당 질문과 관련된 코드 스니펫을 찾지 못했습니다.'
        };
      }

      setMessages(prevMessages => [...prevMessages, newLLMMessage]);
    } catch (error) {
      console.error("API 호출 중 오류 발생:", error);
      // axios 에러는 error.response.data에 상세 정보가 있을 수 있습니다.
      const errorMessage = {
        sender: 'LLM',
        text: `오류가 발생했습니다: ${error.message}. 다시 시도해 주세요.`
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
