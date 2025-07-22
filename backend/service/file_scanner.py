# backend/services/scanner.py
import os
from pathlib import Path
from typing import List, Optional, Literal

# models에서 FileNode 임포트
from schemas.file_node import FileNode

# 일반적으로 코드 분석에서 제외할 디렉토리 목록
EXCLUDE_DIRS = {
    ".git",
    "node_modules",
    "venv",
    "env",
    "__pycache__",
    "build",
    "dist",
    "target",
    ".idea",
    ".vscode",
    "bin",
    "obj",
    "coverage",
    "docs", # 경우에 따라 제외
    "tests", # 경우에 따라 제외
}

# 일반적으로 코드 분석에 포함할 파일 확장자 (필요에 따라 더 추가/수정)
INCLUDE_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".c", ".cpp", ".h", ".hpp",
    ".go", ".rb", ".php", ".cs", ".swift", ".kt", ".rs", ".json", ".xml", ".yml", ".yaml",
    ".toml", ".md", ".txt"
}


def scan_directory_recursive(
    base_path: Path, current_path: Path, exclude_dirs: set = EXCLUDE_DIRS,
    include_extensions: set = INCLUDE_EXTENSIONS
) -> Optional[FileNode]:
    """
    주어진 경로를 재귀적으로 스캔하여 파일/디렉토리 구조를 FileNode 트리로 반환합니다.
    """
    if not current_path.exists():
        return None

    is_dir = current_path.is_dir()
    node_type = "directory" if is_dir else "file"
    name = current_path.name
    relative_path = str(current_path.relative_to(base_path))

    node = FileNode(
        name=name,
        type=node_type,
        path=relative_path,
        is_excluded_by_default=False # 기본값으로 설정, 아래에서 필요시 변경
    )

    # 기본 제외 디렉토리인 경우 is_excluded_by_default를 True로 설정
    if is_dir and name in exclude_dirs:
        node.is_excluded_by_default = True
        node.children = [] # 하위 탐색 안함
        return node
    
    # 파일이고 포함 확장자에 없으면, 노드 자체를 생성하지 않고 None 반환
    if not is_dir and current_path.suffix.lower() not in include_extensions:
        return None


    if is_dir:
        children = []
        try:
            for item in os.scandir(current_path):
                # 재귀 호출로 하위 노드 생성
                # 여기서는 item.name이 exclude_dirs에 있거나, 파일이 include_extensions에 없으면
                # scan_directory_recursive에서 None을 반환하므로, 이를 걸러내기만 하면 됨
                child_node = scan_directory_recursive(base_path, Path(item.path), exclude_dirs, include_extensions)
                if child_node:
                    children.append(child_node)

            node.children = children
        except PermissionError:
            print(f"Permission denied for directory: {current_path}")
            node.children = []
            node.name += " (Permission Denied)"
        except Exception as e:
            print(f"Error scanning directory {current_path}: {e}")
            node.children = []
            node.name += " (Error)"


    return node