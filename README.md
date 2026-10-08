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

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL_CA`
- `CORS_ORIGINS`: comma-separated allowed frontend origins
- `FLASK_DEBUG`: enable only for local development; defaults to `false`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`: optional Twilio credentials for sending order confirmation SMS messages. Without all three values, orders are saved but SMS is not sent.

Frontend setting:

- `VITE_API_URL`: API base URL, including `/api`. Vite values are bundled into the public frontend, so never put credentials or secrets in frontend environment variables.

## Hosting status

The product, purchase, sales, and customer-order APIs use MySQL. Login accounts are currently stored in the browser and the API has no server-side authentication or authorization, so this project is not safe to expose publicly. SMS order confirmations require Twilio credentials. Gifts, expenses, and settings are UI placeholders; reports are limited to basic product/stock calculations. Add server-side authentication and authorization, finish the unfinished modules, and define database migrations, backups, and a production deployment target before public launch.

## Deploy to Render

1. Create a TiDB Cloud Starter instance, which accepts MySQL-protocol connections and includes a monthly free allowance. Usage beyond the allowance can be billed, so configure a spending limit. Create the `business_management` database and get its public connection details from the TiDB console.
2. In the Render Dashboard, choose **New > Blueprint** and select this GitHub repository. Render reads the root `render.yaml` and creates the API and frontend services.
3. Enter the database host, username, password, and database name when prompted. The Blueprint configures TiDB's port and TLS verification, and connects the frontend URL to the API with the matching CORS origin.
4. Wait for both services to finish deploying, then open the frontend service URL.

The API creates its tables when it starts. Do not expose this demo publicly with real business data until server-side authentication and authorization are implemented; login accounts are browser-local and the API endpoints are unauthenticated.
