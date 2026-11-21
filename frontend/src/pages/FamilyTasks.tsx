import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ApiError, members, tasks } from "../api";
import type { MemberOut, TaskOut } from "../api";

interface FamilyTasksProps {
  familyId: string;
}

function messageOf(err: unknown): string {
  if (err instanceof ApiError) return err.detail;
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

export default function FamilyTasks({ familyId }: FamilyTasksProps) {
  const [items, setItems] = useState<TaskOut[]>([]);
  const [memberList, setMemberList] = useState<MemberOut[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [priority, setPriority] = useState("");
  const [assignee, setAssignee] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([tasks.list(familyId), members.list(familyId)])
      .then(([taskData, memberData]) => {
        if (cancelled) return;
        setItems(taskData);
        setMemberList(memberData);
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

  const replaceTask = (updated: TaskOut) =>
    setItems((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));

  const runAction = async (action: () => Promise<TaskOut>) => {
    setActionError(null);
    try {
      replaceTask(await action());
    } catch (err: unknown) {
      setActionError(messageOf(err));
    }
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError(null);
    setCreating(true);
    try {
      const created = await tasks.create(familyId, {
        title: title.trim(),
        description: description.trim() || null,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        priority: priority.trim() || undefined,
        assigned_to_user_id: assignee || null,
      });
      setItems((prev) => [...prev, created]);
      setTitle("");
      setDescription("");
      setDueAt("");
      setPriority("");
      setAssignee("");
    } catch (err: unknown) {
      setActionError(messageOf(err));
    } finally {
      setCreating(false);
    }
  };

  const memberName = (userId: string | null): string => {
    if (!userId) return "Unassigned";
    return memberList.find((m) => m.user_id === userId)?.display_name ?? userId;
  };

  const statusOptions = Array.from(new Set(items.map((t) => t.status)));

  if (loading) return <p role="status">Loading tasks…</p>;
  if (error) return <p role="alert">Could not load tasks: {error}</p>;

  return (
    <section aria-labelledby="family-tasks-heading">
      <h2 id="family-tasks-heading">Family tasks</h2>

      {actionError && <p role="alert">{actionError}</p>}

      <form onSubmit={handleCreate} aria-label="Create task">
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={255} />
        </label>
        <label>
          Description
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label>
          Due
          <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
        </label>
        <label>
          Priority
          <input value={priority} onChange={(e) => setPriority(e.target.value)} placeholder="normal" />
        </label>
        <label>
          Assign to
          <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">Unassigned</option>
            {memberList.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.display_name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={creating || title.trim() === ""}>
          {creating ? "Creating…" : "Create task"}
        </button>
      </form>

      {items.length === 0 ? (
        <p>No tasks yet.</p>
      ) : (
        <ul>
          {items.map((task) => (
            <li key={task.id}>
              <strong>{task.title}</strong>
              {task.description ? ` — ${task.description}` : ""}
              <div>Priority: {task.priority}</div>
              <div>Due: {task.due_at ? new Date(task.due_at).toLocaleString() : "No due date"}</div>
              <div>Assigned to: {memberName(task.assigned_to_user_id)}</div>
              <div>Status: {task.status}</div>

              <label>
                Assign
                <select
                  value={task.assigned_to_user_id ?? ""}
                  onChange={(e) => {
                    const userId = e.target.value;
                    if (userId) {
                      void runAction(() => tasks.assign(familyId, task.id, { assignee_user_id: userId }));
                    }
                  }}
                >
                  <option value="">Choose a member</option>
                  {memberList.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.display_name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Status
                <input
                  list={`task-status-options-${task.id}`}
                  defaultValue={task.status}
                  onBlur={(e) => {
                    const next = e.target.value.trim();
                    if (next && next !== task.status) {
                      void runAction(() => tasks.updateStatus(familyId, task.id, { status: next }));
                    }
                  }}
                />
                <datalist id={`task-status-options-${task.id}`}>
                  {statusOptions.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </label>

              <button
                type="button"
                disabled={task.status === "completed" || task.status === "done"}
                onClick={() => void runAction(() => tasks.complete(familyId, task.id))}
              >
                Complete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
