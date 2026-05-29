import io
import asyncio
import magic
import httpx
from pypdf import PdfReader
from fastapi import HTTPException
from config import settings

ACCEPTED_MIME_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "application/vnd.ms-powerpoint": "ppt",
}

MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024  # 100 MB
CLOUDCONVERT_API = "https://api.cloudconvert.com/v2"


def detect_mime_type(file_bytes: bytes) -> str:
    return magic.from_buffer(file_bytes, mime=True)


def validate_and_detect(file_bytes: bytes, original_filename: str) -> str:
    """Validates file size and MIME type. Returns 'pdf', 'pptx', or 'ppt'."""
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail="File too large. Maximum allowed size is 100 MB."
        )

    mime_type = detect_mime_type(file_bytes)

    if mime_type not in ACCEPTED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: '{mime_type}'. Only PDF and PowerPoint (.ppt, .pptx) files are accepted."
        )

    return ACCEPTED_MIME_TYPES[mime_type]


async def convert_pptx_to_pdf(pptx_bytes: bytes, filename: str = "document.pptx") -> bytes:
    """
    Converts PPTX/PPT to PDF using the CloudConvert REST API via httpx.
    Free tier: 25 conversions/day. Requires CLOUDCONVERT_API_KEY in .env.
    """
    api_key = settings.cloudconvert_api_key
    if not api_key or api_key == "your-cloudconvert-api-key":
        raise HTTPException(
            status_code=500,
            detail="CLOUDCONVERT_API_KEY is not set in .env."
        )

    auth_headers = {"Authorization": f"Bearer {api_key}"}

    try:
        async with httpx.AsyncClient(timeout=120) as client:

            # Step 1: Create job with three tasks
            resp = await client.post(
                f"{CLOUDCONVERT_API}/jobs",
                headers={**auth_headers, "Content-Type": "application/json"},
                json={
                    "tasks": {
                        "upload-file": {"operation": "import/upload"},
                        "convert-file": {
                            "operation": "convert",
                            "input": ["upload-file"],
                            "output_format": "pdf",
                        },
                        "export-file": {
                            "operation": "export/url",
                            "input": ["convert-file"],
                        },
                    }
                },
            )
            resp.raise_for_status()
            job = resp.json()["data"]
            job_id = job["id"]

            # Step 2: Upload the file to the presigned S3 form
            upload_task = next(t for t in job["tasks"] if t["name"] == "upload-file")
            form = upload_task["result"]["form"]

            upload_resp = await client.post(
                form["url"],
                data=form["parameters"],
                files={"file": (filename, pptx_bytes, "application/octet-stream")},
            )
            upload_resp.raise_for_status()

            # Step 3: Poll until finished or error (max 2 minutes)
            for _ in range(60):
                await asyncio.sleep(2)
                poll = await client.get(
                    f"{CLOUDCONVERT_API}/jobs/{job_id}",
                    headers=auth_headers,
                )
                poll.raise_for_status()
                job_data = poll.json()["data"]

                if job_data["status"] == "finished":
                    break
                if job_data["status"] == "error":
                    failed = next(
                        (t for t in job_data["tasks"] if t["status"] == "error"), None
                    )
                    msg = (failed or {}).get("message", "Conversion failed")
                    raise HTTPException(status_code=500, detail=f"CloudConvert error: {msg}")
            else:
                raise HTTPException(
                    status_code=500,
                    detail="CloudConvert timed out after 2 minutes."
                )

            # Step 4: Download the converted PDF
            export_task = next(t for t in job_data["tasks"] if t["name"] == "export-file")
            pdf_url = export_task["result"]["files"][0]["url"]

            pdf_resp = await client.get(pdf_url)
            pdf_resp.raise_for_status()
            return pdf_resp.content

    except HTTPException:
        raise
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=500,
            detail=f"CloudConvert API error {e.response.status_code}: {e.response.text[:300]}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CloudConvert conversion failed: {str(e)}")


def count_pdf_pages(pdf_bytes: bytes) -> int:
    """Counts pages in a PDF using pypdf."""
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        return len(reader.pages)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not read PDF page count: {str(e)}")
