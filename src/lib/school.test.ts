import { describe, expect, it } from "vitest";
import { schoolProgress } from "./school";
describe("school progress", () => {
  it("averages notes on /20 even when marked out of 10", () => {
    const p = schoolProgress([
      { kind: "note", grade: 15, out_of: 20, done: false, subject: "Maths" },
      { kind: "note", grade: 8, out_of: 10, done: false, subject: "Maths" },
    ]);
    expect(p.average).toBe(15.5);
  });
  it("homework completion percentage", () => {
    const p = schoolProgress([
      { kind: "devoir", grade: null, out_of: null, done: true, subject: null },
      { kind: "devoir", grade: null, out_of: null, done: false, subject: null },
    ]);
    expect(p.homeworkDone).toBe(50);
  });
});
