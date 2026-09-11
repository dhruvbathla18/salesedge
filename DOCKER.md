# Running SalesEdge with Docker on EC2

This project ships as two containers plus an optional database:

| Service    | Image base          | Port | Role                                              |
|------------|---------------------|------|---------------------------------------------------|
| `frontend` | nginx (built Vite)  | 80   | Serves the React SPA, reverse-proxies `/api`      |
| `backend`  | node:20-alpine      | 5000 | Express API (internal only, reached via frontend) |
| `postgres` | postgres:16-alpine  | 5432 | Optional local DB (skip if using AWS RDS)         |

The browser only talks to the `frontend` (port 80). nginx forwards `/api`,
`/recordings`, and `/public` to the `backend` over the internal Docker network,
so the backend port does not need to be exposed publicly.

---

## 1. Prerequisites on the EC2 instance

```bash
# Amazon Linux 2023
sudo dnf install -y docker
sudo systemctl enable --now docker

# Docker Compose plugin
sudo dnf install -y docker-compose-plugin   # or: sudo yum install -y docker-compose-plugin

# (optional) run docker without sudo
sudo usermod -aG docker $USER   # then log out / back in
```

Open **inbound port 80** (and 443 if you add TLS) in the EC2 **Security Group**.

## 2. Configure environment

```bash
cd ~/salesedge
cp server/.env.docker.example server/.env
# edit server/.env: DB_HOST, DB_PASSWORD, JWT_SECRET, AWS keys, CLIENT_URL, etc.
```

- **Using AWS RDS:** set `DB_HOST` to the RDS endpoint. SSL is enabled
  automatically for any non-localhost host.
- **Using the bundled Postgres:** set `DB_HOST=postgres` in `server/.env`, and
  start compose with the `local-db` profile (see below).

## 3. Build and run

Using RDS (default — no local database):

```bash
docker compose up -d --build
```

Using the bundled Postgres container instead of RDS:

```bash
docker compose --profile local-db up -d --build
```

Check status and logs:

```bash
docker compose ps
docker compose logs -f backend
```

Open `http://<EC2-public-DNS>/` in a browser.

## 4. Database schema

Schema auto-sync only runs when `NODE_ENV=development`. In production
(`NODE_ENV=production`) create the schema explicitly, e.g.:

```bash
docker compose exec backend npm run db:sync
docker compose exec backend npm run seed   # optional: seed demo data
```

## 5. Common operations

```bash
docker compose down            # stop and remove containers
docker compose down -v         # also remove volumes (DB data + recordings)
docker compose up -d --build   # rebuild after code changes
docker compose restart backend
```

## Notes

- `VITE_API_URL` is baked into the frontend at build time and defaults to
  `/api`, so the SPA calls the same origin and nginx proxies it. If you serve
  the API from a different host, rebuild the frontend with a new value:
  `docker compose build --build-arg VITE_API_URL=https://api.example.com/api frontend`.
- Generated recordings persist in the `recordings` Docker volume.
- To add HTTPS, put an ALB or a reverse proxy (Caddy/Traefik) in front, or add
  a TLS-terminating nginx config with your certificate.
```
