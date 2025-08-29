<script lang="ts">
  import { z } from "zod";
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
      username: string;
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
      votingProgress: {
        totalVoters: number;
        votedCount: number;
        remainingVoters: string[];
      };
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
      username: string;
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
    votingState: null | {
      starsRemaining: number;
      votedSubmissions: string[];
      canVote: boolean;
    };
    user: { _id: string; email: string; username: string } | null;
  };

  export let form: { message?: string } | undefined;

  // Client-side validation for Spotify URLs
  const spotifyUrlSchema = z
    .string()
    .min(1, "URL is required")
    .refine(
      (s) =>
        /spotify\.com\/track\/[a-zA-Z0-9]{22}/.test(s) ||
        /^spotify:track:[a-zA-Z0-9]{22}$/.test(s),
      {
        message: "Must be a Spotify track URL",
      },
    );

  let submitUrl = "";
  let submitError = "";
  function validateSubmitSong(e: SubmitEvent) {
    submitError = "";
    const formEl = e.currentTarget as HTMLFormElement;
    const urlInput = formEl.elements.namedItem(
      "spotifyUrl",
    ) as HTMLInputElement;
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
    editErrors[id] = "";
  }
  function cancelEdit(id: string) {
    editing[id] = false;
    editErrors[id] = "";
  }
  function validateEditSubmit(e: SubmitEvent) {
    const formEl = e.currentTarget as HTMLFormElement;
    const subId = (
      formEl.elements.namedItem("submissionId") as HTMLInputElement
    ).value;
    const url = (
      formEl.elements.namedItem("spotifyUrl") as HTMLInputElement
    ).value.trim();
    const res = spotifyUrlSchema.safeParse(url);
    if (!res.success) {
      e.preventDefault();
      editErrors[subId] = res.error.issues[0].message;
    } else {
      // Let it submit; UI will reset on reload
      editErrors[subId] = "";
    }
  }
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

  <section class="rounded border p-4">
    <h2 class="mb-2 font-medium">Players</h2>
    {#if data.players.length === 0}
      <p class="text-sm text-gray-600">No players yet.</p>
    {:else}
      <ul class="divide-y">
        {#each data.players as p (p._id)}
          <li class="flex items-center justify-between py-2">
            <div>
              <div class="text-sm">{p.username}</div>
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

  <section class="space-y-2 rounded border p-4">
    <h2 class="font-medium">Sessions</h2>
    {#if data.sessions.length === 0}
      <p class="text-sm text-gray-600">No sessions yet.</p>
    {:else}
      <ul class="divide-y">
        {#each data.sessions as s (s._id)}
          <li class="py-2">
            <div class="flex items-baseline justify-between">
              <div class="font-medium">Session {s.sessionNumber}: {s.vibe}</div>
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

  {#if data.currentSession}
    <section class="rounded border p-4">
      <h2 class="mb-2 font-medium">Current Session</h2>
      <div class="text-sm">
        Session {data.currentSession.sessionNumber}: {data.currentSession.vibe}
      </div>
      <div class="mt-1 text-xs text-gray-700">
        Phase: {data.currentSession.phase} • Time remaining: {Math.max(
          0,
          Math.floor(data.currentSession.timeRemaining.milliseconds / 60000),
        )}m
      </div>
      {#if data.currentSession.playlistUrl}
        <div class="mt-2 text-sm">
          Playlist:
          <a
            class="underline"
            href={data.currentSession.playlistUrl}
            target="_blank">{data.currentSession.playlistUrl}</a
          >
        </div>
      {/if}
      {#if data.user && data.user._id === data.battle.creatorId}
        <form method="post" action="?/generatePlaylistNow" class="mt-2">
          <input
            type="hidden"
            name="sessionId"
            value={data.currentSession._id}
          />
          <button
            class="rounded bg-green-700 px-2 py-1 text-xs text-white"
            type="submit"
          >
            Generate Playlist Now
          </button>
        </form>
        {#if form?.message}
          <div class="mt-1 text-xs text-red-600">{form.message}</div>
        {/if}
        {#if form?.playlistUrl}
          <div class="mt-2 text-sm">
            Generated Playlist:
            <a class="underline" target="_blank" href={form.playlistUrl}
              >{form.playlistUrl}</a
            >
          </div>
        {/if}
      {/if}
      {#if data.currentSession.phase === "submission"}
        <div class="mt-4 grid gap-3">
          {#if data.user}
            <form
              method="post"
              action="?/submitSong"
              class="grid gap-2"
              on:submit={validateSubmitSong}
            >
              {#if form?.message}
                <p class="text-sm text-red-600">{form.message}</p>
              {/if}
              {#if submitError}
                <p class="text-sm text-red-600">{submitError}</p>
              {/if}
              <input
                type="hidden"
                name="sessionId"
                value={data.currentSession._id}
              />
              <label class="grid gap-1">
                <span class="text-sm">Spotify track URL</span>
                <input
                  bind:value={submitUrl}
                  name="spotifyUrl"
                  class="rounded border px-2 py-1"
                  placeholder="https://open.spotify.com/track/..."
                  required
                />
              </label>
              <button
                class="w-max rounded bg-black px-3 py-1 text-white"
                type="submit">Submit Song</button
              >
            </form>
            <div class="mt-4 grid grid-cols-2 gap-6">
              <div>
                <h3 class="mb-2 font-medium">Your Submissions</h3>
                {#if data.mySubmissions.length === 0}
                  <p class="text-sm text-gray-600">No submissions yet.</p>
                {:else}
                  <ul class="space-y-2">
                    {#each data.mySubmissions as s (s._id)}
                      <li class="text-sm">
                        {#if !editing[s._id]}
                          <div class="flex items-center justify-between">
                            <div>
                              <a
                                href={s.spotifyUrl}
                                target="_blank"
                                class="underline">{s.spotifyUrl}</a
                              >
                              <span class="ml-1 text-xs text-gray-600"
                                >#{s.submissionOrder}</span
                              >
                            </div>
                            <div class="flex items-center gap-3">
                              <button
                                class="text-xs underline"
                                type="button"
                                on:click={() => startEdit(s._id, s.spotifyUrl)}
                                >Edit</button
                              >
                              <form method="post" action="?/removeSubmission">
                                <input
                                  type="hidden"
                                  name="submissionId"
                                  value={s._id}
                                />
                                <button
                                  class="text-xs text-red-600 underline"
                                  type="submit">Remove</button
                                >
                              </form>
                            </div>
                          </div>
                        {:else}
                          <form
                            method="post"
                            action="?/updateSubmission"
                            class="grid gap-1"
                            on:submit={validateEditSubmit}
                          >
                            {#if editErrors[s._id]}
                              <span class="text-xs text-red-600"
                                >{editErrors[s._id]}</span
                              >
                            {/if}
                            <input
                              type="hidden"
                              name="submissionId"
                              value={s._id}
                            />
                            <div class="flex items-center gap-2">
                              <input
                                bind:value={editValues[s._id]}
                                name="spotifyUrl"
                                class="flex-1 rounded border px-2 py-1 text-sm"
                              />
                              <button
                                class="rounded bg-black px-2 py-0.5 text-xs text-white"
                                type="submit">Save</button
                              >
                              <button
                                class="text-xs underline"
                                type="button"
                                on:click={() => cancelEdit(s._id)}
                                >Cancel</button
                              >
                            </div>
                          </form>
                        {/if}
                      </li>
                    {/each}
                  </ul>
                {/if}
              </div>
              <div>
                <h3 class="mb-2 font-medium">All Submissions</h3>
                {#if data.sessionSubmissions.length === 0}
                  <p class="text-sm text-gray-600">No songs submitted yet.</p>
                {:else}
                  <ul class="space-y-2">
                    {#each data.sessionSubmissions as s (s._id)}
                      <li class="text-sm">
                        <a href={s.spotifyUrl} target="_blank" class="underline"
                          >{s.spotifyUrl}</a
                        >
                        <span class="ml-1 text-xs text-gray-600"
                          >by {s.username}{s.isCurrentUser
                            ? " (you)"
                            : ""}</span
                        >
                      </li>
                    {/each}
                  </ul>
                {/if}
              </div>
            </div>
          {:else}
            <p class="mt-2 text-sm text-gray-600">Sign in to submit a song.</p>
          {/if}
        </div>
      {/if}
      {#if data.currentSession.phase === "voting"}
        <div class="mt-4 grid gap-3">
          {#if data.user}
            <div class="text-sm">
              Stars remaining: {data.votingState?.starsRemaining ?? 0}
            </div>
            {#if form?.message}
              <p class="text-sm text-red-600">{form.message}</p>
            {/if}
            <div>
              <h3 class="mb-2 font-medium">Submissions</h3>
              {#if data.sessionSubmissions.length === 0}
                <p class="text-sm text-gray-600">No songs submitted.</p>
              {:else}
                <ul class="space-y-2">
                  {#each data.sessionSubmissions as s (s._id)}
                    {#if !s.isCurrentUser}
                      <li class="flex items-center justify-between text-sm">
                        <div class="flex-1">
                          <a
                            href={s.spotifyUrl}
                            target="_blank"
                            class="underline">{s.spotifyUrl}</a
                          >
                          <span class="ml-1 text-xs text-gray-600"
                            >by {s.username}</span
                          >
                          <span class="ml-2 text-xs text-gray-600"
                            >⭐ {s.starsReceived}</span
                          >
                        </div>
                        <div class="flex items-center gap-2">
                          {#if data.votingState && data.votingState.votedSubmissions.includes(s._id)}
                            <form method="post" action="?/removeStar">
                              <input
                                type="hidden"
                                name="submissionId"
                                value={s._id}
                              />
                              <button class="text-xs underline" type="submit"
                                >Unstar</button
                              >
                            </form>
                          {:else}
                            <form method="post" action="?/awardStar">
                              <input
                                type="hidden"
                                name="submissionId"
                                value={s._id}
                              />
                              <button
                                class="rounded bg-black px-2 py-0.5 text-xs text-white"
                                type="submit"
                                disabled={!data.votingState?.canVote}
                                >Give Star</button
                              >
                            </form>
                          {/if}
                        </div>
                      </li>
                    {/if}
                  {/each}
                </ul>
              {/if}
            </div>
          {:else}
            <p class="mt-2 text-sm text-gray-600">Sign in to vote.</p>
          {/if}
        </div>
      {/if}
    </section>
  {/if}

  {#if data.user}
    <section class="rounded border p-4">
      <h2 class="mb-2 font-medium">Invite Player</h2>
      {#if form?.message}
        <p class="mb-2 text-sm text-red-600">{form.message}</p>
      {/if}
      <form method="post" action="?/invite" class="flex items-end gap-2">
        <label class="grid flex-1 gap-1">
          <span class="text-sm">Email</span>
          <input
            name="email"
            type="email"
            required
            class="w-full rounded border px-2 py-1"
          />
        </label>
        <button class="rounded bg-black px-3 py-1 text-white" type="submit"
          >Send</button
        >
      </form>
      <p class="mt-2 text-xs text-gray-600">
        Only the battle creator can invite.
      </p>
    </section>
    {#if data.user._id === data.battle.creatorId && data.battle.status === "active"}
      <section class="rounded border p-4">
        <h2 class="mb-2 font-medium">Add Session</h2>
        {#if form?.message}
          <p class="mb-2 text-sm text-red-600">{form.message}</p>
        {/if}
        <form method="post" action="?/addSession" class="grid gap-3">
          <label class="grid gap-1">
            <span class="text-sm">Vibe</span>
            <input name="vibe" class="rounded border px-2 py-1" required />
          </label>
          <label class="grid gap-1">
            <span class="text-sm">Description (optional)</span>
            <input name="description" class="rounded border px-2 py-1" />
          </label>
          <div class="grid grid-cols-2 gap-3">
            <label class="grid gap-1">
              <span class="text-sm">Submission deadline</span>
              <input
                name="submissionDeadline"
                type="datetime-local"
                class="rounded border px-2 py-1"
                required
              />
            </label>
            <label class="grid gap-1">
              <span class="text-sm">Voting deadline</span>
              <input
                name="votingDeadline"
                type="datetime-local"
                class="rounded border px-2 py-1"
                required
              />
            </label>
          </div>
          <button
            class="w-max rounded bg-black px-3 py-1 text-white"
            type="submit">Add Session</button
          >
        </form>
        <p class="mt-1 text-xs text-gray-600">
          First session starts immediately; later sessions start after previous
          completes. Deadlines use your local time.
        </p>
      </section>
    {/if}
  {/if}
</div>
