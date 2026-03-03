<script lang="ts">
    // @ts-nocheck
    import {
        getUniquePropertyLabels,
        getPropertyValueByLabel,
        filterProperties,
    } from "ochre-sdk";
    import { MapLibre, DefaultMarker } from "svelte-maplibre";
    import { Input } from "$lib/components/ui/input";
    import {
        Table,
        TableBody,
        TableCell,
        TableHead,
        TableHeader,
        TableRow,
    } from "$lib/components/ui/table";

    let { data } = $props();
    let spatialUnits = $derived(data.items);
    let propertyLabels = $derived(
        getUniquePropertyLabels(spatialUnits[0].properties),
    );

    let search = $state("");

    let filteredData = $derived(
        search === ""
            ? spatialUnits
            : spatialUnits.filter((unit) => {
                  const nameMatch = unit.identification?.label
                      ?.toLowerCase()
                      .includes(search.toLowerCase());
                  const propMatch = unit.properties.some((prop) =>
                      filterProperties(
                          prop,
                          { label: "all fields", value: search },
                          { includeNestedProperties: true },
                      ),
                  );
                  return nameMatch || propMatch;
              }),
    );
</script>

<main class="max-w-6xl mx-auto px-6 py-10">
    <h1 class="text-3xl font-bold mb-2">
        Objects discovered outside the kingdom of Ugarit
    </h1>
    <p class="text-gray-500 mb-6">
        These {spatialUnits.length} objects are related to the kingdom of Ugarit
        and were found
        <strong>outside</strong> the kingdom.
    </p>

    <div class="mb-6">
        <MapLibre
            zoom={4}
            center={[36, 34]}
            class="h-100 rounded-lg"
            style="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        >
            {#each filteredData as item (item.uuid)}
                {#each item.coordinates as coord}
                    {#if coord.type === "point"}
                        <DefaultMarker
                            lngLat={[coord.longitude, coord.latitude]}
                        />
                    {/if}
                {/each}
            {/each}
        </MapLibre>
    </div>

    <Input
        type="text"
        placeholder="Filter by name, object type, and material"
        bind:value={search}
        class="mb-8 max-w-md"
    />

    <h2 class="text-2xl font-semibold mb-4">Objects</h2>
    <div class="rounded-md border overflow-x-auto">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Name</TableHead>
                    {#each propertyLabels as label}
                        <TableHead>{label}</TableHead>
                    {/each}
                </TableRow>
            </TableHeader>
            <TableBody>
                {#each filteredData as item (item.uuid)}
                    <TableRow>
                        <TableCell>
                            <a
                                href="/{item.uuid}"
                                class="text-blue-600 hover:underline font-medium"
                            >
                                {item.identification?.label ?? ""}
                            </a>
                        </TableCell>
                        {#each propertyLabels as label}
                            <TableCell>
                                {getPropertyValueByLabel(
                                    item.properties,
                                    label,
                                ) ?? ""}
                            </TableCell>
                        {/each}
                    </TableRow>
                {/each}
            </TableBody>
        </Table>
    </div>
</main>
