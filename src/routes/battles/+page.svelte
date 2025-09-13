<script lang="ts">
  import { useQuery } from "convex-svelte";

  import { api } from "$lib/convex/_generated/api";

  const { data, form } = $props();

  const query = useQuery(
    api.battles.getMyBattles,
    {
      userId: data.user._id,
    },
    { initialData: data.battles },
  );

  $inspect("form:", form, "data:", data);
</script>

<h1 class="text-xl font-semibold">Battles</h1>

<section class="rounded border p-4">
  <h2 class="mb-3 font-medium">Create Battle</h2>
  <form method="post" action="?/createBattle" class="grid gap-3">
    <label class="grid gap-1">
      <span class="text-sm">Name</span>
      <input name="name" class="rounded border px-2 py-1" required />
    </label>
    <label class="grid gap-1">
      <span class="text-sm">Visibility</span>
      <select name="visibility" class="rounded border px-2 py-1">
        <option value="private">Private</option>
        <option value="public">Public</option>
      </select>
    </label>
    <div class="grid grid-cols-2 gap-3">
      <label class="grid gap-1">
        <span class="text-sm">Max Players</span>
        <input
          name="maxPlayers"
          type="number"
          min="2"
          max="20"
          value="4"
          class="rounded border px-2 py-1"
        />
      </label>
      <label class="mt-6 flex items-center gap-2">
        <input name="doubleSubmissions" type="checkbox" />
        <span class="text-sm">Allow double submissions</span>
      </label>
    </div>
    <button
      class="self-start rounded bg-black px-3 py-1 text-white"
      type="submit">Create</button
    >
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
    {JSON.stringify(query.data, null, 2)}
  {/if}
</section>
