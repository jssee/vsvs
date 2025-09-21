<script lang="ts">
  import { useQuery } from "convex-svelte";
  import { api } from "$lib/convex/_generated/api";
  import type { PageProps } from "./$types";

  const { data }: PageProps = $props();

  const query = useQuery(
    api.battles.getMyBattles,
    { userId: data.user._id },
    { initialData: data.battles },
  );
</script>

<h1 class="text-xl font-semibold">Battles</h1>
<div class="mb-4">
  <a href="/battles/create" class="text-blue-600 underline">create new battle</a
  >
</div>

<section class="rounded border p-4">
  <h2 class="mb-3 font-medium">My Battles</h2>
  {#if query.isLoading}
    <p class="text-sm text-gray-600">Loading...</p>
  {:else if query.error != null}
    failed to load: {query.error.toString()}
  {:else if query.data.length === 0}
    <p class="text-sm text-gray-600">You have no battles.</p>
  {:else}
    <ul class="space-y-2">
      {#each query.data as battle}
        <li class="flex items-center justify-between rounded border p-3">
          <a
            class="font-medium hover:underline"
            href={`/battles/${battle._id}`}
          >
            {battle.name}
          </a>
          <span class="text-sm text-gray-600">
            {battle.playerCount}/{battle.maxPlayers} · {battle.status}
          </span>
        </li>
      {/each}
    </ul>
  {/if}
</section>
