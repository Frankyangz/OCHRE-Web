/**
 * GeoJSON builders for the two things drawn on top of the basemap: rings at
 * fixed distances from Ugarit, and the great-circle line from Ugarit to each
 * find.
 *
 * All of this catalogue sits between 22°E and 37°E, so no antimeridian
 * splitting is needed; a general-purpose version would have to handle it.
 */

import type { FeatureCollection, LineString, Point } from 'geojson';
import { UGARIT } from './geo';
import type { CatalogueEntry } from './catalogue';

const EARTH_RADIUS_KM = 6371;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;

/** Point at `distanceKm` from `origin` along `bearing` (degrees from north). */
function destination(
	origin: { lat: number; lng: number },
	distanceKm: number,
	bearing: number
): [number, number] {
	const angular = distanceKm / EARTH_RADIUS_KM;
	const lat1 = toRadians(origin.lat);
	const lng1 = toRadians(origin.lng);
	const theta = toRadians(bearing);

	const lat2 = Math.asin(
		Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(theta)
	);
	const lng2 =
		lng1 +
		Math.atan2(
			Math.sin(theta) * Math.sin(angular) * Math.cos(lat1),
			Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2)
		);

	return [toDegrees(lng2), toDegrees(lat2)];
}

/** The distances that get a labelled ring, in km. */
export const RING_DISTANCES = [250, 500, 1000] as const;

/**
 * Closed rings of constant great-circle distance. These are true circles on the
 * sphere, so they render as ellipses in Web Mercator — which is the honest
 * result, not a bug to correct.
 */
export function distanceRings(steps = 180): FeatureCollection<LineString> {
	return {
		type: 'FeatureCollection',
		features: RING_DISTANCES.map((km) => ({
			type: 'Feature' as const,
			properties: { km, label: `${km.toLocaleString('en-US')} km` },
			geometry: {
				type: 'LineString' as const,
				coordinates: Array.from({ length: steps + 1 }, (_, index) =>
					destination(UGARIT, km, (index / steps) * 360)
				)
			}
		}))
	};
}

/** One label anchor per ring, placed due west so it clears the finds. */
export function ringLabels(): FeatureCollection<Point> {
	return {
		type: 'FeatureCollection',
		features: RING_DISTANCES.map((km) => ({
			type: 'Feature' as const,
			properties: { label: `${km.toLocaleString('en-US')} km` },
			geometry: { type: 'Point' as const, coordinates: destination(UGARIT, km, 270) }
		}))
	};
}

/** Spherical interpolation, so the line follows the shortest path. */
function greatCircle(
	from: { lat: number; lng: number },
	to: { lat: number; lng: number },
	steps = 64
): Array<[number, number]> {
	const lat1 = toRadians(from.lat);
	const lng1 = toRadians(from.lng);
	const lat2 = toRadians(to.lat);
	const lng2 = toRadians(to.lng);

	const d =
		2 *
		Math.asin(
			Math.sqrt(
				Math.sin((lat2 - lat1) / 2) ** 2 +
					Math.cos(lat1) * Math.cos(lat2) * Math.sin((lng2 - lng1) / 2) ** 2
			)
		);

	// Coincident points have no defined path.
	if (d === 0) return [[from.lng, from.lat]];

	return Array.from({ length: steps + 1 }, (_, index) => {
		const f = index / steps;
		const a = Math.sin((1 - f) * d) / Math.sin(d);
		const b = Math.sin(f * d) / Math.sin(d);

		const x = a * Math.cos(lat1) * Math.cos(lng1) + b * Math.cos(lat2) * Math.cos(lng2);
		const y = a * Math.cos(lat1) * Math.sin(lng1) + b * Math.cos(lat2) * Math.sin(lng2);
		const z = a * Math.sin(lat1) + b * Math.sin(lat2);

		return [
			toDegrees(Math.atan2(y, x)),
			toDegrees(Math.atan2(z, Math.sqrt(x * x + y * y)))
		] as [number, number];
	});
}

/** A connector from Ugarit out to each located find. */
export function dispersalLines(entries: CatalogueEntry[]): FeatureCollection<LineString> {
	return {
		type: 'FeatureCollection',
		features: entries
			.filter((entry) => entry.lat !== null && entry.lng !== null)
			.map((entry) => ({
				type: 'Feature' as const,
				properties: { uuid: entry.uuid, distanceKm: entry.distanceKm ?? 0 },
				geometry: {
					type: 'LineString' as const,
					coordinates: greatCircle(UGARIT, { lat: entry.lat!, lng: entry.lng! })
				}
			}))
	};
}

/**
 * Two finds can share a findspot exactly (Kamid el-Loz and Sarepta each have
 * two), which would stack their markers into one. Nudge duplicates apart by a
 * few pixels' worth of degrees so both stay clickable.
 */
export function spreadOverlaps(entries: CatalogueEntry[]): Map<string, [number, number]> {
	const byPosition = new Map<string, CatalogueEntry[]>();

	for (const entry of entries) {
		if (entry.lat === null || entry.lng === null) continue;
		const key = `${entry.lat.toFixed(4)},${entry.lng.toFixed(4)}`;
		byPosition.set(key, [...(byPosition.get(key) ?? []), entry]);
	}

	const positions = new Map<string, [number, number]>();
	const OFFSET_DEG = 0.16;

	for (const group of byPosition.values()) {
		group.forEach((entry, index) => {
			if (group.length === 1) {
				positions.set(entry.uuid, [entry.lng!, entry.lat!]);
				return;
			}
			// Fan the group around its shared point.
			const angle = (index / group.length) * Math.PI * 2 - Math.PI / 2;
			positions.set(entry.uuid, [
				entry.lng! + Math.cos(angle) * OFFSET_DEG,
				entry.lat! + Math.sin(angle) * OFFSET_DEG
			]);
		});
	}

	return positions;
}
