// frontend/my-app/src/components/ProjectAnalysis.jsx

import React, { useState } from 'react';
import '../css/projectAnalysis.css';
import "../css/home.css";
import FileTreeVisualization from '../components/FileTreeVisualization';
import StatisticsCharts from '../components/StatisticsCharts';
import DependencyMap from '../components/DependencyMap';
import apiClient from '../config/apiClient';

const ProjectAnalysis = () => {
  const [projectPath, setProjectPath] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fileStructure, setFileStructure] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('tree'); // tree, charts, dependency
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  
  // 고급 옵션 상태
  const [includePatterns, setIncludePatterns] = useState(['*.py', '*.js', '*.jsx', '*.ts', '*.tsx', '*.java', '*.cpp', '*.c']);
  const [excludePatterns, setExcludePatterns] = useState(['__pycache__', 'node_modules', '.git', '.venv', 'venv', 'env']);

  const handleProjectPathChange = (e) => {
    setProjectPath(e.target.value);
  };

  const handleAnalyzeProject = async () => {
    if (!projectPath.trim()) {
      setError('프로젝트 경로를 입력해주세요.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setFileStructure(null);

    try {
      // 파일 스캔 API 사용
      const response = await fetch('http://localhost:8000/scan-project-path', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_path: projectPath,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setFileStructure(data.file_structure);
    } catch (err) {
      setError(`프로젝트 분석 중 오류가 발생했습니다: ${err.message}`);
      console.error('Project analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearAll = () => {
    setProjectPath('');
    setFileStructure(null);
    setError(null);
    setActiveTab('tree');
  };

  const addIncludePattern = () => {
    const newPattern = prompt('포함할 파일 패턴을 입력하세요 (예: *.py):');
    if (newPattern && !includePatterns.includes(newPattern)) {
      setIncludePatterns([...includePatterns, newPattern]);
    }
  };

  const removeIncludePattern = (index) => {
    setIncludePatterns(includePatterns.filter((_, i) => i !== index));
  };

  const addExcludePattern = () => {
    const newPattern = prompt('제외할 디렉토리/파일 패턴을 입력하세요:');
    if (newPattern && !excludePatterns.includes(newPattern)) {
      setExcludePatterns([...excludePatterns, newPattern]);
    }
  };

  const removeExcludePattern = (index) => {
    setExcludePatterns(excludePatterns.filter((_, i) => i !== index));
  };

  return (
    <div className="project-analysis-container">
      <div className="analysis-header">
        <h2>프로젝트 구조 시각화</h2>
        <p>경로 기반 파일 구조와 통계를 시각적으로 분석</p>
      </div>

      <div className="input-section">
        <div className="path-input-group">
          <label htmlFor="projectPath">프로젝트 경로:</label>
          <input
            id="projectPath"
            type="text"
            value={projectPath}
            onChange={handleProjectPathChange}
            placeholder="C:\Users\Username\Projects\my-project"
            className="project-path-input"
            disabled={isAnalyzing}
          />
        </div>

        <div className="advanced-options-toggle">
          <button
            type="button"
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            className="toggle-button"
          >
            {showAdvancedOptions ? '▼' : '▶'} 고급 옵션
          </button>
        </div>

        {showAdvancedOptions && (
          <div className="advanced-options">
            <div className="option-group">
              <label>포함할 파일 패턴:</label>
              <div className="pattern-list">
                {includePatterns.map((pattern, index) => (
                  <div key={index} className="pattern-item">
                    <span>{pattern}</span>
                    <button
                      onClick={() => removeIncludePattern(index)}
                      className="remove-pattern"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button onClick={addIncludePattern} className="add-pattern">
                  + 패턴 추가
                </button>
              </div>
            </div>

            <div className="option-group">
              <label>제외할 패턴:</label>
              <div className="pattern-list">
                {excludePatterns.map((pattern, index) => (
                  <div key={index} className="pattern-item">
                    <span>{pattern}</span>
                    <button
                      onClick={() => removeExcludePattern(index)}
                      className="remove-pattern"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button onClick={addExcludePattern} className="add-pattern">
                  + 패턴 추가
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="action-buttons">
          <button
            onClick={handleAnalyzeProject}
            disabled={isAnalyzing || !projectPath.trim()}
            className="analyze-button"
          >
            {isAnalyzing ? '🔄 분석 중...' : '프로젝트 분석'}
          </button>
          <button onClick={clearAll} className="clear-button">
            초기화
          </button>
        </div>
      </div>

      {error && (
        <div className="error-section">
          <h3>❌ 오류</h3>
          <p className="error-message">{error}</p>
        </div>
      )}

      {fileStructure && (
        <div className="visualization-section">
          <div className="tab-navigation">
            <button
              className={`tab-button ${activeTab === 'tree' ? 'active' : ''}`}
              onClick={() => setActiveTab('tree')}
            >
              📁 파일 구조
            </button>
            <button
              className={`tab-button ${activeTab === 'charts' ? 'active' : ''}`}
              onClick={() => setActiveTab('charts')}
            >
              📊 통계 차트
            </button>
            <button
              className={`tab-button ${activeTab === 'dependency' ? 'active' : ''}`}
              onClick={() => setActiveTab('dependency')}
            >
              🔗 의존성 맵
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'tree' && (
              <FileTreeVisualization fileStructure={fileStructure} />
            )}
            
            {activeTab === 'charts' && (
              <StatisticsCharts fileStructure={fileStructure} />
            )}
            
            {activeTab === 'dependency' && (
              <DependencyMap fileStructure={fileStructure} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectAnalysis;




