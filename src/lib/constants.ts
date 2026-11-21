export const AstronomicalConstants = {
  epoch: 2444238.5,
  ecliptic_longitude_epoch: 278.833540,
  ecliptic_longitude_perigee: 282.596403,
  eccentricity: 0.016718,
  sun_smaxis: 1.49585e8,
  sun_angular_size_smaxis: 0.533128,
  moon_mean_longitude_epoch: 64.975464,
  moon_mean_perigee_epoch: 349.383063,
  node_mean_longitude_epoch: 151.950429,
  moon_inclination: 5.145396,
  moon_eccentricity: 0.054900,
  moon_angular_size: 0.5181,
  moon_smaxis: 384401.0,
  moon_parallax: 0.9507,
  synodic_month: 29.53058868,
  lunations_base: 2423436.0,
  earth_radius: 6378.16,
} as const;

/** Phase names in cycle order; each is centered on a multiple of 1/8 of the cycle. */
export const PhaseNames = [
  'New Moon',
  'Waxing Crescent',
  'First Quarter',
  'Waxing Gibbous',
  'Full Moon',
  'Waning Gibbous',
  'Last Quarter',
  'Waning Crescent',
] as const;

export type PhaseName = (typeof PhaseNames)[number];

export const EmptyMoonData = {
  phase: 0,
  illuminated: 0,
  age: 0,
  distance: 0,
  angular_diameter: 0,
  sun_distance: 0,
  sun_angular_diameter: 0,
} as const;