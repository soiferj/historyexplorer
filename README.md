Note! This code is written almost entirely by Github Copilot.

# HistoryMap

HistoryMap is a full-stack web application for exploring historical events on an interactive timeline. Users can view, filter, and (if authorized) add, edit, or delete events, with support for grouping by tags or book references. The backend uses Supabase for authentication and data storage. The frontend is built with React and D3.js for rich, interactive visualizations.

## Features
- Interactive timeline visualization of historical events
- Filter by date range, search term, tags, or book references
- Zoom by event, century, or millennium
- Add, edit, and delete events (authorized users only)
- Google OAuth authentication via Supabase
- Automatic enrichment of event descriptions and tags using OpenAI

## Prerequisites
- Node.js (v18+ recommended)
- npm or yarn
- Supabase project (with tables: `events`, `allowed_emails`)
- OpenAI API key (for event enrichment)

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

## Database Schema
- `events` table: stores event data (title, description, date, tags, book_reference, date_type, etc.)
- `allowed_emails` table: stores emails allowed to add/edit/delete events

## License
MIT
