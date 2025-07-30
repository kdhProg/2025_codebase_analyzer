# backend/services/file_scanner.py

import os
from pathlib import Path
from typing import List

# code_parser 서비스에서 언어 감지 함수 임포트
from .code_parser import detect_language_from_filename

# 기본적으로 분석에서 제외할 파일/디렉토리 패턴
# Git 저장소, 파이썬 캐시, Node.js 모듈, macOS 메타데이터 파일 등
DEFAULT_EXCLUDE_PATTERNS = [
    ".git",
    "__pycache__",
    "node_modules",
    ".DS_Store",
    ".vscode", # IDE 설정 파일
    "venv",    # Python 가상 환경
    ".env",    # 환경 변수 파일
    "*.min.js", # 압축된 JS 파일
    "*.map",    # 소스 맵 파일
]

def get_code_files_for_analysis(project_root: Path, selected_items: List[str]) -> List[Path]:
    """
    프론트엔드에서 선택된 경로 목록을 기반으로 실제 분석 대상 코드 파일 목록을 반환합니다.
    디렉토리가 선택되면 해당 디렉토리의 모든 분석 가능한 하위 파일을 포함합니다.
    """
    files_to_analyze: List[Path] = []

    for item_path_str in selected_items:
        # print(f'Project root : {project_root}      item_path_str : {item_path_str}  ')
        full_item_path = project_root / item_path_str # pathlib.Path 객체로 경로 결합

        if not full_item_path.exists():
            print(f"Warning: Selected path does not exist: {full_item_path}")
            continue

        if full_item_path.is_file():
            # 파일이 직접 선택된 경우
            if _is_analyzable_code_file(full_item_path):
                files_to_analyze.append(full_item_path)
            else:
                print(f"Skipping non-analyzable file: {full_item_path}")
        elif full_item_path.is_dir():
            # 디렉토리가 선택된 경우, 그 안의 모든 코드를 분석 대상으로 추가 (재귀 탐색)
            # rglob('*')은 모든 하위 파일과 디렉토리를 포함합니다.
            for file_path in full_item_path.rglob('*'):
                if file_path.is_file() and _is_analyzable_code_file(file_path):
                    files_to_analyze.append(file_path)
    
    # 중복 제거 (만약 부모 디렉토리와 특정 파일이 동시에 선택된 경우)
    return list(set(files_to_analyze))


def _is_analyzable_code_file(file_path: Path) -> bool:
    """
    주어진 파일이 분석 가능한 코드 파일인지 확인합니다.
    - 파일 확장자를 통해 언어를 감지할 수 있는지 확인합니다.
    - 제외 패턴에 해당하는지 확인합니다.
    """
    if not file_path.is_file():
        return False

    # 1. 언어 감지 가능한 파일인지 확인
    if detect_language_from_filename(str(file_path)) is None:
        return False # 지원하지 않는 언어 또는 코드가 아닌 파일

    # 2. 제외 패턴에 해당하는지 확인
    for pattern in DEFAULT_EXCLUDE_PATTERNS:
        if pattern.startswith('*'): # *.js 같은 와일드카드 패턴 처리
            if file_path.name.endswith(pattern[1:]):
                return False
        elif pattern in str(file_path): # 경로 내에 패턴이 포함된 경우
            return False
            
    return True