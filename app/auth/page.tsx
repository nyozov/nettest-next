"use client";

import { useState } from "react";
import {
  Button,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  TextField,
} from "@heroui/react";
import { useAuth } from "../context/AuthContext";

type Mode = "login" | "register";

export default function AuthForm() {
  const { login } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
        await login(email, password);
        setSuccessMessage("Logged in successfully!");
      } else {
        const res = await fetch("http://localhost:5259/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, role: "Landlord" }),
        });

        if (res.status === 409) {
          setServerError("An account with that email already exists.");
          return;
        }
        if (!res.ok) {
          setServerError("Something went wrong. Please try again.");
          return;
        }

        setSuccessMessage("Account created! You can now log in.");
        setMode("login");
      }
    } catch (err: unknown) {
      setServerError(
        err instanceof Error ? err.message : "Could not reach the server.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col gap-4">
        <Form
          className="flex w-96 flex-col gap-4"
          render={(props) => <form {...props} />}
          onSubmit={handleSubmit}
        >
          {serverError && <p className="text-red-500 text-sm">{serverError}</p>}
          {successMessage && (
            <p className="text-green-500 text-sm">{successMessage}</p>
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
      </div>
    </div>
  );
}
