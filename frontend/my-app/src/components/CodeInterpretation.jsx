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
      setError('코드를 입력해주세요.');
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
      setError(`코드 해석 중 오류가 발생했습니다: ${err.message}`);
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
      return <p className="error-text">구조 분석 실패: {structure?.error}</p>;
    }

    return (
      <div className="structure-info">
        <h4>📊 코드 구조</h4>
        <div className="structure-stats">
          <span className="stat-item">함수: {structure.functions?.length || 0}개</span>
          <span className="stat-item">클래스: {structure.classes?.length || 0}개</span>
          <span className="stat-item">변수: {structure.variables?.length || 0}개</span>
          <span className="stat-item">임포트: {structure.imports?.length || 0}개</span>
        </div>
        
        {structure.functions && structure.functions.length > 0 && (
          <div className="entity-list">
            <h5>🔧 함수들:</h5>
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
            <h5>📦 클래스들:</h5>
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
        <h2>🔍 코드 해석기</h2>
        <p>코드를 입력하면 AI가 분석하고 해석해드립니다</p>
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
            {isLoading ? '🔄 분석 중...' : '🚀 코드 해석'}
          </button>
          <button 
            onClick={clearAll}
            className="clear-button"
          >
            🗑️ 초기화
          </button>
        </div>

        <textarea
          value={codeInput}
          onChange={handleCodeChange}
          placeholder={`${language === 'python' ? 'def hello_world():\n    print("Hello, World!")' : 
                        language === 'javascript' ? 'function helloWorld() {\n    console.log("Hello, World!");\n}' :
                        '여기에 코드를 입력하세요...'}`}
          className="code-input"
          rows={12}
        />
      </div>

      {error && (
        <div className="error-section">
          <h3>❌ 오류</h3>
          <p className="error-message">{error}</p>
        </div>
      )}

      {result && (
        <div className="results-section">
          <h3>✅ 분석 결과</h3>
          
          {/* 해석 결과 */}
          <div className="interpretation-result">
            <h4>📝 코드 해석</h4>
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

          {/* 코드 구조 */}
          {formatCodeStructure(result.code_structure)}

          {/* 유사한 코드 예제 */}
          {result.similar_code_examples && result.similar_code_examples.length > 0 && (
            <div className="similar-code-section">
              <h4>🔗 유사한 코드 패턴</h4>
              <div className="similar-code-list">
                {result.similar_code_examples.map((example, index) => (
                  <div key={index} className="similar-code-item">
                    <div className="similarity-header">
                      <span className="code-name">{example.name}</span>
                      <span className="similarity-score">
                        유사도: {(example.similarity_score * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="code-details">
                      <span className="code-type">타입: {example.code_type?.join(', ') || 'Unknown'}</span>
                      <span className="file-path">파일: {example.file_path}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 개선 제안 */}
          {result.suggestions && result.suggestions.length > 0 && (
            <div className="suggestions-section">
              <h4>💡 개선 제안</h4>
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




