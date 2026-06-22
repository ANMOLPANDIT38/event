<p align="center">
  <img src="https://img.shields.io/badge/status-operational-22c55e?style=for-the-badge" alt="Status: Operational" />
  <img src="https://img.shields.io/badge/python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python 3.11+" />
  <img src="https://img.shields.io/badge/node-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node 18+" />
  <img src="https://img.shields.io/badge/react-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="License: MIT" />
</p>

# 🚨 GridLock Engine

### **Predictive Congestion Intelligence for Event-Driven Operations**

> _When a million people move toward one point on the map, you don't react — you **predict**.  
> GridLock Engine forecasts congestion impact scores and computes exact resource allocations **before** a single barricade is placed._

---

## The Problem

Large-scale public events — political rallies, sports finals, religious gatherings, marathon road closures — create **catastrophic, unpredictable congestion** across urban logistics networks. Operators at Flipkart and similar last-mile platforms face:

- **Blind deployment** of manpower and barricades with no data-driven basis.
- **Reactive firefighting** instead of preemptive resource staging.
- **Zero visibility** into which event types historically cause the worst gridlock.

Every hour of misallocated resources during a high-impact event burns operational budget and tanks delivery SLAs.

## The Solution

GridLock Engine is a **full-stack predictive intelligence platform** that ingests historical event data, trains a `RandomForestRegressor` on congestion patterns, and serves real-time forecasts through an operator-facing dashboard. An operator selects an upcoming event's parameters — type, duration, priority — and receives:

| Output | Description |
|---|---|
| **Congestion Impact Score** | 0–100 severity rating with animated ring visualization |
| **Recommended Manpower** | Exact headcount to deploy (2–50, algorithmically computed) |
| **Recommended Barricades** | Physical barrier count (1–30, scaled to severity) |
| **Diversion Flag** | Binary determination: does this event require active traffic diversion? |

**No guesswork. No gut calls. Pure signal.**

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        OPERATOR BROWSER                         │
│                     React 19 + Vite 8 Dashboard                 │
│                        localhost:5173                            │
│   Interactive event cards · Duration slider · Priority toggles  │
│   Animated score ring · Forecast history sidebar                │
└──────────────────────────┬──────────────────────────────────────┘
                           │  HTTP POST /api/forecast
                           │  (proxied via Vite dev server)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NODE.JS API GATEWAY                         │
│              Express 4 · CORS · Morgan · Axios                  │
│                        localhost:3000                            │
│                                                                 │
│   Routes:                                                       │
│     GET  /health           → Gateway health check               │
│     POST /api/train        → Proxy to forecasting /train        │
│     POST /api/forecast     → Validate + proxy to /forecast      │
│                                                                 │
│   Features: Request validation, error forwarding with           │
│   original status codes, field whitelisting                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │  HTTP POST /forecast
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  PYTHON FORECASTING ENGINE                       │
│         FastAPI · scikit-learn · Pandas · NumPy · Joblib         │
│                        localhost:8000                            │
│                                                                 │
│   Endpoints:                                                    │
│     GET  /health    → Model readiness check                     │
│     POST /train     → Ingest CSV + train RandomForestRegressor  │
│     POST /forecast  → Predict congestion + compute resources    │
│                                                                 │
│   Model: RandomForestRegressor (300 trees, max_depth=12)        │
│   Features: [event_type_encoded, duration_minutes, priority]    │
│   Training: Cartesian product of all event types × 8 durations  │
│             × 3 priority levels × 6 noise samples each          │
└──────────────────────────┬──────────────────────────────────────┘
                           │  pd.read_csv()
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DATASET LAYER                                │
│        Sanitized historical event data (CSV)                    │
│        ~4.5 MB · Anonymized · Production-representative         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Repository Structure

```
gridlock-engine/
├── forecasting/                # Python ML microservice
│   ├── app.py                  # FastAPI app — /train, /forecast, /health
│   ├── data_pipeline.py        # ETL: load CSV → clean → aggregate
│   └── requirements.txt        # Pinned Python dependencies
│
├── backend/                    # Node.js API gateway
│   ├── server.js               # Express server — validation + proxy
│   └── package.json            # Node dependencies
│
├── frontend/                   # React operator dashboard
│   ├── src/
│   │   ├── App.jsx             # Full interactive UI
│   │   ├── App.css             # Component styles (reserved)
│   │   ├── index.css           # Global reset
│   │   └── main.jsx            # React DOM entry point
│   ├── index.html              # HTML shell with Google Fonts
│   ├── vite.config.js          # Vite config with /api proxy
│   └── package.json            # Frontend dependencies
│
├── dataset/                    # Historical event data
│   └── *.csv                   # Anonymized event records (~4.5 MB)
│
├── README.md                   # ← You are here
└── .gitignore
```

---

## How to Run Locally (Step-by-Step)

### Cross-platform setup helpers

This repository includes helper scripts for both macOS and Windows.

- macOS / Linux: `./setup-mac.sh`
- Windows PowerShell: `./setup-windows.ps1`

Use them to create the virtual environment, install Python requirements, and install Node dependencies.

### Prerequisites

Install the following before you begin:

| Tool | Minimum Version | Install Link | Verify Command |
|---|---|---|---|
| **Python** | 3.11+ | [python.org/downloads](https://www.python.org/downloads/) | `python --version` |
| **Node.js** | 22.13+ or 24+ | [nodejs.org](https://nodejs.org/) | `node --version` |
| **npm** | 9+ | _(comes with Node.js)_ | `npm --version` |
| **pip** | 23+ | _(comes with Python)_ | `pip --version` |
| **Git** | Any | [git-scm.com](https://git-scm.com/) | `git --version` |

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/<your-username>/gridlock-engine.git
cd gridlock-engine
```

---

### Step 2: Start the Forecasting Engine (Python · Port 8000)

> **Open Terminal 1**

```bash
cd forecasting
```

**Create a virtual environment** (recommended to avoid dependency conflicts):

```bash
# macOS / Linux
python3 -m venv venv
source venv/bin/activate

# Windows (PowerShell)
python -m venv venv
venv\Scripts\activate
```

**Install Python dependencies:**

```bash
pip install -r requirements.txt
```

> ⚠️ If you see `pip` version warnings, they are safe to ignore.

**Start the FastAPI server:**

```bash
# macOS / Linux
uvicorn app:app --host 127.0.0.1 --port 8000 --reload

# Windows (PowerShell) — if uvicorn is not on PATH
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```

✅ **Expected output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

**Keep this terminal open and running.**

### Windows shortcut: PowerShell setup script

If you want the entire environment bootstrapped with a single command on Windows, run this from the repo root:

```powershell
.\setup-windows.ps1
```

### macOS / Linux shortcut

From the repository root:

```bash
./setup-mac.sh
```

This installs Python and Node dependencies and prepares the project for local development.

---

### Step 3: Train the ML Model (One-Time Setup)

> **Open Terminal 2** (any directory)

The model must be trained before forecasts can be made. This only needs to be done once (the model persists to disk).

```bash
# macOS / Linux
curl -X POST http://localhost:8000/train

# Windows (PowerShell)
Invoke-WebRequest -Method POST -Uri http://localhost:8000/train -UseBasicParsing
```

✅ **Expected output (key fields):**
```json
{
  "status": "success",
  "samples_trained": 1440,
  "feature_importances": {
    "event_type_encoded": 0.33,
    "duration_minutes": 0.34,
    "priority": 0.31
  }
}
```

> ⚠️ **All three feature importances must be non-zero.** If `duration_minutes` or `priority` shows `0.0`, something went wrong — re-check that you're running the latest code.

---

### Step 4: Start the Backend Gateway (Node.js · Port 3000)

> **Use Terminal 2** (or open a new one)

```bash
cd backend
npm install
npm run dev
```

> If you don't have `nodemon` installed globally and `npm run dev` fails, use `npm start` instead.

✅ **Expected output:**
```
Backend running on port 3000
```

**Keep this terminal open and running.**

---

### Step 5: Start the Frontend Dashboard (React · Port 5173)

> **Open Terminal 3**

```bash
cd frontend
npm install
npm run dev
```

✅ **Expected output:**
```
  VITE v8.x.x  ready in XXXms

  ➜  Local:   http://localhost:5173/
```

---

### Step 6: Open the Dashboard

**Navigate to [http://localhost:5173](http://localhost:5173)** in your browser.

You should see the **GridLock Operations Console** with:
- A grid of 8 event type cards with emoji icons
- A duration slider (15 min – 8 hours)
- Priority toggle buttons (Low / Medium / High)
- A gradient "Run Forecast" button

**Select any event, adjust duration and priority, then click "Run Forecast".**

The results panel will animate in with:
- Congestion score ring (0–100, color-coded green/amber/red)
- Manpower and barricade cards with animated counters
- Diversion status badge with pulse indicator
- Your forecast will appear in the history sidebar

---

### Quick Health Check (All Services)

Run these from any terminal to verify all services are alive:

```bash
# Forecasting Engine
curl http://localhost:8000/health
# → {"status":"ok","service":"gridlock-forecasting","model_loaded":true}

# Backend Gateway
curl http://localhost:3000/health
# → {"status":"ok","service":"gridlock-backend"}

# End-to-end forecast via gateway
curl -X POST http://localhost:3000/api/forecast \
  -H "Content-Type: application/json" \
  -d '{"event_type":"political_rally","duration_minutes":120,"priority":3}'
# → {"congestion_impact_score":72.45,"recommended_manpower":29,...}
```

**Windows PowerShell equivalents:**

```powershell
# Health checks
Invoke-WebRequest -Uri http://localhost:8000/health -UseBasicParsing
Invoke-WebRequest -Uri http://localhost:3000/health -UseBasicParsing

# Forecast
Invoke-WebRequest -Method POST -Uri http://localhost:3000/api/forecast -UseBasicParsing `
  -ContentType "application/json" `
  -Body '{"event_type":"political_rally","duration_minutes":120,"priority":3}'
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `POST /forecast` returns **503** | Model not trained yet | Run `POST /train` first (Step 3) |
| `EADDRINUSE: port 3000` | Port already occupied | Kill the process: `npx kill-port 3000` (or `Stop-Process` on Windows) |
| `ModuleNotFoundError: No module named 'fastapi'` | Virtual env not activated or deps not installed | Activate venv, then `pip install -r requirements.txt` |
| `Cannot find module 'axios'` | Missing npm dependency | `cd frontend && npm install` |
| Score doesn't change with inputs | Old model trained before bug fixes | Retrain: `POST /train` and verify all 3 importances are > 0 |
| `Unsupported event_type` 422 error | Event type string doesn't match encoder | Use lowercase with underscores: `political_rally`, `sports_event`, etc. |
| Frontend shows blank page | Backend or forecasting not running | Ensure all 3 terminals are active |
| `ERR_CONNECTION_REFUSED` on frontend | Backend gateway is down | Restart: `cd backend && npm run dev` |

---

## API Reference

### Forecasting Engine — `localhost:8000`

#### `GET /health`
Returns service status and model readiness.

```json
{"status": "ok", "service": "gridlock-forecasting", "model_loaded": true}
```

---

#### `POST /train`
Triggers the ETL pipeline, generates training data across all event types × durations × priorities, and trains the `RandomForestRegressor`.

**Response:**
```json
{
  "status": "success",
  "samples_trained": 1440,
  "feature_importances": {
    "event_type_encoded": 0.3312,
    "duration_minutes": 0.3421,
    "priority": 0.3267
  }
}
```

---

#### `POST /forecast`
Accepts event parameters and returns predicted congestion score + resource allocation.

**Request:**
```json
{
  "event_type": "political_rally",
  "duration_minutes": 120,
  "priority": 3
}
```

| Field | Type | Constraints |
|---|---|---|
| `event_type` | `string` | Must match a known type (see supported list below) |
| `duration_minutes` | `float` | Must be > 0 |
| `priority` | `int` | Must be 1, 2, or 3 |

**Supported Event Types:**
`political_rally`, `sports_event`, `concert_festival`, `religious_gathering`, `marathon_road_race`, `public_protest`, `state_funeral_parade`, `exhibition_trade_fair`

**Response:**
```json
{
  "congestion_impact_score": 72.45,
  "recommended_manpower": 29,
  "recommended_barricades": 19,
  "requires_diversion": true
}
```

---

### Backend Gateway — `localhost:3000`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Gateway health check |
| `POST` | `/api/train` | Proxies to `FORECAST_URL/train` |
| `POST` | `/api/forecast` | Validates `event_type`, `duration_minutes`, `priority` → proxies to `FORECAST_URL/forecast` |

The gateway validates all required fields before forwarding. Invalid requests receive a `400` with a descriptive error. Forecasting errors are forwarded with their original HTTP status code.

---

## Environment Variables

| Variable | Service | Default | Description |
|---|---|---|---|
| `PORT` | Backend | `3000` | Port for the Express gateway |
| `FORECAST_URL` | Backend | `http://localhost:8000` | URL of the Python forecasting service |

---

## Tech Stack

| Layer | Technology | Version | Role |
|---|---|---|---|
| **ML Engine** | Python, FastAPI, scikit-learn, Pandas, NumPy | 3.11+, 0.111, 1.5, 2.2, 1.26 | Congestion prediction and resource computation |
| **Model** | `RandomForestRegressor` | scikit-learn 1.5 | 300 estimators, max_depth=12, trained on event risk profiles |
| **API Gateway** | Node.js, Express, Axios, Morgan | 18+, 4.19, 1.7, 1.10 | Request validation, routing, CORS, logging |
| **Frontend** | React, Vite | 19.2, 8.0 | Interactive operator dashboard |
| **Serialization** | Joblib | Latest | Model and encoder persistence to disk |

---

## Team

**Built for the Grid Lock Hackathon** — Phase 5 Final Delivery.

---

<p align="center">
  <strong>GridLock Engine</strong> — Stop reacting. Start predicting.<br/>
  <sub>Built with conviction. Deployed with precision.</sub>
</p>
