# Slovenian Genealogical Index

A searchable web application for genealogical data with a PostgreSQL database, Python FastAPI backend, and a vanilla JavaScript frontend.

## Architecture

| Layer | Technology |
|---|---|
| Database | PostgreSQL 16 (with `pg_trgm` for fuzzy search) |
| Backend API | Python 3.11 / FastAPI / Uvicorn |
| Frontend | Vanilla JS / HTML / CSS (Vite build) |
| Reverse proxy | Caddy 2 |
| Containerisation | Docker & Docker Compose |

```
Internet → Caddy → /          → static files (frontend dist/)
                 → api.domain → Docker: sgi_api (FastAPI :8000)
                                        ↕
                                Docker: sgi_postgres (:5432)
```

---

## Prerequisites

| Tool | Notes |
|---|---|
| Docker + Docker Compose | v2+ (`docker compose` command) |
| Node.js + Yarn | For building the frontend |
| Python 3 | For local data extraction only |
| Caddy 2 | As the reverse proxy / web server on the host |

---

## 1. Data Extraction (Run Locally)

Extract JSON records from your GEDCOM `.ged` files before importing them into the database.

1. Place `.ged` files in `data/filtered/` (create the directory if needed).
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r tools/requirements.txt
   ```
3. Run the extraction script:
   ```bash
   python tools/gedcom-to-json.py --mode update
   ```
   Output JSON files and `data/output/metadata.json` are written to `data/output/`.

   **Arguments:**
   - `--mode update` *(default)* — skips files already up-to-date
   - `--mode full` — reprocesses all files

---

## 2. Server Setup

### 2.1 Create the shared Docker network

Caddy (running on the host or in its own container) and the app containers communicate over a shared Docker network called `caddy_net`.

```bash
docker network create caddy_net
```

> If you already have a Caddy container on `caddy_net`, skip this step.

### 2.2 Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# PostgreSQL credentials
POSTGRES_DB=sgi_db
POSTGRES_USER=sgi_user
POSTGRES_PASSWORD=a_strong_password_here

# API hostname (without https://) — must match your Caddy config
SGI_API_HOST=api.yourdomain.com
```

### 2.3 Build and start the backend containers

```bash
docker compose up -d --build
```

This starts two containers:
- `sgi_postgres` — PostgreSQL database (data persisted in `postgres_data` Docker volume)
- `sgi_api` — FastAPI application on internal port 8000

Verify they are running:

```bash
docker compose ps
```

### 2.4 Import data into PostgreSQL

With the containers running, load the extracted JSON data:

```bash
docker compose exec api python tools/import_to_db.py --mode update
```

**Arguments:**
- `--mode update` *(default)* — only reimports contributors whose data has changed
- `--mode full` — reimports all contributors
- `--drop-tables` — drops and recreates all tables first (full reimport)
- `--force-births` / `--force-families` / `--force-deaths` — force reimport of specific record types

---

## 3. Caddy Configuration

Caddy acts as the reverse proxy for the API and serves the static frontend files.

### 3.1 Install Caddy

```bash
# Debian/Ubuntu
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
```

### 3.2 Caddyfile

Create or edit `/etc/caddy/Caddyfile`:

```caddyfile
# Frontend — serves the built Vite app
yourdomain.com {
    root * /var/www/sgi
    file_server
    try_files {path} /index.html
    encode gzip
}

# Backend API — reverse proxy to the Docker container
api.yourdomain.com {
    reverse_proxy sgi_api:8000 {
        header_up Host {host}
    }
    header Access-Control-Allow-Origin "https://yourdomain.com"
    encode gzip
}
```

> **Note:** Replace `yourdomain.com` and `api.yourdomain.com` with your actual domains. Caddy obtains and renews TLS certificates from Let's Encrypt automatically.

> **Docker network:** For Caddy to resolve `sgi_api` by container name, Caddy must be on `caddy_net`. Either run Caddy inside a container on that network, or use the container's published port (e.g. `localhost:8000`) if Caddy runs on the host.

Reload Caddy after any config change:

```bash
sudo systemctl reload caddy
# or, to validate first:
caddy validate --config /etc/caddy/Caddyfile && sudo systemctl reload caddy
```

---

## 4. Frontend Build and Deployment

### 4.1 Configure the API host

The frontend reads `SGI_API_HOST` at build time via Vite. Set it in a `.env` file in the project root (same file used by Docker Compose):

```env
SGI_API_HOST=api.yourdomain.com
```

### 4.2 Build

```bash
yarn install
yarn build
```

The production-ready files are written to `web/dist/`.

### 4.3 Deploy to the server

Copy the built files to the directory Caddy serves:

```bash
# Replace user@yourserver with your actual SSH target
ssh user@yourserver "mkdir -p /var/www/sgi"
rsync -avz --delete web/dist/ user@yourserver:/var/www/sgi/
```

Or with `scp`:

```bash
scp -r web/dist/* user@yourserver:/var/www/sgi/
```

No Caddy reload is needed — Caddy serves files directly from disk.

---

## 5. Updating

### Backend code change

```bash
docker compose up -d --build api
```

### Data update (new GEDCOM files)

```bash
# 1. locally — re-extract JSON
python tools/gedcom-to-json.py --mode update

# 2. copy data/output/ to server
rsync -avz data/output/ user@yourserver:/path/to/sgi/data/output/

# 3. on server — reimport changed contributors
docker compose exec api python tools/import_to_db.py --mode update
```

### Frontend change

```bash
yarn build
rsync -avz --delete web/dist/ user@yourserver:/var/www/sgi/
```

---

## 6. Local Development

Start the Vite dev server (accessible on the local network):

```bash
yarn dev
```

The dev server proxies API calls to `SGI_API_HOST` (set in `.env`) and hot-reloads on file changes.

Preview the production build locally:

```bash
yarn build && yarn preview
```
