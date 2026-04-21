# Genealogical Index

A searchable web application for genealogical data with a PostgreSQL database, Python FastAPI backend, and a vanilla JavaScript frontend. Designed as a monorepo that supports multiple country installations sharing the same core code but with per-site branding, translations, and configuration.

## Architecture

| Layer            | Technology                                      |
| ---------------- | ----------------------------------------------- |
| Database         | PostgreSQL 16 (with `pg_trgm` for fuzzy search) |
| Backend API      | Python 3.11 / FastAPI / Uvicorn                 |
| Frontend         | Vanilla JS / HTML / CSS (Vite build)            |
| Reverse proxy    | Caddy 2                                         |
| Containerisation | Docker & Docker Compose                         |

```
Internet → Caddy → /          → static files (site dist/)
                 → api.domain → Docker: sgi_api (FastAPI :8000)
                                        ↕
                                Docker: sgi_postgres (:5432)
```

---

## Repository Layout

```
packages/
  core/
    web/          # Shared frontend (JS / HTML / CSS) — imports @site-config
    backend/      # Shared FastAPI application
    tools/        # Shared GEDCOM import scripts
  sites/
    slo/          # Slovenia installation
      web/
        site.config.js   # Branding, languages, intro texts, API host
        public/          # Logo, favicons
      vite.config.js     # Sets root=core/web, resolves @site-config alias
      package.json       # name: "slo-index"
      docker-compose.yml
      .env.example
      caddy/
data/             # Gitignored — raw GEDCOM files and extracted JSON
```

### Adding a new country installation

1. Copy `packages/sites/slo/` to e.g. `packages/sites/hrv/`.
2. Edit `packages/sites/hrv/web/site.config.js` — set logo, links, languages, intro texts, API host.
3. Replace assets in `packages/sites/hrv/web/public/`.
4. Edit `packages/sites/hrv/package.json` — set a unique `name` (e.g. `"hrv-index"`).
5. Add workspace scripts to the root `package.json`:
   ```json
   "dev:hrv": "npm run dev --workspace=packages/sites/hrv",
   "build:hrv": "npm run build --workspace=packages/sites/hrv"
   ```
6. Set up a `docker-compose.yml` and `.env` in `packages/sites/hrv/` pointing to the new server's data directory and API host.

---

## Prerequisites

| Tool                    | Notes                                         |
| ----------------------- | --------------------------------------------- |
| Docker + Docker Compose | v2+ (`docker compose` command)                |
| Node.js + npm           | For building the frontend                     |
| ged-tools               | For GEDCOM cleanup and JSON extraction (Python 3 based) |
| Caddy 2                 | As the reverse proxy / web server on the host |

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

Run the cleanup for all files in the input folder:

```bash
# From inside the ged-tools directory
python tools/gedcom-cleaner.py \
  --input-dir /path/to/data/input \
  --output-dir /path/to/data/filtered \
  --preset index_cleanup_sgi
```

The script runs in update mode by default — it skips files that are already up-to-date. The cleaned files in `data/filtered/` are then ready for JSON extraction.

> The `index_cleanup_sgi` preset: standardises dates and places, removes records with no valid names, and anonymises persons likely still living (within 100 years of birth) or who died within the last 20 years.

### 1.2 JSON Extraction

Extract JSON records from the cleaned GEDCOM files into the format required for DB import.

The extraction script has moved to [ged-tools](https://github.com/rodoslovje/ged-tools) — the same repo used for cleanup in step 1.1. If you have already cloned and set up ged-tools, no additional setup is needed.

1. Place cleaned `.ged` files in `data/filtered/` (either copied manually or produced by step 1.1).
2. Run the extraction script from inside the ged-tools directory:

   ```bash
   # From inside the ged-tools directory (venv already active from step 1.1)
   python tools/gedcom-to-json.py --mode update --data-dir /path/to/genealogical-index/data
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

Copy the example file and fill in your values (from the site directory, e.g. `packages/sites/slo/`):

```bash
cp packages/sites/slo/.env.example packages/sites/slo/.env
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
cd packages/sites/slo
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

This repository ships ready-made Caddy config files in `packages/sites/slo/caddy/`:

```
caddy/
├── docker-compose.yml   # Caddy container definition
├── Caddyfile            # Root config — imports conf.d/
└── sgi.caddyfile        # This project's site block (copy to conf.d/ on server)
```

Copy the `caddy/` directory to your server once (shared by all services):

```bash
scp -r packages/sites/slo/caddy/ user@yourserver:/srv/caddy
```

On the server, create the `conf.d/` directory and add the SGI snippet:

```bash
mkdir -p /srv/caddy/conf.d
cp /srv/caddy/sgi.caddyfile /srv/caddy/conf.d/sgi.caddyfile
```

The final server layout:

```
/srv/caddy/
├── docker-compose.yml      # Caddy container
├── Caddyfile               # Root config
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
scp packages/sites/slo/caddy/sgi.caddyfile user@yourserver:/srv/caddy/conf.d/sgi.caddyfile
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

The frontend reads the API host from the `apiHost` field in `packages/sites/slo/web/site.config.js`. Edit that field directly before building.

### 4.2 Install dependencies

```bash
npm install
```

### 4.3 Build

```bash
# Slovenia
npm run build:slo
```

The production-ready files are written to `packages/sites/slo/dist/`.

### 4.4 Deploy to the server

Copy the built files to the directory Caddy serves:

```bash
ssh user@yourserver "mkdir -p /var/www/sgi"
rsync -avz --delete packages/sites/slo/dist/ user@yourserver:/var/www/sgi/
```

No Caddy reload is needed — Caddy serves files directly from disk.

---

## 5. Updating

### Backend code change

```bash
cd packages/sites/slo
docker compose up -d --build api
```

### Data update (new GEDCOM files)

```bash
# 1. locally — clean raw GEDCOM files (remove living persons / recent deaths)
#    see Section 1.1 for ged-tools setup; run from inside the ged-tools directory
python tools/gedcom-cleaner.py \
  --input-dir /path/to/data/input \
  --output-dir /path/to/data/filtered \
  --preset index_cleanup_sgi

# 2. locally — re-extract JSON from cleaned files (run from inside ged-tools directory)
python tools/gedcom-to-json.py --mode update --data-dir /path/to/genealogical-index/data

# 3. copy data/output/ to server
rsync -avz data/output/ user@yourserver:/path/to/data/output/

# 4. on server — reimport changed contributors
cd packages/sites/slo
docker compose exec api python tools/import_to_db.py --mode update
```

### Frontend change

```bash
npm run build:slo
rsync -avz --delete packages/sites/slo/dist/ user@yourserver:/var/www/sgi/
```

---

## 6. Local Development

Start the Vite dev server (accessible on the local network):

```bash
npm run dev:slo
```

The dev server runs on port 1995 and hot-reloads on file changes in both `packages/core/web/` and `packages/sites/slo/web/`.

Preview the production build locally:

```bash
npm run build:slo && npm run preview:slo
```
