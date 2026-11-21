import { AstronomicalConstants as AC, PhaseNames, type PhaseName } from '@lib/constants';
import { fixangle, torad, todeg, kepler } from '@lib/calculations';
import type { MoonData } from '@lib/types';
import { MS_PER_DAY, toJulianDate } from '@lib/utils';

/**
 * Moon phase and position for a Julian Date.
 * Port of John Walker's moontool algorithm.
 */
export function getMoonData(jd: number): MoonData {
  const day = jd - AC.epoch;
  const N = fixangle((360 / 365.2422) * day);
  const M = fixangle(N + AC.ecliptic_longitude_epoch - AC.ecliptic_longitude_perigee);

  let Ec = kepler(M, AC.eccentricity);
  Ec = Math.sqrt((1 + AC.eccentricity) / (1 - AC.eccentricity)) * Math.tan(Ec/2.0);
  Ec = 2 * todeg(Math.atan(Ec));
  
  const lambda_sun = fixangle(Ec + AC.ecliptic_longitude_perigee);
  const F = ((1 + AC.eccentricity * Math.cos(torad(Ec))) / (1 - AC.eccentricity**2))
  const sun_dist = AC.sun_smaxis / F;
  const sun_angular_diameter = F * AC.sun_angular_size_smaxis;
  
  const moon_longitude = fixangle(13.1763966 * day + AC.moon_mean_longitude_epoch);
  const MM = fixangle(moon_longitude - 0.1114041 * day - AC.moon_mean_perigee_epoch);
  const evection = 1.2739 * Math.sin(torad(2*(moon_longitude - lambda_sun) - MM));
  const annual_eq = 0.1858 * Math.sin(torad(M));
  const A3 = 0.37 * Math.sin(torad(M));
  const MmP = MM + evection - annual_eq - A3;
  const mEc = 6.2886 * Math.sin(torad(MmP));
  const A4 = 0.214 * Math.sin(torad(2 * MmP));
  const lP = moon_longitude + evection + mEc - annual_eq + A4;
  const variation = 0.6583 * Math.sin(torad(2*(lP - lambda_sun)));
  const lPP = lP + variation;

  const moon_age = lPP - lambda_sun;
  const moon_phase = (1 - Math.cos(torad(moon_age))) / 2.0;
  const moon_dist = (AC.moon_smaxis * (1 - AC.moon_eccentricity**2)) / (1 + AC.moon_eccentricity * Math.cos(torad(MmP + mEc)))
  const moon_diam_frac = moon_dist / AC.moon_smaxis;
  const moon_angular_diameter = AC.moon_angular_size / moon_diam_frac;
  
  const res = {
    phase: fixangle(moon_age) / 360.0,
    illuminated: moon_phase,
    age: AC.synodic_month * fixangle(moon_age) / 360.0,
    distance: moon_dist,
    angular_diameter: moon_angular_diameter,
    sun_distance: sun_dist,
    sun_angular_diameter: sun_angular_diameter,
  }

  return res;
}
/**
 * Name for a phase fraction (0 = new, 0.5 = full). The cycle is split into
 * 8 equal bins centered on the principal and intermediate phases, so
 * "Full Moon" covers 0.4375-0.5625 (about 1.8 days either side of full).
 */
export function phaseName(phase: number): PhaseName {
  const index = ((Math.round(phase * 8) % 8) + 8) % 8;
  return PhaseNames[index];
}

/**
 * Unit vector from the moon toward the sun, in a scene where the viewer
 * (Earth) is on +Z looking at the moon at the origin, +X is to the viewer's
 * right and +Y is up. Northern-hemisphere view: the waxing moon is lit on
 * the right.
 *
 * The phase fraction is just the sun-moon elongation as a fraction of a
 * turn, so the angle is θ = 2π · phase:
 *   phase 0    → ( 0, 0, -1)  sun behind the moon      New
 *   phase 0.25 → ( 1, 0,  0)  right half lit           First Quarter
 *   phase 0.5  → ( 0, 0,  1)  sun behind the viewer    Full
 *   phase 0.75 → (-1, 0,  0)  left half lit            Last Quarter
 */
export function sunDirection(phase: number): [number, number, number] {
  const theta = 2 * Math.PI * phase;
  return [Math.sin(theta), 0, -Math.cos(theta)];
}

const SYNODIC_MS = AC.synodic_month * MS_PER_DAY;

/** Phase fraction at an instant. */
const phaseAt = (t: number) => getMoonData(toJulianDate(new Date(t))).phase;

/** `x` wrapped into [-0.5, 0.5). */
const wrapHalf = (x: number) => x - Math.floor(x + 0.5);

/**
 * The next (or previous) instant after `from` when the moon reaches `target`
 * phase (0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter).
 *
 * Starts from a mean-motion estimate, then corrects it a few times: the moon's
 * real speed varies by about ±10% around its mean, so each step closes most of
 * the remaining gap and five steps reach well under a second.
 */
export function findPhase(from: Date, target: number, direction: 1 | -1 = 1): Date {
  const t0 = from.getTime();
  const ahead = (((target - phaseAt(t0)) % 1) + 1) % 1; // 0..1 of a cycle until target
  let t = t0 + (direction === 1 ? ahead : ahead - 1) * SYNODIC_MS;

  for (let i = 0; i < 5; i++) {
    t += wrapHalf(target - phaseAt(t)) * SYNODIC_MS;
  }

  // If `from` sits right on the target, the estimate can land back on `from`
  // itself (or on the wrong side of it); step one cycle in `direction`.
  if (direction === 1 ? t <= t0 + 60_000 : t >= t0 - 60_000) {
    return findPhase(new Date(t0 + direction * 0.5 * SYNODIC_MS), target, direction);
  }
  return new Date(t);
}

/** The new moons that bracket `date`: the lunation (lunar cycle) it falls in. */
export function lunarCycle(date: Date): { start: Date; end: Date } {
  const start = findPhase(new Date(date.getTime() + 1), 0, -1);
  return { start, end: findPhase(start, 0, 1) };
}
