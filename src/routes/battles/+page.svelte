<script lang="ts">
  import { useQuery } from "convex-svelte";
  import { Field, Control, Label, Description, FieldErrors } from "formsnap";

  import { api } from "$lib/convex/_generated/api";
  import type { PageProps } from "./$types";
  import SuperDebug, { superForm } from "sveltekit-superforms";

  const { data }: PageProps = $props();
  const form = superForm(data.form);
  let { form: formData, enhance, message, allErrors } = form;

  const query = useQuery(
    api.battles.getMyBattles,
    {
      userId: data.user._id,
    },
    { initialData: data.battles },
  );

  $inspect("form errors:", JSON.stringify($allErrors, null, 2));
</script>

<h1 class="text-xl font-semibold">Battles</h1>
<div class="flex flex-col items-center justify-center">
  {#if $message}
    <span class="mb-2 text-emerald-400">
      {$message}
    </span>
  {/if}

  {#if $allErrors.length}
    <ul class="mb-2 text-red-400">
      {#each $allErrors as error}
        <li>
          <b>{error.path}:</b>
          {error.messages.join(". ")}
        </li>
      {/each}
    </ul>
  {/if}

  <form
    use:enhance
    method="post"
    action="?/createBattle"
    class="w-full space-y-2 p-4 md:w-96 lg:p-0"
  >
    <div>
      <Field {form} name="name">
        <Control>
          {#snippet children({ props })}
            <Label class="font-medium">Name</Label>
            <input
              {...props}
              type="text"
              placeholder="Enter a name for the battle"
              bind:value={$formData.name}
            />
            <Description class="text-muted-foreground text-xs"></Description>
          {/snippet}
        </Control>
        <FieldErrors class="text-destructive text-sm" />
      </Field>
    </div>
    <div>
      <Field {form} name="visibility">
        <Control>
          {#snippet children({ props })}
            <Label class="font-medium">Visibility</Label>
            <select
              {...props}
              bind:value={$formData.visibility}
              class="rounded border px-2 py-1"
              name={props.name}
            >
              <option value="private">private</option>
              <option value="public">public</option>
            </select>
          {/snippet}
        </Control>
        <Description class="text-muted-foreground text-sm"></Description>
        <FieldErrors class="text-destructive text-sm" />
      </Field>
    </div>
    <fieldset>
      <!-- <legend class="mb-4 text-lg font-medium"> Email Notifications </legend> -->
      <div
        class="flex flex-row items-center justify-between space-y-4 rounded-lg border p-4"
      >
        <Field {form} name="doubleSubmissions">
          <Control>
            {#snippet children({ props })}
              <div class="space-y-0.5">
                <input
                  {...props}
                  name="doubleSubmissions"
                  type="checkbox"
                  bind:checked={$formData.doubleSubmissions}
                />
                <Label class="font-medium">Double time</Label>

                <Description class="text-muted-foreground text-xs">
                  When active, players can submit two songs per session
                </Description>
              </div>
            {/snippet}
          </Control>
        </Field>
      </div>
    </fieldset>
    <div>
      <Field {form} name="maxPlayers">
        <Control>
          {#snippet children({ props })}
            <Label class="font-medium">Max Players</Label>
            <input
              {...props}
              type="number"
              placeholder=""
              bind:value={$formData.maxPlayers}
            />
            <Description class="text-muted-foreground text-xs"></Description>
          {/snippet}
        </Control>
        <FieldErrors class="text-destructive text-sm" />
      </Field>
    </div>
    <div>
      <button type="submit">Submit</button>
    </div>
  </form>
</div>

<section class="rounded border p-4">
  <h2 class="mb-3 font-medium">My Battles</h2>
  {#if query.isLoading}
    <p class="text-sm text-gray-600">Loading...</p>
  {:else if query.error != null}
    failed to load: {query.error.toString()}
  {:else if query.data.length === 0}
    <p class="text-sm text-gray-600">You have no battles.</p>
  {:else}
    {JSON.stringify(query.data, null, 2)}
  {/if}
</section>
