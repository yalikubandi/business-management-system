# Business Management System

A React/Vite frontend, Flask API, and MySQL database.

## Local setup

Requirements: Python, Node.js/npm, and MySQL.

1. Create the MySQL database and a user with access to it. The application creates its tables when started, but does not create the database itself.
2. Copy `backend/.env.example` to `backend/.env` and set the database host, username, password, and database name.
3. Start the backend:

   ```sh
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   python app.py
   ```

4. In another terminal, copy `frontend/.env.example` to `frontend/.env`, then start the frontend:

   ```sh
   cd frontend
   npm install
   npm run dev
   ```

The Vite development server prints the frontend URL. The API defaults to `http://127.0.0.1:5000/api`.

## Environment settings

Backend settings are read from `backend/.env` or the hosting provider's environment configuration:

- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `CORS_ORIGINS`: comma-separated allowed frontend origins
- `FLASK_DEBUG`: enable only for local development; defaults to `false`

Frontend setting:

- `VITE_API_URL`: API base URL, including `/api`. Vite values are bundled into the public frontend, so never put credentials or secrets in frontend environment variables.

## Hosting status

The product, purchase, and sales APIs use MySQL. This project is not yet safe to expose publicly: the current login is a hardcoded client-side demo check, and the API has no server-side authentication. Gifts, expenses, and settings are UI placeholders; reports are limited to basic product/stock calculations. Add server-side authentication and authorization, finish the unfinished modules, and define database migrations, backups, and a production deployment target before public launch.
