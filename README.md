# ForgeQBE — Query-by-Example Database Explorer

> Show examples of data you want → AI learns the pattern → generates correct SQL queries.

Like GitHub Copilot, but for databases.

---

## How It Works

1. **Connect** your PostgreSQL database
2. **Show examples** — enter rows of data you want to find (table UI or JSON)
3. **Pattern analysis** — the system extracts schema, parses examples, identifies filtering/aggregation logic, and builds candidate SQL queries
4. **LLM refinement** — GPT-4 ranks and refines the candidates into the best query
5. **Execute & validate** — the query runs on your real DB and results are validated against your examples
6. **Iterate** — refine the query with natural language feedback

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| LLM | OpenAI GPT-4 |
| Database | PostgreSQL (via `pg`) |
| DB Abstraction | Sequelize-compatible connection pooling |
| Frontend | React (plain JS + CSS) |
| API | REST (JSON) |

---

## Project Structure

```
forgeqbe/
├── backend/
│   ├── src/
│   │   ├── index.js              # Express server entry
│   │   ├── db/
│   │   │   ├── connectionManager.js   # PostgreSQL pool management
│   │   │   └── schemaInspector.js     # Schema extraction
│   │   ├── services/
│   │   │   ├── patternMatcher.js      # Example → SQL candidate logic
│   │   │   ├── llmService.js          # OpenAI integration
│   │   │   └── queryValidator.js      # Result validation
│   │   └── routes/
│   │       ├── database.js    # Connect/disconnect endpoints
│   │       ├── schema.js      # Schema inspection endpoints
│   │       ├── query.js       # Generate/execute/refine endpoints
│   │       └── session.js     # Session management
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── index.js
    │   ├── App.js
    │   ├── context/
    │   │   └── SessionContext.js   # Global state (connection, schema, history)
    │   ├── services/
    │   │   └── api.js              # Axios client
    │   ├── components/
    │   │   ├── Sidebar/            # Schema tree, query history, connection status
    │   │   ├── MainPanel/          # Example editor, query results
    │   │   ├── ConnectModal/       # DB connection form
    │   │   └── shared/             # SqlBlock, DataTable, ValidationBadge
    │   └── styles/
    └── package.json
```

---

## Quick Start

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env — add your OPENAI_API_KEY
npm install
npm run dev
```

### 2. Frontend

```bash
cd frontend
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000)

---

## API Endpoints

### Database
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/database/connect` | Connect to a PostgreSQL database |
| POST | `/api/database/test` | Test connection without storing |
| DELETE | `/api/database/disconnect/:sessionId` | Disconnect |

### Schema
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/schema/:sessionId` | Get full schema |
| GET | `/api/schema/:sessionId/tables/:table/sample` | Get sample rows |

### Query
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/query/generate` | Main: examples → SQL + results |
| POST | `/api/query/execute` | Execute raw SQL (read-only) |
| POST | `/api/query/refine` | Refine query with feedback |

### `/api/query/generate` Request Body
```json
{
  "sessionId": "uuid",
  "examples": [
    { "name": "Alice", "status": "active", "country": "US" }
  ],
  "hint": "Find active users in the US"
}
```

### `/api/query/generate` Response
```json
{
  "sql": "SELECT name, status, country FROM users WHERE status = 'active' AND country = 'US';",
  "explanation": "Selects users where status is active and country is US",
  "reasoning": "Both example rows share status='active' and country='US'...",
  "confidence": 0.92,
  "tablesUsed": ["users"],
  "results": { "rows": [...], "rowCount": 42, "duration": 12 },
  "validation": { "isValid": true, "matchRate": 1.0, "matchedExamples": 1 },
  "candidates": [{ "sql": "...", "confidence": 0.85 }]
}
```

---

## Environment Variables

```env
PORT=5000
OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-4          # or gpt-3.5-turbo for lower cost
```

---

## Security

- All SQL is sanitized before execution — DDL/DML operations (DROP, DELETE, INSERT, UPDATE, etc.) are blocked
- Only SELECT queries are allowed through the execute endpoint
- Connection credentials are stored in-memory per session only (not persisted)
