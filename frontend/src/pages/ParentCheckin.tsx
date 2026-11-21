import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { families, medicines, type MedicineOut } from "../api";

// Minimal typing for the browser speech API (not in all TS lib versions).
interface SpeechResultLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechResultLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechCtor = new () => SpeechRecognitionLike;

function getSpeechCtor(): SpeechCtor | null {
  const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
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

const card: CSSProperties = {
  background: "#ffffff",
  borderRadius: 16,
  padding: 16,
  marginBottom: 12,
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
};

export default function ParentCheckin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meds, setMeds] = useState<MedicineOut[]>([]);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Parent routes carry no familyId, so use the first family this account belongs to.
        const fams = await families.list();
        if (fams.length === 0) throw new Error("No family found for this account.");
        const m = await medicines.list(fams[0].id);
        if (!cancelled) setMeds(m.filter((x) => x.active));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
      recognitionRef.current?.stop();
    };
  }, []);

  // Tap-to-start only: a single recognition session begins on tap and ends on its own.
  // No background or always-on microphone.
  function startVoiceCheckin() {
    const Ctor = getSpeechCtor();
    if (!Ctor) {
      setError("Voice check-in is not supported in this browser.");
      return;
    }
    setError(null);
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = () => {
      setListening(false);
      navigate("/parent/confirmation");
    };
    rec.onerror = (e) => {
      setListening(false);
      setError(`Voice check-in stopped: ${e.error}`);
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  }

  if (loading) return <main style={page}><p>Loading medicine…</p></main>;

  return (
    <main style={page}>
      <h1 style={{ fontSize: 30, margin: "8px 0 16px" }}>Medicine check-in</h1>

      {error && <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>}

      {meds.length === 0 ? (
        <p>No medicine to check in today.</p>
      ) : (
        meds.map((med) => (
          <div key={med.id} style={card}>
            <div style={{ fontWeight: 700 }}>{med.display_name}</div>
            {med.instructions_text && <div>{med.instructions_text}</div>}
          </div>
        ))
      )}

      <button
        type="button"
        onClick={startVoiceCheckin}
        disabled={listening}
        aria-label="Tap to start voice check-in"
        style={{
          display: "block",
          width: "100%",
          minHeight: 160,
          marginTop: 24,
          borderRadius: 24,
          border: "none",
          background: listening ? "#64748b" : "#0f766e",
          color: "#ffffff",
          fontSize: 26,
          fontWeight: 700,
          cursor: listening ? "default" : "pointer",
        }}
      >
        {listening ? "Listening…" : "Tap to start"}
      </button>

      <div style={{ marginTop: 16, textAlign: "center" }}>
        <Link to="/parent/home" style={{ fontSize: 20 }}>Back to home</Link>
      </div>
    </main>
  );
}
