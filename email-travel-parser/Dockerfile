FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Optional: place a Linux amd64 binary at bin/msgvault-linux before building.
# The web app works without it — msgvault is only needed for the taste-profile pipeline script.
RUN if [ -f bin/msgvault-linux ]; then \
      install -m 0755 bin/msgvault-linux /usr/local/bin/msgvault; \
    fi

EXPOSE 8042

CMD ["uvicorn", "api.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8042", \
     "--proxy-headers", \
     "--forwarded-allow-ips=*"]
