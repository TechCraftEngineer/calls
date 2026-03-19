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
      expect(normalizeStatusFilter("missed")).toBe("ПРОПУЩЕН");
      expect(normalizeStatusFilter("answered")).toBe("ПРИНЯТ");
    });

    it("normalizes russian status values", () => {
      expect(normalizeStatusFilter("Пропущен")).toBe("ПРОПУЩЕН");
      expect(normalizeStatusFilter("пропущен")).toBe("ПРОПУЩЕН");
      expect(normalizeStatusFilter("Принят")).toBe("ПРИНЯТ");
      expect(normalizeStatusFilter("принят")).toBe("ПРИНЯТ");
    });
  });
});
