# backend/api/analysis.py

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from typing import Dict, Any, Generator
from pathlib import Path
import os
import json
import asyncio # 비동기 작업을 위한 임포트
import logging

# 서비스 임포트
from service.file_name_preprocessor import get_code_files_for_analysis
from service.code_parser import parse_code_with_tree_sitter, detect_language_from_filename
# 모델 임포트
from models.analysis_request import CodeAnalysisRequest # 기존 모델 사용
# DB 인제스터 임포트
from db.ingestor_python import ingest_code_graph_data
# 임베딩 파이프라인 임포트
from service.ai_data_pipeline import run_embedding_pipeline

router = APIRouter(
    prefix="/analyze"
)
logger = logging.getLogger(__name__)

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
            yield f"data: {json.dumps({'status': 'info', 'message': '파일 시스템 스캔 중...', 'progress': 0})}\n\n"
            files_to_analyze = get_code_files_for_analysis(project_root, request.selected_paths)

            if not files_to_analyze:
                yield f"data: {json.dumps({'status': 'error', 'message': '분석할 유효한 코드 파일이 선택되지 않았습니다.', 'progress': 0})}\n\n"
                return

            total_files = len(files_to_analyze)
            analyzed_count = 0
            analysis_summary_details = []

            # 2. 각 파일에 대해 코드 파싱 및 분석 수행
            for file_path in files_to_analyze:
                try:
                    yield f"data: {json.dumps({'status': 'in_progress', 'stage': '파일 분석', 'detail': f'{analyzed_count + 1}/{total_files} 파일 처리 중', 'progress': (analyzed_count / total_files) * 100})}\n\n"
                    
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        code_content = f.read()
                    
                    language = detect_language_from_filename(str(file_path))
                    
                    parsed_data = None
                    if language:
                        parsed_data = parse_code_with_tree_sitter(code_content, language, file_path)
                        
                        if parsed_data:
                            # DB 저장
                            ingest_code_graph_data(
                                parsed_data["extracted_entities"],
                                parsed_data["extracted_relationships"]
                            )

                            detail = {
                                "file_path": str(file_path.relative_to(project_root)),
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
                    error_detail = {
                        "file_path": str(file_path.relative_to(project_root)),
                        "status": "error",
                        "message": str(e)
                    }
                    analysis_summary_details.append(error_detail)
                    logger.error(f"Error processing file {file_path}: {e}")
                
                finally:
                    analyzed_count += 1
                    # 이전에 메시지를 보냈으므로 여기서는 추가 진행률 메시지를 보내지 않습니다.
                    pass

            # 모든 파일 분석 완료 후 최종 요약 전송
            file_analysis_progress = 100
            final_summary = {
                "total_files_for_analysis": total_files,
                "analyzed_files_details": analysis_summary_details
            }
            yield f"data: {json.dumps({'status': 'completed', 'analysis_summary': final_summary, 'progress': file_analysis_progress})}\n\n"

            # 3. 임베딩 파이프라인 실행
            yield f"data: {json.dumps({'status': 'info', 'message': '코드 임베딩 생성 시작...', 'progress': file_analysis_progress})}\n\n"

            # 비동기 콜백 함수 정의 (yield를 사용하여 프론트엔드에 메시지 전달)
            def embedding_progress_callback(message: Dict[str, Any]):
                # 임베딩 진행 상태 메시지에도 progress 키가 있는지 확인하여 전송
                if 'progress' not in message:
                    message['progress'] = file_analysis_progress
                yield f"data: {json.dumps(message)}\n\n"

            # 동기 함수인 run_embedding_pipeline을 별도의 스레드에서 실행
            await asyncio.to_thread(
                run_embedding_pipeline, 
                embedding_progress_callback, 
                project_root_path=request.project_root_path
            )

            yield f"data: {json.dumps({'status': 'info', 'message': '임베딩 생성 완료.', 'progress': 100})}\n\n"


        except HTTPException as he:
            yield f"data: {json.dumps({'status': 'error', 'message': he.detail, 'progress': 0})}\n\n"
        except Exception as e:
            logger.error(f"Unexpected error in analysis stream: {e}", exc_info=True)
            yield f"data: {json.dumps({'status': 'error', 'message': f'서버 내부 오류: {e}', 'progress': 0})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
