from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str
    cloudconvert_api_key: str = ""

    # AWS — supports both SSO temp credentials and named profile
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_session_token: str = ""   # required for SSO / STS temporary credentials
    aws_profile: str = ""         # alternative: named AWS CLI profile (e.g. "navispark-sso")
    aws_region: str = "us-east-1"
    bedrock_model_id: str = "anthropic.claude-sonnet-4-20250514-v1:0"

    frontend_url: str = "http://localhost:5173"

    class Config:
        env_file = "../.env"
        env_file_encoding = "utf-8"

settings = Settings()
