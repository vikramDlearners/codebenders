import { useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  medicines,
  type MedicineCreate,
  type MedicineOut,
  type MedicineUpdate,
} from "../api";

interface MedicineFormProps {
  familyId: string;
  /** Required when creating a new medicine. */
  careProfileId?: string;
  /** Set to edit an existing medicine; omit to create. */
  medicineId?: string;
  onSaved?: (medicine: MedicineOut) => void;
}

export default function MedicineForm({
  familyId,
  careProfileId,
  medicineId,
  onSaved,
}: MedicineFormProps) {
  const isEdit = medicineId !== undefined;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [quantity, setQuantity] = useState("");
  const [refillDate, setRefillDate] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    medicines
      .get(familyId, medicineId)
      .then((m) => {
        if (cancelled) return;
        setDisplayName(m.display_name);
        setInstructions(m.instructions_text ?? "");
        setQuantity(m.quantity_remaining?.toString() ?? "");
        setRefillDate(m.refill_date ?? "");
        setActive(m.active);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(err instanceof ApiError ? err.detail : "Could not load medicine.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [familyId, medicineId, isEdit]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const qty = quantity === "" ? null : Number(quantity);
      const refill = refillDate === "" ? null : refillDate;
      let result: MedicineOut;

      if (isEdit) {
        const body: MedicineUpdate = {
          display_name: displayName,
          instructions_text: instructions || null,
          refill_date: refill,
          active,
        };
        result = await medicines.update(familyId, medicineId, body);
      } else {
        if (!careProfileId) {
          throw new ApiError(400, "No care profile selected.");
        }
        const body: MedicineCreate = {
          care_profile_id: careProfileId,
          display_name: displayName,
          instructions_text: instructions || null,
          quantity_remaining: qty,
          refill_date: refill,
        };
        result = await medicines.create(familyId, body);
      }
      onSaved?.(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Could not save medicine.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p role="status">Loading medicine…</p>;

  return (
    <main>
      <h1>{isEdit ? "Edit medicine" : "Add medicine"}</h1>

      <form onSubmit={handleSubmit}>
        <label>
          Name
          <input required minLength={1} maxLength={255} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </label>
        <label>
          Instructions
          <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} />
        </label>
        {!isEdit && (
          <label>
            Quantity remaining
            <input type="number" min={0} step={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </label>
        )}
        <label>
          Refill date
          <input type="date" value={refillDate} onChange={(e) => setRefillDate(e.target.value)} />
        </label>
        {isEdit && (
          <label>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Active
          </label>
        )}
        <button type="submit" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save changes" : "Add medicine"}
        </button>
        {error && <p role="alert">{error}</p>}
      </form>
    </main>
  );
}
