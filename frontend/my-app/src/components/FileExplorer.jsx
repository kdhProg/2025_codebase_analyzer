import React, { useState } from 'react';


function FileNodeItem({ node }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isChecked, setIsChecked] = useState(!node.is_excluded_by_default);

  const toggleOpen = () => {
    if (node.type === 'directory') {
      setIsOpen(!isOpen);
    }
  };

  const handleCheckboxChange = () => {
    setIsChecked(!isChecked);
  };

  const getIcon = () => {
    if (node.type === 'directory') {
      return isOpen ? '📂' : '📁';
    }
    return '📄';
  };

  return (
    <div style={{ marginLeft: '20px', userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={isChecked}
          onChange={handleCheckboxChange}
          style={{ marginRight: '5px' }}
        />
        <span onClick={toggleOpen} style={{ cursor: node.type === 'directory' ? 'pointer' : 'default' }}>
          {getIcon()} {node.name}
          {node.is_excluded_by_default && (
            <span style={{ color: 'gray', fontSize: '0.8em', marginLeft: '5px' }}>
              (기본 제외)
            </span>
          )}
        </span>
      </div>
      {node.type === 'directory' && isOpen && node.children && node.children.map((childNode) => (
        <FileNodeItem key={childNode.path} node={childNode} />
      ))}
    </div>
  );
}

function FileExplorer({ node }) {
  if (!node || !node.children) {
    return <p>스캔된 파일 구조가 없음</p>;
  }

  return (
    <div style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '5px', maxHeight: '500px', overflowY: 'auto' }}>
      {node.children.map((childNode) => (
        <FileNodeItem key={childNode.path} node={childNode} />
      ))}
      <hr style={{ marginTop: '20px' }} />
      <button>선택 완료 및 분석 시작</button>
    </div>
  );
}

export default FileExplorer;