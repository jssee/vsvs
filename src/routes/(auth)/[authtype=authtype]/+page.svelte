<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { authClient } from "$lib/auth-client";
  import SubmitButton from "$lib/components/submit-button.svelte";

  let email = $state("");
  let password = $state("");
  let username = $state("");
  let isSubmitting = $state(false);
  let errorMessage = $state("");
  let fieldErrors = $state<{
    email?: string;
    password?: string;
    username?: string;
  }>({});

  const isSignUp = $derived(page.params.authtype === "signup");
  const signInSignUp = $derived(isSignUp ? "Sign up" : "Sign in");

  function validateForm() {
    fieldErrors = {};
    let isValid = true;

    // Email validation
    if (!email) {
      fieldErrors.email = "Email is required";
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      fieldErrors.email = "Enter a valid email address";
      isValid = false;
    }

    // Password validation
    if (!password) {
      fieldErrors.password = "Password is required";
      isValid = false;
    } else if (password.length < 8) {
      fieldErrors.password = "Password must be at least 8 characters long";
      isValid = false;
    }

    // Username validation for signup
    if (isSignUp) {
      if (!username) {
        fieldErrors.username = "Username is required";
        isValid = false;
      } else if (username.length < 3 || username.length > 30) {
        fieldErrors.username = "Username must be between 3 and 30 characters";
        isValid = false;
      } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        fieldErrors.username =
          "Username can only contain letters, numbers, and underscores";
        isValid = false;
      }
    }

    return isValid;
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    isSubmitting = true;
    errorMessage = "";
    fieldErrors = {};

    try {
      if (isSignUp) {
        const { error } = await authClient.signUp.email({
          email,
          password,
          name: username,
        });

        if (error) {
          errorMessage = error.message || "Failed to sign up";
          if (error.message?.toLowerCase().includes("email")) {
            fieldErrors.email = error.message;
          } else if (error.message?.toLowerCase().includes("username")) {
            fieldErrors.username = error.message;
          }
        } else {
          try {
            const syncResponse = await fetch("/api/auth/sync", {
              method: "POST",
            });

            if (!syncResponse.ok) {
              const data = await syncResponse.json().catch(() => ({}));
              const message =
                typeof data?.message === "string"
                  ? data.message
                  : "Failed to complete signup";

              if (syncResponse.status === 409) {
                fieldErrors.username = message;
              }

              errorMessage = message;
              return;
            }
          } catch (syncError) {
            console.error("Signup sync error:", syncError);
            errorMessage = "Failed to complete signup. Please try again.";
            return;
          }

          // Successful signup - redirect to battles
          goto("/battles");
        }
      } else {
        const { error } = await authClient.signIn.email({
          email,
          password,
        });

        if (error) {
          errorMessage = error.message || "Failed to sign in";
          if (error.message?.toLowerCase().includes("email")) {
            fieldErrors.email = error.message;
          } else if (error.message?.toLowerCase().includes("password")) {
            fieldErrors.password = error.message;
          }
        } else {
          // Successful signin - redirect to trigger server-side sync
          goto("/battles");
        }
      }
    } catch (err) {
      console.error("Auth error:", err);
      errorMessage = "An unexpected error occurred. Please try again.";
    } finally {
      isSubmitting = false;
    }
  }
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
    <form
      onsubmit={handleSubmit}
      class="flex flex-col gap-2 px-4 pb-12 sm:px-16"
      autocomplete="on"
    >
      {#if errorMessage}
        <div
          class="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400"
        >
          {errorMessage}
        </div>
      {/if}

      {#if isSignUp}
        <div class="flex flex-col gap-1">
          <label for="username" class="text-sm font-medium">Username</label>
          <input
            id="username"
            type="text"
            placeholder="yourname"
            bind:value={username}
            autocomplete="username"
            required
            class:border-red-500={fieldErrors.username}
          />
          {#if fieldErrors.username}
            <span class="text-xs text-red-500">{fieldErrors.username}</span>
          {:else}
            <span class="text-xs text-gray-500">
              Letters, numbers, and underscores only
            </span>
          {/if}
        </div>
      {/if}

      <div class="flex flex-col gap-1">
        <label for="email" class="text-sm font-medium">Email Address</label>
        <input
          id="email"
          type="email"
          placeholder="user@acme.com"
          bind:value={email}
          autocomplete="email"
          required
          class:border-red-500={fieldErrors.email}
        />
        {#if fieldErrors.email}
          <span class="text-xs text-red-500">{fieldErrors.email}</span>
        {/if}
      </div>

      <div class="flex flex-col gap-1">
        <label for="password" class="text-sm font-medium">Password</label>
        <input
          id="password"
          type="password"
          placeholder="••••••••"
          bind:value={password}
          autocomplete={isSignUp ? "new-password" : "current-password"}
          required
          class:border-red-500={fieldErrors.password}
        />
        {#if fieldErrors.password}
          <span class="text-xs text-red-500">{fieldErrors.password}</span>
        {/if}
      </div>

      <SubmitButton pending={isSubmitting} success={false}>
        {signInSignUp}
      </SubmitButton>

      {#if isSignUp}
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
