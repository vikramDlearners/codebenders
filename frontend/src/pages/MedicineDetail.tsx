import { useEffect, useState, type FormEvent } from "react";
import { ApiError, medicines, type MedicineOut } from "../api";

interface MedicineDetailProps {
  familyId: string;
  medicineId: string;
  onEdit?: (medicine: MedicineOut) => void;
}

export default function MedicineDetail({ familyId, medicineId, onEdit }: MedicineDetailProps) {
  const [medicine, setMedicine] = useState<MedicineOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [quantity, setQuantity] = useState("");
  const [savingQty, setSavingQty] = useState(false);
  const [qtyError, setQtyError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    medicines
      .get(familyId, medicineId)
      .then((m) => {
        if (cancelled) return;
        setMedicine(m);
        setQuantity(m.quantity_remaining?.toString() ?? "");
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
  }, [familyId, medicineId]);

  async function handleQuantity(e: FormEvent) {
    e.preventDefault();
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 0) {
      setQtyError("Quantity must be a whole number, 0 or more.");
      return;
    }
    setSavingQty(true);
    setQtyError(null);
    try {
      const updated = await medicines.updateQuantity(familyId, medicineId, { quantity: qty });
      setMedicine(updated);
      setQuantity(updated.quantity_remaining?.toString() ?? "");
    } catch (err) {
      setQtyError(err instanceof ApiError ? err.detail : "Could not update quantity.");
    } finally {
      setSavingQty(false);
    }
  }

  if (loading) return <p role="status">Loading medicine…</p>;
  if (error) return <p role="alert">{error}</p>;
  if (!medicine) return null;

  return (
    <main>
      <header>
        <h1>{medicine.display_name}</h1>
        {onEdit && (
          <button type="button" onClick={() => onEdit(medicine)}>
            Edit
          </button>
        )}
      </header>

      <dl>
        <dt>Instructions</dt>
        <dd>{medicine.instructions_text ?? "—"}</dd>
        <dt>Quantity remaining</dt>
        <dd>{medicine.quantity_remaining ?? "—"}</dd>
        <dt>Refill date</dt>
        <dd>{medicine.refill_date ?? "—"}</dd>
        <dt>Status</dt>
        <dd>{medicine.active ? "Active" : "Inactive"}</dd>
      </dl>

      <form onSubmit={handleQuantity}>
        <label>
          Update quantity
          <input type="number" min={0} step={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </label>
        <button type="submit" disabled={savingQty}>
          {savingQty ? "Updating…" : "Update quantity"}
        </button>
        {qtyError && <p role="alert">{qtyError}</p>}
      </form>
    </main>
  );
}
