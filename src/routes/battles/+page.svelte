<script lang="ts">
  export let data: {
    myBattles: Array<{
      _id: string;
      name: string;
      status: "active" | "completed";
      playerCount: number;
      maxPlayers: number;
      createdAt: number;
      currentSessionNumber?: number;
    }>;
    user: { _id: string; email: string } | null;
  };

  export let form: { message?: string } | undefined;
</script>

<div class="mx-auto max-w-3xl space-y-8 p-4">
  <h1 class="text-xl font-semibold">Battles</h1>

  {#if !data.user}
    <p class="text-sm text-gray-600">Please sign in to manage battles.</p>
  {:else}
    <section class="rounded border p-4">
      <h2 class="mb-3 font-medium">Create Battle</h2>
      {#if form?.message}
        <p class="mb-2 text-sm text-red-600">{form.message}</p>
      {/if}
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
      <h2 class="mb-3 font-medium">Join by Invite Code</h2>
      {#if form?.message}
        <p class="mb-2 text-sm text-red-600">{form.message}</p>
      {/if}
      <form method="post" action="?/joinByCode" class="flex items-end gap-2">
        <label class="grid gap-1">
          <span class="text-sm">Invite Code</span>
          <input name="inviteCode" class="rounded border px-2 py-1 uppercase" />
        </label>
        <button class="rounded bg-black px-3 py-1 text-white" type="submit"
          >Join</button
        >
      </form>
    </section>

    <section class="rounded border p-4">
      <h2 class="mb-3 font-medium">My Battles</h2>
      {#if data.myBattles.length === 0}
        <p class="text-sm text-gray-600">No battles yet.</p>
      {:else}
        <ul class="divide-y">
          {#each data.myBattles as b (b._id)}
            <li class="flex items-center justify-between py-2">
              <div>
                <a class="text-blue-700 underline" href={`/battles/${b._id}`}
                  >{b.name}</a
                >
                <div class="text-xs text-gray-600">
                  {b.status} • {b.playerCount}/{b.maxPlayers}
                  {#if b.currentSessionNumber !== undefined}
                    • Session {b.currentSessionNumber}
                  {/if}
                </div>
              </div>
              <a
                class="text-xs text-blue-700 underline"
                href={`/battles/${b._id}`}>Open</a
              >
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {/if}
</div>
