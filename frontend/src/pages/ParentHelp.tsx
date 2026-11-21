import { useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { notifications, type NotificationOut } from "../api";

const page: CSSProperties = {
  maxWidth: 480,
  margin: "0 auto",
  padding: 20,
  minHeight: "100vh",
  boxSizing: "border-box",
  fontFamily: "system-ui, sans-serif",
  fontSize: 20,
  color: "#1f2937",
};

const card: CSSProperties = {
  background: "#ffffff",
  borderRadius: 16,
  padding: 16,
  marginBottom: 12,
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
};

export default function ParentHelp() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationOut[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // No help-request endpoint exists in api.ts; show the account's notifications instead.
        const list = await notifications.list();
        if (!cancelled) setItems(list);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <main style={page}><p>Loading help request…</p></main>;

  if (error) {
    return (
      <main style={page}>
        <p role="alert" style={{ color: "#b91c1c" }}>Could not load help request: {error}</p>
      </main>
    );
  }

  return (
    <main style={page}>
      <h1 style={{ fontSize: 30, margin: "8px 0 16px" }}>Help requested</h1>
      <p>Your family has been told you need help.</p>

      {items.length > 0 && (
        <>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: "24px 0 12px" }}>Recent updates</h2>
          {items.map((n) => (
            <div key={n.id} style={card}>
              <div style={{ fontWeight: 700 }}>{n.type.replace(/_/g, " ")}</div>
              <div style={{ fontSize: 16, color: "#4b5563" }}>
                {new Date(n.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </>
      )}

      <div style={{ marginTop: 24 }}>
        <Link
          to="/parent/home"
          style={{
            display: "block",
            textAlign: "center",
            padding: "20px 16px",
            minHeight: 72,
            borderRadius: 16,
            background: "#0f766e",
            color: "#ffffff",
            fontSize: 22,
            fontWeight: 700,
            textDecoration: "none",
            boxSizing: "border-box",
          }}
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
