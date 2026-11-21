import { useEffect, useState } from "react";
import { activity, ApiError } from "../api";
import type { ActivityOut } from "../api";

interface CareVoiceActivityProps {
  familyId: string;
}

function messageOf(err: unknown): string {
  if (err instanceof ApiError) return err.detail;
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

export default function CareVoiceActivity({ familyId }: CareVoiceActivityProps) {
  const [items, setItems] = useState<ActivityOut[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    activity
      .list(familyId)
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(messageOf(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [familyId]);

  if (loading) return <p role="status">Loading CareVoice activity…</p>;
  if (error) return <p role="alert">Could not load activity: {error}</p>;
  if (items.length === 0) return <p>No CareVoice activity yet.</p>;

  return (
    <section aria-labelledby="carevoice-activity-heading">
      <h2 id="carevoice-activity-heading">CareVoice activity</h2>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <strong>{item.action}</strong> on {item.object_type}
            {item.object_id ? ` (${item.object_id})` : ""}
            <time dateTime={item.created_at}> · {new Date(item.created_at).toLocaleString()}</time>
          </li>
        ))}
      </ul>
    </section>
  );
}
