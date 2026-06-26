"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@heroui/react";
import { useAuth } from "./context/AuthContext";

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (user?.role === "Admin") router.replace("/users");
  }, [router, user, isLoading]);

  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Nettest</h1>
          <p className="mt-2 text-sm text-muted">
            Manage properties, units, users, and maintenance requests.
          </p>
        </div>
        <Link href="/auth" className="w-fit">
          <Button>Sign in</Button>
        </Link>
      </div>
    </div>
  );
}
