import { normalizeCallStatus } from "@calls/db";

type NormalizedBase = {
  externalId: string;
  rawData: Record<string, unknown>;
};

export type NormalizedEmployee = NormalizedBase & {
  extension: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  isActive: boolean;
};

export type NormalizedNumber = NormalizedBase & {
  employeeExternalId: string | null;
  phoneNumber: string;
  extension: string | null;
  label: string | null;
  lineType: string | null;
  isActive: boolean;
};

export type NormalizedCall = NormalizedBase & {
  employeeExternalId: string | null;
  numberExternalId: string | null;
  timestamp: string;
  duration: number | null;
  direction: string | null;
  externalNumber: string | null;
  internalNumber: string | null;
  status: string | null;
  recordingUrl: string | null;
};

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  return null;
}

function asBool(value: unknown, fallback = true): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const lowered = value.toLowerCase();
    if (["true", "1", "yes", "active", "enabled"].includes(lowered)) return true;
    if (["false", "0", "no", "inactive", "disabled"].includes(lowered)) return false;
  }
  return fallback;
}

function normalizePhone(value: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits || value;
}

function normalizeTimestamp(value: string | null): string | null {
  if (!value) return null;
  const v = value.trim();
  // MegaPBX format: YYYYmmddTHHMMSSZ -> ISO 8601
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (m) {
    const [, y, mo, d, h, mi, s] = m;
    return `${y}-${mo}-${d}T${h}:${mi}:${s}Z`;
  }
  return v;
}

export function normalizeEmployee(raw: Record<string, unknown>): NormalizedEmployee | null {
  const externalId =
    asString(raw.login) ??
    asString(raw.id) ??
    asString(raw.employeeId) ??
    asString(raw.employee_id) ??
    asString(raw.extensionId);
  if (!externalId) return null;

  const firstName = asString(raw.firstName) ?? asString(raw.first_name);
  const lastName = asString(raw.lastName) ?? asString(raw.last_name);
  const displayName =
    asString(raw.displayName) ??
    asString(raw.name) ??
    ([firstName, lastName].filter(Boolean).join(" ").trim() || externalId);

  return {
    externalId,
    extension:
      asString(raw.ext) ??
      asString(raw.extension) ??
      asString(raw.internalNumber) ??
      asString(raw.internal_number),
    email: asString(raw.email),
    firstName,
    lastName,
    displayName,
    isActive: asBool(raw.isActive ?? raw.active, true),
    rawData: raw,
  };
}

export function normalizeNumber(raw: Record<string, unknown>): NormalizedNumber | null {
  const userId = asString(raw.user);
  const telnum = asString(raw.telnum);
  const externalId =
    asString(raw.id) ??
    asString(raw.numberId) ??
    asString(raw.number_id) ??
    (userId && telnum ? `${userId}:${telnum}` : null) ??
    telnum;
  const phoneNumber =
    normalizePhone(
      asString(raw.telnum) ??
        asString(raw.phoneNumber) ??
        asString(raw.phone) ??
        asString(raw.number) ??
        asString(raw.did),
    ) ?? null;

  if (!externalId || !phoneNumber) return null;

  return {
    externalId,
    employeeExternalId:
      asString(raw.user) ??
      asString(raw.employeeId) ??
      asString(raw.employee_id) ??
      asString(raw.userId) ??
      null,
    phoneNumber,
    extension:
      asString(raw.extension) ?? asString(raw.internalNumber) ?? asString(raw.internal_number),
    label: asString(raw.user_name) ?? asString(raw.label) ?? asString(raw.name),
    lineType: asString(raw.type) ?? asString(raw.lineType) ?? asString(raw.line_type),
    isActive:
      typeof raw.disabled === "boolean" ? !raw.disabled : asBool(raw.isActive ?? raw.active, true),
    rawData: raw,
  };
}

export function normalizeCall(raw: Record<string, unknown>): NormalizedCall | null {
  const externalId =
    asString(raw.callid) ??
    asString(raw.uid) ??
    asString(raw.id) ??
    asString(raw.callId) ??
    asString(raw.call_id);
  const timestamp =
    normalizeTimestamp(asString(raw.start)) ??
    asString(raw.timestamp) ??
    asString(raw.startedAt) ??
    asString(raw.started_at) ??
    asString(raw.dateTime) ??
    asString(raw.createdAt);

  if (!externalId || !timestamp) return null;

  const directionRaw = asString(raw.direction) ?? asString(raw.callType) ?? asString(raw.type);
  const direction =
    directionRaw?.toLowerCase().includes("out") || directionRaw?.toLowerCase().includes("исх")
      ? "outbound"
      : directionRaw?.toLowerCase().includes("in") || directionRaw?.toLowerCase().includes("вх")
        ? "inbound"
        : directionRaw;

  return {
    externalId,
    employeeExternalId:
      asString(raw.user) ??
      asString(raw.employeeId) ??
      asString(raw.employee_id) ??
      asString(raw.userId) ??
      null,
    numberExternalId: asString(raw.numberId) ?? asString(raw.number_id) ?? asString(raw.lineId),
    timestamp,
    duration: raw.durationSeconds
      ? Number(raw.durationSeconds)
      : raw.duration
        ? Number(raw.duration)
        : null,
    direction,
    externalNumber:
      normalizePhone(
        asString(raw.client) ??
          asString(raw.clientNumber) ??
          asString(raw.externalNumber) ??
          asString(raw.external_number) ??
          asString(raw.phone),
      ) ?? null,
    internalNumber:
      normalizePhone(
        asString(raw.diversion) ??
          asString(raw.extension) ??
          asString(raw.internalNumber) ??
          asString(raw.internal_number),
      ) ?? null,
    status: normalizeCallStatus(asString(raw.status)),
    recordingUrl:
      asString(raw.link) ??
      asString(raw.Link) ??
      asString(raw.record) ??
      asString(raw.recordingUrl) ??
      asString(raw.recording_url) ??
      asString(raw.recordUrl) ??
      null,
    rawData: raw,
  };
}
