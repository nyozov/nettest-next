"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Button,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  TextField,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useAuth } from "../context/AuthContext";

const apiUrl = "http://localhost:5259/api";

interface InviteDetails {
  code: string;
  sentToEmail: string | null;
  expiresAt: string;
  unit: {
    id: number;
    unitNumber: number;
    property: {
      id: number;
      name: string;
      address: string;
    };
  };
}

function InviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { acceptToken } = useAuth();
  const code = useMemo(() => searchParams.get("code") ?? "", [searchParams]);
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(code));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      return;
    }

    fetch(`${apiUrl}/invites/${encodeURIComponent(code)}`)
      .then(async (response) => {
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Invite could not be loaded.");
        }

        return response.json() as Promise<InviteDetails>;
      })
      .then(setInvite)
      .catch((loadError) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Invite could not be loaded.",
        );
      })
      .finally(() => setIsLoading(false));
  }, [code]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!invite) return;

    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const response = await fetch(
        `${apiUrl}/invites/${encodeURIComponent(invite.code)}/redeem`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        },
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Could not create your account.");
      }

      const { token } = (await response.json()) as { token: string };
      acceptToken(token);
      router.replace("/tenant");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not create your account.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f6f3ed] px-5 py-6 text-black sm:px-8">
      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-black text-white">
            <Icon icon="gravity-ui:house" className="size-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight">NestOps</span>
        </Link>
        <Link href="/auth" className="text-sm text-black/55 hover:text-black">
          Sign in
        </Link>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 py-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <h1 className="mt-3 max-w-xl text-5xl font-semibold leading-tight tracking-tight">
            Create your account for this unit.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-black/58">
            Use the invite from your email to connect your account to the right
            property and unit.
          </p>
        </div>

        <div className="rounded-[2rem] bg-white p-5 shadow-sm sm:p-6">
          {!code ? (
            <div>
              <p className="text-sm text-danger">Invite code is missing.</p>
              <Link href="/auth">
                <Button className="mt-5" variant="secondary">
                  Back to sign in
                </Button>
              </Link>
            </div>
          ) : isLoading ? (
            <p className="text-sm text-black/55">Loading invite...</p>
          ) : error && !invite ? (
            <div>
              <p className="text-sm text-danger">{error}</p>
              <Link href="/auth">
                <Button className="mt-5" variant="secondary">
                  Back to sign in
                </Button>
              </Link>
            </div>
          ) : invite ? (
            <>
              <div className="rounded-3xl bg-[#eef6ff] p-5">
                <p className="text-xs text-black/45">You were invited to</p>
                <h2 className="mt-2 text-2xl font-semibold">
                  {invite.unit.property.name}
                </h2>
                <p className="mt-1 text-sm text-black/55">
                  {invite.unit.property.address}
                </p>
                <div className="mt-5 flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                  <span className="text-sm text-black/45">Unit</span>
                  <span className="text-lg font-semibold">
                    {invite.unit.unitNumber}
                  </span>
                </div>
              </div>

              {error && <p className="mt-4 text-sm text-danger">{error}</p>}

              <Form
                className="mt-6"
                render={(props) => <form {...props} />}
                onSubmit={handleSubmit}
              >
                <div className="space-y-4">
                  <TextField
                    isRequired
                    name="email"
                    type="email"
                    defaultValue={invite.sentToEmail ?? ""}
                    isReadOnly={Boolean(invite.sentToEmail)}
                  >
                    <Label>Email</Label>
                    <Input placeholder="tenant@example.com" />
                    {invite.sentToEmail && (
                      <Description>
                        This invite is tied to the email it was sent to.
                      </Description>
                    )}
                    <FieldError />
                  </TextField>

                  <TextField
                    isRequired
                    name="password"
                    type="password"
                    validate={(value) =>
                      value.length < 8
                        ? "Password must be at least 8 characters"
                        : null
                    }
                  >
                    <Label>Password</Label>
                    <Input placeholder="Create a password" />
                    <FieldError />
                  </TextField>
                </div>

                <Button className="mt-5 w-full" type="submit" isDisabled={isSubmitting}>
                  {isSubmitting ? "Creating account..." : "Create account"}
                  {!isSubmitting && (
                    <Icon icon="gravity-ui:arrow-right" className="size-4" />
                  )}
                </Button>
              </Form>
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f6f3ed] p-6 text-sm text-black/55">
          Loading invite...
        </main>
      }
    >
      <InviteContent />
    </Suspense>
  );
}
