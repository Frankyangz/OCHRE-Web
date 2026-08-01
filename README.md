# What left Ugarit

An interactive catalogue of the eleven objects bearing the Ugaritic alphabet that
were excavated **outside** the kingdom of Ugarit — from Tell Sukas, 35 km down the
Syrian coast, to Tiryns in Mycenaean Greece, 1,179 km west.

**Live:** https://ochre-web.vercel.app

Data is read from [OCHRE](https://ochre.lib.uchicago.edu/), the Online Cultural
and Historical Research Environment at the University of Chicago, via the
[`ochre-sdk`](https://github.com/uchicago-digitalculture-webdev/ochre-sdk).
Nothing is checked in or hand-transcribed.

---

## The idea

The set is defined by exclusion: every object in it was found somewhere that is
not Ugarit. So the map treats Ugarit as an **absent centre** — drawn as an empty
ring, with each find connected back to it along a great-circle line and measured
in kilometres. Distance from the capital is the default sort and a first-class
column, because it is the variable the collection is actually about.

The basemap is stripped to land, sea, and rivers. Modern motorways and national
borders are anachronisms on a map of the Late Bronze Age, and removing them
leaves the coastline — the thing that shaped how these objects actually moved —
as the only geography on screen.

## Stack

|             |                                                  |
| ----------- | ------------------------------------------------ |
| Framework   | SvelteKit 2 · Svelte 5 (runes)                   |
| Styling     | Tailwind CSS 4 over a custom token layer         |
| Map         | MapLibre GL via `svelte-maplibre`, CARTO basemap |
| Data        | `ochre-sdk` against the public OCHRE API         |
| Hosting     | Vercel, Node 22, prerendered at build            |
| Type safety | `svelte-check` clean, no `@ts-nocheck`           |

## Notes on the implementation

A few things that were less obvious than they looked:

**The two upstream records are complementary, not redundant.** OCHRE's set
endpoint returns a thin projection of each item — it carries coordinates and the
Script/Language properties but no image, description, or context path. The
individual item endpoint carries those but _drops the coordinates_. Neither is a
superset, so `toEntry()` merges both. Reading only one of them silently loses
either the map or half the metadata.

**The catalogue costs a dozen upstream requests.** It is assembled from one set
read plus eleven parallel item reads (~3 s), then memoised in-process. Every page
is prerendered, so that cost is paid once in CI and visitors are served static
files. A single item failing upstream degrades that one row rather than taking
down the page, and the fetch layer retries transient errors so one dropped
connection cannot fail a build.

**The interesting content is on the observations, not the objects.** Three of the
eleven records carry four notes written by named scholars, and one carries a
Zotero bibliography — all hanging off `observations[].notes` and
`bibliographies`, which an earlier version of this site was quietly discarding.

**`filterLayers` in `svelte-maplibre` runs on every `styledata` event** and hides
_any_ layer its predicate rejects — including layers added by child components.
Filtering the basemap therefore requires explicitly allowing your own overlay
sources through, or the rings and connectors silently vanish.

**The SDK emits stale image URLs.** `image.url` points at `/ochre/v2/ochre.php`,
which now 404s; the live endpoint is `/ochre` and needs the `preview` flag to
return a JPEG rather than the item's XML. `normaliseImageUrl()` rebuilds the link
from the uuid.

**Facets that do not discriminate are not filters.** Script (`Alphabetic`) and
Language (`Ugaritic`) are constant across almost the whole set, so offering them
as filter chips would be offering controls that do nothing. They are stated once
in the header as framing instead; only properties with more than one distinct
value become facets.

**Uncertainty is data.** Where an excavator recorded an identification as
uncertain, OCHRE flags it on the property value. That flag is carried through to
the UI as a marker on the value rather than being flattened away.

## Running it

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm lint       # prettier --check + eslint
pnpm format     # prettier --write
pnpm test       # node:test (retry + sanitiser)
pnpm check      # svelte-check
pnpm build      # production build
```

No environment variables or API keys are required — the OCHRE API is public.

## Data and credit

Records are published by the **Ras Shamra Tablet Inventory** project at the
University of Chicago and are reproduced here through OCHRE's public API. Each
object page links to its persistent identifier at `pi.lib.uchicago.edu`, which is
the citable address for the record.

This site is an independent presentation of that data and is not affiliated with
the OCHRE Data Service.
