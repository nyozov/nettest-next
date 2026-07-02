"use client";

import {
  Button,
  Chip,
  Input,
  Modal,
  TextField,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useEffect, useMemo, useState } from "react";
import { useApiFetch } from "@/app/context/AuthContext";

interface User {
  id: number;
  email: string;
  role: string;
  createdAt: string;
}

interface MaintenanceRequest {
  id: number;
  title: string;
  description: string;
  status: number;
  unitId: number;
  unitNumber: number;
  propertyId: number;
  propertyName: string;
  createdByUserId: number;
  createdByUser: User | null;
  createdAt: string;
  completedAt: string | null;
}

type RequestFilter = "all" | "open" | "inProgress" | "completed";

const requestsUrl = "http://localhost:5259/api/maintenance-requests";

const statusDetails: Record<
  number,
  { label: string; color: "default" | "success" | "danger" }
> = {
  0: { label: "Open", color: "default" },
  1: { label: "In progress", color: "default" },
  2: { label: "Completed", color: "success" },
  3: { label: "Cancelled", color: "danger" },
};

const filterOptions: Array<{ id: RequestFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "inProgress", label: "In progress" },
  { id: "completed", label: "Completed" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function LandlordMaintenanceRequestsPage() {
  const apiFetch = useApiFetch();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [selectedRequest, setSelectedRequest] =
    useState<MaintenanceRequest | null>(null);
  const [activeFilter, setActiveFilter] = useState<RequestFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch(requestsUrl)
      .then((response) => {
        if (!response.ok)
          throw new Error("Could not load maintenance requests.");
        return response.json() as Promise<MaintenanceRequest[]>;
      })
      .then(setRequests)
      .catch((loadError: unknown) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load maintenance requests.",
        );
      })
      .finally(() => setIsLoading(false));
  }, [apiFetch]);

  const counts = useMemo(
    () => ({
      open: requests.filter((request) => request.status === 0).length,
      inProgress: requests.filter((request) => request.status === 1).length,
      completed: requests.filter((request) => request.status === 2).length,
    }),
    [requests],
  );

  const filteredRequests = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesFilter =
        activeFilter === "all" ||
        (activeFilter === "open" && request.status === 0) ||
        (activeFilter === "inProgress" && request.status === 1) ||
        (activeFilter === "completed" && request.status === 2);

      const matchesSearch =
        !normalizedQuery ||
        request.title.toLowerCase().includes(normalizedQuery) ||
        request.description.toLowerCase().includes(normalizedQuery) ||
        request.propertyName.toLowerCase().includes(normalizedQuery) ||
        String(request.unitNumber).includes(normalizedQuery) ||
        request.createdByUser?.email.toLowerCase().includes(normalizedQuery);

      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, requests, searchQuery]);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
      <div className="mb-8">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-muted">
          Operations
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Maintenance</h1>
        <p className="mt-2 text-sm text-muted">
          Requests across every property and unit in your portfolio.
        </p>
      </div>

      {!isLoading && !error && (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          {[
            {
              label: "Open",
              value: counts.open,
              icon: "gravity-ui:circle-exclamation",
            },
            {
              label: "In progress",
              value: counts.inProgress,
              icon: "gravity-ui:clock",
            },
            {
              label: "Completed",
              value: counts.completed,
              icon: "gravity-ui:circle-check",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-2xl border border-default/70 bg-surface px-5 py-4 shadow-sm"
            >
              <div>
                <p className="text-xs text-muted">{item.label}</p>
                <p className="mt-1 text-2xl font-semibold">{item.value}</p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-default/40">
                <Icon icon={item.icon} className="size-4" />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1 rounded-xl bg-default/25 p-1">
          {filterOptions.map((filter) => (
            <Button
              key={filter.id}
              size="sm"
              variant={activeFilter === filter.id ? "secondary" : "tertiary"}
              onPress={() => setActiveFilter(filter.id)}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        <TextField
          aria-label="Search maintenance requests"
          className="w-full lg:max-w-xs"
          value={searchQuery}
          onChange={setSearchQuery}
        >
          <Input placeholder="Search property, unit, or request..." />
        </TextField>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-2xl bg-default/30"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-danger/30 bg-danger/5 p-6">
          <p className="text-sm text-danger">{error}</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-default p-8 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-default/40">
            <Icon icon="gravity-ui:wrench" className="size-5" />
          </div>
          <h2 className="font-medium">
            {requests.length === 0
              ? "No maintenance requests"
              : "No matching requests"}
          </h2>
          <p className="mt-2 max-w-sm text-sm text-muted">
            {requests.length === 0
              ? "Requests linked to your units will appear here."
              : "Try another status or clear your search."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-default/70 bg-surface shadow-sm">
          {filteredRequests.map((request, index) => {
            const status =
              statusDetails[request.status] ?? statusDetails[0];

            return (
              <article
                key={request.id}
                className={`flex flex-col gap-4 p-5 sm:flex-row sm:items-center ${
                  index > 0 ? "border-t border-default/60" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Chip
                      color={status.color}
                      size="sm"
                      variant="soft"
                    >
                      {status.label}
                    </Chip>
                    <span className="text-xs text-muted">
                      {request.propertyName} · Unit {request.unitNumber}
                    </span>
                  </div>
                  <h2 className="truncate text-sm font-medium">
                    {request.title}
                  </h2>
                  <p className="mt-1 line-clamp-1 text-sm text-muted">
                    {request.description}
                  </p>
                </div>

                <div className="flex shrink-0 items-center justify-between gap-5 sm:justify-end">
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-muted">
                      {formatDate(request.createdAt)}
                    </p>
                    <p className="mt-1 max-w-44 truncate text-xs text-muted">
                      {request.createdByUser?.email ??
                        `User #${request.createdByUserId}`}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => setSelectedRequest(request)}
                  >
                    View
                    <Icon
                      icon="gravity-ui:chevron-right"
                      className="size-3.5"
                    />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={selectedRequest !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setSelectedRequest(null);
        }}
      >
        <Modal.Backdrop>
          <Modal.Container placement="center" size="md">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              {selectedRequest && (
                <>
                  <Modal.Header>
                    <Modal.Icon>
                      <Icon icon="gravity-ui:wrench" className="size-5" />
                    </Modal.Icon>
                    <div className="min-w-0">
                      <Modal.Heading>
                        {selectedRequest.title}
                      </Modal.Heading>
                      <p className="mt-1 text-sm font-normal text-muted">
                        {selectedRequest.propertyName} · Unit{" "}
                        {selectedRequest.unitNumber}
                      </p>
                    </div>
                  </Modal.Header>
                  <Modal.Body className="gap-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip
                        color={
                          (
                            statusDetails[selectedRequest.status] ??
                            statusDetails[0]
                          ).color
                        }
                        size="sm"
                        variant="soft"
                      >
                        {
                          (
                            statusDetails[selectedRequest.status] ??
                            statusDetails[0]
                          ).label
                        }
                      </Chip>
                      <span className="text-xs text-muted">
                        Request #{selectedRequest.id}
                      </span>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                        Description
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-6">
                        {selectedRequest.description}
                      </p>
                    </div>

                    <div className="grid gap-4 rounded-xl bg-default/30 p-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-muted">Submitted by</p>
                        <p className="mt-1 text-sm font-medium">
                          {selectedRequest.createdByUser?.email ??
                            `User #${selectedRequest.createdByUserId}`}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted">Created</p>
                        <p className="mt-1 text-sm font-medium">
                          {formatDate(selectedRequest.createdAt)}
                        </p>
                      </div>
                      {selectedRequest.completedAt && (
                        <div>
                          <p className="text-xs text-muted">Completed</p>
                          <p className="mt-1 text-sm font-medium">
                            {formatDate(selectedRequest.completedAt)}
                          </p>
                        </div>
                      )}
                    </div>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button
                      variant="secondary"
                      onPress={() => setSelectedRequest(null)}
                    >
                      Close
                    </Button>
                  </Modal.Footer>
                </>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </main>
  );
}
