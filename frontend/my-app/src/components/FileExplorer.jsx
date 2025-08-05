// src/components/FileExplorer.jsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import '../css/fileExplorer.css';

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
        <div className="file-node-item">
            <div className="file-node-item-header">
                <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={handleCheckboxChange}
                    ref={checkboxRef}
                />
                <span 
                    onClick={toggleOpen} 
                    className={node.type === 'directory' ? 'directory-name' : ''}
                >
                    {getIcon()} {node.name}
                    {node.is_excluded_by_default && (
                        <span className="excluded-label">(기본 제외)</span>
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
                    newMap[currentNode.path] = false;
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

    const handleAnalyzeClick = () => {
        const selectedPaths = Object.keys(isCheckedMap).filter(path => isCheckedMap[path]);
        
        if (onAnalyze) {
            onAnalyze(projectRootPath, selectedPaths);
        }
    };

    if (!node || !node.children) {
        return <p>스캔된 파일 구조가 없음</p>;
    }

    return (
        <div className="file-explorer">
            <FileNodeItem
                node={node}
                onToggleCheck={handleToggleCheck}
                isCheckedMap={isCheckedMap}
            />
            <hr className="explorer-separator" />
            <button 
                onClick={handleAnalyzeClick}
                className="analyze-button"
            >
                선택 완료 및 분석 시작
            </button>
        </div>
    );
}

export default FileExplorer;