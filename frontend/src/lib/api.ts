// Typed client for the Carecircle atlas endpoints.
// All URLs are relative (/api/...). The Vite dev server proxies /api to the
// FastAPI backend (see vite.config.ts), so no host or port is hardcoded here.
import { ApiError } from "./errors";
import type * as T from "./types";

async function request<R>(method: string, path: string, body?: unknown): Promise<R> {
  const res = await fetch(path, {
    method,
    credentials: "include",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = (await res.json()) as { detail?: string };
      if (data.detail) detail = data.detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as R;
  return (await res.json()) as R;
}

const qs = (params: Record<string, string | boolean | undefined>): string => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== "");
  return entries.length ? `?${new URLSearchParams(entries as [string, string][]).toString()}` : "";
};

// ---- Health ----
export const getHealth = () => request<{ status: string }>("GET", "/api/health");

// ---- Auth ----
export const signup = (b: { name: string; email: string; password: string }) =>
  request<T.User>("POST", "/api/auth/signup", b);
export const login = (b: { email: string; password: string }) =>
  request<T.User>("POST", "/api/auth/login", b);
export const logout = () => request<void>("POST", "/api/auth/logout");
export const forgotPassword = (b: { email: string }) =>
  request<void>("POST", "/api/auth/forgot-password", b);
export const resetPassword = (b: { token: string; password: string }) =>
  request<void>("POST", "/api/auth/reset-password", b);

// ---- Me ----
export const getMe = () => request<T.User>("GET", "/api/me");
export const updateMe = (b: { name?: string; email?: string }) =>
  request<T.User>("PATCH", "/api/me", b);
export const updatePassword = (b: { current_password: string; new_password: string }) =>
  request<void>("PATCH", "/api/me/password", b);

// ---- Care recipients / family ----
export const getCareRecipients = () => request<T.CareRecipient[]>("GET", "/api/care-recipients");
export const createCareRecipient = (b: { name: string; date_of_birth: string }) =>
  request<T.CareRecipient>("POST", "/api/care-recipients", b);
export const getFamilyMembers = () => request<T.FamilyMember[]>("GET", "/api/family-members");
export const addFamilyMember = (b: { email: string }) =>
  request<T.FamilyMember>("POST", "/api/family-members", b);
export const createFamily = (b: { name: string }) => request<T.Family>("POST", "/api/families", b);

// ---- Home ----
export const getHomeToday = () => request<T.HomeToday>("GET", "/api/home/today");

// ---- Medicines & reminders ----
export const getMedicines = (careRecipientId?: string) =>
  request<T.Medicine[]>("GET", `/api/medicines${qs({ care_recipient_id: careRecipientId })}`);
export const getMedicine = (id: string) => request<T.Medicine>("GET", `/api/medicines/${id}`);
export const createMedicine = (b: T.MedicineInput) =>
  request<T.Medicine>("POST", "/api/medicines", b);
export const updateMedicine = (id: string, b: Partial<T.MedicineInput> & { active?: boolean }) =>
  request<T.Medicine>("PATCH", `/api/medicines/${id}`, b);
export const addReminder = (medicineId: string, b: { time: string; enabled: boolean }) =>
  request<T.Reminder>("POST", `/api/medicines/${medicineId}/reminders`, b);
export const updateReminder = (id: string, b: { time?: string; enabled?: boolean }) =>
  request<T.Reminder>("PATCH", `/api/reminders/${id}`, b);
export const deleteReminder = (id: string) => request<void>("DELETE", `/api/reminders/${id}`);

// ---- Appointments ----
export const getAppointments = (careRecipientId?: string) =>
  request<T.AppointmentList>("GET", `/api/appointments${qs({ care_recipient_id: careRecipientId })}`);
export const getAppointment = (id: string) =>
  request<T.Appointment>("GET", `/api/appointments/${id}`);
export const createAppointment = (b: T.AppointmentInput) =>
  request<T.Appointment>("POST", "/api/appointments", b);
export const updateAppointment = (
  id: string,
  b: Partial<T.AppointmentInput> & { notes?: string; status?: T.AppointmentStatus },
) => request<T.Appointment>("PATCH", `/api/appointments/${id}`, b);

// ---- Health records ----
export const getHealthRecords = (params: { care_recipient_id?: string; q?: string } = {}) =>
  request<T.HealthRecord[]>("GET", `/api/health-records${qs(params)}`);
export const getHealthRecord = (id: string) =>
  request<T.HealthRecord>("GET", `/api/health-records/${id}`);
export const createHealthRecord = (b: T.HealthRecordInput) =>
  request<T.HealthRecord>("POST", "/api/health-records", b);
export const updateHealthRecord = (id: string, b: { contents: string }) =>
  request<T.HealthRecord>("PATCH", `/api/health-records/${id}`, b);
export async function uploadAttachment(recordId: string, file: File): Promise<T.HealthAttachment> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`/api/health-records/${recordId}/attachments`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  if (!res.ok) throw new ApiError(res.status, res.statusText);
  return (await res.json()) as T.HealthAttachment;
}

// ---- Family care tasks ----
export const getFamilyCareTasks = (careRecipientId?: string) =>
  request<T.FamilyCareTask[]>("GET", `/api/family-care-tasks${qs({ care_recipient_id: careRecipientId })}`);
export const getFamilyCareTask = (id: string) =>
  request<T.FamilyCareTask>("GET", `/api/family-care-tasks/${id}`);
export const createFamilyCareTask = (b: T.FamilyCareTaskInput) =>
  request<T.FamilyCareTask>("POST", "/api/family-care-tasks", b);
export const updateFamilyCareTask = (id: string, b: T.FamilyCareTaskUpdate) =>
  request<T.FamilyCareTask>("PATCH", `/api/family-care-tasks/${id}`, b);

// ---- Notifications & check-ins ----
export const getNotifications = () => request<T.AppNotification[]>("GET", "/api/notifications");
export const markNotificationRead = (id: string) =>
  request<T.AppNotification>("PATCH", `/api/notifications/${id}/read`);
export const getCheckIns = (flaggedOnly?: boolean) =>
  request<T.CheckIn[]>("GET", `/api/check-ins${qs({ concern_flagged: flaggedOnly ? "true" : undefined })}`);
