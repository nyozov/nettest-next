"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Avatar, Button, Chip } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useAuth } from "./context/AuthContext";

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (user?.role === "Admin") router.replace("/users");
    else if (user?.role === "Landlord")
      router.replace("/landlord/properties");
  }, [router, user, isLoading]);

  return (
    <main>
      <section className="">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.96)_0%,rgba(255,255,255,0.74)_42%,rgba(255,255,255,0.5)_100%)]" />

        <div className="relative z-10 flex min-h-full w-full flex-col px-6 py-5 sm:px-10 lg:px-12">
          <header className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-xl bg-black text-white">
                <Icon icon="gravity-ui:house" className="size-4" />
              </div>
              <span className="text-sm font-semibold tracking-tight">NestOps</span>
            </Link>

            <nav className="hidden rounded-full border border-black/5 bg-white/78 px-2 py-1 shadow-sm backdrop-blur md:flex">
              {["Home", "Portfolio", "Work Orders", "Insights", "Pricing"].map(
                (item, index) => (
                  <a
                    key={item}
                    href={index === 0 ? "/" : "#"}
                    className="rounded-full px-4 py-2 text-xs text-black/70 transition hover:bg-black hover:text-white"
                  >
                    {item}
                  </a>
                ),
              )}
            </nav>

            <Link href="/auth">
              <Button className="rounded-full bg-black px-5 text-white" size="sm">
                Get Started
                <Icon icon="gravity-ui:arrow-right" className="size-4" />
              </Button>
            </Link>
          </header>

          <div className="relative grid flex-1 items-center gap-8 py-10 lg:grid-cols-[0.95fr_1.35fr] lg:py-0">
            <div className="relative z-20 max-w-sm lg:pt-24">
              <p className="mb-5 text-xs leading-5 text-black/70">
                Run every property from one clean command center with leases,
                units, requests, owners, and tenant activity connected in real time.
              </p>
              <Link
                href="/auth"
                className="inline-flex items-center gap-2 border-b border-black pb-1 text-xs font-medium"
              >
                Launch Dashboard
                <Icon icon="gravity-ui:arrow-up-right" className="size-3.5" />
              </Link>
            </div>

            <div className="relative min-h-130 lg:min-h-162.5">


              <div className="absolute inset-x-0 bottom-0 top-8 overflow-hidden rounded-[22px] lg:inset-x-8 lg:top-28">
                <Image
                  alt="Modern managed property"
                  fill
                  priority
                  sizes="(min-width: 1024px) 760px, 100vw"
                  className="size-full object-cover object-center"
                  src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1500&q=85"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0)_42%,rgba(255,255,255,0.62)_100%)]" />
              </div>

              <div className="absolute bottom-7 left-0 z-40 w-44 rounded-2xl border border-white/70 bg-white/74 p-4 shadow-[0_20px_55px_rgba(15,23,42,0.15)] backdrop-blur-md sm:left-4">
                <p className="text-3xl font-light">+500</p>
                <p className="mt-2 text-[11px] leading-4 text-black/55">
                  units monitored across occupancy, maintenance, and rent flow
                </p>
                <div className="mt-4 flex -space-x-2">
                  {["A", "M", "S", "R"].map((initial) => (
                    <Avatar key={initial} className="border-2 border-white" size="sm">
                      <Avatar.Fallback>{initial}</Avatar.Fallback>
                    </Avatar>
                  ))}
                </div>
              </div>

              <div className="absolute right-0 top-[39%] z-40 w-56 rounded-2xl border border-white/80 bg-white/76 p-4 shadow-[0_22px_65px_rgba(15,23,42,0.16)] backdrop-blur-md sm:right-8">
                <div className="mb-6 flex items-center justify-between">
                  <p className="text-sm font-medium">Portfolio Health</p>
                  <Icon icon="gravity-ui:shield-check" className="size-4" />
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] text-black/40">Open requests</p>
                    <div className="mt-1 flex items-end gap-2">
                      <span className="text-2xl font-light">12</span>
                      <span className="pb-1 text-[11px] text-emerald-600">-18%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] text-black/40">Occupancy</p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-base">94%</span>
                      <Chip size="sm" variant="soft">
                        Stable
                      </Chip>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute left-[45%] top-[58%] z-40 hidden size-6 items-center justify-center rounded-full border border-white bg-black text-white shadow-lg sm:flex">
                <Icon icon="gravity-ui:plus" className="size-3" />
              </div>
            </div>
          </div>

          
        </div>
      </section>
    </main>
  );
}
