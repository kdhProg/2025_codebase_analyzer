// src/components/AnalysisPage.jsx

import React, { useState, useEffect } from 'react';
import apiClient from '../config/apiClient';

// props로 projectRootPath, selectedPaths, onAnalysisComplete, onAnalysisError를 받습니다.
function AnalysisPage({ projectRootPath, selectedPaths, onAnalysisComplete, onAnalysisError }) {
  // 컴포넌트 내부 상태는 분석 진행 상황과 오류만을 다룹니다.
  const [status, setStatus] = useState('analyzing'); // 이 컴포넌트가 렌더링되면 바로 분석 시작
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    // AnalysisPage가 마운트되거나, 필요한 props가 변경될 때 분석 스트림을 시작합니다.
    const startAnalysisStream = async () => {
      setStatus('analyzing'); // 분석 시작 상태로 설정
      setProgress(0);
      setCurrentFile('');
      setError(null);

      try {
        const response = await fetch('http://localhost:8000/analyze/analyze-selected-code-stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            project_root_path: projectRootPath, // Home.jsx로부터 받은 props 사용
            selected_paths: selectedPaths,     // Home.jsx로부터 받은 props 사용
          }),
        });

        // HTTP 응답이 비정상이거나 body가 없는 경우 처리
        if (!response.ok || !response.body) {
          const errorData = await response.json().catch(() => ({ detail: "알 수 없는 오류" }));
          throw new Error(errorData.detail || `HTTP 오류: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = ''; // 불완전한 SSE 메시지 조각을 위한 버퍼

        const readStream = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log('Stream finished.');
              // 스트림이 완료되었지만 'completed' 또는 'error' 메시지를 받지 못했다면,
              // 이는 예상치 못한 종료이므로 오류로 처리합니다.
              if (status !== 'completed' && status !== 'error') {
                  setError("분석 스트림이 예상치 못하게 종료되었습니다. 모든 데이터가 전송되지 않았을 수 있습니다.");
                  onAnalysisError("분석 스트림이 예상치 못하게 종료되었습니다. 모든 데이터가 전송되지 않았을 수 있습니다."); // 상위 컴포넌트에 오류 알림
              }
              break; 
            }

            buffer += decoder.decode(value, { stream: true }); // 스트림 모드로 디코딩하여 버퍼에 추가

            // 완전한 SSE 메시지 블록(data: ...\n\n)을 찾아서 처리
            let lastNewlineIndex;
            while ((lastNewlineIndex = buffer.indexOf('\n\n')) !== -1) {
              const messageChunk = buffer.substring(0, lastNewlineIndex);
              buffer = buffer.substring(lastNewlineIndex + 2); // 처리된 메시지 이후부터 버퍼 갱신

              if (messageChunk.startsWith('data: ')) {
                  const message = messageChunk.substring(6); // 'data: ' 접두어 제거
                  try {
                      const data = JSON.parse(message); // JSON 파싱
                      
                      if (data.status === 'in_progress') {
                          setProgress(data.progress);
                          setCurrentFile(data.file_path);
                      } else if (data.status === 'completed') {
                          // 분석 완료 시, 최종 분석 요약 데이터를 상위 컴포넌트로 전달
                          onAnalysisComplete(data.analysis_summary); 
                          setStatus('completed'); // 컴포넌트 내부 상태를 완료로
                          reader.cancel(); // 스트림 중단
                          return; // 함수 종료
                      } else if (data.status === 'error') {
                          // 오류 발생 시, 오류 메시지를 상위 컴포넌트로 전달
                          const errorMessage = data.message || data.detail || "분석 중 오류 발생.";
                          setError(errorMessage);
                          setStatus('error'); // 컴포넌트 내부 상태를 에러로
                          onAnalysisError(errorMessage); // 상위 컴포넌트에 오류 알림
                          reader.cancel(); // 스트림 중단
                          return; // 함수 종료
                      }
                  } catch (e) {
                      console.error("Failed to parse JSON from stream message:", message, e);
                      const parseErrorMessage = "서버 응답 파싱 중 오류 발생.";
                      setError(parseErrorMessage);
                      setStatus('error');
                      onAnalysisError(parseErrorMessage); // 상위 컴포넌트에 파싱 오류 알림
                      reader.cancel();
                      return;
                  }
              }
            }
          }
        };
        readStream(); // 스트림 읽기 시작

      } catch (err) {
        console.error("코드 분석 요청 중 오류 발생:", err);
        const requestErrorMessage = err.message || "알 수 없는 오류가 발생했습니다.";
        setError(requestErrorMessage);
        setStatus('error');
        onAnalysisError(requestErrorMessage); // 상위 컴포넌트에 요청 오류 알림
      }
    };

    // 컴포넌트가 마운트되거나, projectRootPath나 selectedPaths가 변경될 때만 분석 시작
    // status가 'analyzing'일 때만 이 effect를 재실행하도록 하여 불필요한 재요청 방지
    if (projectRootPath && selectedPaths.length > 0 && status === 'analyzing') {
        startAnalysisStream();
    }
  }, [projectRootPath, selectedPaths, onAnalysisComplete, onAnalysisError, status]); 
  // status를 의존성 배열에 추가하여 startAnalysisStream 내부에서 상태가 변경될 때 effect가 다시 실행되지 않도록 방지

  // --- 렌더링 로직 ---

  if (status === 'analyzing') {
    return (
      <div style={{ textAlign: 'center', padding: '50px', background: '#f0f2f5', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <h2 style={{ color: '#333' }}>코드 분석 중... ({progress.toFixed(0)}%)</h2>
        <p style={{ color: '#555', fontSize: '1.1em' }}>현재 분석 중인 파일: <strong style={{ color: '#007bff' }}>{currentFile || '파일 로딩 중...'}</strong></p>
        <div style={{ width: '80%', maxWidth: '600px', height: '25px', backgroundColor: '#e0e0e0', margin: '20px auto', borderRadius: '12px', overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)' }}>
          <div style={{ 
            width: `${progress}%`, 
            height: '100%', 
            backgroundColor: '#4CAF50', 
            transition: 'width 0.5s ease-out', 
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingRight: '10px',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '0.9em'
          }}>
            {progress.toFixed(0)}%
          </div>
        </div>
        <p style={{ color: '#777' }}>선택된 파일을 분석하고 지식 그래프를 생성하고 있습니다. 잠시만 기다려 주세요.</p>
        <div style={{ border: '4px solid rgba(0, 0, 0, 0.1)', width: '36px', height: '36px', borderRadius: '50%', borderLeftColor: '#007bff', animation: 'spin 1s linear infinite', marginTop: '20px' }}></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{ textAlign: 'center', padding: '50px', color: 'red', background: '#fff3f3', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <h2 style={{ color: '#cc0000' }}>오류 발생!</h2>
        <p style={{ fontSize: '1.1em' }}>{error}</p>
        {/* 오류 시 상위 컴포넌트가 다시 파일 선택 단계로 돌아가도록 알리는 버튼 */}
        <button 
          onClick={() => onAnalysisError("사용자 요청으로 다시 시도합니다.")} 
          style={{ 
            marginTop: '20px', 
            padding: '10px 20px', 
            fontSize: '16px', 
            backgroundColor: '#dc3545', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px', 
            cursor: 'pointer', 
            transition: 'background-color 0.3s' 
          }}
        >
          파일 재선택
        </button>
      </div>
    );
  }

  // 분석 완료 (status === 'completed') 상태이거나 초기 로딩 중에는
  // 이 컴포넌트 자체는 아무것도 렌더링하지 않습니다.
  // Home.jsx가 AnalysisPage의 완료/오류 콜백을 받아 다음 단계를 렌더링할 것입니다.
  return null; 
}

export default AnalysisPage;