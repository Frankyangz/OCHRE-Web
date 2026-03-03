<script lang="ts">
    // @ts-nocheck
    const { data } = $props();

    let properties = [];
    if (data.observations?.length > 0) {
        let raw =
            data.observations[0].properties ??
            data.observations[0].links?.properties ??
            [];
        if (!Array.isArray(raw)) {
            raw = raw.property ?? [];
        }
        if (!Array.isArray(raw)) {
            raw = [raw];
        }
        properties = raw;
    }

    function getLabel(prop) {
        if (typeof prop.label === "string") return prop.label;
        return prop.label?.content?.string ?? "";
    }

    function getValue(prop) {
        const val = prop.value ?? prop.values?.[0];
        if (!val) return "";
        if (typeof val.content === "string") return val.content;
        return val.content?.string ?? "";
    }
</script>

<main class="max-w-2xl mx-auto px-6 py-10">
    <a
        href="/"
        class="text-sm text-gray-400 hover:text-gray-700 mb-6 inline-block"
    >
        &lt;— Back to list
    </a>

    <h1 class="text-4xl font-bold mb-2">
        {data.identification?.label ?? ""}
    </h1>

    {#if data.description}
        <p class="text-gray-500 mb-4">{data.description}</p>
    {/if}

    {#if data.image?.url}
        <img
            src={data.image.url}
            alt={data.identification?.label}
            class="max-w-xs rounded-lg mb-8 border border-gray-200 shadow-sm"
        />
    {:else}
        <p class="text-gray-400 italic mb-8">[ No image available ]</p>
    {/if}

    <dl class="space-y-3">
        {#each properties as prop}
            {@const label = getLabel(prop)}
            {@const value = getValue(prop)}
            {#if value}
                <div class="flex gap-2">
                    <dt class="font-semibold min-w-40">{label}</dt>
                    <dd class="text-gray-700">{value}</dd>
                </div>
            {/if}
        {/each}
    </dl>
</main>
