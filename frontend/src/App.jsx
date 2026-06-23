import { useState, useEffect, useRef } from "react";
import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL;

/* ─── Constants ─── */
const EVENT_TYPES = [
  { label: "Political Rally", icon: "🏛️", color: "#ef4444" },
  { label: "Sports Event", icon: "⚽", color: "#f59e0b" },
  { label: "Concert / Festival", icon: "🎵", color: "#a78bfa" },
  { label: "Religious Gathering", icon: "🕌", color: "#38bdf8" },
  { label: "Marathon / Road Race", icon: "🏃", color: "#22c55e" },
  { label: "Public Protest", icon: "📢", color: "#f43f5e" },
  { label: "State Funeral / Parade", icon: "🎖️", color: "#64748b" },
  { label: "Exhibition / Trade Fair", icon: "🎪", color: "#fb923c" },
];

const PRIORITY_OPTIONS = [
  { label: "Low", value: 1, color: "#22c55e" },
  { label: "Medium", value: 2, color: "#f59e0b" },
  { label: "High", value: 3, color: "#ef4444" },
];

const initialForm = {
  event_type: EVENT_TYPES[0].label,
  duration_minutes: 60,
  priority: 1,
};

/* ─── Animated Counter Hook ─── */
function useAnimatedValue(target, duration = 600) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const fromRef = useRef(0);

  useEffect(() => {
    fromRef.current = value;
    startRef.current = null;
    const animate = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(fromRef.current + (target - fromRef.current) * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

/* ─── Score Ring ─── */
function ScoreRing({ score }) {
  const animated = useAnimatedValue(score);
  const clamped = Math.min(Math.max(animated, 0), 100);
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const color =
    clamped >= 65 ? "#ef4444" : clamped >= 35 ? "#f59e0b" : "#22c55e";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
      }}
    >
      <div style={{ position: "relative", width: "150px", height: "150px" }}>
        <svg
          width="150"
          height="150"
          viewBox="0 0 150 150"
          style={{ filter: `drop-shadow(0 0 12px ${color}40)` }}
        >
          <circle
            cx="75"
            cy="75"
            r={radius}
            fill="none"
            stroke="#1e293b"
            strokeWidth="8"
          />
          <circle
            cx="75"
            cy="75"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 75 75)"
            style={{ transition: "stroke 0.4s ease" }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: "32px",
              fontWeight: "800",
              color,
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
            }}
          >
            {clamped.toFixed(1)}
          </span>
          <span
            style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}
          >
            / 100
          </span>
        </div>
      </div>
      <span
        style={{
          fontSize: "10px",
          letterSpacing: "0.14em",
          color: "#64748b",
          textTransform: "uppercase",
          fontWeight: "600",
        }}
      >
        Congestion Score
      </span>
    </div>
  );
}

/* ─── Animated Stat Card ─── */
function StatCard({ label, value, accent, icon }) {
  const animated = useAnimatedValue(value, 500);

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1a1f35 100%)",
        border: `1px solid ${accent}30`,
        borderRadius: "14px",
        padding: "22px 26px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        flex: "1",
        minWidth: "140px",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = `0 8px 24px ${accent}20`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "18px" }}>{icon}</span>
        <span
          style={{
            fontSize: "10px",
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            fontWeight: "600",
          }}
        >
          {label}
        </span>
      </div>
      <span
        style={{
          fontSize: "34px",
          fontWeight: "800",
          color: accent,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
        }}
      >
        {Math.round(animated)}
      </span>
    </div>
  );
}

/* ─── Diversion Badge ─── */
function DiversionBadge({ required }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "16px 22px",
        borderRadius: "14px",
        background: required ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)",
        border: `1px solid ${required ? "#ef4444" : "#22c55e"}40`,
        marginTop: "4px",
        transition: "all 0.3s ease",
      }}
    >
      <div style={{ position: "relative", width: "12px", height: "12px" }}>
        <div
          style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            background: required ? "#ef4444" : "#22c55e",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: "-3px",
            borderRadius: "50%",
            border: `2px solid ${required ? "#ef4444" : "#22c55e"}`,
            animation: "pulse-ring 2s ease-in-out infinite",
          }}
        />
      </div>
      <span
        style={{
          fontSize: "13px",
          fontWeight: "700",
          color: required ? "#ef4444" : "#22c55e",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        {required ? "⚠ Traffic Diversion Required" : "✓ No Diversion Needed"}
      </span>
    </div>
  );
}

/* ─── Event Type Card ─── */
function EventTypeCard({ item, selected, onClick }) {
  const isActive = selected === item.label;
  return (
    <button
      onClick={() => onClick(item.label)}
      style={{
        background: isActive ? `${item.color}18` : "#0f172a",
        border: `1.5px solid ${isActive ? item.color : "#1e293b"}`,
        borderRadius: "12px",
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        outline: "none",
        width: "100%",
        boxShadow: isActive ? `0 0 16px ${item.color}20` : "none",
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.borderColor = `${item.color}80`;
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.borderColor = "#1e293b";
      }}
    >
      <span style={{ fontSize: "20px", lineHeight: 1 }}>{item.icon}</span>
      <span
        style={{
          fontSize: "13px",
          fontWeight: isActive ? "700" : "500",
          color: isActive ? item.color : "#94a3b8",
          transition: "color 0.2s ease",
        }}
      >
        {item.label}
      </span>
      {isActive && (
        <div
          style={{
            marginLeft: "auto",
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: item.color,
            boxShadow: `0 0 8px ${item.color}`,
          }}
        />
      )}
    </button>
  );
}

/* ─── Priority Toggle ─── */
function PriorityToggle({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: "8px" }}>
      {PRIORITY_OPTIONS.map((p) => {
        const isActive = value === p.value;
        return (
          <button
            key={p.value}
            onClick={() => onChange(p.value)}
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: "10px",
              border: `1.5px solid ${isActive ? p.color : "#1e293b"}`,
              background: isActive ? `${p.color}15` : "#0f172a",
              color: isActive ? p.color : "#64748b",
              fontWeight: isActive ? "700" : "500",
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              outline: "none",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              boxShadow: isActive ? `0 0 12px ${p.color}20` : "none",
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.borderColor = `${p.color}60`;
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.borderColor = "#1e293b";
            }}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Duration Slider ─── */
function DurationSlider({ value, onChange }) {
  const percentage = ((value - 15) / (480 - 15)) * 100;
  const getLabel = (v) => {
    if (v >= 60)
      return `${(v / 60).toFixed(1).replace(".0", "")}h ${v % 60 ? `${v % 60}m` : ""}`.trim();
    return `${v}m`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontWeight: "600",
          }}
        >
          Duration
        </span>
        <span
          style={{
            fontSize: "22px",
            fontWeight: "800",
            color: "#f1f5f9",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {getLabel(value)}
        </span>
      </div>
      <div
        style={{
          position: "relative",
          height: "6px",
          borderRadius: "3px",
          background: "#1e293b",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${percentage}%`,
            borderRadius: "3px",
            background: "linear-gradient(90deg, #0ea5e9, #6366f1)",
            transition: "width 0.1s ease",
          }}
        />
      </div>
      <input
        type="range"
        min={15}
        max={480}
        step={15}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: "100%",
          marginTop: "-14px",
          position: "relative",
          zIndex: 1,
          appearance: "none",
          WebkitAppearance: "none",
          background: "transparent",
          cursor: "pointer",
          height: "20px",
          outline: "none",
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: "10px", color: "#475569" }}>15m</span>
        <span style={{ fontSize: "10px", color: "#475569" }}>8h</span>
      </div>
    </div>
  );
}

/* ─── History Item ─── */
function HistoryItem({ item, index }) {
  const evt = EVENT_TYPES.find((e) => e.label === item.event_type) || {
    icon: "📍",
    color: "#64748b",
  };
  const scoreColor =
    item.score >= 65 ? "#ef4444" : item.score >= 35 ? "#f59e0b" : "#22c55e";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 14px",
        borderRadius: "10px",
        background: "#0f172a",
        border: "1px solid #1e293b",
        animation: `slideIn 0.3s ease ${index * 0.05}s both`,
        transition: "border-color 0.2s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#334155")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1e293b")}
    >
      <span style={{ fontSize: "16px" }}>{evt.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "12px",
            fontWeight: "600",
            color: "#cbd5e1",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {item.event_type}
        </div>
        <div style={{ fontSize: "10px", color: "#475569", marginTop: "2px" }}>
          {item.duration}min · P{item.priority}
        </div>
      </div>
      <div
        style={{
          fontSize: "14px",
          fontWeight: "800",
          color: scoreColor,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {item.score}
      </div>
    </div>
  );
}

/* ─── Main App ─── */
export default function App() {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  const handleEventChange = (label) => {
    setResult(null);
    setError(null);
    setForm((prev) => ({ ...prev, event_type: label }));
  };

  const handlePriorityChange = (val) => {
    setResult(null);
    setError(null);
    setForm((prev) => ({ ...prev, priority: val }));
  };

  const handleDurationChange = (val) => {
    setResult(null);
    setError(null);
    setForm((prev) => ({ ...prev, duration_minutes: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data } = await axios.post(
  `${import.meta.env.VITE_API_URL}/api/forecast`,
  {
    event_type: form.event_type.toLowerCase().replace(/ /g, '_').replace(/\//g, '_').replace(/_+/g, '_'),
    duration_minutes: form.duration_minutes,
    priority: form.priority,
  }
);
      setResult(data);
      setHistory((prev) =>
        [
          {
            event_type: form.event_type,
            duration: form.duration_minutes,
            priority: form.priority,
            score: data.congestion_impact_score,
          },
          ...prev,
        ].slice(0, 10),
      );
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.error ||
          "Forecast service unavailable.",
      );
    } finally {
      setLoading(false);
    }
  };

  const selectedEvent =
    EVENT_TYPES.find((e) => e.label === form.event_type) || EVENT_TYPES[0];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020817",
        color: "#f1f5f9",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        display: "flex",
        justifyContent: "center",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1100px",
          display: "grid",
          gridTemplateColumns: history.length > 0 ? "1fr 280px" : "1fr",
          gap: "28px",
          alignItems: "start",
        }}
      >
        {/* ─── Main Panel ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          {/* Header */}
          <div
            style={{ borderBottom: "1px solid #1e293b", paddingBottom: "20px" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "8px",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#22c55e",
                  boxShadow: "0 0 10px #22c55e",
                  animation: "pulse-dot 2s ease-in-out infinite",
                }}
              />
              <span
                style={{
                  fontSize: "11px",
                  color: "#22c55e",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  fontWeight: "600",
                }}
              >
                System Online · GridLock Engine v2
              </span>
            </div>
            <h1
              style={{
                fontSize: "30px",
                fontWeight: "800",
                margin: 0,
                letterSpacing: "-0.03em",
                color: "#f8fafc",
              }}
            >
              Event Impact Forecaster
            </h1>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: "14px",
                color: "#475569",
                lineHeight: "1.5",
              }}
            >
              Predict congestion load and compute operational resource
              requirements in real time.
            </p>
          </div>

          {/* Event Type Grid */}
          <div>
            <label
              style={{
                fontSize: "11px",
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontWeight: "600",
                display: "block",
                marginBottom: "10px",
              }}
            >
              Event Type
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "8px",
              }}
            >
              {EVENT_TYPES.map((et) => (
                <EventTypeCard
                  key={et.label}
                  item={et}
                  selected={form.event_type}
                  onClick={handleEventChange}
                />
              ))}
            </div>
          </div>

          {/* Duration + Priority Row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "24px",
            }}
          >
            <div
              style={{
                background: "linear-gradient(135deg, #0a1628 0%, #0f172a 100%)",
                border: "1px solid #1e293b",
                borderRadius: "14px",
                padding: "20px 22px",
              }}
            >
              <DurationSlider
                value={form.duration_minutes}
                onChange={handleDurationChange}
              />
            </div>
            <div
              style={{
                background: "linear-gradient(135deg, #0a1628 0%, #0f172a 100%)",
                border: "1px solid #1e293b",
                borderRadius: "14px",
                padding: "20px 22px",
              }}
            >
              <label
                style={{
                  fontSize: "11px",
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontWeight: "600",
                  display: "block",
                  marginBottom: "12px",
                }}
              >
                Priority Level
              </label>
              <PriorityToggle
                value={form.priority}
                onChange={handlePriorityChange}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              background: loading
                ? "#1e293b"
                : `linear-gradient(135deg, ${selectedEvent.color}, #6366f1)`,
              color: loading ? "#475569" : "#fff",
              border: "none",
              borderRadius: "12px",
              padding: "16px 36px",
              fontSize: "14px",
              fontWeight: "700",
              cursor: loading ? "not-allowed" : "pointer",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              transition: "all 0.3s ease",
              alignSelf: "flex-start",
              boxShadow: loading
                ? "none"
                : `0 4px 20px ${selectedEvent.color}30`,
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
            onMouseEnter={(e) => {
              if (!loading)
                e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {loading ? (
              <>
                <span style={{ display: "inline-flex", gap: "4px" }}>
                  <span
                    style={{
                      animation: "bounce 1.4s ease-in-out infinite",
                      animationDelay: "0s",
                    }}
                  >
                    ●
                  </span>
                  <span
                    style={{
                      animation: "bounce 1.4s ease-in-out infinite",
                      animationDelay: "0.2s",
                    }}
                  >
                    ●
                  </span>
                  <span
                    style={{
                      animation: "bounce 1.4s ease-in-out infinite",
                      animationDelay: "0.4s",
                    }}
                  >
                    ●
                  </span>
                </span>
                Forecasting
              </>
            ) : (
              <>▶ Run Forecast</>
            )}
          </button>

          {/* Error */}
          {error && (
            <div
              style={{
                background: "rgba(239,68,68,0.06)",
                border: "1px solid #ef444450",
                borderRadius: "12px",
                padding: "14px 18px",
                color: "#ef4444",
                fontSize: "13px",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                animation: "fadeIn 0.3s ease",
              }}
            >
              <span>⚠</span> {error}
            </div>
          )}

          {/* Results */}
          {result && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                animation: "fadeIn 0.5s ease",
              }}
            >
              <div
                style={{
                  background:
                    "linear-gradient(135deg, #0a1628 0%, #0d1b2a 100%)",
                  border: "1px solid #1e293b",
                  borderRadius: "18px",
                  padding: "32px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "24px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                }}
              >
                {/* Result Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "20px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "6px",
                      }}
                    >
                      <div
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: selectedEvent.color,
                          boxShadow: `0 0 8px ${selectedEvent.color}`,
                        }}
                      />
                      <p
                        style={{
                          margin: 0,
                          fontSize: "10px",
                          color: "#64748b",
                          textTransform: "uppercase",
                          letterSpacing: "0.12em",
                          fontWeight: "600",
                        }}
                      >
                        Forecast Result
                      </p>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "16px",
                        fontWeight: "700",
                        color: "#e2e8f0",
                      }}
                    >
                      {selectedEvent.icon} {form.event_type}
                    </p>
                    <p
                      style={{
                        margin: "4px 0 0",
                        fontSize: "12px",
                        color: "#475569",
                      }}
                    >
                      {form.duration_minutes} min ·{" "}
                      {
                        PRIORITY_OPTIONS.find((p) => p.value === form.priority)
                          ?.label
                      }{" "}
                      Priority
                    </p>
                  </div>
                  <ScoreRing score={result.congestion_impact_score} />
                </div>

                {/* Stat Cards */}
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <StatCard
                    label="Manpower"
                    value={result.recommended_manpower}
                    accent="#38bdf8"
                    icon="👷"
                  />
                  <StatCard
                    label="Barricades"
                    value={result.recommended_barricades}
                    accent="#a78bfa"
                    icon="🚧"
                  />
                </div>

                <DiversionBadge required={result.requires_diversion} />
              </div>
            </div>
          )}
        </div>

        {/* ─── History Sidebar ─── */}
        {history.length > 0 && (
          <div
            style={{
              background: "linear-gradient(180deg, #0a1628 0%, #0f172a 100%)",
              border: "1px solid #1e293b",
              borderRadius: "16px",
              padding: "20px 16px",
              position: "sticky",
              top: "40px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "14px",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontWeight: "600",
                }}
              >
                History
              </span>
              <span
                style={{
                  fontSize: "10px",
                  color: "#334155",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {history.length}/10
              </span>
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              {history.map((item, i) => (
                <HistoryItem key={i} item={item} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Global Styles ─── */}
      <style>{`
                * { box-sizing: border-box; margin: 0; padding: 0; }
                select option { background: #0f172a; }

                input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 18px; height: 18px; border-radius: 50%;
                    background: linear-gradient(135deg, #0ea5e9, #6366f1);
                    border: 2px solid #f1f5f9;
                    box-shadow: 0 0 10px rgba(99, 102, 241, 0.5);
                    cursor: pointer;
                    transition: transform 0.15s ease;
                }
                input[type="range"]::-webkit-slider-thumb:hover {
                    transform: scale(1.2);
                }
                input[type="range"]::-moz-range-thumb {
                    width: 18px; height: 18px; border-radius: 50%;
                    background: linear-gradient(135deg, #0ea5e9, #6366f1);
                    border: 2px solid #f1f5f9;
                    box-shadow: 0 0 10px rgba(99, 102, 241, 0.5);
                    cursor: pointer;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes slideIn {
                    from { opacity: 0; transform: translateX(10px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes pulse-dot {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
                @keyframes pulse-ring {
                    0% { transform: scale(1); opacity: 0.6; }
                    100% { transform: scale(1.8); opacity: 0; }
                }
                @keyframes bounce {
                    0%, 80%, 100% { transform: translateY(0); }
                    40% { transform: translateY(-6px); }
                }

                @media (max-width: 768px) {
                    body > div > div > div:first-child > div:nth-child(4) {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
    </div>
  );
}
