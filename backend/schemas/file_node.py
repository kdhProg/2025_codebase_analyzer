# backend/models/file_node.py
from typing import List, Optional, Literal
from pydantic import BaseModel, Field

class DirectoryScanRequest(BaseModel):
    """프론트엔드로부터 받을 프로젝트 루트 경로 요청 모델"""
    project_path: str = Field(..., description="분석할 프로젝트의 로컬 절대 경로")

class FileNode(BaseModel):
    """파일/디렉토리 구조의 단일 노드 모델"""
    name: str = Field(..., description="파일 또는 디렉토리 이름")
    type: Literal["file", "directory"] = Field(..., description="노드의 타입 (file 또는 directory)")
    path: str = Field(..., description="루트 경로로부터의 상대 경로")
    children: Optional[List['FileNode']] = Field(None, description="디렉토리인 경우 하위 노드 목록")
    is_excluded_by_default: bool = Field(False, description="기본 제외 대상인지 여부 (예: node_modules)")

# Pydantic v2에서 재귀 모델 정의 시 필요
FileNode.model_rebuild()