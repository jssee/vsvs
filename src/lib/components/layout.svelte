<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "$lib/utils.js";

  let {
    class: className,
    children,
    ...restProps
  }: HTMLAttributes<HTMLDivElement> = $props();
</script>

<div
  class={cn(
    "grid min-h-screen grid-cols-[1fr_min(65ch,100%)_1fr] gap-x-4 px-4",
    className,
  )}
  {...restProps}
>
  <div class="col-start-2">
    {@render children?.()}
  </div>
</div>
