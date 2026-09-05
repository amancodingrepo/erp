"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const from = useSearchParams().get("from") ?? "/staff/dashboard";
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: form.get("username"),
        password: form.get("password"),
        portal: form.get("portal") || "staff",
      }),
    });
    setPending(false);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(
        payload.error === "rate_limited"
          ? "Too many attempts. Wait and try again."
          : "Username or password is wrong, or this login is disabled.",
      );
      return;
    }
    router.replace(from.startsWith("/student") ? from : "/staff/dashboard");
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md border border-[var(--rule)] bg-[var(--paper-2)] p-8 shadow-[8px_8px_0_#1b2a22]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brass)]">
          Campus desk
        </p>
        <h1 className="font-display mt-2 text-4xl">Sign in</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Staff, student, and parent portals share this gate. Access is scoped
          by role.
        </p>
        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <div>
            <Label htmlFor="portal">Portal</Label>
            <select
              id="portal"
              name="portal"
              defaultValue="staff"
              className="h-10 w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-sm"
            >
              <option value="staff">Staff</option>
              <option value="student">Student</option>
              <option value="parent">Parent</option>
            </select>
          </div>
          <div>
            <Label htmlFor="username">Username</Label>
            <Input id="username" name="username" autoComplete="username" required />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          {error ? (
            <p className="text-sm text-[var(--stamp)]" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Checking…" : "Enter desk"}
          </Button>
        </form>
      </div>
    </div>
  );
}
