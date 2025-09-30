<script lang="ts">
  import { useQuery } from "convex-svelte";
  import { api } from "$lib/convex/_generated/api";
  import type { PageProps } from "./$types";

  const { data, form }: PageProps = $props();

  const query = useQuery(
    api.invitations.getMyInvitations,
    { userId: data.user._id },
    { initialData: data.invitations },
  );

  // Group invitations by status
  const pending = $derived(
    (query.data || []).filter((inv) => inv.status === "pending"),
  );
  const accepted = $derived(
    (query.data || []).filter((inv) => inv.status === "accepted"),
  );
  const declined = $derived(
    (query.data || []).filter((inv) => inv.status === "declined"),
  );
</script>

<div class="mx-auto max-w-3xl space-y-6 p-4">
  <div class="flex items-center justify-between">
    <h1 class="text-xl font-semibold">Invitations</h1>
    <a href="/battles" class="text-sm text-blue-700 underline">← Back to battles</a
    >
  </div>

  {#if form?.message}
    <div
      class="rounded border px-4 py-2 text-sm"
      class:border-red-500={!form.success}
      class:text-red-600={!form.success}
      class:border-green-500={form.success}
      class:text-green-600={form.success}
    >
      {form.message}
    </div>
  {/if}

  {#if query.isLoading}
    <p class="text-sm text-gray-600">Loading invitations...</p>
  {:else if query.error}
    <p class="text-sm text-red-600">Failed to load: {query.error.toString()}</p>
  {:else}
    <!-- Pending Invitations -->
    <section class="rounded border p-4">
      <h2 class="mb-3 font-medium">Pending Invitations</h2>
      {#if pending.length === 0}
        <p class="text-sm text-gray-600">No pending invitations.</p>
      {:else}
        <ul class="space-y-3">
          {#each pending as inv (inv._id)}
            <li class="rounded border p-3">
              <div class="mb-2 flex items-baseline justify-between">
                <span class="font-medium">Battle Invitation</span>
                <span class="text-xs text-gray-600"
                  >{new Date(inv.invitedAt).toLocaleDateString()}</span
                >
              </div>
              {#if inv.invitedEmail}
                <p class="text-sm text-gray-700">
                  Invited to join via email: {inv.invitedEmail}
                </p>
              {/if}
              <div class="mt-3 flex gap-2">
                <form method="post" action="?/respond">
                  <input type="hidden" name="invitationId" value={inv._id} />
                  <input type="hidden" name="response" value="accepted" />
                  <button
                    type="submit"
                    class="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
                  >
                    Accept
                  </button>
                </form>
                <form method="post" action="?/respond">
                  <input type="hidden" name="invitationId" value={inv._id} />
                  <input type="hidden" name="response" value="declined" />
                  <button
                    type="submit"
                    class="rounded bg-gray-600 px-3 py-1 text-sm text-white hover:bg-gray-700"
                  >
                    Decline
                  </button>
                </form>
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <!-- Accepted Invitations -->
    <section class="rounded border p-4">
      <h2 class="mb-3 font-medium">Accepted Invitations</h2>
      {#if accepted.length === 0}
        <p class="text-sm text-gray-600">No accepted invitations.</p>
      {:else}
        <ul class="space-y-2">
          {#each accepted as inv (inv._id)}
            <li class="rounded border bg-green-50 p-3 text-sm">
              <div class="flex items-center justify-between">
                <span>Battle invitation</span>
                <span class="text-xs text-gray-600"
                  >Accepted {inv.respondedAt
                    ? new Date(inv.respondedAt).toLocaleDateString()
                    : ""}</span
                >
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <!-- Declined Invitations -->
    <section class="rounded border p-4">
      <h2 class="mb-3 font-medium">Declined Invitations</h2>
      {#if declined.length === 0}
        <p class="text-sm text-gray-600">No declined invitations.</p>
      {:else}
        <ul class="space-y-2">
          {#each declined as inv (inv._id)}
            <li class="rounded border bg-gray-50 p-3 text-sm">
              <div class="flex items-center justify-between">
                <span>Battle invitation</span>
                <span class="text-xs text-gray-600"
                  >Declined {inv.respondedAt
                    ? new Date(inv.respondedAt).toLocaleDateString()
                    : ""}</span
                >
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {/if}
</div>