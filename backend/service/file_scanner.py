# backend/services/scanner.py
import os
from pathlib import Path
from typing import List, Optional, Literal
from schemas.file_node import FileNode

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
    "docs",
    "tests",
}

INCLUDE_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".c", ".cpp", ".h", ".hpp",
    ".go", ".rb", ".php", ".cs", ".swift", ".kt", ".rs", ".json", ".xml", ".yml", ".yaml",
    ".toml", ".md", ".txt"
}


def scan_directory_recursive(
    base_path: Path, current_path: Path, exclude_dirs: set = EXCLUDE_DIRS,
    include_extensions: set = INCLUDE_EXTENSIONS
) -> Optional[FileNode]:
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
        is_excluded_by_default=False
    )

    if is_dir and name in exclude_dirs:
        node.is_excluded_by_default = True
        node.children = [] # 하위 탐색 안함
        return node
    
    if not is_dir and current_path.suffix.lower() not in include_extensions:
        return None


    if is_dir:
        children = []
        try:
            for item in os.scandir(current_path):
                # 재귀 호출로 하위 노드 생성
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