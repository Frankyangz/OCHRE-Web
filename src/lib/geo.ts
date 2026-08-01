/**
 * Geodesy helpers for positioning finds relative to Ugarit.
 *
 * The whole catalogue is defined by exclusion — every object in it was found
 * *outside* the kingdom — so distance and bearing from the capital are the two
 * numbers that actually carry the argument.
 */

/** Ras Shamra (ancient Ugarit), the site none of these objects were found at. */
export const UGARIT = {
	label: 'Ugarit',
	modernName: 'Ras Shamra',
	lat: 35.60194,
	lng: 35.78194
} as const;

export const EARTH_RADIUS_KM = 6371;

export type Point = { lat: number; lng: number };

export const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
export const toDegrees = (radians: number) => (radians * 180) / Math.PI;

/**
 * Angular separation of two points in radians — the haversine formula without
 * the radius applied. Distance and great-circle interpolation both need it.
 */
export function angularDistance(from: Point, to: Point): number {
	const dLat = toRadians(to.lat - from.lat);
	const dLng = toRadians(to.lng - from.lng);
	const lat1 = toRadians(from.lat);
	const lat2 = toRadians(to.lat);

	const a = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

	return 2 * Math.asin(Math.sqrt(a));
}

/** Great-circle distance in kilometres. */
export function haversineKm(from: Point, to: Point): number {
	return EARTH_RADIUS_KM * angularDistance(from, to);
}

/** Initial bearing in degrees clockwise from north (0–360). */
export function bearingDegrees(
	from: { lat: number; lng: number },
	to: { lat: number; lng: number }
): number {
	const lat1 = toRadians(from.lat);
	const lat2 = toRadians(to.lat);
	const dLng = toRadians(to.lng - from.lng);

	const y = Math.sin(dLng) * Math.cos(lat2);
	const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

	return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

const COMPASS_POINTS = [
	'N',
	'NNE',
	'NE',
	'ENE',
	'E',
	'ESE',
	'SE',
	'SSE',
	'S',
	'SSW',
	'SW',
	'WSW',
	'W',
	'WNW',
	'NW',
	'NNW'
] as const;

/** Bearing as a 16-point compass abbreviation. */
export function compassPoint(bearing: number): string {
	return COMPASS_POINTS[Math.round(bearing / 22.5) % 16]!;
}

/** Distances read as measurements, not statistics — no false precision. */
export function formatDistance(km: number): string {
	return `${Math.round(km).toLocaleString('en-US')} km`;
}

/** Decimal degrees with a hemisphere letter, the convention used in site reports. */
export function formatCoordinate(lat: number, lng: number): string {
	const ns = lat >= 0 ? 'N' : 'S';
	const ew = lng >= 0 ? 'E' : 'W';
	return `${Math.abs(lat).toFixed(4)}°${ns}, ${Math.abs(lng).toFixed(4)}°${ew}`;
}

/**
 * Bounding box covering every point plus Ugarit itself, so the absent centre is
 * always in frame.
 */
export function boundsOf(
	points: ReadonlyArray<{ lat: number; lng: number }>
): [[number, number], [number, number]] | null {
	if (points.length === 0) return null;

	let minLat = Infinity;
	let maxLat = -Infinity;
	let minLng = Infinity;
	let maxLng = -Infinity;

	for (const { lat, lng } of points) {
		minLat = Math.min(minLat, lat);
		maxLat = Math.max(maxLat, lat);
		minLng = Math.min(minLng, lng);
		maxLng = Math.max(maxLng, lng);
	}

	return [
		[minLng, minLat],
		[maxLng, maxLat]
	];
}
