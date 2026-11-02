"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <SetPasswordForm />
    </Suspense>
  );
}

function SetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (password !== confirm) {
      setPending(false);
      setError("Passwords do not match.");
      return;
    }
    const response = await fetch("/api/v1/auth/set-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: form.get("token"), password }),
    });
    setPending(false);
    if (!response.ok) {
      setError("This link is invalid or expired.");
      return;
    }
    setDone(true);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="em-card w-full max-w-md p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brass)]">
          Campus desk
        </p>
        <h1 className="font-display mt-2 text-4xl">Set password</h1>
        {done ? (
          <p className="mt-6 text-sm">
            Password saved.{" "}
            <Link href="/login" className="underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <input type="hidden" name="token" value={token} />
            <div>
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                minLength={8}
                required
              />
            </div>
            <div>
              <Label htmlFor="confirm">Confirm</Label>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                minLength={8}
                required
              />
            </div>
            {error ? (
              <p className="text-sm text-[var(--stamp)]" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={pending || !token}>
              {pending ? "Saving…" : "Save password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
