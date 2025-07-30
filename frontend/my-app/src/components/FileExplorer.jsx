import React, { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../config/apiClient';

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
function FileExplorer({ node, projectRootPath }) {
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

    const setChildrenCheckedState = useCallback((currentNode, checked, currentMap) => {
        currentMap[currentNode.path] = checked;
        if (currentNode.type === 'directory' && currentNode.children) {
            currentNode.children.forEach(child => {
                setChildrenCheckedState(child, checked, currentMap);
            });
        }
    }, []);

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
    }, [node, findNode]); // findNode를 의존성 배열에 추가

    const handleAnalyzeClick = async () => {
        const selectedPaths = Object.keys(isCheckedMap).filter(path => isCheckedMap[path]);

        const payload = {
            project_root_path: projectRootPath,
            selected_paths: selectedPaths,
        };

        try {
            // axios를 사용하여 POST 요청 전송
            const response = await apiClient.post('/analyze/analyze-selected-code', payload, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            alert('분석 요청 성공: ' + JSON.stringify(response.data, null, 2));
        } catch (error) {
            if (error.response) {
                console.error('분석 요청 실패 (서버 응답):', error.response.data);
                
                // 💡 여기를 수정합니다: 서버 응답의 'detail' 필드를 더 자세히 표시
                let errorMessage = '알 수 없는 서버 오류';
                if (error.response.data && error.response.data.detail) {
                    if (Array.isArray(error.response.data.detail)) {
                        // detail이 배열인 경우, 각 오류 메시지를 추출하여 표시
                        errorMessage = error.response.data.detail.map(err => {
                            const loc = err.loc ? err.loc.join('.') : 'unknown';
                            return `${loc}: ${err.msg}`;
                        }).join('\n'); // 줄바꿈으로 여러 오류 표시
                    } else if (typeof error.response.data.detail === 'string') {
                        // detail이 문자열인 경우 (일반적인 오류 메시지)
                        errorMessage = error.response.data.detail;
                    }
                }
                alert('분석 요청 실패: ' + errorMessage);

            } else if (error.request) {
                console.error('분석 요청 실패 (네트워크 오류):', error.request);
                alert('네트워크 오류 또는 서버에 연결할 수 없습니다.');
            } else {
                console.error('분석 요청 실패 (클라이언트 오류):', error.message);
                alert('분석 요청 중 오류 발생: ' + error.message);
            }
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
            <button onClick={handleAnalyzeClick}>선택 완료 및 분석 시작</button>
        </div>
    );
}

export default FileExplorer;