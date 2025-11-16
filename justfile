# Personal Data Tracker justfile

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

# Create data backup
backup:
    @echo "Creating backup..."
    @mkdir -p backups
    @tar -czf backups/backup-{{`date +%Y%m%d-%H%M%S`}}.tar.gz data/
    @echo "Backup created in backups/"

# Start backend development server
dev-backend:
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
