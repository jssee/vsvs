<script lang="ts">
  import { setupConvex } from "convex-svelte";

  import "../app.css";
  import favicon from "$lib/assets/favicon.svg";
  import { PUBLIC_CONVEX_URL } from "$env/static/public";
  import { createSvelteAuthClient } from "@mmailaender/convex-better-auth-svelte/svelte";
  import { authClient } from "$lib/auth-client";

  let { children } = $props();

  setupConvex(PUBLIC_CONVEX_URL);
  createSvelteAuthClient({ authClient });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}
