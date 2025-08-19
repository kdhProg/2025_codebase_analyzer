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
  
  // Advanced option state
  const [includePatterns, setIncludePatterns] = useState(['*.py', '*.js', '*.jsx', '*.ts', '*.tsx', '*.java', '*.cpp', '*.c']);
  const [excludePatterns, setExcludePatterns] = useState(['__pycache__', 'node_modules', '.git', '.venv', 'venv', 'env']);

  const handleProjectPathChange = (e) => {
    setProjectPath(e.target.value);
  };

  const handleAnalyzeProject = async () => {
    if (!projectPath.trim()) {
      setError('Please enter the project path.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setFileStructure(null);

    try {
      // Use file scan API
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
      setError(`An error occurred during project analysis: ${err.message}`);
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
    const newPattern = prompt('Enter the file pattern to include (e.g., *.py):');
    if (newPattern && !includePatterns.includes(newPattern)) {
      setIncludePatterns([...includePatterns, newPattern]);
    }
  };

  const removeIncludePattern = (index) => {
    setIncludePatterns(includePatterns.filter((_, i) => i !== index));
  };

  const addExcludePattern = () => {
    const newPattern = prompt('Enter the directory/file pattern to exclude:');
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
        <h2>Project Structure Visualization</h2>
        <p>Visually analyze path-based file structures and statistics</p>
      </div>

      <div className="input-section">
        <div className="path-input-group">
          <label htmlFor="projectPath">Project Path:</label>
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
            {showAdvancedOptions ? '▼' : '▶'} Advanced Options
          </button>
        </div>

        {showAdvancedOptions && (
          <div className="advanced-options">
            <div className="option-group">
              <label>File patterns to include:</label>
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
                  + Add Pattern
                </button>
              </div>
            </div>

            <div className="option-group">
              <label>Patterns to exclude:</label>
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
                  + Add Pattern
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
            {isAnalyzing ? '🔄 Analyzing...' : 'Analyze Project'}
          </button>
          <button onClick={clearAll} className="clear-button">
            Reset
          </button>
        </div>
      </div>

      {error && (
        <div className="error-section">
          <h3>❌ Error</h3>
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
              📁 File Structure
            </button>
            <button
              className={`tab-button ${activeTab === 'charts' ? 'active' : ''}`}
              onClick={() => setActiveTab('charts')}
            >
              📊 Statistics Charts
            </button>
            <button
              className={`tab-button ${activeTab === 'dependency' ? 'active' : ''}`}
              onClick={() => setActiveTab('dependency')}
            >
              🔗 Dependency Map
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
