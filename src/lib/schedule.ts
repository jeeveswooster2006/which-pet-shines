// Maps the weekly Mon-Sat submissions / Sun-Fri rounds / Sat champion cycle
// from the product spec onto concrete UTC timestamps.
//
// Anchor concept: every tournament is identified by the Sunday its Round of
// 64 falls on ("D"). From D:
//   submissions open   D-6 (Mon) 00:00 UTC
//   submissions close   D-1 (Sat) 23:59:59.999 UTC
//   Round of 64          [D,   D+1)
//   Round of 32          [D+1, D+2)
//   Round of 16          [D+2, D+3)
//   Quarter-final        [D+3, D+4)
//   Semi-final           [D+4, D+5)
//   Final                [D+5, D+6)
//   Champion announced   D+6 (Sat)
// Note next week's submissions (D+7-6=D+1 .. D+6) run concurrently with this
// week's rounds — that's intentional per the spec ("next week's submissions
// continue" on the same Saturday the outgoing champion is announced).

import {
  addDays,
  startOfDay,
  getISOWeek,
  getISOWeekYear,
  nextDay,
  previousDay,
  isSunday,
} from "date-fns";
import { ROUND_ORDER } from "@/lib/constants";
import type { Round } from "@/lib/types";

const Sunday = 0;

/** The Sunday >= `from` (or `from` itself if it's already a Sunday). */
export function onOrAfterSunday(from: Date): Date {
  const day = startOfDay(from);
  return isSunday(day) ? day : nextDay(day, Sunday);
}

/** The most recent Sunday <= `from` (or `from` itself if it's a Sunday). */
export function onOrBeforeSunday(from: Date): Date {
  const day = startOfDay(from);
  return isSunday(day) ? day : previousDay(day, Sunday);
}

export interface RoundWindow {
  start: Date;
  end: Date;
}

export interface TournamentSchedule {
  weekLabel: string;
  round64Sunday: Date;
  submissionsOpenAt: Date;
  submissionsCloseAt: Date;
  rounds: Record<Round, RoundWindow>;
  championAnnouncedAt: Date;
}

/** Build the full schedule for the tournament whose Round of 64 is on `round64Sunday`. */
export function scheduleForRound64Sunday(round64Sunday: Date): TournamentSchedule {
  const d = startOfDay(round64Sunday);
  if (!isSunday(d)) {
    throw new Error("round64Sunday must be a Sunday");
  }

  const submissionsOpenAt = addDays(d, -6); // Monday
  const submissionsCloseAt = addDays(d, 0); // exclusive upper bound = start of Sunday

  const rounds = {} as Record<Round, RoundWindow>;
  ROUND_ORDER.forEach((round, i) => {
    rounds[round] = { start: addDays(d, i), end: addDays(d, i + 1) };
  });

  const championAnnouncedAt = addDays(d, 6); // Saturday

  const isoWeek = getISOWeek(submissionsOpenAt);
  const isoYear = getISOWeekYear(submissionsOpenAt);
  const weekLabel = `${isoYear}-W${String(isoWeek).padStart(2, "0")}`;

  return {
    weekLabel,
    round64Sunday: d,
    submissionsOpenAt,
    submissionsCloseAt,
    rounds,
    championAnnouncedAt,
  };
}

/**
 * The tournament that should currently be accepting submissions, as of `now`:
 * the next upcoming Sunday's tournament (submissions run the 6 days before it).
 * If `now` is itself a Sunday, submissions have just closed and the *next*
 * Sunday's window is what should be open.
 */
export function scheduleForUpcomingSubmissionWindow(now: Date): TournamentSchedule {
  const todayIsSunday = isSunday(startOfDay(now));
  const anchor = todayIsSunday
    ? addDays(onOrAfterSunday(now), 7)
    : onOrAfterSunday(now);
  return scheduleForRound64Sunday(anchor);
}

/** The tournament currently playing through its rounds (Sun-Fri) as of `now`. */
export function scheduleForCurrentRoundsWindow(now: Date): TournamentSchedule {
  return scheduleForRound64Sunday(onOrBeforeSunday(now));
}
