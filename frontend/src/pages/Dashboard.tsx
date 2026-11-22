import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../dashboard.css";
import WorkspaceLayout from "../components/WorkspaceLayout";
import {
  ApiError,
  auth,
  getFamilyDashboard,
  getFamilyReport,
  type DashboardParentOut,
  type DashboardResponse,
  type DashboardStockItemOut,
  type ReportResponse,
  tasks,
  type TaskOut,
} from "../api";

// Family dashboard: GET /api/families/{familyId}/dashboard, optionally scoped
// to one parent with care_profile_id.

const TIME_RE = /^(\d{1,2}):(\d{2})/;

// Medicines without reminder times are recorded per part of the day.
const SLOT_PART_NAMES: Record<string, string> = { morning: "Morning", noon: "Afternoon", night: "Night" };

function formatTime(hhmm: string): string {
  const m = TIME_RE.exec(hhmm);
  if (!m) return hhmm;
  const h = Number(m[1]);
  return `${((h + 11) % 12) + 1}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}

// Dates arrive as "YYYY-MM-DD"; build a local day to avoid UTC shifts.
function parseDay(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatStamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function errorText(err: unknown): string {
  return err instanceof ApiError ? err.detail : "Could not load the dashboard.";
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const REPORT_CSS = `
body{font-family:Arial,Helvetica,sans-serif;color:#1f2d2b;margin:32px;font-size:13px;}
h1{color:#0f7b6c;margin:0;font-size:26px;text-align:center;}
.sub{text-align:center;color:#5b6b68;margin:4px 0 16px;letter-spacing:.05em;}
h2{font-size:18px;margin:24px 0 6px;}
p.lead{color:#3b4a47;margin:4px 0 8px;}
table{border-collapse:collapse;width:100%;margin:6px 0;}
th,td{border:1px solid #d7e3e0;padding:6px 8px;text-align:left;vertical-align:top;}
thead th{background:#0f7b6c;color:#fff;}
table.profile th{background:#f2f8f7;color:#1f2d2b;width:18%;}
.stats{display:flex;gap:0;margin:12px 0;border:1px solid #cfe6e1;background:#e8f5f2;}
.stats div{flex:1;text-align:center;padding:10px;border-left:1px solid #cfe6e1;}
.stats div:first-child{border-left:none;}
.stats strong{display:block;font-size:20px;color:#0f7b6c;}
.muted{color:#6b7a77;}
.disclaimer{margin-top:28px;border-top:1px solid #d7e3e0;padding-top:10px;color:#5b6b68;font-size:11px;}
`;

function buildReportHtml(r: ReportResponse): string {
  const e = escapeHtml;
  const p = r.profile;
  const pct = (v: number | null) => (v === null ? "—" : `${v}%`);
  const emptyRow = (cols: number) => `<tr><td colspan="${cols}" class="muted">No entries recorded</td></tr>`;
  const table = (headers: string[], rows: string) =>
    `<table><thead><tr>${headers.map((h) => `<th>${e(h)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>`;

  const medicineRows = r.medicines
    .map((m) => {
      const stock =
        m.stock_days_left === null ? (m.low_stock ? "Low" : "—") : `${Math.round(m.stock_days_left)} days left`;
      return `<tr><td>${e(m.display_name)}</td><td>${e(m.schedule.join(", ") || "—")}</td><td>${e(
        `${m.taken} / ${m.scheduled ?? "—"} recorded taken`,
      )}</td><td>${e(stock)}${m.low_stock ? " (low stock)" : ""}</td></tr>`;
    })
    .join("");

  const dietRows =
    r.diet.meals.map((m) => `<tr><td>${e(m.meal)}</td><td>${e(`${m.days_logged} days logged`)}</td></tr>`).join("") +
    `<tr><td>Water intake</td><td>${e(`${r.diet.water_days} days logged`)}</td></tr>` +
    `<tr><td>Fruit / vegetables</td><td>${e(`${r.diet.fruit_days} days logged`)}</td></tr>`;

  const healthRows = r.health_entries
    .map((h) => `<tr><td>${e(h.day)}</td><td>${e(h.text)}</td><td>${h.urgent ? "Urgent" : ""}</td></tr>`)
    .join("");

  const checklistItems: string[] = [
    ...r.checklist.low_stock.map((name) => `Review refill timing for low-stock medicine: ${name}`),
    ...(r.checklist.unconfirmed_checkins > 0
      ? [`Check with parent/caregiver about ${r.checklist.unconfirmed_checkins} unconfirmed check-in(s)`]
      : []),
    ...r.checklist.upcoming_appointments.map(
      (a) =>
        `Appointment ${a.scheduled_date} ${a.start_time}: ${a.reason} with ${a.provider}${
          a.location ? ` at ${a.location}` : ""
        } (${a.status})`,
    ),
  ];
  const checklistHtml = checklistItems.length
    ? `<ul>${checklistItems.map((item) => `<li>${e(item)}</li>`).join("")}</ul>`
    : `<p class="muted">No entries recorded</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>CareCircle monthly parent report ${e(r.period.month)}</title>
<style>${REPORT_CSS}</style>
</head>
<body>
<h1>CareCircle</h1>
<p class="sub">MONTHLY PARENT HEALTH REPORT</p>
<table class="profile"><tbody>
<tr><th>Parent name</th><td>${e(p.display_name)}</td><th>Report period</th><td>${e(r.period.start)} – ${e(r.period.end)}</td></tr>
<tr><th>Age</th><td>${p.age === null ? "Not set" : e(`${p.age} years`)}</td><th>Relationship</th><td>${e(p.relationship ?? "Not set")}</td></tr>
<tr><th>Primary caregiver</th><td>${e(p.primary_caregiver_name ?? "Not set")}</td><th>Language</th><td>${e(p.preferred_language)}</td></tr>
<tr><th>Health details on file</th><td>${e(p.health_details ?? "None recorded")}</td><th>Primary doctor</th><td>${e(p.primary_doctor ?? "Not set")}</td></tr>
</tbody></table>
<div class="stats">
<div><strong>${e(pct(r.summary.medicine_checkins_recorded_pct))}</strong>Medicine check-ins recorded</div>
<div><strong>${e(pct(r.summary.diet_days_recorded_pct))}</strong>Diet log days recorded</div>
<div><strong>${e(r.summary.health_entries)}</strong>Health entries logged</div>
<div><strong>${e(r.summary.followups_to_review)}</strong>Follow-up notes to review</div>
</div>
<h2>1. Medicine report</h2>
${r.medicines.length ? table(["Medicine", "Schedule", "Check-in summary", "Stock note"], medicineRows) : `<p class="muted">No entries recorded</p>`}
<h2>2. Diet report</h2>
${table(["Diet item", "Monthly log summary"], dietRows || emptyRow(2))}
<p class="lead">Diet log coverage: entries recorded on ${e(r.diet.days_with_entries)} day(s) this month. This section reflects family-entered logs, not a nutrition assessment.</p>
<h2>3. Health report</h2>
${r.health_entries.length ? table(["Date", "Entry", "Urgent"], healthRows) : `<p class="muted">No entries recorded</p>`}
<h2>4. Family follow-up checklist</h2>
${checklistHtml}
<div class="disclaimer">
<p>${e(r.disclaimer)}</p>
<p>Family-entered records only. Not medical advice or a clinical assessment.</p>
</div>
</body>
</html>`;
}

function downloadReportHtml(filename: string, html: string): void {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

type Tone = "red" | "amber" | "green";

function stockTone(item: DashboardStockItemOut): Tone {
  if (item.low || (item.days_left !== null && item.days_left <= 4)) return "red";
  if (item.days_left !== null && item.days_left <= 7) return "amber";
  return "green";
}

function daysLabel(item: DashboardStockItemOut): string {
  if (item.days_left === null) return item.low ? "Low" : "—";
  const n = Math.round(item.days_left);
  return `${n} day${n === 1 ? "" : "s"} left`;
}

function Avatar({ name, photoUrl, gender }: { name: string; photoUrl: string | null; gender: string | null }) {
  if (photoUrl) return <img className="db-avatar" src={photoUrl} alt={name} />;
  if (gender === "male" || gender === "female") {
    return (
      <span className="db-avatar is-emoji" aria-hidden="true">
        {gender === "male" ? "👨" : "👩"}
      </span>
    );
  }
  return (
    <span className="db-avatar is-initials" aria-hidden="true">
      {initials(name)}
    </span>
  );
}

export default function Dashboard() {
  const { familyId = "" } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [familyTasks, setFamilyTasks] = useState<TaskOut[]>([]);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [reportBusy, setReportBusy] = useState(false);

  useEffect(() => {
    let active = true;
    auth
      .me()
      .then((me) => {
        if (active) setUserName(me.display_name);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getFamilyDashboard(familyId, selectedId ? { care_profile_id: selectedId } : {})
      .then((res) => {
        if (active) setData(res);
      })
      .catch((err) => {
        if (active) setError(errorText(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [familyId, selectedId]);

  useEffect(() => {
    let active = true;
    setTasksError(null);
    tasks
      .list(familyId)
      .then((res) => {
        if (active) setFamilyTasks(res);
      })
      .catch((err) => {
        if (active) setTasksError(errorText(err));
      });
    return () => {
      active = false;
    };
  }, [familyId]);

  const greeting = `Good Evening, ${userName ?? "there"}`;

  async function handleDownloadReport() {
    setReportBusy(true);
    try {
      const params: { care_profile_id?: string; month?: string } = {};
      if (selectedId) params.care_profile_id = selectedId;
      const month = data?.on_date.slice(0, 7);
      if (month) params.month = month;
      const report = await getFamilyReport(familyId, params);
      downloadReportHtml(`carecircle-report-${report.period.month}.html`, buildReportHtml(report));
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Could not download the report.");
    } finally {
      setReportBusy(false);
    }
  }

  let content: ReactNode;
  if (!data) {
    content = error ? (
      <div role="alert" className="db-banner is-error">
        {error}
      </div>
    ) : (
      <p role="status" className="pp-muted">
        Loading dashboard…
      </p>
    );
  } else {
    const parent: DashboardParentOut | undefined =
      data.parents.find((p) => p.care_profile_id === data.selected_care_profile_id) ?? data.parents[0];
    const taken = data.medicines_today.taken;
    const total = data.medicines_today.total;
    const lowCount = data.medicine_stock.filter((s) => s.low).length;
    const appt = data.next_appointment;

    content = (
      <>
        {error && (
          <div role="alert" className="db-banner is-error">
            {error}
          </div>
        )}
        {loading && <p role="status" className="pp-muted">Updating…</p>}

        {/* Parent overview */}
        <section className="db-card db-tint-teal db-overview" aria-label="Parent overview">
          <div className="db-overview-main">
            <h2 className="db-card-title">Parent Overview</h2>
            {data.parents.length > 0 ? (
              <div className="db-switcher" role="group" aria-label="Choose parent">
                {data.parents.map((p) => {
                  const active = p.care_profile_id === parent?.care_profile_id;
                  return (
                    <button
                      key={p.care_profile_id}
                      type="button"
                      className={`db-switch${active ? " is-active" : ""}`}
                      aria-pressed={active}
                      onClick={() => setSelectedId(p.care_profile_id)}
                    >
                      <Avatar name={p.display_name} photoUrl={p.photo_url} gender={p.gender} />
                      {p.display_name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="pp-muted">No parents added yet.</p>
            )}
            {parent && (
              <div className="db-parent">
                <Avatar name={parent.display_name} photoUrl={parent.photo_url} gender={parent.gender} />
                <div className="db-parent-text">
                  <button
                    type="button"
                    className="db-parent-name db-parent-link"
                    onClick={() => navigate(`/family/${familyId}/parents/${parent.care_profile_id}`)}
                  >
                    {parent.display_name}
                  </button>
                  <div className="pp-muted">
                    {parent.age !== null ? `${parent.age} years` : "Age not set"}
                    {parent.relationship && ` • ${parent.relationship}`}
                  </div>
                </div>
                {parent.all_good && <span className="db-badge is-good">✓ All Good</span>}
              </div>
            )}
          </div>
          <dl className="db-facts">
            <div>
              <dt>Health</dt>
              <dd>{parent?.known_health_conditions || "None recorded"}</dd>
            </div>
            <div>
              <dt><span aria-hidden="true">💊</span> Medicines</dt>
              <dd>{data.daily_medicine_count} Medicine(s) daily</dd>
            </div>
            <div>
              <dt>Primary Caregiver</dt>
              <dd>{parent?.primary_caregiver_name || "Not set"}</dd>
            </div>
          </dl>
        </section>

        {/* Summary cards */}
        <div className="db-summary">
          <section className="db-card db-tint-mint">
            <h3 className="db-card-title"><span aria-hidden="true">💊</span> Today's Medicines</h3>
            <p className="db-big">
              {taken} / {total}
            </p>
            {total > 0 && taken === total && <span className="db-badge is-good">✓ Completed</span>}
          </section>

          <section className="db-card db-tint-blue">
            <h3 className="db-card-title"><span aria-hidden="true">📅</span> Next Appointment</h3>
            {appt ? (
              <>
                <p className="db-big db-big-sm">{parseDay(appt.scheduled_date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</p>
                <p className="db-sub">{appt.title}</p>
                <p className="pp-muted">
                  {appt.doctor}
                  {appt.location && ` • ${appt.location}`}
                </p>
                <p className="pp-muted">{formatTime(appt.start_time)}</p>
              </>
            ) : (
              <p className="pp-muted">No upcoming appointments.</p>
            )}
          </section>

          <section className="db-card db-tint-lavender">
            <h3 className="db-card-title"><span aria-hidden="true">💊</span> Medicine Stock</h3>
            <p className="db-big">
              {lowCount > 0 ? <span className="db-badge is-red">{lowCount} Low</span> : <span className="db-badge is-good">All OK</span>}
            </p>
            <p className="pp-muted">Out of {data.medicine_stock.length} medicines</p>
          </section>

          <section className="db-card db-tint-rose">
            <h3 className="db-card-title">Emergency</h3>
            {data.emergency.active ? (
              <span className="db-badge is-red">Emergency alert active</span>
            ) : (
              <span className="db-badge is-good">✓ No Active Alerts</span>
            )}
            <p className="pp-muted">
              {data.emergency.last_check_at
                ? `Last check: ${formatStamp(data.emergency.last_check_at)}`
                : "No check recorded yet"}
            </p>
          </section>
        </div>

        {/* Lists */}
        <div className="db-lists">
          <section className="db-card db-tint-mint" aria-label="Medicine stock list">
            <h2 className="db-card-title"><span aria-hidden="true">💊</span> Medicine Stock</h2>
            {data.medicine_stock.length === 0 ? (
              <p className="pp-muted">No medicines in stock.</p>
            ) : (
              <ul className="db-list">
                {data.medicine_stock.map((s) => (
                  <li key={s.medicine_id} className="db-row">
                    <div className="db-row-main">
                      <strong>{s.display_name}</strong>
                      <span className="pp-muted">
                        {[s.instructions_text, s.purpose].filter(Boolean).join(" • ") || "—"}
                      </span>
                    </div>
                    <span className={`db-days is-${stockTone(s)}`}>{daysLabel(s)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="db-card db-tint-blue" aria-label="Today's schedule">
            <h2 className="db-card-title">Today's Schedule</h2>
            <table className="db-schedule-table">
              <thead>
                <tr>
                  <th scope="col">Time</th>
                  <th scope="col"><span aria-hidden="true">💊</span> Medicine</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.today_schedule.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="pp-muted">No doses scheduled today.</td>
                  </tr>
                ) : (
                  data.today_schedule.map((item, i) => {
                    const done = item.status === "taken";
                    return (
                      <tr key={`${item.medicine_id}-${item.slot}-${i}`}>
                        <td className="db-schedule-time">
                          {item.slot === "any" || item.slot in SLOT_PART_NAMES
                            ? (SLOT_PART_NAMES[item.slot] ?? "Any time")
                            : formatTime(item.slot)}
                        </td>
                        <td className="db-schedule-name">{item.medicine_name}</td>
                        <td>
                          <span className={`db-schedule-status${done ? " is-done" : " is-pending"}`}>
                            {done ? "Completed" : "Pending"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </section>

          <section className="db-card db-tint-lavender" aria-label="Tasks">
            <h2 className="db-card-title">Tasks</h2>
            {tasksError ? (
              <p className="pp-muted">{tasksError}</p>
            ) : familyTasks.length === 0 ? (
              <p className="pp-muted">No tasks for this family.</p>
            ) : (
              <ul className="db-list">
                {familyTasks.map((t) => (
                  <li key={t.id} className="db-row">
                    <span className="db-row-main">{t.title}</span>
                    <span className="pp-muted db-stamp">
                      {t.due_at ? formatStamp(t.due_at) : t.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </>
    );
  }

  return (
    <WorkspaceLayout familyId={familyId} current="overview" title="Dashboard">
      <div className="pp-content db">
        <div className="pp-page-head">
          <div>
            <h1>{greeting}</h1>
            <p className="pp-muted">Here's your family care summary for today.</p>
          </div>
          <button type="button" className="pp-btn" onClick={handleDownloadReport} disabled={reportBusy}>
            {reportBusy ? "Preparing…" : "Download report"}
          </button>
        </div>
        {content}
      </div>
    </WorkspaceLayout>
  );
}
