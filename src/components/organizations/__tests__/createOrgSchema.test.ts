import { describe, it, expect } from "vitest";
import { createOrgSchema } from "../CreateOrganizationForm";
import { OrganizationType } from "@/types/database";

describe("createOrgSchema", () => {
  it("accepts valid School organization with school_district", () => {
    const result = createOrgSchema.safeParse({
      name: "Springfield Elementary",
      type: OrganizationType.School,
      school_district: "Springfield Unified",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid Nonprofit organization without school_district", () => {
    const result = createOrgSchema.safeParse({
      name: "Green Earth Foundation",
      type: OrganizationType.Nonprofit,
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid Business organization without school_district", () => {
    const result = createOrgSchema.safeParse({
      name: "Acme Corp",
      type: OrganizationType.Business,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createOrgSchema.safeParse({
      name: "",
      type: OrganizationType.Business,
    });
    expect(result.success).toBe(false);
  });

  it("rejects name over 100 characters", () => {
    const result = createOrgSchema.safeParse({
      name: "a".repeat(101),
      type: OrganizationType.Business,
    });
    expect(result.success).toBe(false);
  });

  it("rejects School type without school_district", () => {
    const result = createOrgSchema.safeParse({
      name: "Test School",
      type: OrganizationType.School,
      school_district: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(paths).toContain("school_district");
    }
  });

  it("rejects missing type", () => {
    const result = createOrgSchema.safeParse({
      name: "Test Org",
      type: undefined,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type value", () => {
    const result = createOrgSchema.safeParse({
      name: "Test Org",
      type: "InvalidType",
    });
    expect(result.success).toBe(false);
  });

  it("accepts name with exactly 100 characters", () => {
    const result = createOrgSchema.safeParse({
      name: "a".repeat(100),
      type: OrganizationType.Business,
    });
    expect(result.success).toBe(true);
  });

  it("does not require school_district for Nonprofit even if provided empty", () => {
    const result = createOrgSchema.safeParse({
      name: "Test Nonprofit",
      type: OrganizationType.Nonprofit,
      school_district: "",
    });
    expect(result.success).toBe(true);
  });
});
