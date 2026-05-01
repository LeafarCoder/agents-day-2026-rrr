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
	pip3 install -r requirements.txt

start:
	uvicorn api.main:app --reload --port 8042

migrate:
	supabase db push
