# OpenUI Self-hosted Chat (Docker)

This folder is a self-hosted chat app intended to validate the GapGPT OpenAI-compatible API and server-side conversation persistence independently of the OpenUI monorepo build.

## Requirements

- Docker Engine 24+ (tested target: Docker 29)
- A GapGPT API key with access to the configured model
- Server port 1654 available
- Persistent host directory for SQLite data

## Configure

```bash
cp .env.example .env
nano .env
```

Set `OPENAI_API_KEY` and a long random `APP_PASSWORD`. Keep `.env` private; never commit API keys or passwords. The UI and history APIs require HTTP Basic Authentication; use HTTPS (for example, behind your existing reverse proxy/CDN) whenever the server is reachable over an untrusted network. The health endpoint is intentionally public and does not expose secrets.

## Build and run without Docker Compose

```bash
docker build -t openui-selfhosted-chat:1.0 .
mkdir -p ./data
docker run -d \
  --name openui_selfhosted_chat \
  --restart unless-stopped \
  --env-file .env \
  -e DATA_DIR=/data \
  -p 1654:3000 \
  -v "$(pwd)/data:/data" \
  openui-selfhosted-chat:1.0
```

Open `http://SERVER_IP:1654`. Existing containers are not stopped or replaced.

## Authentication\n\nThe site prompts for a username/password using browser HTTP Basic Authentication. The username can be any value; the password must match `APP_PASSWORD`. Set a long random password before starting. This is a shared-password setup, not per-user accounts.\n\n## Server-side history

SQLite database: `/data/chat-history.sqlite` inside the container. The Docker bind mount stores it in `./data/chat-history.sqlite` on the host, so messages and thread lists survive container replacement/recreation as long as the host directory is preserved.

## Check

```bash
docker ps --filter name=openui_selfhosted_chat
docker logs --tail 100 openui_selfhosted_chat
curl -fsS http://127.0.0.1:1654/api/health
```

The health endpoint reports whether an API key is configured, never the key itself.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `OPENAI_BASE_URL` | `https://api.gapgpt.app/v1` | OpenAI-compatible API base |
| `OPENAI_API_KEY` | required at request time | API key; server-side only |
| `OPENAI_MODEL` | `gpt-5-mini` | Model ID supported by the provider |\n| `APP_PASSWORD` | required | Shared password for UI and history APIs |
| `DATA_DIR` | `./data` | Directory for SQLite history |

## Important scope note

This is a minimal self-hosted chat + persistence deployment target, not yet the full generated OpenUI GenUI experience from the separate `openui-server` scaffold. It is meant to validate deployment, provider connectivity, and durable server-side history first. Do not expose it publicly without adding authentication or putting it behind an authenticated reverse proxy.
