FROM node:24-alpine AS frontend-builder
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    POKER_ASYNC_MODE=threading \
    POKER_DEBUG=false \
    POKER_DATA_DIR=/var/data
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
COPY --from=frontend-builder /web/dist /app/frontend/dist
RUN mkdir -p /var/data
EXPOSE 10000
CMD ["sh", "-c", "exec gunicorn --workers 1 --threads 100 --timeout 120 --bind 0.0.0.0:${PORT:-10000} app:app"]

