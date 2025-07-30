from pydantic import BaseModel, Field
from typing import List, Optional, Literal # 필요한 타입 임포트
from .file_node import FileNode

class ProjectScanResponse(BaseModel):
    """프로젝트 스캔 API의 전체 응답 모델"""
    file_structure: FileNode = Field(..., description="스캔된 프로젝트의 디렉토리/파일 트리 구조 (최상위 노드)")
    project_root_absolute_path: str = Field(..., description="스캔된 프로젝트의 실제 절대 경로")
    message: str = Field("Project scanned successfully.", description="스캔 결과 메시지")