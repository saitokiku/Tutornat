// @vitest-environment node
import { describe, expect, it } from "vitest";

const { isPublicAddress, normalizeFeedUrl, fetchFeed } = await import("./safe-fetch");

describe("feed fetching guard", () => {
  it("knows private addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"])
      expect(isPublicAddress(ip), ip).toBe(false);
    for (const ip of ["8.8.8.8", "172.32.0.1", "142.250.80.46", "2607:f8b0:4004:800::200e"]) expect(isPublicAddress(ip), ip).toBe(true);
  });

  it("accepts https and webcal only", () => {
    expect(normalizeFeedUrl("webcal://calendar.google.com/x.ics").protocol).toBe("https:");
    expect(() => normalizeFeedUrl("http://example.com/a.ics")).toThrow();
    expect(() => normalizeFeedUrl("file:///etc/passwd")).toThrow();
    expect(() => normalizeFeedUrl("https://user:pw@example.com/")).toThrow();
    expect(() => normalizeFeedUrl("https://example.com:8443/")).toThrow();
  });

  it("refuses private hosts before fetching", async () => {
    await expect(fetchFeed("https://127.0.0.1/cal.ics")).rejects.toMatchObject({ code: "blocked" });
    await expect(fetchFeed("https://localhost/cal.ics")).rejects.toMatchObject({ code: "blocked" });
  });
});
