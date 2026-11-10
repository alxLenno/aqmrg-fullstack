# AQMRG Fullstack Air Quality Monitoring Platform

An integrated end-to-end Air Quality Monitoring, Analytics, and Forecasting Platform developed for the Air Quality Monitoring and Research Group (AQMRG).

---

## 🏗️ Architecture Overview

This repository contains the complete fullstack system:

```
aqmrg-fullstack/
├── backend/                  # Flask REST API & Machine Learning engine
│   ├── app/                  # Application factory, routes, models & ML inference
│   ├── templates/            # Web UI / Swagger documentation templates
│   ├── _Desktop_pm25_*.pkl   # Trained ML forecasting models
│   ├── flask_app.py          # Backend entry point (Port 5001)
│   ├── Dockerfile            # Container configuration
│   └── requirements.txt      # Python dependencies
├── frontend/                 # React 19 + Vite analytics dashboard
│   ├── src/                  # Components (Leaflet Map, Metric Charts, Story Mode)
│   ├── public/               # Static assets (logos, icons)
│   ├── api/                  # Serverless function handlers
│   ├── Dockerfile            # Frontend container setup
│   └── package.json          # UI dependencies
├── infrastructure/           # Monitoring and time-series services
│   └── monitoring/
│       ├── grafana/          # Provisioned Grafana real-time dashboards
│       ├── influxdb/         # InfluxDB time-series database setup
│       └── prometheus/       # Metrics scraper configuration
├── docker-compose.yml        # Orchestrates Backend, Frontend, InfluxDB, and Grafana
└── render.yaml               # Cloud deployment blueprint for Render
```

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Python 3.10+** (for backend)
- **Node.js 18+ & npm** (for frontend)
- **Docker & Docker Compose** (optional, for full containerized stack)

---

### Option A: Running with Docker Compose (Recommended)

Start the entire stack (Backend + Frontend + InfluxDB + Grafana) with a single command:

```bash
docker compose up --build
```

Services will be accessible at:
- **Frontend Dashboard:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:5001](http://localhost:5001)
- **API Documentation (Swagger):** [http://localhost:5001/apidocs/](http://localhost:5001/apidocs/)
- **Grafana Monitoring:** [http://localhost:3000](http://localhost:3000)
- **InfluxDB:** [http://localhost:8086](http://localhost:8086)

---

### Option B: Running Services Manually

#### Backend:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python flask_app.py
```
*Backend runs on `http://localhost:5001`.*

#### Frontend:
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service health check |
| `GET` | `/api/v1/devices` | List active reporting sensor nodes |
| `POST` | `/api/v1/data/ingest` | Ingest real-time telemetry from sensor hardware |
| `GET` | `/api/v1/data/latest` | Fetch most recent readings across all stations |
| `GET` | `/api/v1/history/all` | Fetch historical readings with timestamp filtering |
| `POST` | `/api/v1/predict` | Run multi-model ML inference on sensor values |

---

## ☁️ Cloud Deployment

- **Render Blueprint (`render.yaml`):** Deploys InfluxDB and embedded Grafana services automatically to Render.
- **Frontend:** Ready for zero-config deployment on Vercel or Netlify.
- **Backend:** Ready for deployment on Render, PythonAnywhere, Railway, or Google Cloud Run.

---

## 📄 License
MIT License. Developed for AQMRG Research & Operations.
