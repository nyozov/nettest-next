"use client";

import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) router.replace("/");
    else if (user.role !== "Admin") router.replace("/");
  }, [router, user, isLoading]);

  if (isLoading || !user || user.role !== "Admin") {
    return <p className="p-6 text-sm text-muted">Redirecting...</p>;
  }

  return <>{children}</>;
}
