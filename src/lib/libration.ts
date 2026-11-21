import { fixangle, todeg, torad } from '@lib/calculations';

/**
 * Optical libration: how far the Moon's Earth-facing point is shifted from
 * its mean position, which lets us see a little around its edges over a month.
 *
 * - `longitude` > 0: the sub-Earth point is east of the mean centre, so more
 *   of the east limb (Mare Crisium's side) is visible. Range about ±7.9°.
 * - `latitude` > 0: the sub-Earth point is north, so more of the north pole
 *   region is visible. Range about ±6.9°.
 */
export interface Libration {
  longitude: number;
  latitude: number;
}

/** Inclination of the Moon's equator to the ecliptic (IAU), degrees. */
const I = 1.54242;

const sin = (deg: number) => Math.sin(torad(deg));
const cos = (deg: number) => Math.cos(torad(deg));

/**
 * The Moon's geocentric ecliptic longitude and latitude, with the mean
 * arguments needed for libration. Truncated from Meeus, Astronomical
 * Algorithms ch. 47: the largest terms only, good to roughly 0.05°.
 */
function lunarArguments(jd: number) {
  const T = (jd - 2_451_545.0) / 36_525;

  const Lp = 218.3164477 + 481_267.88123421 * T; // mean longitude
  const D = 297.8501921 + 445_267.1114034 * T; // mean elongation
  const M = 357.5291092 + 35_999.0502909 * T; // Sun's mean anomaly
  const Mp = 134.9633964 + 477_198.8675055 * T; // Moon's mean anomaly
  const F = 93.272095 + 483_202.0175233 * T - 0.0036539 * T * T; // argument of latitude
  const Om = 125.0445479 - 1934.1362891 * T + 0.0020754 * T * T; // ascending node

  const lambda =
    Lp +
    6.288774 * sin(Mp) +
    1.274027 * sin(2 * D - Mp) +
    0.658314 * sin(2 * D) +
    0.213618 * sin(2 * Mp) -
    0.185116 * sin(M) -
    0.114332 * sin(2 * F) +
    0.058793 * sin(2 * D - 2 * Mp) +
    0.057066 * sin(2 * D - M - Mp) +
    0.053322 * sin(2 * D + Mp) +
    0.045758 * sin(2 * D - M) -
    0.040923 * sin(M - Mp) -
    0.03472 * sin(D) -
    0.030383 * sin(M + Mp);

  const beta =
    5.128122 * sin(F) +
    0.280602 * sin(Mp + F) +
    0.277693 * sin(Mp - F) +
    0.173237 * sin(2 * D - F) +
    0.055413 * sin(2 * D - Mp + F) +
    0.046271 * sin(2 * D - Mp - F) +
    0.032573 * sin(2 * D + F) +
    0.017198 * sin(2 * Mp + F);

  return { lambda: fixangle(lambda), beta, F: fixangle(F), Om: fixangle(Om) };
}

/** Optical libration for a Julian Date (Meeus ch. 53). */
export function getLibration(jd: number): Libration {
  const { lambda, beta, F, Om } = lunarArguments(jd);
  const W = lambda - Om;

  const A = todeg(Math.atan2(sin(W) * cos(beta) * cos(I) - sin(beta) * sin(I), cos(W) * cos(beta)));
  // A − F, wrapped to [-180, 180).
  const longitude = fixangle(A - F + 180) - 180;
  const latitude = todeg(Math.asin(-sin(W) * cos(beta) * sin(I) - sin(beta) * cos(I)));

  return { longitude, latitude };
}
