<script lang="ts">
  import { useQuery } from "convex-svelte";
  import { api } from "$lib/convex/_generated/api";
  import type { PageProps } from "./$types";
  import { Button } from "$lib/components/ui/button";
  import { Field } from "$lib/components/ui/field";
  import { Input } from "$lib/components/ui/input";
  import { Card, CardContent } from "$lib/components/ui/card";
  import * as Item from "$lib/components/ui/item";

  const { data, form }: PageProps = $props();

  const query = useQuery(
    api.battle.getMyBattles,
    { userId: data.user._id },
    { initialData: data.battles },
  );

  let inviteCode = $state("");
</script>

<div class="mb-4 flex items-baseline justify-between">
  <h1 class="text-xl font-semibold">Battles</h1>
  <a href="/invitations" class="text-sm text-blue-600 underline"
    >View invitations</a
  >
</div>
<div class="mb-4 flex gap-4">
  <a href="/battles/create" class="text-blue-600 underline">create new battle</a
  >
</div>

<section class="mx-auto max-w-screen-lg">
  <Card>
    <CardContent
      ><h2 class="mb-3 font-medium">Join a Battle</h2>
      <form method="post" action="?/joinByCode" class="flex gap-2">
        {#if form?.message}
          <p class="w-full text-sm text-red-600">{form.message}</p>
        {/if}
        <Field>
          <Input
            type="text"
            name="inviteCode"
            bind:value={inviteCode}
            placeholder="Enter invite code (e.g., ABC123)"
            class="flex-1 rounded border px-3 py-2 uppercase"
            required
          />
          <Button type="submit">Join</Button>
        </Field>
      </form></CardContent
    >
  </Card>
</section>

<section class="mx-auto max-w-screen-lg">
  {#if query.isLoading}
    <p class="text-sm text-gray-600">Loading...</p>
  {:else if query.error != null}
    failed to load: {query.error.toString()}
  {:else if query.data.length === 0}
    <p class="text-sm text-gray-600">You have no battles.</p>
  {:else}
    <Item.Group>
      {#each query.data as battle (battle._id)}
        <Item.Root>
          <Item.Header>
            <a
              class="font-medium hover:underline"
              href={`/battles/${battle._id}`}
            >
              {battle.name}
            </a>
          </Item.Header>
          <Item.Content
            ><span class="text-sm text-gray-600">
              {battle.playerCount}/{battle.maxPlayers} · {battle.status}
            </span></Item.Content
          >
          <Item.Actions>
            <Button variant="outline">Go</Button>
          </Item.Actions>
        </Item.Root>
      {/each}
    </Item.Group>
  {/if}
</section>
