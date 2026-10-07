import { describe, expect, it } from "vitest";
import en from "./en";
import es from "./es";
import { gradeLabel, t } from ".";

describe("i18n", () => {
  it("es has every en key, none empty, and the same placeholders", () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(es[key], key).toBeTruthy();
      const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
      expect(vars(es[key]), key).toBe(vars(en[key]));
    }
  });

  it("t interpolates {name}", () => {
    expect(t("en", "home.hello", { name: "Ada" })).toBe("Hi, Ada");
    expect(t("es", "home.hello", { name: "Ada" })).toBe("Hola, Ada");
  });

  it("labels grades", () => {
    expect(gradeLabel("en", "K")).toBe("Kindergarten");
    expect(gradeLabel("en", "4")).toBe("Grade 4");
    expect(gradeLabel("es", "4", true)).toBe("4.º");
  });
});
