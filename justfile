set dotenv-load := true


# Default recipe shows help
default:
    @just --list

# Build Docker images (optimized for avoiding provenance issues)
build:
    #!/usr/bin/env bash
    export DOCKER_BUILDKIT=1
    export BUILDKIT_PROGRESS=plain
    export BUILDX_NO_DEFAULT_ATTESTATIONS=1
    docker-compose build --parallel

# Start services with Docker Compose
up:
    docker-compose up -d

# Stop services
down:
    docker-compose down

# View logs
logs:
    docker-compose logs -f

# Clean up Docker resources
clean:
    docker-compose down -v --rmi all --remove-orphans

# Check if UV is installed
check-uv:
    @command -v uv >/dev/null 2>&1 || { echo "UV is not installed. Install it with: curl -LsSf https://astral.sh/uv/install.sh | sh"; exit 1; }

# Development commands
install: check-uv
    @echo "Installing backend dependencies..."
    cd backend && uv sync --group dev
    @echo "Installing frontend dependencies..."
    cd frontend && npm install

# Run tests
test:
    @echo "Running backend tests..."
    cd backend && uv run pytest
    @echo "Running frontend type check..."
    cd frontend && npm run type-check

# Run linting
lint:
    @echo "Linting backend..."
    cd backend && uv run ruff app/
    @echo "Linting frontend..."
    cd frontend && npm run lint

# Format code
format:
    @echo "Formatting backend..."
    cd backend && uv run black app/
    @echo "Formatting frontend..."
    cd frontend && npm run lint --fix

# Start backend development server
dev-backend:
    #!/usr/bin/env bash
    export DATA_PATH="$(pwd)/data"
    cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Start frontend development server
dev-frontend:
    cd frontend && npm run dev

# Start both development servers
dev: dev-backend dev-frontend
    @echo "Starting development servers..."
    @echo "Backend: http://localhost:8000"
    @echo "Frontend: http://localhost:3000"
    @echo "Press Ctrl+C to stop"

# Install Dagster analytics dependencies
install-analytics: check-uv
    cd analytics && uv sync

# Start Dagster analytics development server
dev-analytics: install-analytics
    #!/usr/bin/env bash
    cd analytics
    
    export DAGSTER_HOME="$(pwd)/home"
    export DATA_PATH="$(pwd)/data"
    
    uv run dagster dev

# Render Envoy config templates
render-envoy-config DEPLOYMENT="app" ENV="development":
    @mkdir -p config/out/{{ DEPLOYMENT }}
    jinja2 config/templates/{{ DEPLOYMENT }}-envoy.yaml.j2 "config/variables.{{ DEPLOYMENT }}.{{ ENV }}.yaml" --format=yaml > config/out/{{ DEPLOYMENT }}/envoy.yaml
    jinja2 config/templates/envoy-hmac-secret.yaml.j2 "config/variables.{{ DEPLOYMENT }}.{{ ENV }}.yaml" --format=yaml > config/out/{{ DEPLOYMENT }}/envoy-hmac-secret.yaml
    jinja2 config/templates/envoy-token-secret.yaml.j2 "config/variables.{{ DEPLOYMENT }}.{{ ENV }}.yaml" --format=yaml > config/out/{{ DEPLOYMENT }}/envoy-token-secret.yaml
    jinja2 config/templates/opa-data.json.j2 "config/variables.{{ DEPLOYMENT }}.{{ ENV }}.yaml" --format=yaml > config/out/{{ DEPLOYMENT }}/opa-data.json
    @echo "Rendered {{ DEPLOYMENT }} configuration for {{ ENV }} environment"
