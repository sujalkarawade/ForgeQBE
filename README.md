# ForgeQBE — Query-by-Example Database Explorer

> Show examples of the data you want → AI learns the pattern → generates accurate SQL queries.

No SQL knowledge required. Connect your PostgreSQL database, provide a few example rows, and ForgeQBE figures out the query.

---

## How It Works

1. **Connect** your PostgreSQL database via the sidebar
2. **Provide examples** — enter rows of data you want to find using the table editor or JSON input
3. **Pattern analysis** — the backend extracts your schema, parses examples, identifies filters and aggregations, and builds candidate SQL queries
4. **LLM refinement** — OpenRouter (GPT-4o by default) ranks and refines candidates into the best query
5. **Execute & validate** — the query runs on your real database and results are validated against your examples
6. **Iterate** — refine the query with natural language feedback

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js + Express |
| LLM | OpenRouter API (OpenAI-compatible) |
| Default Model | `openai/gpt-4o` (configurable) |
| Database | PostgreSQL via `pg` |
| Frontend | React 18 + Vite 5 |
| Styling | Plain CSS — white theme |
| API | REST / JSON |

---

## Project Structure

```
forgeqbe/
├── backend/
│   ├── src/
│   │   ├── index.js                    # Express server entry
│   │   ├── db/
│   │   │   ├── connectionManager.js    # PostgreSQL pool management
│   │   │   └── schemaInspector.js      # Schema extraction
│   │   ├── services/
│   │   │   ├── patternMatcher.js       # Example → SQL candidate logic
│   │   │   ├── llmService.js           # OpenRouter integration
│   │   │   └── queryValidator.js       # Result validation
│   │   └── routes/
│   │       ├── database.js             # Connect/disconnect endpoints
│   │       ├── schema.js               # Schema inspection endpoints
│   │       ├── query.js                # Generate/execute/refine endpoints
│   │       └── session.js              # Session management
│   ├── .env
│   └── package.json
│
├── frontend/
│   ├── index.html                      # Vite entry point
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── context/
│       │   └── SessionContext.jsx      # Global state (connection, schema, history)
│       ├── services/
│       │   └── api.js                  # Axios client
│       ├── components/
│       │   ├── Sidebar/                # Schema tree, query history, connection status
│       │   ├── MainPanel/              # Example editor, query results
│       │   ├── ConnectModal/           # DB connection form
│       │   └── shared/                 # SqlBlock, DataTable, ValidationBadge
│       └── styles/
│           ├── global.css
│           └── App.css
│
├── demo/
│   └── seed.sql                        # Sample PostgreSQL data
└── docker-compose.yml
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database (local, remote, or via Docker)
- [OpenRouter API key](https://openrouter.ai/keys)

### 1. Configure environment

```bash
# backend/.env
PORT=5000
NODE_ENV=development

OPENROUTER_API_KEY=your_openrouter_api_key_here
LLM_MODEL=openai/gpt-4o

APP_URL=http://localhost:3000
APP_NAME=ForgeQBE
```

### 2. Start the backend

```bash
cd backend
npm install
npm run dev
```

Backend runs at `http://localhost:5000`

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`

---

## Docker (run everything at once)

Starts PostgreSQL + backend + frontend together with a seeded demo database.

```bash
docker-compose up --build
```

Set `OPENROUTER_API_KEY` in your shell environment before running, or add it to a `.env` file at the project root:

```bash
OPENROUTER_API_KEY=your_key_here docker-compose up --build
```

Open [http://localhost:3000](http://localhost:3000) and connect using:

| Field | Value |
|-------|-------|
| Host | `localhost` |
| Port | `5432` |
| Database | `qbe_demo` |
| User | `postgres` |
| Password | `postgres` |

---

## Changing the LLM Model

ForgeQBE uses OpenRouter, which gives access to models from OpenAI, Anthropic, Google, and more. Change the model by updating `LLM_MODEL` in `backend/.env`:

```env
LLM_MODEL=openai/gpt-4o              # default
LLM_MODEL=anthropic/claude-3.5-sonnet
LLM_MODEL=google/gemini-2.5-pro
LLM_MODEL=openai/gpt-4o-mini          # lower cost
```

Full model list at [openrouter.ai/models](https://openrouter.ai/models).

---

## API Reference

### Database

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/database/connect` | Connect to a PostgreSQL database |
| `POST` | `/api/database/test` | Test a connection without storing it |
| `DELETE` | `/api/database/disconnect/:sessionId` | Disconnect a session |

### Schema

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/schema/:sessionId` | Get full schema |
| `GET` | `/api/schema/:sessionId/tables/:table/sample` | Get sample rows from a table |

### Query

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/query/generate` | Examples → SQL + executed results |
| `POST` | `/api/query/execute` | Execute raw SQL (read-only) |
| `POST` | `/api/query/refine` | Refine an existing query with feedback |

#### `POST /api/query/generate`

**Request**
```json
{
  "sessionId": "uuid",
  "examples": [
    { "name": "Alice", "status": "active", "country": "US" },
    { "name": "Bob",   "status": "active", "country": "US" }
  ],
  "hint": "Find active users in the US"
}
```

**Response**
```json
{
  "sql": "SELECT name, status, country FROM users WHERE status = 'active' AND country = 'US';",
  "explanation": "Selects users where status is active and country is US",
  "reasoning": "Both example rows share status='active' and country='US'...",
  "confidence": 0.92,
  "tablesUsed": ["users"],
  "results": { "rows": [...], "rowCount": 42, "duration": 12 },
  "validation": { "isValid": true, "matchRate": 1.0, "matchedExamples": 2 },
  "candidates": [{ "sql": "...", "confidence": 0.85 }]
}
```

---

## Security

- DDL/DML operations (`DROP`, `DELETE`, `INSERT`, `UPDATE`, etc.) are blocked at the validator level
- Only `SELECT` queries are permitted through the execute endpoint
- Database credentials are stored in-memory per session only — never persisted to disk
