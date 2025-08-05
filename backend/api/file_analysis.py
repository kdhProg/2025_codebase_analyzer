# backend/api/analysis.py

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from typing import Dict, Any, Generator
from pathlib import Path
import os
import json
import asyncio # 비동기 작업을 위한 임포트

# 모델 임포트
from db.ingestor_python import ingest_code_graph_data
from models.analysis_request import CodeAnalysisRequest # 기존 모델 사용

# 서비스 임포트
from service.file_name_preprocessor import get_code_files_for_analysis
from service.code_parser import parse_code_with_tree_sitter, detect_language_from_filename

router = APIRouter(
    prefix="/analyze"
)

@router.post("/analyze-selected-code-stream")
async def analyze_selected_code_stream_endpoint(request: CodeAnalysisRequest):
    """
    프론트엔드로부터 선택된 파일 및 디렉토리 경로를 받아 코드 분석을 수행하고,
    진행 상황을 Server-Sent Events (SSE) 스트림으로 반환합니다.
    """
    project_root = Path(request.project_root_path)

    # 비동기 제너레이터 함수 정의
    async def event_generator() -> Generator[str, None, None]:
        files_to_analyze = []
        try:
            # 1. 파일 시스템 스캔 서비스 호출: 분석 대상 파일 목록을 얻습니다.
            files_to_analyze = get_code_files_for_analysis(project_root, request.selected_paths)

            if not files_to_analyze:
                # 분석할 파일이 없을 경우 오류 메시지 전송
                yield f"data: {json.dumps({'status': 'error', 'message': '분석할 유효한 코드 파일이 선택되지 않았습니다.'})}\n\n"
                return

            total_files = len(files_to_analyze)
            analyzed_count = 0
            analysis_summary_details = []

            # 2. 각 파일에 대해 코드 파싱 및 분석 수행
            for file_path in files_to_analyze:
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        code_content = f.read()
                    
                    language = detect_language_from_filename(str(file_path))
                    
                    parsed_data = None
                    if language:
                        # Tree-sitter 파싱 서비스 호출
                        parsed_data = parse_code_with_tree_sitter(code_content, language, file_path)
                        
                        if parsed_data:
                            # DB 저장 (비동기 함수라면 await 필요)
                            # 현재 ingest_code_graph_data가 비동기가 아니므로 await 없음
                            ingest_code_graph_data(
                                parsed_data["extracted_entities"],
                                parsed_data["extracted_relationships"]
                            )

                            detail = {
                                "file_path": str(file_path.relative_to(project_root)), # 루트 경로에 대한 상대 경로
                                "status": "success",
                                "language": language,
                                "extracted_entities_count": len(parsed_data.get("extracted_entities", [])),
                                "extracted_relationships_count": len(parsed_data.get("extracted_relationships", []))
                            }
                        else:
                            detail = {
                                "file_path": str(file_path.relative_to(project_root)),
                                "status": "failed_parsing",
                                "reason": f"No parser available or parsing failed for language: {language}"
                            }
                    else:
                        detail = {
                            "file_path": str(file_path.relative_to(project_root)),
                            "status": "skipped",
                            "reason": "Unknown or unsupported file type for parsing"
                        }
                    
                    analysis_summary_details.append(detail)

                except Exception as e:
                    # 파일 읽기 또는 처리 중 발생한 예외
                    error_detail = {
                        "file_path": str(file_path.relative_to(project_root)),
                        "status": "error",
                        "message": str(e)
                    }
                    analysis_summary_details.append(error_detail)
                    print(f"Error processing file {file_path}: {e}")
                
                finally:
                    analyzed_count += 1
                    progress = (analyzed_count / total_files) * 100
                    
                    # 진행 상황 메시지 전송
                    message = {
                        "status": "in_progress",
                        "progress": progress,
                        "file_path": str(file_path.relative_to(project_root)) # 클라이언트에 상대 경로 전송
                    }
                    yield f"data: {json.dumps(message)}\n\n"
                    # 실제 서비스에서는 데이터가 즉시 전송될 수 있도록 await asyncio.sleep(0) 등을 사용하지 않습니다.

            # 모든 파일 분석 완료 후 최종 요약 전송
            final_summary = {
                "total_files_for_analysis": total_files,
                "analyzed_files_details": analysis_summary_details
            }
            yield f"data: {json.dumps({'status': 'completed', 'analysis_summary': final_summary})}\n\n"

        except HTTPException as he:
            # FastAPI HTTPException 발생 시 오류 메시지 전송
            yield f"data: {json.dumps({'status': 'error', 'message': he.detail})}\n\n"
        except Exception as e:
            # 그 외 예상치 못한 오류 발생 시
            print(f"Unexpected error in analysis stream: {e}")
            yield f"data: {json.dumps({'status': 'error', 'message': f'서버 내부 오류: {e}'})}\n\n"

    # StreamingResponse를 반환하여 SSE 스트림을 시작
    return StreamingResponse(event_generator(), media_type="text/event-stream")