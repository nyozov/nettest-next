"use client";

import Script from "next/script";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Description,
  FieldError,
  Form,
  Input,
  InputOTP,
  Label,
  Link,
  TextField,
} from "@heroui/react";
import { useAuth } from "../context/AuthContext";

type Mode = "login" | "register" | "verify";

const apiUrl = "http://localhost:5259/api";
const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleAccountsId {
  initialize: (options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      theme: "outline" | "filled_blue" | "filled_black";
      size: "large" | "medium" | "small";
      text: "signin_with" | "signup_with" | "continue_with" | "signin";
      width?: number;
    },
  ) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsId;
      };
    };
  }
}

export default function AuthForm() {
  const { acceptToken, login } = useAuth();
  const router = useRouter();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError(null);
    setSuccessMessage(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      if (mode === "login") {
        const user = await login(email, password);
        setSuccessMessage("Logged in successfully!");
        routeUser(user.role);
      } else {
        const res = await fetch(`${apiUrl}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (res.status === 409) {
          setServerError("An account with that email already exists.");
          return;
        }
        if (!res.ok) {
          const message = await res.text();
          setServerError(message || "Something went wrong. Please try again.");
          return;
        }

        setPendingEmail(email);
        setVerificationCode("");
        setSuccessMessage("We sent a confirmation code to your email.");
        setMode("verify");
      }
    } catch (err: unknown) {
      setServerError(
        err instanceof Error ? err.message : "Could not reach the server.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const res = await fetch(`${apiUrl}/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: pendingEmail,
          code: verificationCode,
        }),
      });

      if (!res.ok) {
        const message = await res.text();
        setServerError(message || "Invalid or expired confirmation code.");
        return;
      }

      const { token } = await res.json();
      const user = acceptToken(token);
      routeUser(user.role);
    } catch (err: unknown) {
      setServerError(
        err instanceof Error ? err.message : "Could not reach the server.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setServerError(null);
    setSuccessMessage(null);
    setResending(true);

    try {
      const res = await fetch(`${apiUrl}/auth/resend-confirmation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail }),
      });

      if (!res.ok) {
        const message = await res.text();
        setServerError(message || "Could not resend the code.");
        return;
      }

      setVerificationCode("");
      setSuccessMessage("We sent a new confirmation code.");
    } catch (err: unknown) {
      setServerError(
        err instanceof Error ? err.message : "Could not reach the server.",
      );
    } finally {
      setResending(false);
    }
  };

  const handleGoogleCredential = async (response: GoogleCredentialResponse) => {
    if (!response.credential) {
      setServerError("Google sign-in did not return a credential.");
      return;
    }

    setServerError(null);
    setSuccessMessage(null);
    setGoogleLoading(true);

    try {
      const res = await fetch(`${apiUrl}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: response.credential }),
      });

      if (!res.ok) {
        setServerError("Google sign-in failed. Please try again.");
        return;
      }

      const { token } = await res.json();
      const user = acceptToken(token);
      routeUser(user.role);
    } catch (err: unknown) {
      setServerError(
        err instanceof Error ? err.message : "Could not reach the server.",
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const renderGoogleButton = () => {
    if (!googleClientId || !googleButtonRef.current || !window.google) return;

    googleButtonRef.current.innerHTML = "";
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleGoogleCredential,
    });
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: "outline",
      size: "large",
      text: mode === "login" ? "signin_with" : "signup_with",
      width: 384,
    });
  };

  const routeUser = (role: string) => {
    router.replace(
      role === "Admin"
        ? "/users"
        : role === "Landlord"
          ? "/landlord/properties"
          : "/tenant",
    );
  };

  const maskedEmail = maskEmail(pendingEmail);

  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center p-6">
      {googleClientId && (
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onLoad={renderGoogleButton}
        />
      )}
      <div className="flex w-full max-w-md flex-col gap-4">
        {mode === "verify" ? (
          <Form
            className="flex w-96 flex-col gap-4"
            render={(props) => <form {...props} />}
            onSubmit={handleVerifyEmail}
          >
            {serverError && (
              <p className="text-sm text-danger">{serverError}</p>
            )}
            {successMessage && (
              <p className="text-sm text-success">{successMessage}</p>
            )}

            <div className="flex w-[280px] flex-col gap-2">
              <div className="flex flex-col gap-1">
                <Label>Verify account</Label>
                <p className="text-sm text-muted">
                  We&apos;ve sent a code to {maskedEmail}
                </p>
              </div>
              <InputOTP
                maxLength={6}
                value={verificationCode}
                onChange={setVerificationCode}
              >
                <InputOTP.Group>
                  <InputOTP.Slot index={0} />
                  <InputOTP.Slot index={1} />
                  <InputOTP.Slot index={2} />
                </InputOTP.Group>
                <InputOTP.Separator />
                <InputOTP.Group>
                  <InputOTP.Slot index={3} />
                  <InputOTP.Slot index={4} />
                  <InputOTP.Slot index={5} />
                </InputOTP.Group>
              </InputOTP>
              <div className="flex items-center gap-[5px] px-1 pt-1">
                <p className="text-sm text-muted">
                  Didn&apos;t receive a code?
                </p>
                <Link
                  className="text-foreground underline"
                  href="#"
                  onPress={handleResendCode}
                >
                  {resending ? "Sending..." : "Resend"}
                </Link>
              </div>
            </div>

            <Button
              className="w-full"
              type="submit"
              isDisabled={loading || verificationCode.length !== 6}
            >
              {loading ? "Verifying..." : "Verify account"}
            </Button>
            <Button
              className="w-full"
              type="button"
              variant="secondary"
              onPress={() => {
                setMode("register");
                setVerificationCode("");
                setServerError(null);
                setSuccessMessage(null);
              }}
            >
              Back to sign up
            </Button>
          </Form>
        ) : (
          <Form
            className="flex w-96 flex-col gap-4"
            render={(props) => <form {...props} />}
            onSubmit={handleSubmit}
          >
            {serverError && (
              <p className="text-sm text-danger">{serverError}</p>
            )}
            {successMessage && (
              <p className="text-sm text-success">{successMessage}</p>
            )}

            {googleClientId ? (
              <>
                <div
                  ref={googleButtonRef}
                  className={googleLoading ? "pointer-events-none opacity-60" : ""}
                />
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-divider" />
                  <span className="text-xs text-muted">or</span>
                  <div className="h-px flex-1 bg-divider" />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted">
                Add NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable Google sign-in.
              </p>
            )}

            <TextField
              isRequired
              name="email"
              type="email"
              validate={(value) => {
                if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value))
                  return "Please enter a valid email address";
                return null;
              }}
            >
              <Label>Email</Label>
              <Input placeholder="john@example.com" />
              <FieldError />
            </TextField>

            <TextField
              isRequired
              name="password"
              type="password"
              validate={(value) => {
                if (mode === "register") {
                  if (value.length < 8)
                    return "Password must be at least 8 characters";
                  if (!/[A-Z]/.test(value))
                    return "Password must contain at least one uppercase letter";
                  if (!/[0-9]/.test(value))
                    return "Password must contain at least one number";
                }
                return null;
              }}
            >
              <Label>Password</Label>
              <Input placeholder="Enter your password" />
              {mode === "register" && (
                <Description>
                  Must be at least 8 characters with 1 uppercase and 1 number
                </Description>
              )}
              <FieldError />
            </TextField>

            <div className="flex gap-2">
              <Button type="submit" isDisabled={loading}>
                {loading
                  ? "Loading..."
                  : mode === "login"
                    ? "Sign in"
                    : "Create account"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onPress={() => {
                  setMode(mode === "login" ? "register" : "login");
                  setServerError(null);
                  setSuccessMessage(null);
                }}
              >
                {mode === "login" ? "Sign up instead" : "Sign in instead"}
              </Button>
            </div>
          </Form>
        )}
      </div>
    </div>
  );
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;

  return `${name.charAt(0)}${"*".repeat(Math.max(3, name.length - 1))}@${domain}`;
}
