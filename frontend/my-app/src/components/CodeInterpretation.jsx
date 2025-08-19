import React, { useState } from 'react';
import '../css/codeInterpretation.css';

const CodeInterpretation = () => {
  const [codeInput, setCodeInput] = useState('');
  const [language, setLanguage] = useState('python');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleCodeChange = (e) => {
    setCodeInput(e.target.value);
  };

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
  };

  const interpretCode = async () => {
    if (!codeInput.trim()) {
      setError('Please enter the code.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('http://localhost:8000/interpret-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code_content: codeInput,
          language: language,
          context: null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(`An error occurred while interpreting the code: ${err.message}`);
      console.error('Code interpretation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearAll = () => {
    setCodeInput('');
    setResult(null);
    setError(null);
  };

  const formatCodeStructure = (structure) => {
    if (!structure || structure.error) {
      return <p className="error-text">Structure analysis failed: {structure?.error}</p>;
    }

    return (
      <div className="structure-info">
        <h4>📊 Code Structure</h4>
        <div className="structure-stats">
          <span className="stat-item">Functions: {structure.functions?.length || 0}</span>
          <span className="stat-item">Classes: {structure.classes?.length || 0}</span>
          <span className="stat-item">Variables: {structure.variables?.length || 0}</span>
          <span className="stat-item">Imports: {structure.imports?.length || 0}</span>
        </div>
        
        {structure.functions && structure.functions.length > 0 && (
          <div className="entity-list">
            <h5>🔧 Functions:</h5>
            <ul>
              {structure.functions.slice(0, 5).map((func, index) => (
                <li key={index}>
                  <code>{func.name || 'Unknown'}</code>
                  {func.line_number && <span className="line-info"> (line {func.line_number})</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {structure.classes && structure.classes.length > 0 && (
          <div className="entity-list">
            <h5>📦 Classes:</h5>
            <ul>
              {structure.classes.slice(0, 5).map((cls, index) => (
                <li key={index}>
                  <code>{cls.name || 'Unknown'}</code>
                  {cls.line_number && <span className="line-info"> (line {cls.line_number})</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="code-interpretation-container">
      <div className="interpretation-header">
        <h2>Code Interpretation</h2>
      </div>

      <div className="input-section">
        <div className="input-controls">
          <select 
            value={language} 
            onChange={handleLanguageChange}
            className="language-selector"
          >
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
          </select>
          <button 
            onClick={interpretCode} 
            disabled={isLoading || !codeInput.trim()}
            className="interpret-button"
          >
            {isLoading ? '🔄 Analyzing...' : '🚀 Interpret Code'}
          </button>
          <button 
            onClick={clearAll}
            className="clear-button"
          >
            🗑️ Clear
          </button>
        </div>

        <textarea
          value={codeInput}
          onChange={handleCodeChange}
          placeholder={`${language === 'python' ? 'def hello_world():\n    print("Hello, World!")' : 
                        language === 'javascript' ? 'function helloWorld() {\n    console.log("Hello, World!");\n}' :
                        'Enter your code here...'}`}
          className="code-input"
          rows={12}
        />
      </div>

      {error && (
        <div className="error-section">
          <h3>❌ Error</h3>
          <p className="error-message">{error}</p>
        </div>
      )}

      {result && (
        <div className="results-section">
          <h3>Analysis Results</h3>
          
          {/* Interpretation Result */}
          <div className="interpretation-result">
            <h4>Code Interpretation</h4>
            <div className="interpretation-content">
              {result.interpretation.split('\n').map((line, index) => {
                if (line.startsWith('##')) {
                  return <h3 key={index} className="section-title">{line.replace('## ', '')}</h3>;
                } else if (line.startsWith('###')) {
                  return <h4 key={index} className="subsection-title">{line.replace('### ', '')}</h4>;
                } else if (line.startsWith('-')) {
                  return <li key={index} className="list-item">{line.replace('- ', '')}</li>;
                } else if (line.trim()) {
                  return <p key={index} className="interpretation-text">{line}</p>;
                }
                return <br key={index} />;
              })}
            </div>
          </div>

          {/* Code Structure */}
          {/* {formatCodeStructure(result.code_structure)} */}

          {/* Similar Code Examples */}
          {/* {result.similar_code_examples && result.similar_code_examples.length > 0 && (
            <div className="similar-code-section">
              <h4>🔗 Similar Code Patterns</h4>
              <div className="similar-code-list">
                {result.similar_code_examples.map((example, index) => (
                  <div key={index} className="similar-code-item">
                    <div className="similarity-header">
                      <span className="code-name">{example.name}</span>
                      <span className="similarity-score">
                        Similarity: {(example.similarity_score * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="code-details">
                      <span className="code-type">Type: {example.code_type?.join(', ') || 'Unknown'}</span>
                      <span className="file-path">File: {example.file_path}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )} */}

          {/* Suggestions */}
          {result.suggestions && result.suggestions.length > 0 && (
            <div className="suggestions-section">
              <h4>💡 Suggestions</h4>
              <ul className="suggestions-list">
                {result.suggestions.map((suggestion, index) => (
                  <li key={index} className="suggestion-item">
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CodeInterpretation;
