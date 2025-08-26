<script lang="ts">
  export let data: {
    battle: {
      _id: string;
      name: string;
      status: "active" | "completed";
      inviteCode: string;
      playerCount: number;
      maxPlayers: number;
      visibility: "public" | "private";
      canJoin: boolean;
    };
    players: Array<{
      _id: string;
      userId: string;
      userEmail: string;
      joinedAt: number;
      totalStarsEarned: number;
      sessionsWon: number;
      isCreator: boolean;
    }>;
    user: { _id: string; email: string } | null;
  };

  export let form: { message?: string } | undefined;
</script>

<div class="mx-auto max-w-3xl p-4 space-y-6">
  <a href="/battles" class="text-sm text-blue-700 underline">← Back</a>
  <header class="border rounded p-4">
    <div class="flex items-baseline justify-between">
      <h1 class="text-xl font-semibold">{data.battle.name}</h1>
      <span class="text-xs text-gray-600">{data.battle.status}</span>
    </div>
    <div class="text-sm text-gray-700 mt-2">
      {data.battle.playerCount}/{data.battle.maxPlayers} players • {data.battle.visibility}
    </div>
    <div class="mt-2 text-sm">
      Invite code: <code class="px-1 py-0.5 bg-gray-100 rounded">{data.battle.inviteCode}</code>
    </div>
  </header>

  <section class="border rounded p-4">
    <h2 class="font-medium mb-2">Players</h2>
    {#if data.players.length === 0}
      <p class="text-sm text-gray-600">No players yet.</p>
    {:else}
      <ul class="divide-y">
        {#each data.players as p (p._id)}
          <li class="py-2 flex items-center justify-between">
            <div>
              <div class="text-sm">{p.userEmail}</div>
              <div class="text-xs text-gray-600">
                Stars: {p.totalStarsEarned} • Wins: {p.sessionsWon}
                {#if p.isCreator}
                  • Creator
                {/if}
              </div>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  {#if data.user}
    <section class="border rounded p-4">
      <h2 class="font-medium mb-2">Invite Player</h2>
      {#if form?.message}
        <p class="text-sm text-red-600 mb-2">{form.message}</p>
      {/if}
      <form method="post" action="?/invite" class="flex gap-2 items-end">
        <label class="grid gap-1 flex-1">
          <span class="text-sm">Email</span>
          <input name="email" type="email" required class="border rounded px-2 py-1 w-full" />
        </label>
        <button class="bg-black text-white px-3 py-1 rounded" type="submit">Send</button>
      </form>
      <p class="text-xs text-gray-600 mt-2">Only the battle creator can invite.</p>
    </section>
  {/if}
</div>
