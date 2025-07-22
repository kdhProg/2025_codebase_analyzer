# backend/api/scan.py
from fastapi import APIRouter, HTTPException
from pathlib import Path

# models와 services에서 필요한 것들 임포트
from schemas.file_node import DirectoryScanRequest, FileNode
from service.file_scanner import scan_directory_recursive

# APIRouter 인스턴스 생성
router = APIRouter(
    # prefix="/scan", # 이 라우터에 속하는 모든 엔드포인트는 /scan으로 시작
    # tags=["scan"], # OpenAPI(Swagger UI) 문서에 표시될 태그
)

@router.post("/scan-project-path", response_model=FileNode)
async def scan_project_path(request: DirectoryScanRequest):
    """
    클라이언트로부터 받은 프로젝트 경로를 스캔하여 디렉토리 구조를 반환합니다.
    """
    root_path = Path(request.project_path)

    if not root_path.exists():
        raise HTTPException(status_code=404, detail=f"Path not found: {request.project_path}")
    if not root_path.is_dir():
        raise HTTPException(status_code=400, detail=f"Provided path is not a directory: {request.project_path}")

    print(f"Scanning project path: {root_path}")
    scanned_tree = scan_directory_recursive(root_path, root_path)

    if not scanned_tree:
        raise HTTPException(status_code=500, detail="Failed to scan directory.")

    return scanned_tree