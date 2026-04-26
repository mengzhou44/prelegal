# Stage 1: Build Next.js static export
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python backend serving static frontend
FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

COPY backend/pyproject.toml ./
RUN uv sync --no-dev --no-install-project

COPY backend/main.py backend/pdf_generator.py backend/database.py backend/catalog.json ./
COPY backend/templates/ ./templates/

COPY --from=frontend-builder /app/frontend/out ./static

ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
