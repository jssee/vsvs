<script lang="ts">
  import { z } from 'zod';
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
    sessionSubmissions: Array<{
      _id: string;
      userId: string;
      userEmail: string;
      spotifyUrl: string;
      submissionOrder: number;
      submittedAt: number;
      starsReceived: number;
      isCurrentUser: boolean;
    }>;
    mySubmissions: Array<{
      _id: string;
      spotifyUrl: string;
      submissionOrder: number;
      submittedAt: number;
      starsReceived: number;
    }>;
    user: { _id: string; email: string } | null;
  };

  export let form: { message?: string } | undefined;

  // Client-side validation for Spotify URLs
  const spotifyUrlSchema = z
    .string()
    .min(1, 'URL is required')
    .refine((s) => /spotify\.com\/track\/[a-zA-Z0-9]{22}/.test(s) || /^spotify:track:[a-zA-Z0-9]{22}$/.test(s), {
      message: 'Must be a Spotify track URL',
    });

  let submitUrl = '';
  let submitError = '';
  function validateSubmitSong(e: SubmitEvent) {
    submitError = '';
    const formEl = e.currentTarget as HTMLFormElement;
    const urlInput = formEl.elements.namedItem('spotifyUrl') as HTMLInputElement;
    const res = spotifyUrlSchema.safeParse(urlInput.value.trim());
    if (!res.success) {
      e.preventDefault();
      submitError = res.error.issues[0].message;
    }
  }

  // Edit-in-place state for user's submissions
  let editing: Record<string, boolean> = {};
  let editValues: Record<string, string> = {};
  let editErrors: Record<string, string> = {};
  function startEdit(id: string, currentUrl: string) {
    editing[id] = true;
    editValues[id] = currentUrl;
    editErrors[id] = '';
  }
  function cancelEdit(id: string) {
    editing[id] = false;
    editErrors[id] = '';
  }
  function validateEditSubmit(e: SubmitEvent) {
    const formEl = e.currentTarget as HTMLFormElement;
    const subId = (formEl.elements.namedItem('submissionId') as HTMLInputElement).value;
    const url = (formEl.elements.namedItem('spotifyUrl') as HTMLInputElement).value.trim();
    const res = spotifyUrlSchema.safeParse(url);
    if (!res.success) {
      e.preventDefault();
      editErrors[subId] = res.error.issues[0].message;
    } else {
      // Let it submit; UI will reset on reload
      editErrors[subId] = '';
    }
  }
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
              Submissions until {new Date(s.submissionDeadline).toLocaleString()} • Voting until {new Date(s.votingDeadline).toLocaleString()} • {s.submissionCount} submissions
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
      {#if data.currentSession.phase === 'submission'}
        <div class="mt-4 grid gap-3">
          {#if data.user}
            <form method="post" action="?/submitSong" class="grid gap-2" on:submit={validateSubmitSong}>
              {#if form?.message}
                <p class="text-sm text-red-600">{form.message}</p>
              {/if}
              {#if submitError}
                <p class="text-sm text-red-600">{submitError}</p>
              {/if}
              <input type="hidden" name="sessionId" value={data.currentSession._id} />
              <label class="grid gap-1">
                <span class="text-sm">Spotify track URL</span>
                <input bind:value={submitUrl} name="spotifyUrl" class="border rounded px-2 py-1" placeholder="https://open.spotify.com/track/..." required />
              </label>
              <button class="bg-black text-white px-3 py-1 rounded w-max" type="submit">Submit Song</button>
            </form>
            <div class="grid grid-cols-2 gap-6 mt-4">
              <div>
                <h3 class="font-medium mb-2">Your Submissions</h3>
                {#if data.mySubmissions.length === 0}
                  <p class="text-sm text-gray-600">No submissions yet.</p>
                {:else}
                  <ul class="space-y-2">
                    {#each data.mySubmissions as s (s._id)}
                      <li class="text-sm">
                        {#if !editing[s._id]}
                          <div class="flex items-center justify-between">
                            <div>
                              <a href={s.spotifyUrl} target="_blank" class="underline">{s.spotifyUrl}</a>
                              <span class="text-xs text-gray-600 ml-1">#{s.submissionOrder}</span>
                            </div>
                            <div class="flex items-center gap-3">
                              <button class="text-xs underline" type="button" on:click={() => startEdit(s._id, s.spotifyUrl)}>Edit</button>
                              <form method="post" action="?/removeSubmission">
                                <input type="hidden" name="submissionId" value={s._id} />
                                <button class="text-xs text-red-600 underline" type="submit">Remove</button>
                              </form>
                            </div>
                          </div>
                        {:else}
                          <form method="post" action="?/updateSubmission" class="grid gap-1" on:submit={validateEditSubmit}>
                            {#if editErrors[s._id]}
                              <span class="text-xs text-red-600">{editErrors[s._id]}</span>
                            {/if}
                            <input type="hidden" name="submissionId" value={s._id} />
                            <div class="flex items-center gap-2">
                              <input bind:value={editValues[s._id]} name="spotifyUrl" class="border rounded px-2 py-1 text-sm flex-1" />
                              <button class="text-xs bg-black text-white px-2 py-0.5 rounded" type="submit">Save</button>
                              <button class="text-xs underline" type="button" on:click={() => cancelEdit(s._id)}>Cancel</button>
                            </div>
                          </form>
                        {/if}
                      </li>
                    {/each}
                  </ul>
                {/if}
              </div>
              <div>
                <h3 class="font-medium mb-2">All Submissions</h3>
                {#if data.sessionSubmissions.length === 0}
                  <p class="text-sm text-gray-600">No songs submitted yet.</p>
                {:else}
                  <ul class="space-y-2">
                    {#each data.sessionSubmissions as s (s._id)}
                      <li class="text-sm">
                        <a href={s.spotifyUrl} target="_blank" class="underline">{s.spotifyUrl}</a>
                        <span class="text-xs text-gray-600 ml-1">by {s.userEmail}{s.isCurrentUser ? ' (you)' : ''}</span>
                      </li>
                    {/each}
                  </ul>
                {/if}
              </div>
            </div>
          {:else}
            <p class="text-sm text-gray-600 mt-2">Sign in to submit a song.</p>
          {/if}
        </div>
      {/if}
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
