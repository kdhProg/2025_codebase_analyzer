from pydantic import BaseModel
from typing import List

class CodeAnalysisRequest(BaseModel):
    project_root_path: str
    selected_paths: List[str]