# Build stage
FROM python:3.11-slim AS builder

WORKDIR /build

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy dependency files
COPY scripts/pyproject.toml ./
COPY lib/metrics/ /lib/metrics/

# Create virtual environment and install dependencies
RUN uv venv /opt/venv && \
    . /opt/venv/bin/activate && \
    uv pip install --no-cache -e /lib/metrics && \
    uv pip install --no-cache -e .

# Production stage
FROM python:3.11-slim

WORKDIR /app

RUN useradd -r -s /bin/false app

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv

# Set PATH to use venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy migration scripts
COPY --chown=app:app scripts/migrations/ ./migrations/

USER app

ENTRYPOINT ["python"]
