# Email Travel Parser

Scans Gmail booking confirmation emails from known travel brands (Airbnb, Booking.com, Ryanair, Viator, etc.) and builds a structured travel preference profile.

## Setup

### 1. Python

Install Python 3.12 via pyenv:

```bash
brew install pyenv
pyenv install 3.12.3
pyenv local 3.12.3
```

### 2. Dependencies

```bash
make install
```

### 3. Gmail OAuth credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → **APIs & Services → Library** → enable **Gmail API**
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Type: **Web application**
   - Authorised JavaScript origins: `http://localhost:8042`
   - Authorised redirect URIs: `http://localhost:8042/oauth/callback`
4. Download JSON → rename to `credentials.json` → place in this directory
5. **Google Auth Platform → Audience** → add your Gmail address as a test user
6. **Google Auth Platform → Data access** → add scope `gmail.readonly`

### 4. Supabase

```bash
supabase login
make migrate
```

When prompted during `make migrate`, enter your project ref from your Supabase dashboard URL:
`https://supabase.com/dashboard/project/<project-ref>`

## Running

```bash
make start
```

Open `http://localhost:8042`, click **Connect Gmail** and sign in with the Gmail account you added as a test user.

## Commands

```bash
make install   # Install Python dependencies
make start     # Start the server (port 8042, hot reload)
make migrate   # Link Supabase and push migrations
```

## Project structure

```
api/               FastAPI routes (auth, scan, preferences)
gmail/             Gmail API client (auth, fetcher, parser)
detection/         Keyword config, activity signals, profile builder
observability/     Logging setup
templates/         Jinja2 HTML templates
supabase/          Database migrations
data/              Custom categories (written at runtime)
```
