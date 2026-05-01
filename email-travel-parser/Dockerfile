FROM public.ecr.aws/docker/library/python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    bash curl ca-certificates sqlite3 && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Prefer a checked-in Linux binary if present; otherwise install msgvault at build time.
RUN if [ -f bin/msgvault-linux ]; then \
      install -m 0755 bin/msgvault-linux /usr/local/bin/msgvault; \
    else \
      (curl -fsSL https://msgvault.io/install.sh || \
       curl -fsSL https://raw.githubusercontent.com/wesm/msgvault/main/install.sh) | bash && \
      command -v msgvault && \
      msgvault --version; \
    fi

RUN chmod +x /app/scripts/railway_start.sh

EXPOSE 8042

CMD ["/app/scripts/railway_start.sh"]
