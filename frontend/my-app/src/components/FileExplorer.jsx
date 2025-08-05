// src/components/FileExplorer.jsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
// apiClient 임포트는 더 이상 필요하지 않아 제거되었습니다.
// import apiClient from '../config/apiClient';

// FileNodeItem 컴포넌트는 이전 답변과 동일하게 유지됩니다.
function FileNodeItem({ node, onToggleCheck, isCheckedMap }) {
    const [isOpen, setIsOpen] = useState(false);
    const isChecked = isCheckedMap[node.path];

    const getChildrenCheckState = useCallback((currentNode) => {
        if (!currentNode.children || currentNode.children.length === 0) {
            return { allChecked: true, anyChecked: isCheckedMap[currentNode.path] };
        }

        let allChildrenChecked = true;
        let anyChildChecked = false;

        for (const child of currentNode.children) {
            const childState = getChildrenCheckState(child);
            if (!childState.allChecked) {
                allChildrenChecked = false;
            }
            if (childState.anyChecked) {
                anyChildChecked = true;
            }
        }
        return { allChecked: allChildrenChecked, anyChecked: anyChildChecked };
    }, [isCheckedMap]);

    const checkboxRef = useRef();

    useEffect(() => {
        if (node.type === 'directory' && checkboxRef.current) {
            const { allChecked, anyChecked } = getChildrenCheckState(node);
            checkboxRef.current.indeterminate = anyChecked && !allChecked;
        }
    }, [node, isCheckedMap, getChildrenCheckState]);

    const toggleOpen = () => {
        if (node.type === 'directory') {
            setIsOpen(!isOpen);
        }
    };

    const handleCheckboxChange = (e) => {
        const newCheckedState = e.target.checked;
        onToggleCheck(node.path, newCheckedState, node.type === 'directory');
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
                    ref={checkboxRef}
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
                <FileNodeItem
                    key={childNode.path}
                    node={childNode}
                    onToggleCheck={onToggleCheck}
                    isCheckedMap={isCheckedMap}
                />
            ))}
        </div>
    );
}

// FileExplorer 컴포넌트
// onAnalyze prop을 추가했습니다.
function FileExplorer({ node, projectRootPath, onAnalyze }) {
    const [isCheckedMap, setIsCheckedMap] = useState({});

    useEffect(() => {
        const initialCheckedState = {};
        const collectInitialStates = (currentNode) => {
            initialCheckedState[currentNode.path] = !currentNode.is_excluded_by_default;
            if (currentNode.type === 'directory' && currentNode.children) {
                currentNode.children.forEach(collectInitialStates);
            }
        };
        if (node) {
            collectInitialStates(node);
        }
        setIsCheckedMap(initialCheckedState);
    }, [node]);

    const findNode = useCallback((currentNode, targetPath) => {
        if (currentNode.path === targetPath) {
            return currentNode;
        }
        if (currentNode.type === 'directory' && currentNode.children) {
            for (const child of currentNode.children) {
                const found = findNode(child, targetPath);
                if (found) {
                    return found;
                }
            }
        }
        return null;
    }, []);

    const handleToggleCheck = useCallback((targetPath, newCheckedState, isDirectory) => {
        setIsCheckedMap(prevMap => {
            const newMap = { ...prevMap };

            if (isDirectory) {
                const updateChildren = (currentNode) => {
                    newMap[currentNode.path] = newCheckedState;
                    if (currentNode.type === 'directory' && currentNode.children) {
                        currentNode.children.forEach(child => updateChildren(child));
                    }
                };
                const targetNode = findNode(node, targetPath);
                if (targetNode) {
                    updateChildren(targetNode);
                }
            } else {
                newMap[targetPath] = newCheckedState;
            }

            const adjustParentsState = (currentNode) => {
                if (!currentNode.children || currentNode.children.length === 0) {
                    return newMap[currentNode.path];
                }

                let allChildrenChecked = true;
                let anyChildChecked = false;

                for (const child of currentNode.children) {
                    const childIsChecked = adjustParentsState(child);
                    if (!childIsChecked) {
                        allChildrenChecked = false;
                    }
                    if (childIsChecked) {
                        anyChildChecked = true;
                    }
                }
                
                if (allChildrenChecked) {
                    newMap[currentNode.path] = true;
                } else if (anyChildChecked) {
                    newMap[currentNode.path] = false; // 부분 선택 시 부모 해제
                } else {
                    newMap[currentNode.path] = false;
                }

                return newMap[currentNode.path];
            };

            if (node) {
                adjustParentsState(node);
            }
            
            return newMap;
        });
    }, [node, findNode]); 

    // API 호출 로직을 제거하고, onAnalyze 콜백을 호출하도록 수정했습니다.
    const handleAnalyzeClick = () => {
        const selectedPaths = Object.keys(isCheckedMap).filter(path => isCheckedMap[path]);
        
        // 부모 컴포넌트인 Home.jsx에 분석 시작을 알리기 위해 onAnalyze 콜백을 호출합니다.
        // 선택된 경로와 프로젝트 루트 경로를 인자로 전달합니다.
        if (onAnalyze) {
            onAnalyze(projectRootPath, selectedPaths);
        }
    };

    if (!node || !node.children) {
        return <p>스캔된 파일 구조가 없음</p>;
    }

    return (
        <div style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '5px', maxHeight: '500px', overflowY: 'auto' }}>
            <FileNodeItem
                node={node}
                onToggleCheck={handleToggleCheck}
                isCheckedMap={isCheckedMap}
            />
            <hr style={{ marginTop: '20px' }} />
            <button 
                onClick={handleAnalyzeClick}
                style={{ 
                    padding: '10px 20px', 
                    fontSize: '16px', 
                    backgroundColor: '#007bff', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '5px', 
                    cursor: 'pointer', 
                    transition: 'background-color 0.3s' 
                }}
            >
                선택 완료 및 분석 시작
            </button>
        </div>
    );
}

export default FileExplorer;