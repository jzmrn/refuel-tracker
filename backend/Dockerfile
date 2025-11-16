# Build stage
FROM python:3.11-slim AS builder

WORKDIR /build

# Install build dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install UV
RUN pip install --no-cache-dir uv

COPY ./README.md ./
# Copy dependency files
COPY README.md pyproject.toml uv.lock* ./

# Create virtual environment and install dependencies
RUN uv venv /build/venv
ENV VIRTUAL_ENV=/build/venv
ENV PATH="/build/venv/bin:$PATH"

# Install dependencies
RUN uv pip install --only-binary=:all: -e . || \
    uv pip install -e .

# Clean up unnecessary files from venv to reduce layer size
RUN find /build/venv -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true && \
    find /build/venv -type f -name "*.pyc" -delete && \
    find /build/venv -type f -name "*.pyo" -delete && \
    find /build/venv -type f -name "*.dist-info" -type d -exec rm -rf {} + 2>/dev/null || true

# Production stage
FROM python:3.11-slim AS production

WORKDIR /app

# Install only runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && useradd -r -s /bin/false app

# Copy virtual environment from builder
COPY --from=builder /build/venv /app/.venv

# Fix shebangs in venv to point to the correct path in production
RUN find /app/.venv/bin -type f -exec sed -i 's|#!/build/venv/bin/python|#!/app/.venv/bin/python|g' {} \;

# Set PATH to use venv
ENV PATH="/app/.venv/bin:$PATH"

# Copy application code
COPY --chown=app:app app/ ./app/

# Create data and backup directories
RUN mkdir -p /app/data /app/backups && chown -R app:app /app

USER app

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
