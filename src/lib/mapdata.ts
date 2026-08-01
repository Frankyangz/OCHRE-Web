/**
 * GeoJSON builders for the two things drawn on top of the basemap: rings at
 * fixed distances from Ugarit, and the great-circle line from Ugarit to each
 * find.
 *
 * All of this catalogue sits between 22°E and 37°E, so no antimeridian
 * splitting is needed; a general-purpose version would have to handle it.
 */

import type { FeatureCollection, LineString, Point as GeoJsonPoint } from 'geojson';
import { angularDistance, EARTH_RADIUS_KM, toDegrees, toRadians, UGARIT, type Point } from './geo';
import type { CatalogueEntry } from './catalogue';

/** Point at `distanceKm` from `origin` along `bearing` (degrees from north). */
function destination(origin: Point, distanceKm: number, bearing: number): [number, number] {
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
export function ringLabels(): FeatureCollection<GeoJsonPoint> {
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
function greatCircle(from: Point, to: Point, steps = 64): Array<[number, number]> {
	const lat1 = toRadians(from.lat);
	const lng1 = toRadians(from.lng);
	const lat2 = toRadians(to.lat);
	const lng2 = toRadians(to.lng);

	const d = angularDistance(from, to);

	// Coincident points have no defined path.
	if (d === 0) return [[from.lng, from.lat]];

	return Array.from({ length: steps + 1 }, (_, index) => {
		const f = index / steps;
		const a = Math.sin((1 - f) * d) / Math.sin(d);
		const b = Math.sin(f * d) / Math.sin(d);

		const x = a * Math.cos(lat1) * Math.cos(lng1) + b * Math.cos(lat2) * Math.cos(lng2);
		const y = a * Math.cos(lat1) * Math.sin(lng1) + b * Math.cos(lat2) * Math.sin(lng2);
		const z = a * Math.sin(lat1) + b * Math.sin(lat2);

		return [toDegrees(Math.atan2(y, x)), toDegrees(Math.atan2(z, Math.sqrt(x * x + y * y)))] as [
			number,
			number
		];
	});
}

/** A connector from Ugarit out to each located find, at its true coordinate. */
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
 * Screen-space nudges for finds that share a findspot exactly — Kamid el-Loz
 * and Sarepta each have two — which would otherwise stack into a single
 * clickable wedge.
 *
 * The offset is in **pixels, not degrees**. Moving the coordinate instead was
 * the obvious approach and it was wrong twice over: at 0.16° it pushed coastal
 * finds out into the sea, and any value small enough to stay on the coast was
 * too small to separate two 7 px wedges. Worse, a coordinate offset drifts —
 * zoom in and the pair slides further apart on the ground.
 *
 * A pixel offset leaves the anchor on the true coordinate, so the connector
 * line still ends exactly where the object was found, and the pair reads as
 * what it is: two objects from one site, sitting side by side.
 */
export function markerOffsets(entries: CatalogueEntry[]): Map<string, [number, number]> {
	const byPosition = new Map<string, CatalogueEntry[]>();

	for (const entry of entries) {
		if (entry.lat === null || entry.lng === null) continue;
		const key = `${entry.lat.toFixed(4)},${entry.lng.toFixed(4)}`;
		byPosition.set(key, [...(byPosition.get(key) ?? []), entry]);
	}

	const offsets = new Map<string, [number, number]>();
	const SPACING_PX = 9;

	for (const group of byPosition.values()) {
		group.forEach((entry, index) => {
			// Spread horizontally about the shared point, so the group stays
			// centred on the findspot rather than hanging off one side of it.
			const dx = (index - (group.length - 1) / 2) * SPACING_PX;
			offsets.set(entry.uuid, [dx, 0]);
		});
	}

	return offsets;
}
