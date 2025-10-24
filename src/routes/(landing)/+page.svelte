<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import {
    FieldGroup,
    Field,
    FieldLabel,
    FieldDescription,
  } from "$lib/components/ui/field";
  import { signIn } from "$lib/actions/auth.remote";
  // import Logo from "$lib/assets/logo.svg";

  let id = $props.id();
</script>

<main class="flex h-full flex-col items-center justify-center">
  <Card.Root class="mx-auto w-full max-w-sm">
    <Card.Header>
      <Card.Title class="text-2xl font-bold tracking-tight">Sign in</Card.Title>
      <Card.Description
        >Enter your email below to sign in to your account</Card.Description
      >
    </Card.Header>
    <Card.Content>
      <form {...signIn}>
        <FieldGroup>
          <Field>
            <FieldLabel for="email-{id}">Email</FieldLabel>
            <Input
              id="email-{id}"
              placeholder="you@email.com"
              required
              {...signIn.fields.email.as("email")}
            />
          </Field>
          <Field>
            <div class="flex items-center">
              <FieldLabel for="password-{id}">Password</FieldLabel>
              <a
                href="mailto:jsshoyos@gmail.com?subject=VSVS: Forgot Password"
                class="ml-auto inline-block text-sm underline"
              >
                Forgot your password?
              </a>
            </div>
            <Input
              id="password-{id}"
              required
              data-invalid
              {...signIn.fields.password.as("password")}
            />
          </Field>
          <Field>
            <Button type="submit" variant="accent" size="lg" class="w-full"
              >Sign in</Button
            >

            <FieldDescription class="text-center">
              Don't have an account? <a href="/signup">Sign up</a>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </Card.Content>
  </Card.Root>
</main>
