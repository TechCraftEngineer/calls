import { describe, expect, it } from "bun:test";
import { normalizeDirectionFilter, normalizeStatusFilter } from "./list";

describe("calls list normalization", () => {
  describe("normalizeDirectionFilter", () => {
    it("normalizes canonical english direction values", () => {
      expect(normalizeDirectionFilter("inbound")).toBe("inbound");
      expect(normalizeDirectionFilter("outbound")).toBe("outbound");
    });

    it("normalizes russian direction values", () => {
      expect(normalizeDirectionFilter("входящий")).toBe("inbound");
      expect(normalizeDirectionFilter("Входящий")).toBe("inbound");
      expect(normalizeDirectionFilter("исходящий")).toBe("outbound");
      expect(normalizeDirectionFilter("Исходящий")).toBe("outbound");
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
