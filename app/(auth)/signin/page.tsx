"use client";

import { useState } from "react";
import { signInWithMagicLink } from "$/actions/auth";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "$/components/ui/button";
import { Input } from "$/components/ui/input";
import { Separator } from "$/components/ui/separator";
import { Suspense } from "react";

function SignInForm() {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const success = searchParams.get("success");

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    try {
      await signInWithMagicLink(formData);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Sign In</h1>
        <p className="text-gray-500">
          Enter your email to sign in with a magic link
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-500">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-500">
          {success}
        </div>
      )}

      <form action={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="name@example.com"
            required
            disabled={isLoading}
            className="w-full"
          />
        </div>
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
          aria-disabled={isLoading}
        >
          {isLoading ? "Sending..." : "Sign in with Magic Link"}
        </Button>
      </form>

      <Separator className="my-4" />

      <div className="text-center text-sm">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-blue-600 hover:text-blue-500"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}

export default function SignIn() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInForm />
    </Suspense>
  );
}