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


def _train_and_persist():
    global model, encoder
    _, df_clean, df_agg = run_pipeline()
    X, y = _prepare_training_data(df_clean, df_agg)
    if len(X) < 5:
        raise ValueError("Insufficient data to train (minimum 5 samples).")
    trained_model = RandomForestRegressor(
        n_estimators=300,
        max_depth=12,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )
    trained_model.fit(X, y)
    joblib.dump(trained_model, MODEL_PATH)
    joblib.dump(encoder, ENCODER_PATH)
    model = trained_model
    importances = dict(zip(feature_columns, trained_model.feature_importances_.round(4).tolist()))
    return len(X), importances


def _validate_model() -> bool:
    global model, encoder
    if model is None or encoder is None:
        return False
    try:
        test_type = list(encoder.classes_)[0]
        enc = int(encoder.transform([test_type])[0])
        test_in = np.array([[enc, 60.0, 1]])
        _ = model.predict(test_in)
        return True
    except Exception as e:
        print("Model validation check failed:", e)
        return False


@asynccontextmanager
async def lifespan(app: FastAPI):
    global model, encoder
    if os.path.exists(MODEL_PATH) and os.path.exists(ENCODER_PATH):
        try:
            model = joblib.load(MODEL_PATH)
            encoder = joblib.load(ENCODER_PATH)
        except Exception as e:
            print("Error loading existing model/encoder:", e)
            model, encoder = None, None

    if not _validate_model():
        try:
            print("Model uninitialized or incompatible. Training on startup...")
            _train_and_persist()
            print("Model successfully initialized and verified on startup.")
        except Exception as e:
            print("Failed to initialize model on startup:", e)
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
    return {"status": "ok", "service": "gridlock-forecasting", "model_loaded": _validate_model()}


@app.post("/train", response_model=TrainResponse)
def train():
    """Load historical data, train a RandomForestRegressor, and persist the model."""
    try:
        samples_trained, importances = _train_and_persist()
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Pipeline failed: {exc}")

    return TrainResponse(
        status="success",
        samples_trained=samples_trained,
        feature_importances=importances,
    )


@app.post("/forecast", response_model=ForecastResponse)
def forecast(req: ForecastRequest):
    """Accept event parameters, return predicted congestion score and operational resources."""
    global model, encoder

    if not _validate_model():
        try:
            _train_and_persist()
        except Exception as exc:
            raise HTTPException(status_code=503, detail=f"Model not trained and auto-training failed: {exc}")

    if req.duration_minutes <= 0:
        raise HTTPException(status_code=422, detail="duration_minutes must be positive.")
    if req.priority < 1 or req.priority > 3:
        raise HTTPException(status_code=422, detail="priority must be 1, 2, or 3.")

    event_type_clean = req.event_type.lower().strip().replace(" ", "_").replace("/", "_")
    while "__" in event_type_clean:
        event_type_clean = event_type_clean.replace("__", "_")
    event_type_clean = event_type_clean.strip("_")

    try:
        if hasattr(encoder, "classes_") and event_type_clean in encoder.classes_:
            event_encoded = int(encoder.transform([event_type_clean])[0])
        elif hasattr(encoder, "classes_") and len(encoder.classes_) > 0:
            event_encoded = int(encoder.transform([list(encoder.classes_)[0]])[0])
        else:
            event_encoded = 0
    except Exception:
        event_encoded = 0

    try:
        X_input = np.array([[event_encoded, float(req.duration_minutes), int(req.priority)]])
        score = float(np.clip(model.predict(X_input)[0], 0.0, 100.0))
    except Exception as exc:
        # Auto-recover: retrain model and retry once
        try:
            _train_and_persist()
            X_input = np.array([[event_encoded, float(req.duration_minutes), int(req.priority)]])
            score = float(np.clip(model.predict(X_input)[0], 0.0, 100.0))
        except Exception as retry_exc:
            raise HTTPException(status_code=500, detail=f"Prediction computation failed: {retry_exc}")

    resources = _compute_resources(score)

    return ForecastResponse(congestion_impact_score=round(score, 2), **resources)
