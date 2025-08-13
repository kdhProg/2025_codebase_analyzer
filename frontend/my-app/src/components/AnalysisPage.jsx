// src/components/AnalysisPage.jsx

import React, { useState, useEffect } from 'react';
import '../css/analysisPage.css';

function AnalysisPage({ projectRootPath, selectedPaths, onAnalysisComplete, onAnalysisError }) {
  const [stage, setStage] = useState('파일 분석 및 DB 저장');
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    // 프로젝트 경로와 선택된 파일 목록이 없으면 함수 실행을 중단
    if (!projectRootPath || selectedPaths.length === 0) {
      return;
    }

    // 컴포넌트가 마운트되어 있는지 추적하는 플래그
    let isMounted = true;

    // AbortController를 생성하여 요청을 취소할 수 있게 합니다.
    const controller = new AbortController();
    const signal = controller.signal;

    const startAnalysisStream = async () => {
      // 분석이 시작될 때 상태를 초기화합니다.
      if (isMounted) {
        setStage('파일 분석 및 DB 저장');
        setProgress(0);
        setCurrentFile('');
        setError(null);
      }

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
          signal, // AbortController의 signal을 fetch 요청에 전달
        });

        if (!response.ok || !response.body) {
          const errorData = await response.json().catch(() => ({ detail: "알 수 없는 오류" }));
          throw new Error(errorData.detail || `HTTP 오류: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        const readStream = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();

              if (!isMounted || signal.aborted) {
                reader.cancel();
                return;
              }

              if (done) {
                console.log('Stream finished.');
                if (isMounted && stage !== 'completed' && stage !== 'error') {
                  setError("분석 스트림이 예상치 못하게 종료되었습니다.");
                  onAnalysisError("분석 스트림이 예상치 못하게 종료되었습니다.");
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
                    
                    if (isMounted) {
                      if (data.status === 'in_progress') {
                        if (data.file_path) {
                          setStage('파일 분석 및 DB 저장');
                          setProgress(data.progress);
                          setCurrentFile(data.file_path);
                        } else if (data.stage) {
                          setStage(data.stage);
                          setProgress(data.progress);
                          setCurrentFile('');
                        }
                      } else if (data.status === 'completed') {
                        setStage('completed');
                        onAnalysisComplete(data.analysis_summary); 
                        reader.cancel();
                        return;
                      } else if (data.status === 'error') {
                        const errorMessage = data.message || "분석 중 오류 발생.";
                        setError(errorMessage);
                        setStage('error');
                        onAnalysisError(errorMessage);
                        reader.cancel();
                        return;
                      }
                    }
                  } catch (e) {
                    console.error("Failed to parse JSON from stream message:", message, e);
                    if (isMounted) {
                        const parseErrorMessage = "서버 응답 파싱 중 오류 발생.";
                        setError(parseErrorMessage);
                        setStage('error');
                        onAnalysisError(parseErrorMessage);
                    }
                    reader.cancel();
                    return;
                  }
                }
              }
            }
          } catch (err) {
            if (err.name === 'AbortError') {
              console.log('Fetch request was aborted during cleanup.');
            } else if (isMounted) {
              throw err;
            }
          }
        };
        readStream();

      } catch (err) {
        console.error("코드 분석 요청 중 오류 발생:", err);
        if (err.name !== 'AbortError' && isMounted) {
            const requestErrorMessage = err.message || "알 수 없는 오류가 발생했습니다.";
            setError(requestErrorMessage);
            setStage('error');
            onAnalysisError(requestErrorMessage);
        }
      }
    };
    
    startAnalysisStream();

    // 클린업 함수: 컴포넌트가 언마운트되거나 의존성 배열이 변경될 때 호출됩니다.
    return () => {
      console.log('useEffect cleanup: Aborting fetch request.');
      isMounted = false; // 플래그를 false로 설정하여 상태 업데이트를 막습니다.
      controller.abort();
    };
  }, [projectRootPath, selectedPaths, onAnalysisComplete, onAnalysisError]); // 'stage' 의존성을 제거
  
  if (error) {
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

  if (stage === 'completed') {
    return null;
  }

  return (
    <div className="analysis-container analyzing-container">
      <h2 className="analysis-title">코드 분석 중</h2>
      <div className="stage-info">
        <p>현재 단계: <strong>{stage}</strong></p>
      </div>
      <p className="analysis-subtitle">
        {stage === '파일 분석 및 DB 저장' && (
          <>현재 분석 중인 파일: <strong className="current-file-path">{currentFile || '파일 로딩 중...'}</strong></>
        )}
        {stage !== '파일 분석 및 DB 저장' && (
          <strong className="current-file-path">AI 모델이 코드를 처리하고 있습니다.</strong>
        )}
      </p>
      <div className="progress-bar-container">
        <div 
          className="progress-bar"
          style={{ width: `${progress}%` }}
        >
          {progress.toFixed(0)}%
        </div>
      </div>
      <p className="analysis-description">
        {stage === '파일 분석 및 DB 저장' ? '파일을 파싱하고 지식 그래프를 생성 중...' : '임베딩을 생성하고 저장 중...'}
      </p>
      <div className="spinner"></div>
    </div>
  );
}

export default AnalysisPage;
