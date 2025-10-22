<script lang="ts">
  import type { PageProps } from "./$types";

  const { data, form }: PageProps = $props();

  let invitedEmail = $state("");
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

    {#if data.user && data.user._id === data.battle.creatorId && data.battle.status === "active"}
      <div class="mt-4 rounded bg-gray-50 p-3">
        <h3 class="mb-2 text-sm font-medium">Send Invitation by Email</h3>
        {#if form?.message}
          <p
            class="mb-2 text-sm"
            class:text-red-600={!form.success}
            class:text-green-600={form.success}
          >
            {form.message}
          </p>
        {/if}
        <form method="post" action="?/sendInvitation" class="flex gap-2">
          <input
            type="email"
            name="invitedEmail"
            bind:value={invitedEmail}
            placeholder="friend@example.com"
            class="flex-1 rounded border px-3 py-1 text-sm"
            required
          />
          <button
            type="submit"
            class="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
          >
            Send Invite
          </button>
        </form>
      </div>
    {/if}
  </header>

  <section class="space-y-2 rounded border p-4">
    <div class="flex items-center justify-between">
      <h2 class="font-medium">Stages</h2>
      {#if data.user && data.user._id === data.battle.creatorId && data.battle.status === "active"}
        <a
          class="text-sm underline"
          href={`/battles/${data.battle._id}/stage/create`}>Create stage</a
        >
      {/if}
    </div>
    {#if data.stages.length === 0}
      <p class="text-sm text-gray-600">No stages yet.</p>
    {:else}
      <ul class="divide-y">
        {#each data.stages as s (s._id)}
          <li class="py-2">
            <div class="flex items-baseline justify-between">
              <a
                class="font-medium underline"
                href={`/battles/${data.battle._id}/stage/${s._id}`}
              >
                Stage {s.stageNumber}: {s.vibe}
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
