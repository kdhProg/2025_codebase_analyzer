// src/components/AnalysisPage.jsx

import React, { useState, useEffect } from 'react';
import '../css/analysisPage.css';

function AnalysisPage({ projectRootPath, selectedPaths, onAnalysisComplete, onAnalysisError }) {
  const [stage, setStage] = useState('File Analysis and DB Save');
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    // Stop execution if project path or selected files are missing
    if (!projectRootPath || selectedPaths.length === 0) {
      return;
    }

    // Track whether component is mounted
    let isMounted = true;

    // Create AbortController to cancel request if needed
    const controller = new AbortController();
    const signal = controller.signal;

    const startAnalysisStream = async () => {
      // Reset states when analysis starts
      if (isMounted) {
        setStage('File Analysis and DB Save');
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
          signal,
        });

        if (!response.ok || !response.body) {
          const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
          throw new Error(errorData.detail || `HTTP error: ${response.status}`);
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
                  setError("Analysis stream unexpectedly terminated.");
                  onAnalysisError("Analysis stream unexpectedly terminated.");
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
                          setStage('File Analysis and DB Save');
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
                        const errorMessage = data.message || "Error occurred during analysis.";
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
                        const parseErrorMessage = "Error occurred while parsing server response.";
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
        console.error("Error occurred during code analysis request:", err);
        if (err.name !== 'AbortError' && isMounted) {
            const requestErrorMessage = err.message || "An unknown error occurred.";
            setError(requestErrorMessage);
            setStage('error');
            onAnalysisError(requestErrorMessage);
        }
      }
    };
    
    startAnalysisStream();

    // Cleanup when component unmounts or dependencies change
    return () => {
      console.log('useEffect cleanup: Aborting fetch request.');
      isMounted = false;
      controller.abort();
    };
  }, [projectRootPath, selectedPaths, onAnalysisComplete, onAnalysisError]);
  
  if (error) {
    return (
      <div className="analysis-container error-container">
        <h2 style={{ color: '#cc0000' }}>Error Occurred</h2>
        <p style={{ fontSize: '1.1em' }}>{error}</p>
        <button
          onClick={() => onAnalysisError("Retry")}
          className="error-button"
        >
          Re-select Files
        </button>
      </div>
    );
  }

  if (stage === 'completed') {
    return null;
  }

  return (
    <div className="analysis-container analyzing-container">
      <h2 className="analysis-title">Code Analysis in Progress</h2>
      <div className="stage-info">
        <p>Current Stage: <strong>{stage}</strong></p>
      </div>
      <p className="analysis-subtitle">
        {stage === 'File Analysis and DB Save' && (
          <>Currently analyzing file: <strong className="current-file-path">{currentFile || 'Loading file...'}</strong></>
        )}
        {stage !== 'File Analysis and DB Save' && (
          <strong className="current-file-path">AI model is processing the code.</strong>
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
        {stage === 'File Analysis and DB Save' ? 'Parsing files and generating knowledge graph...' : 'Generating and saving embeddings...'}
      </p>
      <div className="spinner"></div>
    </div>
  );
}

export default AnalysisPage;
