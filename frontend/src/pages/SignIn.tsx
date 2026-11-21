import { useState, type FormEvent } from "react";
import { ApiError, auth, families } from "../api";

interface SignInProps {
  onSignedIn?: () => void;
}

type Step = "request" | "verify" | "family" | "done";

export default function SignIn({ onSignedIn }: SignInProps) {
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [token, setToken] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const errorText = (err: unknown) =>
    err instanceof ApiError ? err.detail : "Something went wrong. Please try again.";

  async function handleRequest(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await auth.requestLink({
        email,
        display_name: displayName.trim() || null,
      });
      setNotice(res.detail);
      setStep("verify");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await auth.verify({ token });
      setStep("family");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateFamily(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await families.create({ name: familyName });
      setStep("done");
      onSignedIn?.();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="signin-card">
      <h1>Sign in / Create family</h1>

      {error && <p role="alert">{error}</p>}
      {notice && step === "verify" && <p>{notice}</p>}

      {step === "request" && (
        <form onSubmit={handleRequest}>
          <label className="form-field">
            Email
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="form-field">
            Display name (optional)
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={255} />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? "Sending link…" : "Send sign-in link"}
          </button>
        </form>
      )}

      {step === "verify" && (
        <form onSubmit={handleVerify}>
          <label className="form-field">
            Sign-in token
            <input
              required
              minLength={10}
              maxLength={200}
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? "Verifying…" : "Verify"}
          </button>
        </form>
      )}

      {step === "family" && (
        <form onSubmit={handleCreateFamily}>
          <label className="form-field">
            Family name
            <input
              required
              minLength={1}
              maxLength={255}
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create family"}
          </button>
        </form>
      )}

      {step === "done" && <p>Signed in and family created.</p>}
    </main>
  );
}
