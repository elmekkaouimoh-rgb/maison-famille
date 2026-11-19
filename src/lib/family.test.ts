import { describe, expect, it } from "vitest";
import { ageFrom, canLogInAlone, expandEvents, interfaceForAge, usernameToEmail } from "./family";

describe("family rules", () => {
  it("computes Maya's age from 04/02/2013", () => {
    expect(ageFrom("2013-02-04", new Date("2026-11-19"))).toBe(13);
  });
  it("Eden (born 01/06/2023) gets the toddler interface", () => {
    expect(interfaceForAge(ageFrom("2023-06-01", new Date("2026-11-19")))).toBe("toutpetit");
  });
  it("toddlers cannot log in alone", () => {
    expect(canLogInAlone(3)).toBe(false);
  });
  it("usernames map to a normalized email", () => {
    expect(usernameToEmail("Naël")).toBe("nael@familyos.app");
  });
  it("expands yearly birthdays", () => {
    const r = expandEvents([{ start_at: "2020-06-14T00:00:00Z", recurrence: "annuelle" }], new Date("2026-01-01"), new Date("2026-12-31"));
    expect(r).toHaveLength(1);
  });
});
