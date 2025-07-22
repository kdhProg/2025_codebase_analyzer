import React, { useState } from 'react';


function FileNodeItem({ node }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isChecked, setIsChecked] = useState(!node.is_excluded_by_default);

  const toggleOpen = () => {
    if (node.type === 'directory') {
      setIsOpen(!isOpen);
    }
  };

  // 체크박스 변경 핸들러 (나중에 선택된 파일 목록을 백엔드로 보낼 때 사용)
  const handleCheckboxChange = () => {
    setIsChecked(!isChecked);
    // TODO: 여기에서 부모 컴포넌트로 이 노드의 선택 상태 변경을 알리고,
    // 전체 선택된 파일 목록을 업데이트하는 로직을 추가해야 합니다.
    // 복잡해질 수 있으므로 초기 구현에서는 생략하거나 간단하게 표시만 할 수도 있습니다.
  };

  // 아이콘 선택 (폴더/파일, 확장/축소 상태에 따라)
  const getIcon = () => {
    if (node.type === 'directory') {
      return isOpen ? '📂' : '📁';
    }
    return '📄'; // 파일
  };

  return (
    <div style={{ marginLeft: '20px', userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {/* 체크박스 */}
        <input
          type="checkbox"
          checked={isChecked}
          onChange={handleCheckboxChange}
          style={{ marginRight: '5px' }}
        />
        {/* 아이콘 */}
        <span onClick={toggleOpen} style={{ cursor: node.type === 'directory' ? 'pointer' : 'default' }}>
          {getIcon()} {node.name}
          {node.is_excluded_by_default && (
            <span style={{ color: 'gray', fontSize: '0.8em', marginLeft: '5px' }}>
              (기본 제외)
            </span>
          )}
        </span>
      </div>
      {/* 폴더인 경우, 열려있으면 하위 노드를 재귀적으로 렌더링 */}
      {node.type === 'directory' && isOpen && node.children && node.children.map((childNode) => (
        <FileNodeItem key={childNode.path} node={childNode} />
      ))}
    </div>
  );
}

// 전체 파일 탐색기 컴포넌트
function FileExplorer({ node }) {
  // 루트 노드(예: C:/my_project) 자체는 보통 펼치지 않고, 그 하위부터 보여줍니다.
  // 그래서 node.children을 바로 map으로 돌립니다.
  if (!node || !node.children) {
    return <p>스캔된 파일 구조가 없습니다.</p>;
  }

  return (
    <div style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '5px', maxHeight: '500px', overflowY: 'auto' }}>
      {node.children.map((childNode) => (
        <FileNodeItem key={childNode.path} node={childNode} />
      ))}
      <hr style={{ marginTop: '20px' }} />
      {/* 선택 완료 버튼 (나중에 이 버튼 클릭 시 선택된 파일 목록을 백엔드로 전송) */}
      <button>선택 완료 및 분석 시작</button>
    </div>
  );
}

export default FileExplorer;