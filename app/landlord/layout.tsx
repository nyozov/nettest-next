"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function LandlordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) router.replace("/auth");
    else if (user.role !== "Landlord") router.replace("/");
  }, [isLoading, router, user]);

  if (isLoading || !user || user.role !== "Landlord") {
    return <p className="p-6 text-sm text-muted">Redirecting...</p>;
  }

  return <>{children}</>;
}
