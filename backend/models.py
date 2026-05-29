from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# Auth models
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    user_id: str
    email: str
    message: str = "Login successful"

class UserResponse(BaseModel):
    user_id: str
    email: str

# Session models
class SessionSummary(BaseModel):
    id: str
    created_at: datetime
    updated_at: datetime
    status: str
    original_filename: Optional[str]
    file_type: Optional[str]
    page_count: Optional[int]
    client_industry: Optional[List[str]]
    proposal_type: Optional[str]
    client_priorities: Optional[List[str]]
    agent4_output: Optional[dict] = None

class SessionDetail(SessionSummary):
    storage_path: Optional[str]
    agent1_output: Optional[dict] = None
    agent2_output: Optional[dict] = None
    agent3_output: Optional[dict] = None
    report_storage_path: Optional[str] = None

class UploadResponse(BaseModel):
    session_id: str
    page_count: int
    file_type: str
    status: str
    message: str

class ReportUrlResponse(BaseModel):
    download_url: str
