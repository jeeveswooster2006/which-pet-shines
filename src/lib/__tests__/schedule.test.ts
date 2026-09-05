import { describe, it, expect } from "vitest";
import {
  scheduleForRound64Sunday,
  scheduleForUpcomingSubmissionWindow,
  scheduleForCurrentRoundsWindow,
} from "@/lib/schedule";

describe("scheduleForRound64Sunday", () => {
  it("lays out the full Sun-Fri round schedule plus surrounding submission window", () => {
    // 2026-09-06 is a Sunday.
    const s = scheduleForRound64Sunday(new Date(Date.UTC(2026, 8, 6)));

    expect(s.submissionsOpenAt.toISOString()).toBe("2026-08-31T00:00:00.000Z"); // Monday
    expect(s.submissionsCloseAt.toISOString()).toBe("2026-09-06T00:00:00.000Z"); // start of Sunday

    expect(s.rounds.ROUND_64.start.toISOString()).toBe("2026-09-06T00:00:00.000Z");
    expect(s.rounds.ROUND_64.end.toISOString()).toBe("2026-09-07T00:00:00.000Z");
    expect(s.rounds.ROUND_32.start.toISOString()).toBe("2026-09-07T00:00:00.000Z");
    expect(s.rounds.ROUND_16.start.toISOString()).toBe("2026-09-08T00:00:00.000Z");
    expect(s.rounds.QUARTERFINAL.start.toISOString()).toBe("2026-09-09T00:00:00.000Z");
    expect(s.rounds.SEMIFINAL.start.toISOString()).toBe("2026-09-10T00:00:00.000Z");
    expect(s.rounds.FINAL.start.toISOString()).toBe("2026-09-11T00:00:00.000Z");
    expect(s.rounds.FINAL.end.toISOString()).toBe("2026-09-12T00:00:00.000Z");

    expect(s.championAnnouncedAt.toISOString()).toBe("2026-09-12T00:00:00.000Z"); // Saturday
  });

  it("rejects a non-Sunday anchor", () => {
    expect(() =>
      scheduleForRound64Sunday(new Date(Date.UTC(2026, 8, 7)))
    ).toThrow();
  });

  it("derives a stable ISO week label", () => {
    const s = scheduleForRound64Sunday(new Date(Date.UTC(2026, 8, 6)));
    expect(s.weekLabel).toMatch(/^\d{4}-W\d{2}$/);
  });
});

describe("scheduleForUpcomingSubmissionWindow / scheduleForCurrentRoundsWindow", () => {
  it("on a Wednesday, submissions are open for the upcoming Sunday while THIS week's rounds play out from last Sunday", () => {
    // 2026-09-09 is a Wednesday.
    const now = new Date(Date.UTC(2026, 8, 9, 12));

    const upcoming = scheduleForUpcomingSubmissionWindow(now);
    expect(upcoming.round64Sunday.toISOString()).toBe("2026-09-13T00:00:00.000Z");

    const current = scheduleForCurrentRoundsWindow(now);
    expect(current.round64Sunday.toISOString()).toBe("2026-09-06T00:00:00.000Z");

    // The two windows are for consecutive weeks, and the "upcoming" one's
    // submission period genuinely overlaps the "current" one's rounds.
    expect(upcoming.submissionsOpenAt.toISOString()).toBe("2026-09-07T00:00:00.000Z");
    expect(current.rounds.QUARTERFINAL.start.toISOString()).toBe(
      "2026-09-09T00:00:00.000Z"
    );
  });

  it("on Sunday itself, the upcoming submission window is for next Sunday, not today", () => {
    const now = new Date(Date.UTC(2026, 8, 13, 3)); // Sunday
    const upcoming = scheduleForUpcomingSubmissionWindow(now);
    expect(upcoming.round64Sunday.toISOString()).toBe("2026-09-20T00:00:00.000Z");

    const current = scheduleForCurrentRoundsWindow(now);
    expect(current.round64Sunday.toISOString()).toBe("2026-09-13T00:00:00.000Z");
  });
});
