import React from "react";

export function AdminLogo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0" }}>
      <div
        style={{
          width: "28px",
          height: "28px",
          borderRadius: "8px",
          background: "linear-gradient(135deg, #0ea5e9 0%, #3b82f6 50%, #6366f1 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 16px rgba(14, 165, 233, 0.4)",
        }}
      >
        <span style={{ fontSize: "16px", fontWeight: "900", color: "#fff", lineHeight: 1 }}>⚡</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span
          style={{
            fontSize: "16px",
            fontWeight: "800",
            letterSpacing: "1px",
            background: "linear-gradient(90deg, #f8fafc 0%, #cbd5e1 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          MOBILE <span style={{ color: "#38bdf8", WebkitTextFillColor: "#38bdf8", fontStyle: "italic" }}>PULSE</span>
        </span>
        <span style={{ fontSize: "9px", color: "#64748b", fontWeight: "600", letterSpacing: "1.5px" }}>
          CMS CONTROL CENTER
        </span>
      </div>
    </div>
  );
}
