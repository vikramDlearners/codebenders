import { useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { careProfiles, families, medicines, tasks, type MedicineOut, type TaskOut } from "../api";

// Statuses that mean a task is no longer outstanding.
const DONE_STATUSES = ["done", "completed"];

function isDueToday(iso: string | null): boolean {
  if (!iso) return true;
  return new Date(iso).toDateString() === new Date().toDateString();
}

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

const sectionTitle: CSSProperties = { fontSize: 22, fontWeight: 700, margin: "24px 0 12px" };

const card: CSSProperties = {
  background: "#ffffff",
  borderRadius: 16,
  padding: 16,
  marginBottom: 12,
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
};

const bigLink: CSSProperties = {
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
};

export default function ParentHome() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [greeting, setGreeting] = useState<string>("");
  const [meds, setMeds] = useState<MedicineOut[]>([]);
  const [todo, setTodo] = useState<TaskOut[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Parent routes carry no familyId, so use the first family this account belongs to.
        const fams = await families.list();
        if (fams.length === 0) throw new Error("No family found for this account.");
        const familyId = fams[0].id;

        const [profiles, m, t] = await Promise.all([
          careProfiles.list(familyId),
          medicines.list(familyId),
          tasks.list(familyId),
        ]);
        if (cancelled) return;

        setGreeting(profiles[0]?.greeting_name ?? "");
        setMeds(m.filter((x) => x.active));
        setTodo(t.filter((x) => !DONE_STATUSES.includes(x.status) && isDueToday(x.due_at)));
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

  if (loading) return <main style={page}><p>Loading your day…</p></main>;

  if (error) {
    return (
      <main style={page}>
        <p role="alert" style={{ color: "#b91c1c" }}>Could not load your day: {error}</p>
      </main>
    );
  }

  return (
    <main style={page}>
      <h1 style={{ fontSize: 30, margin: "8px 0 16px" }}>
        Hello{greeting ? `, ${greeting}` : ""}
      </h1>

      <h2 style={sectionTitle}>Today's medicine</h2>
      {meds.length === 0 ? (
        <p>No medicine scheduled.</p>
      ) : (
        meds.map((med) => (
          <div key={med.id} style={card}>
            <div style={{ fontWeight: 700 }}>{med.display_name}</div>
            {med.instructions_text && <div>{med.instructions_text}</div>}
          </div>
        ))
      )}

      <h2 style={sectionTitle}>Today's tasks</h2>
      {todo.length === 0 ? (
        <p>No tasks for today.</p>
      ) : (
        todo.map((task) => (
          <div key={task.id} style={card}>
            <div style={{ fontWeight: 700 }}>{task.title}</div>
            {task.description && <div>{task.description}</div>}
          </div>
        ))
      )}

      <div style={{ marginTop: 24 }}>
        <Link to="/parent/checkin" style={bigLink}>Medicine check-in</Link>
      </div>
      <div style={{ marginTop: 12 }}>
        <Link to="/parent/help" style={{ ...bigLink, background: "#b45309" }}>Ask for help</Link>
      </div>
    </main>
  );
}
