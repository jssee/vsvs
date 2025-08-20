<script lang="ts">
  import { setupConvex } from "convex-svelte";

  import "../app.css";
  import favicon from "$lib/assets/favicon.svg";
  import { PUBLIC_CONVEX_URL } from "$env/static/public";

  let { children } = $props();

  setupConvex(PUBLIC_CONVEX_URL);
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}
