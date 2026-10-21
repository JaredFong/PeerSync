# PeerSync Architecture

Browser frontend: HTML, CSS and vanilla JavaScript under `frontend/`.

REST API: Node.js + Express under `backend/`; route modules delegate to controllers. Express sessions protect authenticated endpoints.

Database: MySQL, created from `database/schema.sql`. The backend uses a MySQL connection pool.

Flow: Browser page -> JSON HTTP request -> Express route/controller -> MySQL -> JSON response -> UI update.

Feature ownership: XinKit owns student profile management; Jared owns support requests; Xun Yi owns feedback. Authentication, shared UI, schema integration and deployment are shared tasks.
