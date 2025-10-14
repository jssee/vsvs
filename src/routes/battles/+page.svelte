<script lang="ts">
  import { useQuery } from "convex-svelte";
  import { api } from "$lib/convex/_generated/api";
  import type { PageProps } from "./$types";

  const { data, form }: PageProps = $props();

  const query = useQuery(
    api.battles.getMyBattles,
    { userId: data.user._id },
    { initialData: data.battles },
  );

  let inviteCode = $state("");
</script>

<div class="mb-4 flex items-baseline justify-between">
  <h1 class="text-xl font-semibold">Battles</h1>
  <a href="/invitations" class="text-sm text-blue-600 underline"
    >View invitations</a
  >
</div>
<div class="mb-4 flex gap-4">
  <a href="/battles/create" class="text-blue-600 underline">create new battle</a
  >
</div>

<section class="mb-6 rounded border p-4">
  <h2 class="mb-3 font-medium">Join a Battle</h2>
  <form method="post" action="?/joinByCode" class="flex gap-2">
    {#if form?.message}
      <p class="w-full text-sm text-red-600">{form.message}</p>
    {/if}
    <input
      type="text"
      name="inviteCode"
      bind:value={inviteCode}
      placeholder="Enter invite code (e.g., ABC123)"
      class="flex-1 rounded border px-3 py-2 uppercase"
      maxlength="6"
      required
    />
    <button
      type="submit"
      class="rounded bg-black px-4 py-2 text-white hover:bg-gray-800"
    >
      Join
    </button>
  </form>
</section>

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
      {#each query.data as battle (battle._id)}
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
