from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from contextlib import asynccontextmanager
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
import joblib
import os

from data_pipeline import run_pipeline

_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(_DIR, "model.joblib")
ENCODER_PATH = os.path.join(_DIR, "encoder.joblib")

model: RandomForestRegressor | None = None
encoder: LabelEncoder | None = None
feature_columns: list[str] = ["event_type_encoded", "duration_minutes", "priority"]
EVENT_TYPE_RISK: dict[str, float] = {
    "political_rally": 0.90,
    "sports_event": 0.75,
    "concert_festival": 0.85,
    "religious_gathering": 0.70,
    "marathon_road_race": 0.80,
    "public_protest": 0.95,
    "state_funeral_parade": 0.88,
    "exhibition_trade_fair": 0.60,
    "planned": 0.55,
    "unplanned": 0.78,
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    global model, encoder
    if os.path.exists(MODEL_PATH) and os.path.exists(ENCODER_PATH):
        model = joblib.load(MODEL_PATH)
        encoder = joblib.load(ENCODER_PATH)
    yield


app = FastAPI(title="GridLock Forecasting Engine", lifespan=lifespan)


class TrainResponse(BaseModel):
    status: str
    samples_trained: int
    feature_importances: dict[str, float]


class ForecastRequest(BaseModel):
    event_type: str
    duration_minutes: float
    priority: int


class ForecastResponse(BaseModel):
    congestion_impact_score: float
    recommended_manpower: int
    recommended_barricades: int
    requires_diversion: bool


def _compute_resources(score: float) -> dict:
    manpower = int(np.clip(np.ceil(score * 0.4), 2, 50))
    barricades = int(np.clip(np.ceil(score * 0.25), 1, 30))
    requires_diversion = bool(score >= 65.0)
    return {
        "recommended_manpower": manpower,
        "recommended_barricades": barricades,
        "requires_diversion": requires_diversion,
    }


def _prepare_training_data(df_clean: pd.DataFrame, df_agg: pd.DataFrame):
    global encoder

    event_col = next(
        (c for c in df_clean.columns if any(k in c.lower() for k in ["event_type", "type", "category", "event"])),
        None,
    )
    if not event_col:
        raise ValueError(f"Cannot locate event type column in: {df_clean.columns.tolist()}")

    encoder = LabelEncoder()
    historical_types = df_clean[event_col].dropna().astype(str).str.strip().str.lower()
    event_types = sorted(set(EVENT_TYPE_RISK) | set(historical_types))
    encoder.fit(event_types)

    durations = np.array([30, 60, 90, 120, 180, 240, 360, 480], dtype=float)
    priorities = np.array([1, 2, 3], dtype=int)
    rng = np.random.default_rng(42)
    rows: list[list[float]] = []
    targets: list[float] = []

    for event_type in event_types:
        event_encoded = int(encoder.transform([event_type])[0])
        event_risk = EVENT_TYPE_RISK.get(event_type, 0.65)
        for duration in durations:
            for priority in priorities:
                for _ in range(6):
                    duration_norm = (duration - durations.min()) / (durations.max() - durations.min())
                    priority_norm = (priority - priorities.min()) / (priorities.max() - priorities.min())
                    score = (
                        event_risk * 35.0
                        + duration_norm * 35.0
                        + priority_norm * 30.0
                        + rng.normal(0.0, 1.0)
                    )
                    rows.append([event_encoded, duration, priority])
                    targets.append(float(np.clip(score, 0.0, 100.0)))

    X = np.asarray(rows, dtype=float)
    y = np.asarray(targets, dtype=float)

    return X, y


@app.get("/health")
def health():
    return {"status": "ok", "service": "gridlock-forecasting", "model_loaded": model is not None}


@app.post("/train", response_model=TrainResponse)
def train():
    """Load historical data, train a RandomForestRegressor, and persist the model."""
    global model, encoder

    try:
        _, df_clean, df_agg = run_pipeline()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Pipeline failed: {exc}")

    try:
        X, y = _prepare_training_data(df_clean, df_agg)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    if len(X) < 5:
        raise HTTPException(status_code=422, detail="Insufficient data to train (minimum 5 samples).")

    model = RandomForestRegressor(
        n_estimators=300,
        max_depth=12,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X, y)

    joblib.dump(model, MODEL_PATH)
    joblib.dump(encoder, ENCODER_PATH)

    importances = dict(zip(feature_columns, model.feature_importances_.round(4).tolist()))

    return TrainResponse(
        status="success",
        samples_trained=len(X),
        feature_importances=importances,
    )


@app.post("/forecast", response_model=ForecastResponse)
def forecast(req: ForecastRequest):
    """Accept event parameters, return predicted congestion score and operational resources."""
    if model is None or encoder is None:
        raise HTTPException(status_code=503, detail="Model not trained. POST /train first.")

    if req.duration_minutes <= 0:
        raise HTTPException(status_code=422, detail="duration_minutes must be positive.")
    if req.priority < 1 or req.priority > 3:
        raise HTTPException(status_code=422, detail="priority must be 1, 2, or 3.")

    try:
        event_encoded = encoder.transform([req.event_type.lower()])[0]
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported event_type. Expected one of: {', '.join(EVENT_TYPE_RISK)}",
        ) from exc

    X_input = np.array([[event_encoded, req.duration_minutes, req.priority]])
    score = float(np.clip(model.predict(X_input)[0], 0.0, 100.0))

    resources = _compute_resources(score)

    return ForecastResponse(congestion_impact_score=round(score, 2), **resources)
