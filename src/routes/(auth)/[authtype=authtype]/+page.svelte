<script lang="ts">
  import { page } from "$app/state";
  import { Field, Control, Label, Description, FieldErrors } from "formsnap";
  import SubmitButton from "$lib/components/submit-button.svelte";
  import { superForm } from "sveltekit-superforms";

  import type { PageProps } from "./$types";

  const { data }: PageProps = $props();
  const form = superForm(data.form);
  let { form: formData, enhance, message, allErrors, submitting } = form;

  const signInSignUp = $derived(
    page.params.authtype === "signup" ? "Sign up" : "Sign in",
  );
</script>

<div
  class="bg-background flex h-dvh w-screen items-start justify-center pt-12 md:items-center md:pt-0"
>
  <div class="flex w-full max-w-md flex-col gap-12 overflow-hidden rounded-2xl">
    <div
      class="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16"
    >
      <h3 class="text-xl font-semibold dark:text-zinc-50">{signInSignUp}</h3>
      <p class="text-sm text-gray-500 dark:text-zinc-400">
        Use your email and password to {signInSignUp.toLowerCase()}
      </p>
    </div>
    <form
      method="post"
      use:enhance
      class="flex flex-col gap-2 px-4 pb-12 sm:px-16"
      autocomplete="on"
    >
      {#if $message}
        <span class="text-sm text-emerald-500">{$message}</span>
      {/if}

      {#if $allErrors.length}
        <ul class="space-y-1 text-sm text-red-500">
          {#each $allErrors as error, index (error.path + index)}
            <li>
              <b>{error.path}:</b>
              {error.messages.join(". ")}
            </li>
          {/each}
        </ul>
      {/if}

      {#if page.params.authtype === "signup"}
        <Field {form} name="username">
          <Control>
            {#snippet children({ props })}
              <Label class="text-sm font-medium">Username</Label>
              <input
                {...props}
                type="text"
                placeholder="yourname"
                bind:value={$formData.username}
                autocomplete="username"
                required
              />
              <Description class="text-xs text-gray-500">
                Letters, numbers, and underscores only
              </Description>
            {/snippet}
          </Control>
          <FieldErrors class="text-xs text-red-500" />
        </Field>
      {/if}

      <Field {form} name="email">
        <Control>
          {#snippet children({ props })}
            <Label class="text-sm font-medium">Email Address</Label>
            <input
              {...props}
              type="email"
              placeholder="user@acme.com"
              bind:value={$formData.email}
              autocomplete="email"
              required
            />
          {/snippet}
        </Control>
        <FieldErrors class="text-xs text-red-500" />
      </Field>

      <Field {form} name="password">
        <Control>
          {#snippet children({ props })}
            <Label class="text-sm font-medium">Password</Label>
            <input
              {...props}
              type="password"
              placeholder="••••••••"
              bind:value={$formData.password}
              autocomplete={page.params.authtype === "signup"
                ? "new-password"
                : "current-password"}
              required
            />
          {/snippet}
        </Control>
        <FieldErrors class="text-xs text-red-500" />
      </Field>

      <SubmitButton pending={$submitting} success={!$submitting && !!$message}>
        {signInSignUp}
      </SubmitButton>

      {#if page.params.authtype === "signup"}
        {@render switchAuthType({
          question: "Already have an account? ",
          href: "/signin",
          cta: "Sign in",
          postscript: " instead.",
        })}
      {:else}
        {@render switchAuthType({
          question: "Don't have an account? ",
          href: "/signup",
          cta: "Sign up",
          postscript: " for free.",
        })}
      {/if}
    </form>
  </div>
</div>

{#snippet switchAuthType({
  question,
  href,
  cta,
  postscript,
}: {
  question: string;
  href: string;
  cta: string;
  postscript: string;
})}
  <p class="mt-4 text-center text-sm text-gray-600 dark:text-zinc-400">
    {question}
    <a
      {href}
      class="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
    >
      {cta}
    </a>
    {postscript}
  </p>
{/snippet}
