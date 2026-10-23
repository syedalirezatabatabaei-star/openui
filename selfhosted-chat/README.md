# OpenUI Self-hosted Chat (Docker)

A minimal standalone chat deployment target to validate the GapGPT OpenAI-compatible API and persistent server-side conversation history independently of the OpenUI monorepo build.

## Important: where to run commands

Run commands from the repository root. The root-level `Dockerfile` builds the app in `selfhosted-chat/`.

See [SELFHOSTED-CHAT-DEPLOY.md](../SELFHOSTED-CHAT-DEPLOY.md) for the complete, root-relative server deployment steps.

## Requirements

- Docker Engine 24+ (tested target: Docker 29)
- A GapGPT API key with access to the configured model
- Host port 1654 available

## Environment

Copy `selfhosted-chat.env.example` to the repository-root `.env` if `.env` does not already exist. Set `OPENAI_API_KEY` and a long random `APP_PASSWORD`. Keep `.env` private; never commit API keys or passwords.

- `OPENAI_BASE_URL`: defaults to `https://api.gapgpt.app/v1`
- `OPENAI_API_KEY`: your private GapGPT key
- `OPENAI_MODEL`: defaults to `gpt-5-mini`
- `APP_PASSWORD`: shared HTTP Basic Authentication password
- `DATA_DIR`: `/data` inside the container

## Persistence and authentication

SQLite history is stored at `/data/chat-history.sqlite` inside the container and persisted on the host through a bind mount. The UI and history APIs require HTTP Basic Authentication; the username may be any value and the password must match `APP_PASSWORD`. This is shared-password authentication, not individual user accounts. The health endpoint is public and does not reveal the API key.

Use HTTPS (for example, through an authenticated reverse proxy/CDN) when reachable over an untrusted network.

## Scope

This is a minimal self-hosted chat + persistence deployment target, not the full generated OpenUI GenUI experience from the separate `openui-server` scaffold. It is intended to validate deployment, provider connectivity, and durable server-side history first.
