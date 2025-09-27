<script lang="ts">
  import { Field, Control, Label, Description, FieldErrors } from "formsnap";
  import { superForm } from "sveltekit-superforms";

  export let data: { battle: { _id: string; name: string }; form: any };
  const form = superForm(data.form);
  let { form: formData, enhance, message, allErrors } = form;
</script>

<a href={`/battles/${data.battle._id}`} class="text-sm text-blue-700 underline"
  >← Back</a
>
<h1 class="mb-2 text-xl font-semibold">
  Create Session for {data.battle.name}
</h1>
<div class="flex flex-col items-center justify-center">
  {#if $message}
    <span class="mb-2 text-emerald-400">{$message}</span>
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
    action="?/createSession"
    class="w-full space-y-2 p-4 md:w-96 lg:p-0"
  >
    <div>
      <Field {form} name="vibe">
        <Control>
          {#snippet children({ props })}
            <Label class="font-medium">Vibe</Label>
            <input
              {...props}
              type="text"
              placeholder="e.g. 90s hip hop"
              bind:value={$formData.vibe}
            />
            <Description class="text-muted-foreground text-xs"></Description>
          {/snippet}
        </Control>
        <FieldErrors class="text-destructive text-sm" />
      </Field>
    </div>

    <div>
      <Field {form} name="description">
        <Control>
          {#snippet children({ props })}
            <Label class="font-medium">Description</Label>
            <input
              {...props}
              type="text"
              placeholder="Optional details"
              bind:value={$formData.description}
            />
          {/snippet}
        </Control>
        <FieldErrors class="text-destructive text-sm" />
      </Field>
    </div>

    <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div>
        <span class="font-medium">Submission deadline</span>
        <input
          name="submissionLocal"
          type="datetime-local"
          class="rounded border px-2 py-1"
          required
        />
      </div>
      <div>
        <span class="font-medium">Voting deadline</span>
        <input
          name="votingLocal"
          type="datetime-local"
          class="rounded border px-2 py-1"
          required
        />
      </div>
    </div>

    <div>
      <button type="submit">Create Session</button>
    </div>
  </form>
</div>
