<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';

	const query = useQuery(api.user.get, {});
</script>

{#if query.isLoading}
	Loading...
{:else if query.error}
	failed to load: {query.error.toString()}
{:else}
	<h1>Hello {query.data[0].displayName}!</h1>
{/if}
