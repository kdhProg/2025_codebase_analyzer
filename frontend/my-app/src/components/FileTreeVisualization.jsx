import React, { useState } from 'react';
import '../css/fileTreeVisualization.css';

const FileTreeVisualization = ({ fileStructure }) => {
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  const toggleNode = (nodePath) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodePath)) {
      newExpanded.delete(nodePath);
    } else {
      newExpanded.add(nodePath);
    }
    setExpandedNodes(newExpanded);
  };

  const renderNode = (node, level = 0, path = '') => {
    const currentPath = path ? `${path}/${node.name}` : node.name;
    const isExpanded = expandedNodes.has(currentPath);
    const hasChildren = node.children && node.children.length > 0;
    const isDirectory = node.type === 'directory';

    return (
      <div key={currentPath} className="tree-node" style={{ marginLeft: `${level * 20}px` }}>
        <div className="node-content">
          <button
            className={`expand-button ${hasChildren ? '' : 'hidden'}`}
            onClick={() => hasChildren && toggleNode(currentPath)}
            disabled={!hasChildren}
          >
            {hasChildren ? (isExpanded ? '▼' : '▶') : ''}
          </button>
          
          <span className={`node-icon ${isDirectory ? 'folder' : 'file'}`}>
            {isDirectory ? '📁' : getFileIcon(node.name)}
          </span>
          
          <span className="node-name">{node.name}</span>
          
          {!isDirectory && (
            <span className="node-info">
              {node.path && <span className="file-path">{node.path}</span>}
            </span>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div className="node-children">
            {node.children.map(child => renderNode(child, level + 1, currentPath))}
          </div>
        )}
      </div>
    );
  };

  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const iconMap = {
      'py': '🐍',
      'js': '📜',
      'jsx': '⚛️',
      'ts': '📘',
      'tsx': '⚛️',
      'java': '☕',
      'cpp': '⚙️',
      'c': '⚙️',
      'h': '📋',
      'hpp': '📋',
      'go': '🐹',
      'rb': '💎',
      'php': '🐘',
      'cs': '🔷',
      'swift': '🍎',
      'kt': '🤖',
      'rs': '🦀',
      'json': '📄',
      'xml': '📄',
      'yml': '⚙️',
      'yaml': '⚙️',
      'toml': '⚙️',
      'md': '📝',
      'txt': '📄',
      'css': '🎨'
    };
    return iconMap[extension] || '📄';
  };

  if (!fileStructure) {
    return <div className="no-data">파일 구조 데이터가 없습니다.</div>;
  }

  return (
    <div className="file-tree-container">
      <h3>📁 프로젝트 파일 구조</h3>
      <div className="tree-controls">
        <button 
          onClick={() => setExpandedNodes(new Set())}
          className="control-button"
        >
          모두 접기
        </button>
        <button 
          onClick={() => {
            const allPaths = getAllPaths(fileStructure);
            setExpandedNodes(new Set(allPaths));
          }}
          className="control-button"
        >
          모두 펼치기
        </button>
      </div>
      <div className="file-tree">
        {renderNode(fileStructure)}
      </div>
    </div>
  );
};

// 모든 경로를 재귀적으로 수집하는 헬퍼 함수
const getAllPaths = (node, path = '') => {
  const currentPath = path ? `${path}/${node.name}` : node.name;
  const paths = [currentPath];
  
  if (node.children) {
    node.children.forEach(child => {
      paths.push(...getAllPaths(child, currentPath));
    });
  }
  
  return paths;
};

export default FileTreeVisualization;

