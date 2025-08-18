> **Note:** This codebase was written almost entirely by GitHub Copilot.

# HistoryExplorer

HistoryExplorer is a modern full-stack web application for exploring, searching, and visualizing historical events on an interactive timeline and map. Users can browse, filter, and (if authorized) contribute events, with support for tags, book references, and rich metadata. The backend uses Supabase for authentication, data storage, and access control, while the frontend leverages React, D3.js, and MapLibre for interactive visualizations. AI-powered features (OpenAI/Azure OpenAI) provide automatic event enrichment, summaries, and a conversational chatbot.

## Features
- Interactive timeline and map visualization of historical events
- Powerful filtering by date range, search term, tags, book references, region, and country
- Zoom and group by event, century, or millennium
- Add, edit, and delete events (admin users only, managed via Supabase)
- Google OAuth authentication via Supabase
- AI-powered enrichment of event descriptions, tags, regions, and summaries (OpenAI/Azure OpenAI)
- Conversational chatbot for historical Q&A with inline event citations
- Book reference management and cover image support
- Admin tools for managing allowed users and configuration

## Prerequisites
- Node.js (v18+ recommended)
- npm or yarn
- Supabase project (with tables: `events`, `allowed_emails`, and optionally `summary_cache`, `messages`, `config`)
- Google OAuth credentials (for Supabase Auth)
- OpenAI API key and/or Azure OpenAI Service credentials (for AI features)

## Getting Started

### 1. Clone the repository
```
git clone https://github.com/soiferj/historymap.git
cd historymap
```

### 2. Set up environment variables
Create `.env` files in both `server/` and `client/` directories:

#### `server/.env`
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_role_key
OPENAI_API_KEY=your_openai_api_key
PORT=5000
```

#### `client/.env`
```
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_KEY=your_supabase_anon_key
REACT_APP_API_URL=http://localhost:5000
```

### 3. Install dependencies
```
cd server
npm install
cd ../client
npm install
```

### 4. Start the development servers
In two terminals:
- **Backend:**
  ```
  cd server
  npm start
  ```
- **Frontend:**
  ```
  cd client
  npm start
  ```

The frontend will run on [http://localhost:3000](http://localhost:3000) and the backend on [http://localhost:5000](http://localhost:5000).

---

## Supabase Database Setup

1. **Create a Supabase Project**
   - Go to [https://app.supabase.com/](https://app.supabase.com/) and create a new project.
   - Note your project URL and API keys (anon and service role).

2. **Set Up Authentication**
   - In the Supabase dashboard, go to **Authentication > Providers** and enable Google (or your preferred OAuth provider).
   - Configure the redirect URL to `http://localhost:3000` for local development.

3. **Create Tables**
   - Go to **Table Editor** and create the following tables:

   **events**
   | Column         | Type      | Notes                       |
   | -------------- | --------- | --------------------------- |
   | id             | uuid      | Primary key, default: uuid_generate_v4() |
   | title          | text      |                             |
   | description    | text      |                             |
   | date           | text      | ISO string or year          |
   | tags           | text[]    | Array of tags               |
   | book_reference | text      | Optional                    |
   | date_type      | text      | Optional (e.g. 'year', 'century') |
   | regions        | text[]    | Optional                    |
   | countries      | text[]    | Optional                    |
   | created_at     | timestamp | Default: now()              |

   **allowed_emails**
   | Column | Type | Notes                |
   | ------ | ---- | --------------------|
   | email  | text | Primary key, unique |

   *(You can add more columns as needed for your use case.)*

4. **(Optional) Additional Tables**
   - If you want to use features like summaries, chatbot, or config, create these tables:
     - `summary_cache` (for event summaries)
     - `messages` (for chatbot conversations)
     - `config` (for app config key/values)

5. **Get Your API Keys**
   - In **Project Settings > API**, copy the `anon` and `service_role` keys for use in your `.env` files.

6. **Test Your Setup**
   - Try registering/logging in from the frontend.
   - Add your email to `allowed_emails` to get admin privileges.
   - Add, edit, or delete events as an admin.

---

## OpenAI and Azure OpenAI Setup

### 1. OpenAI API
- **Sign up** at [OpenAI](https://platform.openai.com/) and create an API key.
- Add your API key to `server/.env` as `OPENAI_API_KEY=your_openai_api_key`.
- The backend uses the `openai` npm package (already in dependencies).
- No further setup is needed for OpenAI usage.

### 2. Azure OpenAI API (Optional)
- **Sign up** for [Azure OpenAI Service](https://azure.microsoft.com/en-us/products/ai-services/openai-service/).
- Deploy your desired models (e.g., GPT-4, Mistral, Llama 3) in the Azure portal.
- In the Azure portal, get your endpoint and API key.
- Add these to `server/.env`:
  ```
  AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint
  AZURE_OPENAI_KEY=your_azure_openai_key
  # Optionally, set deployment names for each model:
  AZURE_MISTRAL_SMALL_DEPLOYMENT=your_mistral_small_deployment_name
  AZURE_LLAMA3_8B_DEPLOYMENT=your_llama3_8b_deployment_name
  AZURE_MISTRAL_NEMO_DEPLOYMENT=your_mistral_nemo_deployment_name
  AZURE_GPT_41_DEPLOYMENT=your_gpt_41_deployment_name
  ```
- The backend will automatically use the correct provider based on your config (see `server/routes/modelProvider.js`).

### 3. Switching Between Providers
- The model used for event enrichment and chatbot is set in the Supabase `config` table (key: `events_model`).
- You can update this value to use either an OpenAI or Azure model (e.g., `gpt-4.1-nano`, `mistral-small`, etc.).
- If the config is not set, the backend defaults to OpenAI nano.

---

## Deployment
- Set environment variables for production in your deployment environment.
- Build the frontend:
  ```
  cd client
  npm run build
  ```
- Deploy the `client/build` directory as your static site (e.g., Vercel, Netlify, or your own server).
- Deploy the backend (`server/`) to your preferred Node.js hosting (e.g., Render, Railway, Heroku, or your own server).
- Ensure both frontend and backend have access to the correct environment variables and can communicate over HTTPS.

## Automated nightly DB backup (GitHub Actions)

This repository includes a scheduled GitHub Actions workflow at `.github/workflows/nightly-db-backup.yml` that runs your `scripts/backup_supabase.sh`, compresses the SQL dump, and uploads it to Azure Blob Storage.

Quick details:
- Workflow path: `.github/workflows/nightly-db-backup.yml`
- Default schedule: daily at 02:00 UTC (cron `0 2 * * *`). Change the cron expression in the workflow to adjust the time.
- Script used: `scripts/backup_supabase.sh` (outputs to `./.dbbackups`).

Required GitHub repository secrets (set under Settings → Secrets):
- PGHOST
- PGPORT
- PGUSER
- PGPASSWORD
- PGDATABASE
- AZURE_STORAGE_CONNECTION_STRING
- AZURE_STORAGE_CONTAINER

Notes:
- The workflow runs on `ubuntu-latest` and installs `postgresql-client` so `pg_dump` is available. The workflow sets `PGSSLMODE=require` so pg_dump connects to Supabase over TLS.
- Do not commit database credentials or `.env` files. Use repository secrets or Azure App Settings for production.
- You can trigger the workflow manually from the Actions tab (the workflow supports `workflow_dispatch` for testing).

## License
MIT
