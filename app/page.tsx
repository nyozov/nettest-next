"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import {
  LazyMotion,
  domAnimation,
  m,
  useScroll,
  useTransform,
} from "framer-motion";
import type { Variants } from "framer-motion";
import { useAuth } from "./context/AuthContext";
import { NestOpsLogo } from "./components/NestOpsLogo";
import type { BuildingUnit } from "./components/PropertyBuilding3D";

const LandingPortfolio3D = dynamic(
  () =>
    import("./components/PropertyBuilding3D").then(
      (module) => module.PortfolioProperties3D,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex size-full items-center justify-center bg-[#e8ece6] text-sm text-black/45">
        Preparing property scene
      </div>
    ),
  },
);

const landingBuildings = [
  {
    property: {
      id: 1,
      name: "Maple House",
      address: "123 Maple Street",
    },
    units: [
      { id: 101, unitNumber: 101, propertyId: 1 },
      { id: 102, unitNumber: 102, propertyId: 1 },
      { id: 201, unitNumber: 201, propertyId: 1 },
      { id: 202, unitNumber: 202, propertyId: 1 },
      { id: 301, unitNumber: 301, propertyId: 1 },
      { id: 302, unitNumber: 302, propertyId: 1 },
    ],
    requests: [
      { id: 1, status: 0, unitId: 101 },
      { id: 2, status: 1, unitId: 202 },
    ],
  },
  {
    property: {
      id: 2,
      name: "Cedar Walk",
      address: "48 Cedar Avenue",
    },
    units: [
      { id: 401, unitNumber: 101, propertyId: 2 },
      { id: 402, unitNumber: 102, propertyId: 2 },
      { id: 501, unitNumber: 201, propertyId: 2 },
      { id: 502, unitNumber: 202, propertyId: 2 },
    ],
    requests: [{ id: 3, status: 1, unitId: 501 }],
  },
];

const entrance: Variants = {
  hidden: { opacity: 0, y: 22, filter: "blur(12px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: "easeOut" },
  },
};

function LandingThreeWindow() {
  const [selectedUnit, setSelectedUnit] = useState<BuildingUnit | null>(
    landingBuildings[0].units[0],
  );

  return (
    <m.div
      className="relative w-full max-w-2xl"
      initial={{ opacity: 0, y: 36, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute -inset-4 rounded-[2.25rem] bg-white/14 blur-2xl" />
      <div className="relative overflow-hidden rounded-[2rem] border border-white/40 bg-white/82 p-2 text-black shadow-[0_32px_110px_rgba(9,14,28,0.38)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-black text-white">
              <NestOpsLogo className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">Live property scene</p>
              <p className="text-xs text-black/50">Rotate, select, inspect</p>
            </div>
          </div>
         
        </div>

        <div className="relative h-[26rem] overflow-hidden rounded-[1.6rem] bg-[#e8ece6] sm:h-[32rem]">
          <LandingPortfolio3D
            buildings={landingBuildings}
            selectedUnitId={selectedUnit?.id ?? null}
            onSelectUnit={setSelectedUnit}
            className="h-full min-h-full rounded-none border-0 bg-transparent shadow-none"
          />

          <m.div
            className="pointer-events-none absolute left-4 top-4 rounded-2xl border border-white/58 bg-white/78 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.18)] backdrop-blur-md"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <p className="text-xs text-black/45">Selected</p>
            <p className="mt-1 text-lg font-semibold">
              Unit {selectedUnit?.unitNumber ?? "none"}
            </p>
            <p className="mt-1 text-xs text-black/52">
              Invite and requests stay attached here.
            </p>
          </m.div>

          <m.div
            className="pointer-events-none absolute bottom-4 right-4 hidden w-52 rounded-2xl border border-white/58 bg-black/86 p-4 text-white shadow-[0_18px_50px_rgba(15,23,42,0.28)] backdrop-blur-md sm:block"
            animate={{ y: [0, 10, 0] }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.4,
            }}
          >
            <p className="text-xs text-white/45">Unit action</p>
            <div className="mt-3 rounded-xl bg-white/10 px-3 py-2">
              <p className="font-mono text-sm">XXXX-XXXX</p>
              <p className="mt-1 text-xs text-white/42">generated invite</p>
            </div>
          </m.div>
        </div>
      </div>
    </m.div>
  );
}

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const heroRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroImageScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const heroContentY = useTransform(scrollYProgress, [0, 1], [0, 76]);
  const heroSceneY = useTransform(scrollYProgress, [0, 1], [0, -46]);
  const heroSceneRotate = useTransform(scrollYProgress, [0, 1], [0, -3]);

  useEffect(() => {
    if (isLoading) return;
    if (user?.role === "Admin") router.replace("/users");
    else if (user?.role === "Landlord") router.replace("/landlord/properties");
    else if (user?.role === "Tenant") router.replace("/tenant");
  }, [router, user, isLoading]);

  return (
    <LazyMotion features={domAnimation}>
      <m.main className="bg-[#f6f3ed] text-black">
      <section ref={heroRef} className="relative overflow-hidden bg-black text-white">
        <m.div className="absolute inset-0" style={{ scale: heroImageScale }}>
          <Image
            alt="Modern apartment building"
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-54"
            src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1800&q=85"
          />
        </m.div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.88)_0%,rgba(0,0,0,0.58)_46%,rgba(0,0,0,0.18)_100%)]" />

        <div className="relative z-10 mx-auto flex min-h-[86svh] w-full max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
          <header className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-white text-black">
                <NestOpsLogo className="size-6" />
              </div>
              <span className="text-sm font-semibold tracking-tight">
                NestOps
              </span>
            </Link>

            <nav className="hidden rounded-full border border-white/14 bg-white/10 px-1.5 py-1 backdrop-blur-md md:flex">
              {[
                ["Workflow", "#workflow"],
                ["Features", "#features"],
                ["Roles", "#roles"],
              ].map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  className="rounded-full px-4 py-2 text-xs text-white/74 transition hover:bg-white hover:text-black"
                >
                  {label}
                </a>
              ))}
            </nav>

            <Link href="/auth">
              <Button className="rounded-full bg-white px-5 text-black" size="sm">
                Sign in
                <Icon icon="gravity-ui:arrow-right" className="size-4" />
              </Button>
            </Link>
          </header>

          <div className="grid flex-1 items-center gap-8 py-12 lg:grid-cols-[0.92fr_1.08fr] lg:py-14">
            <m.div className="max-w-2xl" style={{ y: heroContentY }}>
              
              <m.h1
                className="max-w-4xl text-5xl font-semibold leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl"
                variants={entrance}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.1 }}
              >
                Run properties from one operational workspace.
              </m.h1>
              <m.p
                className="mt-6 max-w-xl text-base leading-7 text-white/74 sm:text-lg"
                variants={entrance}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.2 }}
              >
                NestOps connects properties, units, tenant invites, and
                maintenance requests so day-to-day property work has a clear
                home.
              </m.p>

              <m.div
                className="mt-8 flex flex-col gap-3 sm:flex-row"
                variants={entrance}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.3 }}
              >
                <Link href="/auth">
                  <Button className="h-11 rounded-full bg-white px-6 text-black">
                    Launch dashboard
                    <Icon icon="gravity-ui:arrow-right" className="size-4" />
                  </Button>
                </Link>
                <a
                  href="#workflow"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/20 px-6 text-sm font-medium text-white transition hover:bg-white hover:text-black"
                >
                  See workflow
                  <Icon icon="gravity-ui:arrow-down" className="size-4" />
                </a>
              </m.div>
            </m.div>

            <m.div
              className="flex justify-center lg:justify-end"
              style={{ y: heroSceneY, rotate: heroSceneRotate }}
            >
              <LandingThreeWindow />
            </m.div>
          </div>
        </div>
      </section>

      
      </m.main>
    </LazyMotion>
  );
}
