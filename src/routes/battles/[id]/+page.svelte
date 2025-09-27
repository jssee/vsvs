<script lang="ts">
  export let data: {
    battle: {
      _id: string;
      name: string;
      status: "active" | "completed";
      creatorId: string;
      inviteCode: string;
      playerCount: number;
      maxPlayers: number;
      visibility: "public" | "private";
    };
    sessions: Array<{
      _id: string;
      sessionNumber: number;
      vibe: string;
      description?: string;
      submissionDeadline: number;
      votingDeadline: number;
      phase: "pending" | "submission" | "voting" | "completed";
      playlistUrl?: string;
      submissionCount: number;
    }>;
    user: { _id: string; email: string; username: string } | null;
  };
</script>

<div class="mx-auto max-w-3xl space-y-6 p-4">
  <a href="/battles" class="text-sm text-blue-700 underline">← Back</a>
  <header class="rounded border p-4">
    <div class="flex items-baseline justify-between">
      <h1 class="text-xl font-semibold">{data.battle.name}</h1>
      <span class="text-xs text-gray-600">{data.battle.status}</span>
    </div>
    <div class="mt-2 text-sm text-gray-700">
      {data.battle.playerCount}/{data.battle.maxPlayers} players • {data.battle
        .visibility}
    </div>
    <div class="mt-2 text-sm">
      Invite code: <code class="rounded bg-gray-100 px-1 py-0.5"
        >{data.battle.inviteCode}</code
      >
    </div>
  </header>

  <section class="space-y-2 rounded border p-4">
    <div class="flex items-center justify-between">
      <h2 class="font-medium">Sessions</h2>
      {#if data.user && data.user._id === data.battle.creatorId && data.battle.status === "active"}
        <a
          class="text-sm underline"
          href={`/battles/${data.battle._id}/session/create`}>Create session</a
        >
      {/if}
    </div>
    {#if data.sessions.length === 0}
      <p class="text-sm text-gray-600">No sessions yet.</p>
    {:else}
      <ul class="divide-y">
        {#each data.sessions as s (s._id)}
          <li class="py-2">
            <div class="flex items-baseline justify-between">
              <a
                class="font-medium underline"
                href={`/battles/${data.battle._id}/session/${s._id}`}
              >
                Session {s.sessionNumber}: {s.vibe}
              </a>
              <span class="text-xs tracking-wide text-gray-600 uppercase"
                >{s.phase}</span
              >
            </div>
            {#if s.description}
              <div class="text-sm text-gray-700">{s.description}</div>
            {/if}
            <div class="mt-1 text-xs text-gray-600">
              Submissions until {new Date(
                s.submissionDeadline,
              ).toLocaleString()} • Voting until {new Date(
                s.votingDeadline,
              ).toLocaleString()} • {s.submissionCount} submissions
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>
