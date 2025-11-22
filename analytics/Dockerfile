# Builder stage
FROM python:3.11-slim AS builder

WORKDIR /build

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy dependency files
COPY analytics/pyproject.toml ./
COPY lib/ /lib/

# Create virtual environment and install dependencies
RUN uv venv /opt/venv && \
    . /opt/venv/bin/activate && \
    uv pip install --no-cache -e .

# Final stage
FROM python:3.11-slim

WORKDIR /app

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv

# Copy application code
COPY analytics/pipeline/ ./pipeline/
COPY analytics/workspace.yaml ./

# Set environment variables
ENV DAGSTER_HOME=/app/home \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/opt/venv/bin:$PATH"

# Create dagster home directory and copy config
RUN mkdir -p $DAGSTER_HOME
COPY analytics/dagster.yaml $DAGSTER_HOME/

# Expose Dagster webserver port
EXPOSE 3000

# Command will be specified in docker-compose
CMD ["dagster", "dev", "-h", "0.0.0.0", "-p", "3000", "-w", "/app/workspace.yaml"]
