#!/usr/bin/env node
/**
 * Builds src/data/cities.json from GeoNames dumps.
 *
 * Usage:
 *   node scripts/build-cities.mjs <cities15000.txt> <admin1CodesASCII.txt>
 *
 * Get the inputs from https://download.geonames.org/export/dump/
 * (cities15000.zip, unzipped, and admin1CodesASCII.txt). GeoNames data is
 * CC BY 4.0: https://www.geonames.org
 *
 * Keeps the most populous cities worldwide, plus the largest city in every
 * time zone so a browser's time zone can always be matched to a nearby city.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const TOP_N = 1000;
const [citiesPath, admin1Path] = process.argv.slice(2);
if (!citiesPath || !admin1Path) {
  console.error('usage: node scripts/build-cities.mjs <cities15000.txt> <admin1CodesASCII.txt>');
  process.exit(1);
}

// "US.OR\tOregon\tOregon\t5744337" -> { "US.OR": "Oregon" }
const admin1 = new Map();
for (const line of readFileSync(admin1Path, 'utf8').split('\n')) {
  const [code, , asciiName] = line.split('\t');
  if (code && asciiName) admin1.set(code, asciiName);
}

// cities15000 columns: 0 id, 1 name, 2 asciiname, 4 lat, 5 lon, 8 country,
// 10 admin1, 14 population, 17 timezone.
const all = [];
for (const line of readFileSync(citiesPath, 'utf8').split('\n')) {
  const f = line.split('\t');
  if (f.length < 18) continue;
  const population = Number(f[14]);
  const timeZone = f[17];
  if (!timeZone || !Number.isFinite(population)) continue;
  all.push({
    name: f[1],
    ascii: f[2],
    region: admin1.get(`${f[8]}.${f[10]}`) ?? '',
    country: f[8],
    lat: Math.round(Number(f[4]) * 100) / 100,
    lon: Math.round(Number(f[5]) * 100) / 100,
    timeZone,
    population,
  });
}
all.sort((a, b) => b.population - a.population);

const chosen = new Set(all.slice(0, TOP_N));
const seenZones = new Set();
for (const city of all) {
  if (!seenZones.has(city.timeZone)) {
    seenZones.add(city.timeZone);
    chosen.add(city);
  }
}

const cities = [...chosen].sort((a, b) => b.population - a.population);
const zones = [...new Set(cities.map((c) => c.timeZone))].sort();
const zoneIndex = new Map(zones.map((z, i) => [z, i]));

// Compact rows, most populous first: [name, ascii (0 if same as name), region, country, lat, lon, zone index]
const rows = cities.map((c) => [
  c.name,
  c.ascii === c.name ? 0 : c.ascii,
  c.region,
  c.country,
  c.lat,
  c.lon,
  zoneIndex.get(c.timeZone),
]);

const out = fileURLToPath(new URL('../src/data/cities.json', import.meta.url));
writeFileSync(out, JSON.stringify({ source: 'GeoNames (CC BY 4.0)', zones, cities: rows }) + '\n');
console.log(`wrote ${rows.length} cities across ${zones.length} time zones to ${out}`);
