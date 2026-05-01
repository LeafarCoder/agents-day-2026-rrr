.DEFAULT_GOAL := help

help:
	@echo ""
	@echo "Usage: make <command>"
	@echo ""
	@echo "  install   Install Python dependencies"
	@echo "  start     Start the server (port 8042, hot reload)"
	@echo "  migrate   Push Supabase migrations"
	@echo ""

install:
	~/.pyenv/versions/3.12.3/bin/python3.12 -m venv venv
	venv/bin/pip install -r requirements.txt

start:
	venv/bin/uvicorn api.main:app --reload --port 8042

migrate:
	@supabase projects list > /dev/null 2>&1 || supabase login
	@supabase link 2>/dev/null || true
	supabase db push
