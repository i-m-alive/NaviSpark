import boto3
import json
import base64
import re
from fastapi import HTTPException
from config import settings


_PLACEHOLDERS = {"", "your-aws-access-key", "your-aws-secret-key"}


def get_bedrock_client():
    """
    Builds a Bedrock client using whichever credentials are available:
      1. Explicit keys in .env  — used when AWS_ACCESS_KEY_ID is set and not a placeholder.
         SSO temp creds require all three: ACCESS_KEY + SECRET_KEY + SESSION_TOKEN.
      2. AWS CLI profile / default chain — used when keys are absent/placeholder.
         Run `aws sso login` first, then set AWS_PROFILE in .env if non-default.
    """
    use_explicit = (
        settings.aws_access_key_id not in _PLACEHOLDERS
        and settings.aws_secret_access_key not in _PLACEHOLDERS
    )

    if use_explicit:
        kwargs = dict(
            service_name="bedrock-runtime",
            region_name=settings.aws_region,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
        )
        if settings.aws_session_token:
            kwargs["aws_session_token"] = settings.aws_session_token
        return boto3.client(**kwargs)

    # Fall back to boto3 default credential chain (env vars, ~/.aws/credentials, SSO profile)
    session = boto3.Session(
        profile_name=settings.aws_profile or None,
        region_name=settings.aws_region,
    )
    return session.client("bedrock-runtime")


def _clean_json_response(raw_text: str) -> str:
    text = raw_text.strip()
    text = re.sub(r'^```(?:json)?\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    return text.strip()


def invoke_agent_with_pdf(system_prompt: str, user_message: str, pdf_bytes: bytes) -> dict:
    """
    Calls Claude Sonnet 4 on Bedrock with a PDF as a native document block.
    Bedrock reads the PDF natively — no OCR or preprocessing needed.
    """
    client = get_bedrock_client()
    pdf_b64 = base64.standard_b64encode(pdf_bytes).decode("utf-8")

    request_body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 8000,
        "system": system_prompt,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "document",
                        "source": {
                            "type": "base64",
                            "media_type": "application/pdf",
                            "data": pdf_b64,
                        },
                    },
                    {
                        "type": "text",
                        "text": user_message,
                    }
                ]
            }
        ]
    }

    try:
        response = client.invoke_model(
            modelId=settings.bedrock_model_id,
            contentType="application/json",
            accept="application/json",
            body=json.dumps(request_body),
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AWS Bedrock API call failed: {str(e)}")

    try:
        response_body = json.loads(response["body"].read())
        raw_text = response_body["content"][0]["text"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read Bedrock response: {str(e)}")

    cleaned = _clean_json_response(raw_text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Model returned invalid JSON. Error: {str(e)}. Raw (first 500): {raw_text[:500]}"
        )


def invoke_agent_text_only(system_prompt: str, user_message: str) -> dict:
    """Calls Claude Sonnet 4 on Bedrock with text input only (no PDF). Used by Agent 4."""
    client = get_bedrock_client()

    request_body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 8000,
        "system": system_prompt,
        "messages": [{"role": "user", "content": user_message}]
    }

    try:
        response = client.invoke_model(
            modelId=settings.bedrock_model_id,
            contentType="application/json",
            accept="application/json",
            body=json.dumps(request_body),
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AWS Bedrock API call failed: {str(e)}")

    try:
        response_body = json.loads(response["body"].read())
        raw_text = response_body["content"][0]["text"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read Bedrock response: {str(e)}")

    cleaned = _clean_json_response(raw_text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Model returned invalid JSON. Error: {str(e)}. Raw (first 500): {raw_text[:500]}"
        )
