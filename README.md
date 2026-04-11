# Slovenian Genealogical Index

A searchable web application for genealogical data with a PostgreSQL database, Python FastAPI backend, and a vanilla JavaScript frontend.

## Architecture

| Layer            | Technology                                      |
| ---------------- | ----------------------------------------------- |
| Database         | PostgreSQL 16 (with `pg_trgm` for fuzzy search) |
| Backend API      | Python 3.11 / FastAPI / Uvicorn                 |
| Frontend         | Vanilla JS / HTML / CSS (Vite build)            |
| Reverse proxy    | Caddy 2                                         |
| Containerisation | Docker & Docker Compose                         |

```
Internet → Caddy → /          → static files (frontend dist/)
                 → api.domain → Docker: sgi_api (FastAPI :8000)
                                        ↕
                                Docker: sgi_postgres (:5432)
```

---

## Prerequisites

| Tool                    | Notes                                         |
| ----------------------- | --------------------------------------------- |
| Docker + Docker Compose | v2+ (`docker compose` command)                           |
| Node.js + Yarn          | For building the frontend                                |
| ged-tools               | For GEDCOM cleanup and JSON extraction (Python 3 based)  |
| Caddy 2                 | As the reverse proxy / web server on the host            |

---

## 1. Data Extraction (Run Locally)

### 1.0 Data Folder Structure

The `data/` directory is gitignored. Create it manually with the following layout:

```
data/
├── input/       # Raw .ged files as received from contributors
├── filtered/    # Cleaned .ged files after privacy filtering (see step 1.1)
└── output/      # JSON files extracted for DB import + metadata.json
```

```bash
mkdir -p data/input data/filtered data/output
```

### 1.1 GEDCOM Cleanup (Recommended)

Before importing, GEDCOM files should be stripped of living persons and persons who died within the last 20 years to protect privacy.

Use [ged-tools](https://github.com/rodoslovje/ged-tools), which includes a `srd_index_cleanup` preset with SGI-specific rules.

```bash
# Clone and set up ged-tools (one-time)
git clone https://github.com/rodoslovje/ged-tools.git
cd ged-tools
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Run the cleanup for each contributor file:

```bash
# From inside the ged-tools directory
python tools/gedcom_cleaner.py \
  /path/to/data/input/contributor.ged \
  /path/to/data/filtered/contributor.ged \
  --warn --stats --preset index_cleanup_sgi
```

Repeat for each contributor file. The cleaned files in `data/filtered/` are then ready for JSON extraction.

> The `index_cleanup_sgi` preset: standardises dates and places, removes records with no valid names, and anonymises persons likely still living (within 100 years of birth) or who died within the last 20 years.

### 1.2 JSON Extraction

Extract JSON records from the cleaned GEDCOM files into the format required for DB import.

The extraction script has moved to [ged-tools](https://github.com/rodoslovje/ged-tools) — the same repo used for cleanup in step 1.1. If you have already cloned and set up ged-tools, no additional setup is needed.

1. Place cleaned `.ged` files in `data/filtered/` (either copied manually or produced by step 1.1).
2. Run the extraction script from inside the ged-tools directory:

   ```bash
   # From inside the ged-tools directory (venv already active from step 1.1)
   python tools/gedcom-to-json.py --mode update --data-dir /path/to/srd-slo-index/data
   ```

   Output JSON files and `metadata.json` are written to `data/output/`.

   **Arguments:**
   - `--mode update` _(default)_ — skips files already up-to-date
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

- `--mode update` _(default)_ — only reimports contributors whose data has changed
- `--mode full` — reimports all contributors
- `--drop-tables` — drops and recreates all tables first (full reimport)
- `--force-births` / `--force-families` / `--force-deaths` — force reimport of specific record types

---

## 3. Caddy Setup (Docker)

Caddy runs as a Docker container on the same `caddy_net` network as the app. It handles TLS automatically and resolves backend containers by name. A `conf.d/` folder pattern lets each service ship its own `.caddyfile` snippet that Caddy imports on startup.

### 3.1 Server directory layout

This repository ships ready-made Caddy config files in the `caddy/` directory:

```
caddy/
├── docker-compose.yml   # Caddy container definition
├── Caddyfile            # Root config — imports conf.d/
└── sgi.caddyfile        # This project's site block (copy to conf.d/ on server)
```

Copy the `caddy/` directory to your server once (shared by all services):

```bash
scp -r caddy/ user@yourserver:/srv/caddy
```

On the server, create the `conf.d/` directory and add the SGI snippet:

```bash
mkdir -p /srv/caddy/conf.d
cp /srv/caddy/sgi.caddyfile /srv/caddy/conf.d/sgi.caddyfile
```

The final server layout:

```
/srv/caddy/
├── docker-compose.yml      # Caddy container (caddy/docker-compose.yml)
├── Caddyfile               # Root config (caddy/Caddyfile)
├── conf.d/                 # Per-service snippets — one .caddyfile per project
│   └── sgi.caddyfile       # ← copied from caddy/sgi.caddyfile
└── data/                   # Docker volume mount for Caddy TLS certs (auto-created)
```

### 3.2 Root Caddyfile

`caddy/Caddyfile` imports all snippets from `conf.d/` automatically. No edits needed when adding new services — just drop a file in `conf.d/` and reload.

### 3.3 Caddy docker-compose.yml

`caddy/docker-compose.yml` defines the Caddy container. Key points:

- Ports 80/443 exposed to the internet
- `conf.d/` bind-mounted read-only — edit files on the host, reload Caddy to apply
- TLS certificate data stored in a named Docker volume (`caddy_data`) so certs survive container restarts
- `/var/www` bind-mounted read-only for static sites

Start Caddy:

```bash
cd /srv/caddy
docker compose up -d
```

### 3.4 Per-service snippet (this project)

This repository ships a ready-made snippet at `caddy/sgi.caddyfile`. Copy it to the server and customise the domain names:

```bash
scp caddy/sgi.caddyfile user@yourserver:/srv/caddy/conf.d/sgi.caddyfile
```

Edit the copy on the server — replace `yourdomain.com` and `api.yourdomain.com`:

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

> Caddy resolves `sgi_api` by container name because both the Caddy container and the app containers are on `caddy_net`.

> TLS certificates are obtained from Let's Encrypt automatically — no extra configuration needed.

### 3.5 Reload Caddy after config changes

```bash
docker exec caddy caddy reload --config /etc/caddy/Caddyfile

# Validate before reloading:
docker exec caddy caddy validate --config /etc/caddy/Caddyfile && \
  docker exec caddy caddy reload --config /etc/caddy/Caddyfile
```

### 3.6 Adding another service later

1. Drop a new `myservice.caddyfile` into `/srv/caddy/conf.d/`.
2. Reload Caddy (step 3.5). No changes to the root `Caddyfile` or Caddy container needed.

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
# 1. locally — clean raw GEDCOM files (remove living persons / recent deaths)
#    see Section 1.1 for ged-tools setup; run from inside the ged-tools directory
python tools/gedcom_cleaner.py \
  /path/to/srd-slo-index/data/input/contributor.ged \
  /path/to/srd-slo-index/data/filtered/contributor.ged \
  --preset srd_index_cleanup

# 2. locally — re-extract JSON from cleaned files (run from inside ged-tools directory)
python tools/gedcom-to-json.py --mode update --data-dir /path/to/srd-slo-index/data

# 3. copy data/output/ to server
rsync -avz data/output/ user@yourserver:/path/to/sgi/data/output/

# 4. on server — reimport changed contributors
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
