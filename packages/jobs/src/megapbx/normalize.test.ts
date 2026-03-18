import { describe, expect, it } from "bun:test";
import { normalizeCall, normalizeEmployee, normalizeNumber } from "./normalize";

describe("MegaPBX normalize helpers", () => {
  it("normalizes employee payload", () => {
    const result = normalizeEmployee({
      employee_id: "emp-1",
      first_name: "Иван",
      last_name: "Петров",
      extension: "101",
      email: "ivan@example.com",
      active: true,
    });

    expect(result).toEqual(
      expect.objectContaining({
        externalId: "emp-1",
        displayName: "Иван Петров",
        extension: "101",
        email: "ivan@example.com",
        isActive: true,
      }),
    );
  });

  it("normalizes number payload and strips formatting", () => {
    const result = normalizeNumber({
      id: "num-1",
      employee_id: "emp-1",
      phone: "+7 (903) 555-39-73",
      internal_number: "101",
      label: "Основной",
    });

    expect(result).toEqual(
      expect.objectContaining({
        externalId: "num-1",
        employeeExternalId: "emp-1",
        phoneNumber: "79035553973",
        extension: "101",
        label: "Основной",
      }),
    );
  });

  it("normalizes call payload and maps direction", () => {
    const result = normalizeCall({
      call_id: "call-1",
      started_at: "2026-03-18T12:00:00Z",
      type: "outgoing",
      clientNumber: "+7 900 111-22-33",
      internal_number: "101",
      duration: 45,
      recording_url: "https://example.com/record.mp3",
    });

    expect(result).toEqual(
      expect.objectContaining({
        externalId: "call-1",
        timestamp: "2026-03-18T12:00:00Z",
        direction: "Исходящий",
        externalNumber: "79001112233",
        internalNumber: "101",
        duration: 45,
        recordingUrl: "https://example.com/record.mp3",
      }),
    );
  });
});
