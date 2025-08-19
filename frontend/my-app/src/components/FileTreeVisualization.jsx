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
    return <div className="no-data">No file structure data available.</div>;
  }

  return (
    <div className="file-tree-container">
      <h3>📁 Project File Structure</h3>
      <div className="tree-controls">
        <button 
          onClick={() => setExpandedNodes(new Set())}
          className="control-button"
        >
          Collapse All
        </button>
        <button 
          onClick={() => {
            const allPaths = getAllPaths(fileStructure);
            setExpandedNodes(new Set(allPaths));
          }}
          className="control-button"
        >
          Expand All
        </button>
      </div>
      <div className="file-tree">
        {renderNode(fileStructure)}
      </div>
    </div>
  );
};

// Helper function to recursively collect all paths
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
