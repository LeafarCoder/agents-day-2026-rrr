.DEFAULT_GOAL := help

help:
	@echo ""
	@echo "Usage: make <command>"
	@echo ""
	@echo "  backend-install  Install Python dependencies"
	@echo "  backend-start    Start FastAPI backend (port 8042, hot reload)"
	@echo "  frontend-install Install frontend dependencies"
	@echo "  frontend-start   Start Next.js frontend (port 3042, hot reload)"
	@echo "  migrate          Push Supabase migrations"
	@echo ""

backend-install:
	~/.pyenv/versions/3.12.3/bin/python3.12 -m venv venv --clear
	venv/bin/python3 -m pip install -r requirements.txt

backend-start:
	venv/bin/uvicorn api.main:app --reload --port 8042

frontend-install:
	cd frontend && pnpm install --ignore-scripts

frontend-start:
	cd frontend && pnpm dev

migrate:
	@supabase projects list > /dev/null 2>&1 || supabase login
	@supabase link 2>/dev/null || true
	supabase db push
