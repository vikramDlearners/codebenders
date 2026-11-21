import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ApiError, members, roles } from "../api";
import type { MemberOut, RoleOut } from "../api";

interface MembersPermissionsProps {
  familyId: string;
}

function messageOf(err: unknown): string {
  if (err instanceof ApiError) return err.detail;
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

function parseList(text: string): string[] {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export default function MembersPermissions({ familyId }: MembersPermissionsProps) {
  const [memberList, setMemberList] = useState<MemberOut[]>([]);
  const [roleList, setRoleList] = useState<RoleOut[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [memberRoleId, setMemberRoleId] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);

  const [roleName, setRoleName] = useState("");
  const [rolePermissions, setRolePermissions] = useState("");
  const [creatingRole, setCreatingRole] = useState(false);

  const [permDrafts, setPermDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([members.list(familyId), roles.list(familyId)])
      .then(([memberData, roleData]) => {
        if (cancelled) return;
        setMemberList(memberData);
        setRoleList(roleData);
        setPermDrafts(Object.fromEntries(roleData.map((r) => [r.id, r.permissions.join(", ")])));
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

  const handleAddMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError(null);
    setAddingMember(true);
    try {
      const created = await members.create(familyId, {
        email: email.trim(),
        display_name: displayName.trim() || null,
        role_id: memberRoleId,
      });
      setMemberList((prev) => [...prev, created]);
      setEmail("");
      setDisplayName("");
      setMemberRoleId("");
    } catch (err: unknown) {
      setActionError(messageOf(err));
    } finally {
      setAddingMember(false);
    }
  };

  const handleMemberRoleChange = async (membershipId: string, roleId: string) => {
    setActionError(null);
    try {
      const updated = await members.update(familyId, membershipId, { role_id: roleId });
      setMemberList((prev) => prev.map((m) => (m.membership_id === updated.membership_id ? updated : m)));
    } catch (err: unknown) {
      setActionError(messageOf(err));
    }
  };

  const handleSendInvite = async (membershipId: string) => {
    setActionError(null);
    setInviteNotice(null);
    setInvitingId(membershipId);
    try {
      const res = await members.invite(familyId, membershipId);
      setInviteNotice(res.detail);
    } catch (err: unknown) {
      setActionError(messageOf(err));
    } finally {
      setInvitingId(null);
    }
  };

  const handleCreateRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError(null);
    setCreatingRole(true);
    try {
      const created = await roles.create(familyId, {
        name: roleName.trim(),
        permissions: parseList(rolePermissions),
      });
      setRoleList((prev) => [...prev, created]);
      setPermDrafts((prev) => ({ ...prev, [created.id]: created.permissions.join(", ") }));
      setRoleName("");
      setRolePermissions("");
    } catch (err: unknown) {
      setActionError(messageOf(err));
    } finally {
      setCreatingRole(false);
    }
  };

  const handleSavePermissions = async (role: RoleOut) => {
    setActionError(null);
    try {
      const updated = await roles.updatePermissions(familyId, role.id, {
        permissions: parseList(permDrafts[role.id] ?? ""),
      });
      setRoleList((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setPermDrafts((prev) => ({ ...prev, [updated.id]: updated.permissions.join(", ") }));
    } catch (err: unknown) {
      setActionError(messageOf(err));
    }
  };

  if (loading) return <p role="status">Loading members and roles…</p>;
  if (error) return <p role="alert">Could not load members and roles: {error}</p>;

  return (
    <section aria-labelledby="members-permissions-heading">
      <h2 id="members-permissions-heading">Family members &amp; permissions</h2>

      {actionError && <p role="alert">{actionError}</p>}
      {inviteNotice && <p role="status">{inviteNotice}</p>}

      <h3>Members</h3>
      {memberList.length === 0 ? (
        <p>No members yet.</p>
      ) : (
        <ul>
          {memberList.map((m) => (
            <li key={m.membership_id}>
              <strong>{m.display_name}</strong>
              {m.email ? ` (${m.email})` : ""}
              <label>
                Role
                <select
                  value={m.role_id}
                  onChange={(e) => void handleMemberRoleChange(m.membership_id, e.target.value)}
                >
                  {roleList.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              {m.role_name.toLowerCase() === "parent" && (
                <button
                  type="button"
                  disabled={invitingId === m.membership_id}
                  onClick={() => void handleSendInvite(m.membership_id)}
                >
                  {invitingId === m.membership_id ? "Sending…" : "Send login link"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAddMember} aria-label="Add member">
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Display name
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={255} />
        </label>
        <label>
          Role
          <select value={memberRoleId} onChange={(e) => setMemberRoleId(e.target.value)} required>
            <option value="">Select a role</option>
            {roleList.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={addingMember || email.trim() === "" || memberRoleId === ""}>
          {addingMember ? "Adding…" : "Add member"}
        </button>
      </form>

      <h3>Roles</h3>
      {roleList.length === 0 ? (
        <p>No roles yet.</p>
      ) : (
        <ul>
          {roleList.map((r) => (
            <li key={r.id}>
              <strong>{r.name}</strong>
              {r.is_system ? " (system)" : ""}
              <label>
                Permissions (comma-separated)
                <input
                  value={permDrafts[r.id] ?? ""}
                  onChange={(e) => setPermDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))}
                />
              </label>
              <button type="button" onClick={() => void handleSavePermissions(r)}>
                Save permissions
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleCreateRole} aria-label="Create role">
        <label>
          Role name
          <input value={roleName} onChange={(e) => setRoleName(e.target.value)} required maxLength={64} />
        </label>
        <label>
          Permissions (comma-separated)
          <input value={rolePermissions} onChange={(e) => setRolePermissions(e.target.value)} />
        </label>
        <button type="submit" disabled={creatingRole || roleName.trim() === ""}>
          {creatingRole ? "Creating…" : "Create role"}
        </button>
      </form>
    </section>
  );
}
