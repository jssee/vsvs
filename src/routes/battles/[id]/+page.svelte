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
      votingProgress: { totalVoters: number; votedCount: number; remainingVoters: string[] };
    }>;
    currentSession: null | {
      _id: string;
      sessionNumber: number;
      vibe: string;
      description?: string;
      submissionDeadline: number;
      votingDeadline: number;
      phase: "submission" | "voting" | "completed";
      playlistUrl?: string;
      timeRemaining: { phase: string; milliseconds: number; expired: boolean };
    };
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

  <section class="border rounded p-4 space-y-2">
    <h2 class="font-medium">Sessions</h2>
    {#if data.sessions.length === 0}
      <p class="text-sm text-gray-600">No sessions yet.</p>
    {:else}
      <ul class="divide-y">
        {#each data.sessions as s (s._id)}
          <li class="py-2">
            <div class="flex items-baseline justify-between">
              <div class="font-medium">Session {s.sessionNumber}: {s.vibe}</div>
              <span class="text-xs uppercase tracking-wide text-gray-600">{s.phase}</span>
            </div>
            {#if s.description}
              <div class="text-sm text-gray-700">{s.description}</div>
            {/if}
            <div class="text-xs text-gray-600 mt-1">
              Submissions until {new Date(s.submissionDeadline).toLocaleString()} • Voting until {new Date(s.votingDeadline).toLocaleString()}
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  {#if data.currentSession}
    <section class="border rounded p-4">
      <h2 class="font-medium mb-2">Current Session</h2>
      <div class="text-sm">Session {data.currentSession.sessionNumber}: {data.currentSession.vibe}</div>
      <div class="text-xs text-gray-700 mt-1">
        Phase: {data.currentSession.phase} • Time remaining: {Math.max(0, Math.floor(data.currentSession.timeRemaining.milliseconds / 60000))}m
      </div>
    </section>
  {/if}

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
    {#if data.user._id === data.battle.creatorId && data.battle.status === 'active'}
      <section class="border rounded p-4">
        <h2 class="font-medium mb-2">Add Session</h2>
        {#if form?.message}
          <p class="text-sm text-red-600 mb-2">{form.message}</p>
        {/if}
        <form method="post" action="?/addSession" class="grid gap-3">
          <label class="grid gap-1">
            <span class="text-sm">Vibe</span>
            <input name="vibe" class="border rounded px-2 py-1" required />
          </label>
          <label class="grid gap-1">
            <span class="text-sm">Description (optional)</span>
            <input name="description" class="border rounded px-2 py-1" />
          </label>
          <div class="grid grid-cols-2 gap-3">
            <label class="grid gap-1">
              <span class="text-sm">Submission deadline</span>
              <input name="submissionDeadline" type="datetime-local" class="border rounded px-2 py-1" required />
            </label>
            <label class="grid gap-1">
              <span class="text-sm">Voting deadline</span>
              <input name="votingDeadline" type="datetime-local" class="border rounded px-2 py-1" required />
            </label>
          </div>
          <button class="bg-black text-white px-3 py-1 rounded w-max" type="submit">Add Session</button>
        </form>
        <p class="text-xs text-gray-600 mt-1">First session starts immediately; later sessions start after previous completes. Deadlines use your local time.</p>
      </section>
    {/if}
  {/if}
</div>
