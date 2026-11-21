import { useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { activity, families, type ActivityOut } from "../api";

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

export default function ParentConfirmation() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latest, setLatest] = useState<ActivityOut | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Parent routes carry no familyId, so use the first family this account belongs to.
        const fams = await families.list();
        if (fams.length === 0) throw new Error("No family found for this account.");
        const items = await activity.list(fams[0].id);
        if (!cancelled) setLatest(items[0] ?? null);
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

  if (loading) return <main style={page}><p>Loading confirmation…</p></main>;

  if (error) {
    return (
      <main style={page}>
        <p role="alert" style={{ color: "#b91c1c" }}>Could not load confirmation: {error}</p>
      </main>
    );
  }

  return (
    <main style={page}>
      <h1 style={{ fontSize: 30, margin: "8px 0 16px" }}>Thank you</h1>

      {latest ? (
        <div style={card}>
          <div style={{ fontWeight: 700 }}>Your response was recorded</div>
          <div>{latest.action.replace(/_/g, " ")}</div>
          <div style={{ fontSize: 16, color: "#4b5563" }}>
            {new Date(latest.created_at).toLocaleString()}
          </div>
        </div>
      ) : (
        <p>Your response was recorded.</p>
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
