// src/components/AnalysisPage.jsx

import React, { useState, useEffect } from 'react';
import '../css/analysisPage.css'; // 새로 만든 CSS 파일 임포트

function AnalysisPage({ projectRootPath, selectedPaths, onAnalysisComplete, onAnalysisError }) {
  const [status, setStatus] = useState('analyzing');
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const startAnalysisStream = async () => {
      setStatus('analyzing');
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
            project_root_path: projectRootPath,
            selected_paths: selectedPaths,
          }),
        });

        if (!response.ok || !response.body) {
          const errorData = await response.json().catch(() => ({ detail: "알 수 없는 오류" }));
          throw new Error(errorData.detail || `HTTP 오류: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        const readStream = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log('Stream finished.');
              if (status !== 'completed' && status !== 'error') {
                  setError("분석 스트림이 예상치 못하게 종료되었습니다. 모든 데이터가 전송되지 않았을 수 있습니다.");
                  onAnalysisError("분석 스트림이 예상치 못하게 종료되었습니다. 모든 데이터가 전송되지 않았을 수 있습니다.");
              }
              break; 
            }

            buffer += decoder.decode(value, { stream: true });

            let lastNewlineIndex;
            while ((lastNewlineIndex = buffer.indexOf('\n\n')) !== -1) {
              const messageChunk = buffer.substring(0, lastNewlineIndex);
              buffer = buffer.substring(lastNewlineIndex + 2);

              if (messageChunk.startsWith('data: ')) {
                  const message = messageChunk.substring(6);
                  try {
                      const data = JSON.parse(message);
                      
                      if (data.status === 'in_progress') {
                          setProgress(data.progress);
                          setCurrentFile(data.file_path);
                      } else if (data.status === 'completed') {
                          onAnalysisComplete(data.analysis_summary); 
                          setStatus('completed');
                          reader.cancel();
                          return;
                      } else if (data.status === 'error') {
                          const errorMessage = data.message || data.detail || "분석 중 오류 발생.";
                          setError(errorMessage);
                          setStatus('error');
                          onAnalysisError(errorMessage);
                          reader.cancel();
                          return;
                      }
                  } catch (e) {
                      console.error("Failed to parse JSON from stream message:", message, e);
                      const parseErrorMessage = "서버 응답 파싱 중 오류 발생.";
                      setError(parseErrorMessage);
                      setStatus('error');
                      onAnalysisError(parseErrorMessage);
                      reader.cancel();
                      return;
                  }
              }
            }
          }
        };
        readStream();

      } catch (err) {
        console.error("코드 분석 요청 중 오류 발생:", err);
        const requestErrorMessage = err.message || "알 수 없는 오류가 발생했습니다.";
        setError(requestErrorMessage);
        setStatus('error');
        onAnalysisError(requestErrorMessage);
      }
    };

    if (projectRootPath && selectedPaths.length > 0 && status === 'analyzing') {
        startAnalysisStream();
    }
  }, [projectRootPath, selectedPaths, onAnalysisComplete, onAnalysisError, status]);

  if (status === 'analyzing') {
    return (
      <div className="analysis-container analyzing-container">
        <h2 className="analysis-title">코드 분석 중 ({progress.toFixed(0)}%)</h2>
        <p className="analysis-subtitle">
          현재 분석 중인 파일: <strong className="current-file-path">{currentFile || '파일 로딩 중...'}</strong>
        </p>
        <div className="progress-bar-container">
          <div 
            className="progress-bar"
            style={{ width: `${progress}%` }}
          >
            {progress.toFixed(0)}%
          </div>
        </div>
        <p className="analysis-description">파일 분석 및 지식그래프 생성 중..</p>
        <div className="spinner"></div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="analysis-container error-container">
        <h2 style={{ color: '#cc0000' }}>오류 발생</h2>
        <p style={{ fontSize: '1.1em' }}>{error}</p>
        <button 
          onClick={() => onAnalysisError("재시도")} 
          className="error-button"
        >
          파일 재선택
        </button>
      </div>
    );
  }

  return null;
}

export default AnalysisPage;