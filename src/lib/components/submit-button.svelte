<script lang="ts">
	import type { Snippet } from 'svelte';

	let { pending, success, children }: { pending: boolean; success: boolean; children: Snippet } =
		$props();
</script>

<button type={pending ? 'button' : 'submit'} disabled={pending || success}>
	{@render children()}

	{#if pending || success}
		<span> loading... </span>
	{/if}

	<output aria-live="polite" class="sr-only">
		{pending || success ? 'Loading' : 'Submit form'}
	</output>
</button>
