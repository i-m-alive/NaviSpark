import io
import os
import magic
from pypdf import PdfReader
from pptx import Presentation
from fastapi import HTTPException

ACCEPTED_MIME_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "application/vnd.ms-powerpoint": "ppt",
}

# Fallback: python-magic may detect PPTX (a ZIP-based format) as 'application/octet-stream'
# or 'application/zip'. Map extensions to canonical MIME types as a safety net.
EXTENSION_MIME_FALLBACK = {
    ".pdf": "application/pdf",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".ppt": "application/vnd.ms-powerpoint",
}

CONTENT_TYPES = {
    "pdf": "application/pdf",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "ppt": "application/vnd.ms-powerpoint",
}

FILE_EXTENSIONS = {
    "pdf": "pdf",
    "pptx": "pptx",
    "ppt": "ppt",
}

MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024  # 100 MB


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
        ext = os.path.splitext(original_filename.lower())[1]
        mime_type = EXTENSION_MIME_FALLBACK.get(ext, mime_type)

    if mime_type not in ACCEPTED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: '{mime_type}'. Only PDF and PowerPoint (.ppt, .pptx) files are accepted."
        )

    return ACCEPTED_MIME_TYPES[mime_type]


def count_pdf_pages(pdf_bytes: bytes) -> int:
    """Counts pages in a PDF using pypdf."""
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        return len(reader.pages)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not read PDF page count: {str(e)}")


def count_pptx_slides(pptx_bytes: bytes) -> int:
    """Counts slides in a PPTX/PPT file using python-pptx."""
    try:
        prs = Presentation(io.BytesIO(pptx_bytes))
        return len(prs.slides)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not read PowerPoint slide count: {str(e)}")


def count_file_pages(file_bytes: bytes, file_type: str) -> int:
    """Returns page/slide count for any supported file type."""
    if file_type == "pdf":
        return count_pdf_pages(file_bytes)
    return count_pptx_slides(file_bytes)
