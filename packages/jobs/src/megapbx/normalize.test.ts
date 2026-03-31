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
      type: "outbound",
      clientNumber: "+7 900 111-22-33",
      internal_number: "101",
      duration: 45,
      recording_url: "https://example.com/record.mp3",
    });

    expect(result).toEqual(
      expect.objectContaining({
        externalId: "call-1",
        timestamp: "2026-03-18T12:00:00Z",
        direction: "outbound",
        externalNumber: "79001112233",
        internalNumber: "101",
        duration: 45,
        recordingUrl: "https://example.com/record.mp3",
      }),
    );
  });

  it("normalizes inbound call payload", () => {
    const result = normalizeCall({
      call_id: "call-2",
      started_at: "2026-03-18T13:00:00Z",
      type: "inbound",
      clientNumber: "+7 900 222-33-44",
      internal_number: "102",
      duration: 30,
    });

    expect(result).toEqual(
      expect.objectContaining({
        externalId: "call-2",
        timestamp: "2026-03-18T13:00:00Z",
        direction: "inbound",
        externalNumber: "79002223344",
        internalNumber: "102",
        duration: 30,
      }),
    );
  });

  it("читает URL записи из поля истории CRM", () => {
    const result = normalizeCall({
      uid: "NE5O2I5PEC000047",
      start: "2026-03-19T05:40:39Z",
      type: "out",
      status: "success",
      client: "79263901590",
      diversion: "79361326729",
      user: "admin",
      record: "https://vats919602.megapbx.ru/api/v2/call-records/record/2026-03-19/file.mp3",
      duration: 188,
    });

    expect(result).toEqual(
      expect.objectContaining({
        externalId: "NE5O2I5PEC000047",
        timestamp: "2026-03-19T05:40:39Z",
        direction: "outbound",
        externalNumber: "79263901590",
        internalNumber: "79361326729",
        recordingUrl:
          "https://vats919602.megapbx.ru/api/v2/call-records/record/2026-03-19/file.mp3",
      }),
    );
  });

  it("читает URL записи из webhook-поля link", () => {
    const result = normalizeCall({
      cmd: "history",
      type: "out",
      status: "SUCCESS",
      phone: "74951904198",
      user: "admin",
      start: "20170703T121110Z",
      duration: 124,
      link: "https://vats.example.megapbx.ru/records/file.mp3",
      crm_token: "token",
      callid: "33274237",
    });

    expect(result).toEqual(
      expect.objectContaining({
        externalId: "33274237",
        timestamp: "2017-07-03T12:11:10Z",
        direction: "outbound",
        externalNumber: "74951904198",
        recordingUrl: "https://vats.example.megapbx.ru/records/file.mp3",
      }),
    );
  });
});
