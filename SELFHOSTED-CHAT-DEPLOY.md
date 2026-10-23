# Deploy the self-hosted chat from the repository root

This repository contains the standalone chat app in `selfhosted-chat/`. The root-level `Dockerfile` builds that app, so run deployment commands from the repository root (`/root/openui/source` on the server).

## 1. Configure environment

The root `.env` is local and must never be committed. If it does not exist yet, copy the template:

```bash
cd /root/openui/source
cp selfhosted-chat.env.example .env
chmod 600 .env
nano .env
```

Set a valid `OPENAI_API_KEY` and replace `APP_PASSWORD` with a long random password. Do not paste the key into chat or commit `.env`.

If `.env` already exists, edit it; do not overwrite it with the template.

## 2. Build the image

```bash
cd /root/openui/source
docker build -t openui-selfhosted-chat:1.0 -f Dockerfile .
```

The Dockerfile uses `selfhosted-chat/package.json` and builds the standalone app without requiring Docker Compose.

## 3. Start the container without disturbing existing services

First check whether this container name is already in use:

```bash
docker ps -a --filter 'name=^/openui_selfhosted_chat$'
```

If the name is already listed, do not create another container with the same name; inspect it first. Otherwise:

```bash
mkdir -p /root/openui/source/data
# The app runs as an unprivileged user; allow its container UID to write to this dedicated data directory.
chown -R 1000:1000 /root/openui/source/data

docker run -d \
  --name openui_selfhosted_chat \
  --restart unless-stopped \
  --env-file /root/openui/source/.env \
  -e DATA_DIR=/data \
  -p 1654:3000 \
  -v /root/openui/source/data:/data \
  openui-selfhosted-chat:1.0
```

Do not remove or stop any other container. The bind-mounted SQLite database is stored at `/root/openui/source/data/chat-history.sqlite`.

## 4. Verify

```bash
docker ps --filter 'name=^/openui_selfhosted_chat$'
docker logs --tail 100 openui_selfhosted_chat
curl -i --max-time 10 http://127.0.0.1:1654/api/health
```

Open `http://SERVER_IP:1654`. The UI uses browser HTTP Basic Authentication: the password is `APP_PASSWORD`, and the username can be any value. Use HTTPS behind a reverse proxy/CDN before exposing the service over an untrusted network.

## Scope

This is a minimal standalone chat with server-side SQLite history using the GapGPT OpenAI-compatible API. It is not the full generated OpenUI GenUI experience. It is intentionally isolated from the existing services.
