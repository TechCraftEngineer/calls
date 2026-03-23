import { describe, expect, it } from "bun:test";
import { normalizeDirectionFilter, normalizeStatusFilter } from "./list";

describe("calls list normalization", () => {
  describe("normalizeDirectionFilter", () => {
    it("normalizes canonical english direction values", () => {
      expect(normalizeDirectionFilter("incoming")).toBe("incoming");
      expect(normalizeDirectionFilter("inbound")).toBe("incoming");
      expect(normalizeDirectionFilter("outgoing")).toBe("outgoing");
      expect(normalizeDirectionFilter("outbound")).toBe("outgoing");
    });

    it("normalizes russian direction values", () => {
      expect(normalizeDirectionFilter("входящий")).toBe("incoming");
      expect(normalizeDirectionFilter("Входящий")).toBe("incoming");
      expect(normalizeDirectionFilter("исходящий")).toBe("outgoing");
      expect(normalizeDirectionFilter("Исходящий")).toBe("outgoing");
    });
  });

  describe("normalizeStatusFilter", () => {
    it("normalizes canonical english status values", () => {
      expect(normalizeStatusFilter("missed")).toBe("missed");
      expect(normalizeStatusFilter("answered")).toBe("answered");
      expect(normalizeStatusFilter("accepted")).toBe("answered");
      expect(normalizeStatusFilter("completed")).toBe("answered");
      expect(normalizeStatusFilter("connected")).toBe("answered");
    });

    it("normalizes russian status values", () => {
      expect(normalizeStatusFilter("Пропущен")).toBe("missed");
      expect(normalizeStatusFilter("пропущен")).toBe("missed");
      expect(normalizeStatusFilter("Принят")).toBe("answered");
      expect(normalizeStatusFilter("принят")).toBe("answered");
    });

    it("normalizes uppercase russian status values", () => {
      expect(normalizeStatusFilter("ПРОПУЩЕН")).toBe("missed");
      expect(normalizeStatusFilter("ПРИНЯТ")).toBe("answered");
    });
  });
});
