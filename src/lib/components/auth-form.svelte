<script module lang="ts">
  export type FormSuccessData = {
    success: true;
  };
  export type FormFailureData = {
    success: false;
    message: string;
    email?: string;
  };
  export type FormData = FormSuccessData | FormFailureData;

  export type AuthFormProps = {
    form?: FormData;
    submitButton: Snippet<[{ pending: boolean; success: boolean }]>;
    children: Snippet;
  };
</script>

<script lang="ts">
  import { enhance } from "$app/forms";
  import type { SubmitFunction } from "@sveltejs/kit";
  import type { Snippet } from "svelte";

  let { form, submitButton, children }: AuthFormProps = $props();

  let pending = $state(false);
  const enhanceCallback: SubmitFunction<
    FormSuccessData,
    FormFailureData
  > = () => {
    pending = true;
    return async ({ result, update }) => {
      if (result.type === "failure" && result.data?.message) {
        console.error(result.data.message);
      }
      pending = false;
      return update();
    };
  };

  const defaultValue = $derived.by(() => {
    if (!form?.success && form?.email) {
      return form.email;
    }
    return "";
  });
</script>

<form method="POST" use:enhance={enhanceCallback}>
  <div>
    <label for="email">Email Address</label>

    <input
      id="email"
      name="email"
      type="email"
      placeholder="user@acme.com"
      autocomplete="email"
      required
      {defaultValue}
    />
  </div>

  <div>
    <label for="password">Password</label>

    <input id="password" name="password" type="password" required />
  </div>

  {@render submitButton({ pending, success: !!form?.success })}
  {@render children()}
</form>
