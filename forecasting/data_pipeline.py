import pandas as pd
import numpy as np
import os

CSV_PATH = os.path.join(
    os.path.dirname(__file__),
    "../dataset/Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv"
)

TIMESTAMP_KEYWORDS = ["time", "date", "start", "end", "timestamp"]
EVENT_TYPE_KEYWORDS = ["event_type", "type", "category", "event", "kind"]
IMPACT_KEYWORDS = ["impact", "congestion", "delay", "duration", "count", "volume"]

def _detect_column(df, keywords):
    cols_lower = {c.lower(): c for c in df.columns}
    for kw in keywords:
        for col_lower, col_orig in cols_lower.items():
            if kw in col_lower:
                return col_orig
    return None

def load_data(path=CSV_PATH):
    df = pd.read_csv(path, low_memory=False)
    df.columns = df.columns.str.strip()
    return df

def clean_data(df):
    df = df.copy()
    ts_col = _detect_column(df, TIMESTAMP_KEYWORDS)
    
    if ts_col:
        df[ts_col] = pd.to_datetime(df[ts_col], format="mixed", errors="coerce")
        
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    for col in numeric_cols:
        df[col] = df[col].fillna(df[col].median())
        
    cat_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()
    for col in cat_cols:
        df[col] = df[col].fillna("unknown").str.strip().str.lower()
        
    df.drop_duplicates(inplace=True)
    df.reset_index(drop=True, inplace=True)
    return df

def aggregate_by_event_type(df):
    event_col = _detect_column(df, EVENT_TYPE_KEYWORDS)
    impact_col = _detect_column(df, IMPACT_KEYWORDS)
    
    if not event_col:
        raise ValueError(f"No event type column found. Columns: {df.columns.tolist()}")
        
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    
    if impact_col and impact_col in numeric_cols:
        target_cols = [impact_col]
    else:
        target_cols = numeric_cols
        
    if not target_cols:
        raise ValueError("No numeric columns available for aggregation.")
        
    agg_df = (
        df.groupby(event_col)[target_cols]
        .agg(["mean", "max", "count"])
    )
    
    agg_df.columns = ["_".join(c).strip() for c in agg_df.columns]
    agg_df.reset_index(inplace=True)
    agg_df.rename(columns={event_col: "event_type"}, inplace=True)
    return agg_df

def run_pipeline():
    df_raw = load_data()
    df_clean = clean_data(df_raw)
    df_agg = aggregate_by_event_type(df_clean)
    return df_raw, df_clean, df_agg

if __name__ == "__main__":
    raw, clean, agg = run_pipeline()
    print(f"Raw shape: {raw.shape}")
    print(f"Clean shape: {clean.shape}")
    print(agg.to_string())