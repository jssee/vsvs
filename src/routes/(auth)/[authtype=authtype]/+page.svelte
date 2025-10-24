<script lang="ts">
  import { page } from "$app/state";
  import { signUp, signIn } from "$lib/actions/auth.remote";

  const isSignUp = $derived(page.params.authtype === "signup");
  const signInSignUp = $derived(isSignUp ? "Sign up" : "Sign in");
</script>

<div
  class="flex h-dvh w-screen items-start justify-center bg-background pt-12 md:items-center md:pt-0"
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
    {#if isSignUp}
      <form
        {...signUp}
        class="flex flex-col gap-2 px-4 pb-12 sm:px-16"
        autocomplete="on"
      >
        {#each signUp.fields.allIssues() || [] as issue, i (i)}
          <div
            class="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400"
          >
            {issue.message}
          </div>
        {/each}

        <div class="flex flex-col gap-1">
          <label for="username" class="text-sm font-medium">Username</label>
          <input
            id="username"
            placeholder="yourname"
            {...signUp.fields.username.as("text")}
            autocomplete="username"
            required
          />
          {#if signUp.fields.username.issues()?.length}
            {#each signUp.fields.username.issues() || [] as issue, i (i)}
              <span class="text-xs text-red-500">{issue.message}</span>
            {/each}
          {:else}
            <span class="text-xs text-gray-500">
              Letters, numbers, and underscores only
            </span>
          {/if}
        </div>

        <div class="flex flex-col gap-1">
          <label for="email" class="text-sm font-medium">Email Address</label>
          <input
            id="email"
            placeholder="user@acme.com"
            {...signUp.fields.email.as("email")}
            autocomplete="email"
            required
          />
          {#each signUp.fields.email.issues() || [] as issue, i (i)}
            <span class="text-xs text-red-500">{issue.message}</span>
          {/each}
        </div>

        <div class="flex flex-col gap-1">
          <label for="password" class="text-sm font-medium">Password</label>
          <input
            id="password"
            placeholder="••••••••"
            {...signUp.fields._password.as("password")}
            autocomplete="new-password"
            required
          />
          {#each signUp.fields._password.issues() || [] as issue, i (i)}
            <span class="text-xs text-red-500">{issue.message}</span>
          {/each}
        </div>

        <button type="submit" disabled={!!signUp.pending}>
          {#if signUp.pending}
            Signing up...
          {:else}
            Sign up
          {/if}
        </button>

        {@render switchAuthType({
          question: "Already have an account? ",
          href: "/signin",
          cta: "Sign in",
          postscript: " instead.",
        })}
      </form>
    {:else}
      <form
        {...signIn}
        class="flex flex-col gap-2 px-4 pb-12 sm:px-16"
        autocomplete="on"
      >
        {#each signIn.fields.allIssues() || [] as issue, i (i)}
          <div
            class="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400"
          >
            {issue.message}
          </div>
        {/each}

        <div class="flex flex-col gap-1">
          <label for="email" class="text-sm font-medium">Email Address</label>
          <input
            id="email"
            placeholder="user@acme.com"
            {...signIn.fields.email.as("email")}
            autocomplete="email"
            required
          />
          {#each signIn.fields.email.issues() || [] as issue, i (i)}
            <span class="text-xs text-red-500">{issue.message}</span>
          {/each}
        </div>

        <div class="flex flex-col gap-1">
          <label for="password" class="text-sm font-medium">Password</label>
          <input
            id="password"
            placeholder="••••••••"
            {...signIn.fields._password.as("password")}
            autocomplete="current-password"
            required
          />
          {#each signIn.fields._password.issues() || [] as issue, i (i)}
            <span class="text-xs text-red-500">{issue.message}</span>
          {/each}
        </div>

        <button type="submit" disabled={!!signIn.pending}>
          {#if signIn.pending}
            Signing in...
          {:else}
            Sign in
          {/if}
        </button>

        {@render switchAuthType({
          question: "Don't have an account? ",
          href: "/signup",
          cta: "Sign up",
          postscript: " for free.",
        })}
      </form>
    {/if}
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
