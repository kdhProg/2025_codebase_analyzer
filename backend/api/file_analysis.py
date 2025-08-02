# backend/api/analysis.py

from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from pathlib import Path
import os

# 모델 임포트
from db.ingestor_python import ingest_code_graph_data
from models.analysis_request import CodeAnalysisRequest

# 서비스 임포트
from service.file_name_preprocessor import get_code_files_for_analysis
from service.code_parser import parse_code_with_tree_sitter, detect_language_from_filename
# TODO: 지식 그래프 DB 서비스가 있다면 여기에 임포트
# from backend.services.knowledge_graph_db import KnowledgeGraphDB

router = APIRouter(
    prefix="/analyze"
)

@router.post("/analyze-selected-code", response_model=Dict[str, Any])
async def analyze_selected_code_endpoint(request: CodeAnalysisRequest) -> Dict[str, Any]:
    """
    프론트엔드로부터 선택된 파일 및 디렉토리 경로를 받아 코드 분석.
    """
    project_root = Path(request.project_root_path)
    
    # 1. 파일 시스템 스캔 서비스 호출: 분석 대상 파일 목록을 얻습니다.
    files_to_analyze = get_code_files_for_analysis(project_root, request.selected_paths)
    print(f'files to analyze : {files_to_analyze}')

    if not files_to_analyze:
        raise HTTPException(status_code=400, detail="분석할 유효한 코드 파일이 선택되지 않았습니다.")

    analysis_summary = {
        "total_files_for_analysis": len(files_to_analyze),
        "analyzed_files_details": []
    }

    # 2. 각 파일에 대해 코드 파싱 및 분석 수행
    for file_path in files_to_analyze:
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                code_content = f.read()
            
            language = detect_language_from_filename(str(file_path))
            
            if language:
                # Tree-sitter 파싱 서비스 호출
                parsed_data = parse_code_with_tree_sitter(code_content, language, file_path)
                
                if parsed_data:
                    # save to DB
                    ingest_code_graph_data(
                        parsed_data["extracted_entities"],
                        parsed_data["extracted_relationships"]
                    )

                    analysis_summary["analyzed_files_details"].append({
                        "file_path": str(file_path.relative_to(project_root)), # 루트 경로에 대한 상대 경로
                        "status": "success",
                        "language": language,
                        "extracted_entities_count": len(parsed_data.get("extracted_entities", [])),
                        "extracted_relationships_count": len(parsed_data.get("extracted_relationships", []))
                    })
                else:
                    analysis_summary["analyzed_files_details"].append({
                        "file_path": str(file_path.relative_to(project_root)),
                        "status": "failed_parsing",
                        "reason": f"No parser available or parsing failed for language: {language}"
                    })
            else:
                analysis_summary["analyzed_files_details"].append({
                    "file_path": str(file_path.relative_to(project_root)),
                    "status": "skipped",
                    "reason": "Unknown or unsupported file type for parsing"
                })

        except Exception as e:
            # 파일 읽기 또는 처리 중 발생한 예외
            print(f"Error processing file {file_path}: {e}")
            analysis_summary["analyzed_files_details"].append({
                "file_path": str(file_path.relative_to(project_root)),
                "status": "error",
                "message": str(e)
            })

    return {"message": "코드 분석 요청이 성공적으로 처리되었습니다.", "analysis_summary": analysis_summary}