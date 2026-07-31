<script lang="ts">
	import { page } from '$app/state';
	import { SITE_URL } from '$lib/site';

	type Props = {
		title: string;
		description: string;
		/** Absolute or root-relative; defaults to the site card. */
		image?: string;
		type?: 'website' | 'article';
	};

	let { title, description, image = '/og.png', type = 'website' }: Props = $props();

	const canonical = $derived(new URL(page.url.pathname, SITE_URL).href);
	const imageUrl = $derived(new URL(image, SITE_URL).href);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonical} />

	<meta property="og:type" content={type} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonical} />
	<meta property="og:image" content={imageUrl} />
	<meta property="og:site_name" content="Ras Shamra Tablet Inventory" />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={imageUrl} />
</svelte:head>
