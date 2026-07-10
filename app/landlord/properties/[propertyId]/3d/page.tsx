"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button, Chip } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useEffect, useMemo, useState } from "react";
import type {
  BuildingRequest,
  BuildingUnit,
} from "@/app/components/PropertyBuilding3D";
import { useApiFetch } from "@/app/context/AuthContext";

const PropertyBuilding3D = dynamic(
  () => import("@/app/components/PropertyBuilding3D"),
  {
    ssr: false,
    loading: () => (
      <div className="flex size-full items-center justify-center text-sm text-muted">
        Preparing 3D view...
      </div>
    ),
  },
);

interface Property {
  id: number;
  name: string;
  address: string;
  landlordId: number;
  createdAt: string;
}

interface UserSummary {
  id: number;
  email: string;
  role: string;
  createdAt: string;
}

interface Unit extends BuildingUnit {
  tenants: UserSummary[];
  createdAt: string;
}

interface MaintenanceRequest extends BuildingRequest {
  title: string;
  description: string;
  propertyId: number;
  propertyName: string;
  unitNumber: number;
  createdAt: string;
}

const apiUrl = "http://localhost:5259/api";

export default function Property3DPage() {
  const apiFetch = useApiFetch();
  const params = useParams<{ propertyId: string }>();
  const propertyId = Number(params.propertyId);
  const [property, setProperty] = useState<Property | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch(`${apiUrl}/properties`)
      .then((response) => {
        if (!response.ok) throw new Error("Could not load this property.");
        return response.json() as Promise<Property[]>;
      })
      .then(async (properties) => {
        const currentProperty = properties.find(
          (candidate) => candidate.id === propertyId,
        );

        if (!currentProperty) throw new Error("Property not found.");

        const [unitsResponse, requestsResponse] = await Promise.all([
          apiFetch(`${apiUrl}/properties/${propertyId}/units`),
          apiFetch(`${apiUrl}/maintenance-requests`),
        ]);

        if (!unitsResponse.ok)
          throw new Error("Could not load this property's units.");

        const loadedUnits = (await unitsResponse.json()) as Unit[];
        const loadedRequests = requestsResponse.ok
          ? ((await requestsResponse.json()) as MaintenanceRequest[])
          : [];

        return {
          property: currentProperty,
          units: loadedUnits,
          requests: loadedRequests.filter(
            (request) => request.propertyId === propertyId,
          ),
        };
      })
      .then((data) => {
        setProperty(data.property);
        setUnits(data.units);
        setRequests(data.requests);
      })
      .catch((loadError: unknown) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load the 3D property view.",
        );
      })
      .finally(() => setIsLoading(false));
  }, [apiFetch, propertyId]);

  const selectedRequests = useMemo(
    () =>
      selectedUnit
        ? requests.filter(
            (request) =>
              request.unitId === selectedUnit.id &&
              (request.status === 0 || request.status === 1),
          )
        : [],
    [requests, selectedUnit],
  );
  const selectedTenants = selectedUnit?.tenants ?? [];

  const handleSelectUnit = (unit: BuildingUnit | null) => {
    const selectedFullUnit = unit
      ? units.find((candidate) => candidate.id === unit.id) ?? null
      : null;

    setSelectedUnit(selectedFullUnit);
  };

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-6">
        <div className="h-9 w-52 animate-pulse rounded-lg bg-default/30" />
        <div className="mt-6 h-[min(72vh,720px)] min-h-130 animate-pulse rounded-2xl bg-default/30" />
      </main>
    );
  }

  if (error || !property) {
    return (
      <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-6">
        <Link href="/landlord/properties">
          <Button size="sm" variant="tertiary">
            <Icon icon="gravity-ui:arrow-left" className="size-4" />
            Back to properties
          </Button>
        </Link>
        <div className="mt-6 rounded-2xl border border-danger/30 bg-danger/5 p-6">
          <p className="text-sm text-danger">
            {error ?? "Property not found."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-6 sm:py-8">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/landlord/properties"
            className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted transition hover:text-foreground"
          >
            <Icon icon="gravity-ui:arrow-left" className="size-3.5" />
            Properties
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            {property.name}
          </h1>
          <p className="mt-1 text-sm text-muted">{property.address}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Chip size="sm" variant="soft">
            {units.length} {units.length === 1 ? "unit" : "units"}
          </Chip>
          <Chip size="sm" variant="soft">
            {requests.filter(
              (request) => request.status === 0 || request.status === 1,
            ).length}{" "}
            active requests
          </Chip>
        </div>
      </div>

      <div className="relative h-[min(72vh,720px)] min-h-130 overflow-hidden rounded-2xl border border-default/70 bg-default/20 shadow-sm">
        <PropertyBuilding3D
          units={units}
          requests={requests}
          selectedUnitId={selectedUnit?.id ?? null}
          onSelectUnit={handleSelectUnit}
        />

        <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap gap-2">
          <div className="rounded-full bg-surface/90 px-3 py-1.5 text-xs shadow-sm backdrop-blur">
            Drag to rotate · Scroll to zoom
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-4 left-4 flex flex-wrap gap-2 rounded-xl bg-surface/90 p-2.5 text-xs shadow-sm backdrop-blur">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-zinc-300" />
            Clear
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-amber-500" />
            Open
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-blue-500" />
            In progress
          </span>
        </div>

        {selectedUnit && (
          <aside className="absolute inset-x-3 bottom-3 max-h-[46%] overflow-y-auto rounded-2xl border border-default/70 bg-surface/95 p-5 shadow-xl backdrop-blur sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-4 sm:max-h-[calc(100%-2rem)] sm:w-80">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-muted">
                  Selected unit
                </p>
                <h2 className="mt-1 text-xl font-semibold">
                  Unit {selectedUnit.unitNumber}
                </h2>
              </div>
              <Button
                isIconOnly
                aria-label="Close unit details"
                size="sm"
                variant="tertiary"
                onPress={() => setSelectedUnit(null)}
              >
                <Icon icon="gravity-ui:xmark" className="size-4" />
              </Button>
            </div>

            <div className="mt-5 border-t border-default/60 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Current tenants</p>
                <Chip
                  color={selectedTenants.length > 0 ? "success" : "default"}
                  size="sm"
                  variant="soft"
                >
                  {selectedTenants.length > 0 ? "Occupied" : "Vacant"}
                </Chip>
              </div>

              {selectedTenants.length === 0 ? (
                <p className="mt-3 text-sm text-muted">
                  No tenant assigned to this unit yet.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {selectedTenants.map((tenant) => (
                    <div
                      key={tenant.id}
                      className="rounded-xl bg-default/30 px-3 py-2"
                    >
                      <p className="truncate text-sm font-medium">
                        {tenant.email}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {tenant.role || "Assigned user"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 border-t border-default/60 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Active maintenance</p>
                <Chip size="sm" variant="soft">
                  {selectedRequests.length}
                </Chip>
              </div>

              {selectedRequests.length === 0 ? (
                <p className="mt-3 text-sm text-muted">
                  No open maintenance requests for this unit.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {selectedRequests.map((request) => (
                    <div
                      key={request.id}
                      className="rounded-xl bg-default/30 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">
                          {request.title}
                        </p>
                        <span
                          className={`size-2 shrink-0 rounded-full ${
                            request.status === 0
                              ? "bg-amber-500"
                              : "bg-blue-500"
                          }`}
                        />
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                        {request.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {units.length === 0 && (
        <p className="mt-3 text-center text-xs text-muted">
          This generic building will become interactive as units are added.
        </p>
      )}
    </main>
  );
}
