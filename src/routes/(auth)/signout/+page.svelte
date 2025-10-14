<script lang="ts">
  import { authClient } from "$lib/auth-client";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";

  onMount(async () => {
    await authClient.signOut();
    goto("/signin");
  });
</script>

<div class="flex h-dvh w-screen items-center justify-center">
  <p class="text-sm text-gray-500">Signing out...</p>
</div>
