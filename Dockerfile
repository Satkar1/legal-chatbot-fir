# Production-ready Dockerfile for legal-chatbot-fir
FROM python:3.12-slim


# Environment settings
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PATH=/home/appuser/.local/bin:$PATH


WORKDIR /app


# System deps required by sentence-transformers and PDF libs
RUN apt-get update && \
apt-get install -y --no-install-recommends \
build-essential git curl ffmpeg libsndfile1 libssl-dev libpq-dev && \
rm -rf /var/lib/apt/lists/*


# Copy and install python dependencies first for docker layer caching
COPY legal/requirements.txt /app/requirements.txt
RUN pip install --upgrade pip setuptools wheel && \
pip install --user -r /app/requirements.txt


# Copy application code
COPY legal /app


# Create non-root user and set permissions
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser


# Expose port that Gunicorn will bind to
EXPOSE 8000


# Default CMD for the main web service (Render will use this by default)
# If you deploy chatbot_api or fir_api separately, override start command in Render
CMD ["gunicorn", "--workers", "4", "--bind", "0.0.0.0:8000", "app:app"]
