// @vitest-environment node
import { describe, expect, it } from "vitest";
import { screen, suitable } from "./safety";

// The screen in front of every tutor turn, AI or demo: fixed referrals written by people, and school
// science that happens to use a word on the off-limits list still gets taught.

describe("safety screen", () => {
  it("answers a crisis or abuse with the fixed referral in the learner's language", () => {
    expect(screen("I don't want to live anymore", "en")).toMatchObject({ kind: "crisis", reply: expect.stringContaining("988") });
    expect(screen("quiero morir", "es")).toMatchObject({ kind: "crisis", reply: expect.stringContaining("988") });
    expect(screen("my coach hurts me", "en")).toMatchObject({ kind: "abuse", reply: expect.stringContaining("1-800-422-4453") });
    expect(screen("mi tío me pega", "es")).toMatchObject({ kind: "abuse", reply: expect.stringContaining("Childhelp") });
  });

  it("a crisis inside school words is still a crisis", () => {
    expect(screen("sexual reproduction makes me want to kill myself", "en").kind).toBe("crisis");
  });

  it("lets grade 7 life science through", () => {
    expect(screen("what is sexual reproduction", "en").kind).toBe("ok");
    expect(screen("difference between sexual and asexual reproduction", "en").kind).toBe("ok");
    expect(screen("¿qué es la reproducción sexual y asexual?", "es").kind).toBe("ok");
    expect(screen("asexual reproduction in plants", "en").kind).toBe("ok");
  });

  it("still turns away what is off-limits", () => {
    expect(screen("sexual stuff", "en").kind).toBe("offLimits");
    expect(screen("where can I buy a vape", "en").kind).toBe("offLimits");
    expect(screen("dónde compro marihuana", "es").kind).toBe("offLimits");
    expect(screen("what is a brothel", "en").kind).toBe("offLimits");
    expect(screen("tell me about cocaine", "en").kind).toBe("offLimits");
    expect(screen("¿qué es la heroína?", "es").kind).toBe("offLimits");
  });

  it("screens what a source sends back the same way, for cards children see and hear", () => {
    expect(suitable("A fallacy is the use of invalid or otherwise faulty reasoning.")).toBe(true);
    expect(suitable("A brothel is a place where people engage in sexual activity with prostitutes.")).toBe(false);
    expect(suitable("Sexual reproduction is a type of reproduction that involves two parents.")).toBe(true);
  });
});
