<script lang="ts">
  import { z } from "zod";
  import { formatDuration } from "$lib/time";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();

  const spotifyUrlSchema = z
    .string()
    .min(1, "URL is required")
    .refine(
      (s) =>
        /spotify\.com\/track\/[a-zA-Z0-9]{22}/.test(s) ||
        /^spotify:track:[a-zA-Z0-9]{22}$/.test(s),
      { message: "Must be a Spotify track URL" },
    );

  let submitUrl = $state("");
  let submitError = $state("");
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

  let editing: Record<string, boolean> = $state({});
  let editValues: Record<string, string> = $state({});
  let editErrors: Record<string, string> = $state({});
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
      editErrors[subId] = "";
    }
  }
</script>

<div class="mx-auto max-w-3xl space-y-6 p-4">
  <a
    href={`/battles/${data.battle._id}`}
    class="text-sm text-blue-700 underline">← Back to battle</a
  >
  <header class="rounded border p-4">
    <div class="flex items-baseline justify-between">
      <h1 class="text-xl font-semibold">
        Stage {data.stage.stageNumber}: {data.stage.vibe}
      </h1>
      <span class="text-xs text-gray-600">{data.stage.phase}</span>
    </div>
    {#if data.stage.description}
      <div class="mt-1 text-sm text-gray-700">{data.stage.description}</div>
    {/if}
    <div class="mt-1 text-xs text-gray-700">
      Time remaining: {formatDuration(data.stage.timeRemaining.milliseconds)}
    </div>
    {#if data.stage.playlistUrl}
      <div class="mt-2 text-sm">
        Playlist:
        <a class="underline" href={data.stage.playlistUrl} target="_blank"
          >{data.stage.playlistUrl}</a
        >
      </div>
    {/if}
    {#if data.user && data.user._id === data.battle.creatorId}
      <form method="post" action="?/generatePlaylistNow" class="mt-2">
        <input type="hidden" name="stageId" value={data.stage._id} />
        <button
          class="rounded bg-green-700 px-2 py-1 text-xs text-white"
          type="submit">Generate Playlist Now</button
        >
      </form>
      {#if form?.playlistUrl}
        <div class="mt-2 text-sm">
          Generated Playlist:
          <a class="underline" target="_blank" href={form.playlistUrl}
            >{form.playlistUrl}</a
          >
        </div>
      {/if}
    {/if}
  </header>

  {#if data.stage.phase === "submission"}
    <section class="rounded border p-4">
      <h2 class="mb-2 font-medium">Submit a song</h2>
      {#if data.user}
        <form
          method="post"
          action="?/submitSong"
          class="grid gap-2"
          onsubmit={validateSubmitSong}
        >
          {#if submitError}
            <p class="text-sm text-red-600">{submitError}</p>
          {/if}
          <input type="hidden" name="stageId" value={data.stage._id} />
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
                            onclick={() => startEdit(s._id, s.spotifyUrl)}
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
                        onsubmit={validateEditSubmit}
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
                            onclick={() => cancelEdit(s._id)}>Cancel</button
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
            {#if data.stageSubmissions.length === 0}
              <p class="text-sm text-gray-600">No songs submitted yet.</p>
            {:else}
              <ul class="space-y-2">
                {#each data.stageSubmissions as s (s._id)}
                  <li class="text-sm">
                    <a href={s.spotifyUrl} target="_blank" class="underline"
                      >{s.spotifyUrl}</a
                    >
                    <span class="ml-1 text-xs text-gray-600"
                      >by {s.username}{s.isCurrentUser ? " (you)" : ""}</span
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
    </section>
  {/if}

  {#if data.stage.phase === "voting"}
    <section class="rounded border p-4">
      <h2 class="mb-2 font-medium">Vote</h2>
      {#if data.user}
        <div class="text-sm">
          Stars remaining: {data.votingState?.starsRemaining ?? 0}
        </div>
        <div>
          <h3 class="mb-2 font-medium">Submissions</h3>
          {#if data.stageSubmissions.length === 0}
            <p class="text-sm text-gray-600">No songs submitted.</p>
          {:else}
            <ul class="space-y-2">
              {#each data.stageSubmissions as s (s._id)}
                {#if !s.isCurrentUser}
                  <li class="flex items-center justify-between text-sm">
                    <div class="flex-1">
                      <a href={s.spotifyUrl} target="_blank" class="underline"
                        >{s.spotifyUrl}</a
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
    </section>
  {/if}
</div>
