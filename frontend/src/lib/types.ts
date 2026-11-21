// Response and request shapes for the Carecircle API (atlas endpoints).

export type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "rescheduled";
export type TaskStatus = "open" | "in_progress" | "done";
export type RecordType = "Prescription" | "Test result" | "Discharge letter" | "Report" | "Other";

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface CareRecipient {
  id: string;
  name: string;
  date_of_birth: string;
}

export interface FamilyMember {
  id: string;
  user_id: string;
  name: string;
  email: string;
}

export interface Reminder {
  id: string;
  medicine_id: string;
  time: string;
  enabled: boolean;
}

export interface Medicine {
  id: string;
  care_recipient_id: string;
  name: string;
  dosage: string;
  frequency: string;
  instructions: string;
  active: boolean;
  reminders: Reminder[];
}

export interface Appointment {
  id: string;
  care_recipient_id: string;
  scheduled_date: string;
  start_time: string;
  provider: string;
  reason: string;
  notes: string;
  status: AppointmentStatus;
}

export interface AppointmentList {
  upcoming: Appointment[];
  past: Appointment[];
}

export interface HealthAttachment {
  id: string;
  file_name: string;
  file_url: string;
}

export interface HealthRecord {
  id: string;
  care_recipient_id: string;
  title: string;
  record_type: RecordType;
  record_date: string;
  contents: string;
  attachments: HealthAttachment[];
}

export interface FamilyCareTask {
  id: string;
  care_recipient_id: string;
  title: string;
  notes: string;
  due_date: string;
  status: TaskStatus;
  progress: number;
  assignee_id: string | null;
  assignee_name: string | null;
  completed_at: string | null;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  kind: string;
  care_recipient_id: string | null;
  read_at: string | null;
  related_record_type: string | null;
  related_record_id: string | null;
}

export interface CheckIn {
  id: string;
  care_recipient_id: string;
  checked_in_at: string;
  status: string;
  summary: string;
  concern_flagged: boolean;
}

export interface TodayReminder {
  id: string;
  medicine_name: string;
  time: string;
  enabled: boolean;
}

export interface HomeToday {
  reminders: TodayReminder[];
  appointments: Appointment[];
  tasks: FamilyCareTask[];
  check_ins: CheckIn[];
}

export interface Family {
  id: string;
  name: string;
}

export interface MedicineInput {
  care_recipient_id: string;
  name: string;
  dosage: string;
  frequency: string;
  instructions: string;
}

export interface AppointmentInput {
  care_recipient_id: string;
  scheduled_date: string;
  start_time: string;
  provider: string;
  reason: string;
}

export interface HealthRecordInput {
  care_recipient_id: string;
  title: string;
  record_type: RecordType;
  record_date: string;
  contents: string;
}

export interface FamilyCareTaskInput {
  care_recipient_id: string;
  title: string;
  notes: string;
  due_date: string;
  assignee_id: string;
}

export interface FamilyCareTaskUpdate {
  status?: TaskStatus;
  progress?: number;
  assignee_id?: string;
  notes?: string;
  completed_at?: string | null;
}
