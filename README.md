# MIST Avinya Admin Dashboard

Responsive MERN administration portal for employees, companies, calls, business recording metadata, reporting and audit trails.

## Start locally

1. Copy `.env.example` to `server/.env` and set a MongoDB URI and long JWT secret.
2. Run `npm run install:all`.
3. Run `npm run dev` and open `http://localhost:5173`.

### Sample MongoDB data

Set `MONGODB_URI` in `server/.env` to your MongoDB Atlas database URI (include the database name, for example `mist_avinya`), then run:

```powershell
cd server
npm run seed
```

This creates idempotent sample documents in the configured database: employees, companies, contacts, calls, recording metadata, an audit entry, and a demo admin account (`admin@mistavinya.local` / `Admin@12345`). It also generates three short WAV fixture recordings in `server/public/recordings/`; uploaded sample records play from the local API at `/recordings/<file>`. The remaining recording records intentionally show pending/failed upload states. Use S3 only when you are ready to store real recordings privately.

The UI is populated with presentation data until the API is connected. The server provides JWT authentication, RBAC, filtering/pagination-ready endpoints, MongoDB models and short-lived private S3 playback links. Personal calls never receive recordings through the model/API design. AWS credentials remain server-side; use an IAM role in production.

## Security notes

- S3 bucket stays private; only a five-minute presigned GET URL is returned after authorization.
- No audio binaries are stored in MongoDB, only object metadata and keys.
- Login is rate-limited; Helmet, CORS, request validation and Mongo sanitization are enabled.
