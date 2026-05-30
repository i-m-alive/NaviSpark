FROM python:3.11-slim

# Install system dependencies: LibreOffice for PPT→PDF conversion, libmagic for python-magic
RUN apt-get update && apt-get install -y \
    libreoffice \
    libmagic1 \
    libmagic-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
