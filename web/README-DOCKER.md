# Auto-Cursor Web - Docker Setup

## Quick Start

### Using Docker Compose (Recommended)

```bash
cd web
docker-compose up -d
```

The server will be available at `http://localhost:8765`

### Using Docker Directly

```bash
cd web
docker build -t auto-cursor-web .
docker run -d -p 8765:8765 \
  -v ~/.auto-cursor:/root/.auto-cursor:ro \
  -v /tmp/cursor-agents:/tmp/cursor-agents:ro \
  --name auto-cursor-web \
  auto-cursor-web
```

## Environment Variables

- `PORT`: Server port (default: 8765)
- `HOST`: Bind host (default: 0.0.0.0 for Docker)

## Volumes

- `~/.auto-cursor`: Auto-Cursor project data (read-only)
- `/tmp/cursor-agents`: Agent logs and state (read-only)

## Health Check

The container includes a health check that verifies the API is responding:
- Interval: 30s
- Timeout: 10s
- Retries: 3
- Start period: 5s

## Stopping

```bash
docker-compose down
# or
docker stop auto-cursor-web
docker rm auto-cursor-web
```
