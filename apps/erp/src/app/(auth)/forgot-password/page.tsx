"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: form.get("username"),
        portal: form.get("portal") || "staff",
      }),
    });
    setPending(false);
    if (!response.ok) {
      setError("Could not start a reset. Try again later.");
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="em-card w-full max-w-md p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brass)]">
          Campus desk
        </p>
        <h1 className="font-display mt-2 text-4xl">Forgot password</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          If the account exists, a 15-minute set-password token is issued. We
          never use a shared default password.
        </p>
        {sent ? (
          <p className="mt-6 text-sm">
            If that username is active, a reset was created. Check with your
            administrator for the invite link.
          </p>
        ) : (
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
              <Input id="username" name="username" required />
            </div>
            {error ? (
              <p className="text-sm text-[var(--stamp)]" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Sending…" : "Send reset"}
            </Button>
          </form>
        )}
        <p className="mt-6 text-sm">
          <Link href="/login" className="underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
