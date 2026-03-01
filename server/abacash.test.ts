import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { SUBSCRIPTION_PLANS, calculatePlanPrice } from "./abacash";

describe("Abacash Integration", () => {
  describe("Subscription Plans", () => {
    it("should have all subscription plans defined", () => {
      expect(SUBSCRIPTION_PLANS).toHaveProperty("monthly");
      expect(SUBSCRIPTION_PLANS).toHaveProperty("quarterly");
      expect(SUBSCRIPTION_PLANS).toHaveProperty("semiannual");
      expect(SUBSCRIPTION_PLANS).toHaveProperty("annual");
    });

    it("should have correct monthly plan pricing", () => {
      const plan = SUBSCRIPTION_PLANS.monthly;
      expect(plan.price).toBe(24.9);
      expect(plan.priceCents).toBe(2490);
      expect(plan.discount).toBe(0);
      expect(plan.name).toBe("Plano Mensal");
    });

    it("should have correct quarterly plan pricing (5% discount)", () => {
      const plan = SUBSCRIPTION_PLANS.quarterly;
      expect(plan.price).toBe(70.97); // 3 x 24.90 - 5%
      expect(plan.priceCents).toBe(7097);
      expect(plan.discount).toBe(5);
      expect(plan.name).toBe("Plano Trimestral");
    });

    it("should have correct semiannual plan pricing (10% discount)", () => {
      const plan = SUBSCRIPTION_PLANS.semiannual;
      expect(plan.price).toBe(134.46); // 6 x 24.90 - 10%
      expect(plan.priceCents).toBe(13446);
      expect(plan.discount).toBe(10);
      expect(plan.name).toBe("Plano Semestral");
    });

    it("should have correct annual plan pricing (20% discount)", () => {
      const plan = SUBSCRIPTION_PLANS.annual;
      expect(plan.price).toBe(239.04); // 12 x 24.90 - 20%
      expect(plan.priceCents).toBe(23904);
      expect(plan.discount).toBe(20);
      expect(plan.name).toBe("Plano Anual");
    });
  });

  describe("calculatePlanPrice", () => {
    it("should calculate monthly plan price correctly", () => {
      const result = calculatePlanPrice("monthly");
      expect(result.price).toBe(24.9);
      expect(result.priceCents).toBe(2490);
      expect(result.discount).toBe(0);
    });

    it("should calculate quarterly plan price correctly", () => {
      const result = calculatePlanPrice("quarterly");
      expect(result.price).toBe(70.97);
      expect(result.priceCents).toBe(7097);
      expect(result.discount).toBe(5);
    });

    it("should calculate semiannual plan price correctly", () => {
      const result = calculatePlanPrice("semiannual");
      expect(result.price).toBe(134.46);
      expect(result.priceCents).toBe(13446);
      expect(result.discount).toBe(10);
    });

    it("should calculate annual plan price correctly", () => {
      const result = calculatePlanPrice("annual");
      expect(result.price).toBe(239.04);
      expect(result.priceCents).toBe(23904);
      expect(result.discount).toBe(20);
    });
  });

  describe("Plan pricing validation", () => {
    it("should verify discount calculations are correct", () => {
      const basePrice = 24.9;
      
      // Quarterly: 3 months with 5% discount
      const quarterlyExpected = basePrice * 3 * 0.95;
      expect(SUBSCRIPTION_PLANS.quarterly.price).toBeCloseTo(quarterlyExpected, 1);
      
      // Semiannual: 6 months with 10% discount
      const semiannualExpected = basePrice * 6 * 0.90;
      expect(SUBSCRIPTION_PLANS.semiannual.price).toBeCloseTo(semiannualExpected, 1);
      
      // Annual: 12 months with 20% discount
      const annualExpected = basePrice * 12 * 0.80;
      expect(SUBSCRIPTION_PLANS.annual.price).toBeCloseTo(annualExpected, 1);
    });

    it("should verify price in cents matches price in reais", () => {
      Object.entries(SUBSCRIPTION_PLANS).forEach(([key, plan]) => {
        const expectedCents = Math.round(plan.price * 100);
        // Allow small rounding differences
        expect(Math.abs(plan.priceCents - expectedCents)).toBeLessThanOrEqual(1);
      });
    });
  });
});
