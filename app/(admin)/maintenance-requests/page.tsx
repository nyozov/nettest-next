"use client";

import type { Selection, SortDescriptor } from "@heroui/react";
import { Button, Chip, Table, cn } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useEffect, useMemo, useState } from "react";
import { useApiFetch } from "@/app/context/AuthContext";

interface User {
  id: number;
  email: string;
  role: string;
  createdAt: string;
}

interface Property {
  id: number;
  name: string;
  address: string;
  landlordId: number;
  landlord: User | null;
  createdAt: string;
}

interface Unit {
  id: number;
  unitNumber: number;
  propertyId: number;
  property: Property | null;
  createdAt: string;
}

interface MaintenanceRequest {
  id: number;
  title: string;
  description: string;
  status: number | string;
  unitId: number;
  createdByUserId: number;
  createdByUser: User | null;
  createdAt: string;
  completedAt: string | null;
  propertyName?: string;
  unitNumber?: number;
}

function SortableColumnHeader({
  children,
  sortDirection,
}: {
  children: React.ReactNode;
  sortDirection?: "ascending" | "descending";
}) {
  return (
    <span className="flex items-center justify-between">
      {children}
      {!!sortDirection && (
        <Icon
          icon="gravity-ui:chevron-up"
          className={cn(
            "size-3 transform transition-transform duration-100 ease-out",
            sortDirection === "descending" ? "rotate-180" : "",
          )}
        />
      )}
    </span>
  );
}

const statusLabel: Record<number, string> = {
  0: "Open",
  1: "In progress",
  2: "Completed",
  3: "Cancelled",
};

function getStatus(request: MaintenanceRequest) {
  if (typeof request.status === "string") return request.status;
  return statusLabel[request.status] ?? "Unknown";
}

export default function MaintenanceRequestsPage() {
  const apiFetch = useApiFetch();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set());
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "createdAt",
    direction: "descending",
  });

  useEffect(() => {
    let ignore = false;

    async function fetchMaintenanceRequests() {
      try {
        const propertiesRes = await apiFetch("http://localhost:5259/api/properties");
        if (!propertiesRes.ok) throw new Error("Failed to fetch properties");

        const properties = (await propertiesRes.json()) as Property[];
        const unitsByProperty = await Promise.all(
          properties.map(async (property) => {
            const unitsRes = await apiFetch(
              `http://localhost:5259/api/properties/${property.id}/units`,
            );
            if (!unitsRes.ok) throw new Error("Failed to fetch units");
            const units = (await unitsRes.json()) as Unit[];
            return units.map((unit) => ({
              ...unit,
              property: unit.property ?? property,
            }));
          }),
        );

        const units = unitsByProperty.flat();
        const requestsByUnit = await Promise.all(
          units.map(async (unit) => {
            const requestsRes = await apiFetch(
              `http://localhost:5259/api/units/${unit.id}/requests`,
            );
            if (!requestsRes.ok) throw new Error("Failed to fetch maintenance requests");
            const unitRequests = (await requestsRes.json()) as MaintenanceRequest[];
            return unitRequests.map((request) => ({
              ...request,
              propertyName: unit.property?.name,
              unitNumber: unit.unitNumber,
            }));
          }),
        );

        if (!ignore) setRequests(requestsByUnit.flat());
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to fetch requests");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    fetchMaintenanceRequests();

    return () => {
      ignore = true;
    };
  }, [apiFetch]);

  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => {
      const column = sortDescriptor.column as keyof MaintenanceRequest;
      const first = String(a[column] ?? "");
      const second = String(b[column] ?? "");
      let cmp = first.localeCompare(second);
      if (sortDescriptor.direction === "descending") cmp *= -1;
      return cmp;
    });
  }, [requests, sortDescriptor]);

  if (loading) return <p className="p-6">Loading...</p>;
  if (error) return <p className="p-6 text-red-500">{error}</p>;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Maintenance Requests</h1>
        <Chip size="sm" variant="soft">
          {requests.length} total
        </Chip>
      </div>

      <Table>
        <Table.ScrollContainer>
          <Table.Content
            aria-label="Maintenance requests table"
            className="min-w-250"
            selectedKeys={selectedKeys}
            selectionMode="multiple"
            sortDescriptor={sortDescriptor}
            onSelectionChange={setSelectedKeys}
            onSortChange={setSortDescriptor}
          >
            <Table.Header>
              <Table.Column className="pr-0" />
              <Table.Column allowsSorting isRowHeader id="id">
                {({ sortDirection }) => (
                  <SortableColumnHeader sortDirection={sortDirection}>
                    ID
                  </SortableColumnHeader>
                )}
              </Table.Column>
              <Table.Column allowsSorting id="title">
                {({ sortDirection }) => (
                  <SortableColumnHeader sortDirection={sortDirection}>
                    Request
                  </SortableColumnHeader>
                )}
              </Table.Column>
              <Table.Column allowsSorting id="status">
                {({ sortDirection }) => (
                  <SortableColumnHeader sortDirection={sortDirection}>
                    Status
                  </SortableColumnHeader>
                )}
              </Table.Column>
              <Table.Column allowsSorting id="propertyName">
                {({ sortDirection }) => (
                  <SortableColumnHeader sortDirection={sortDirection}>
                    Property
                  </SortableColumnHeader>
                )}
              </Table.Column>
              <Table.Column allowsSorting id="unitNumber">
                {({ sortDirection }) => (
                  <SortableColumnHeader sortDirection={sortDirection}>
                    Unit
                  </SortableColumnHeader>
                )}
              </Table.Column>
              <Table.Column allowsSorting id="createdByUserId">
                {({ sortDirection }) => (
                  <SortableColumnHeader sortDirection={sortDirection}>
                    Created By
                  </SortableColumnHeader>
                )}
              </Table.Column>
              <Table.Column allowsSorting id="createdAt">
                {({ sortDirection }) => (
                  <SortableColumnHeader sortDirection={sortDirection}>
                    Created
                  </SortableColumnHeader>
                )}
              </Table.Column>
              <Table.Column className="text-end">Actions</Table.Column>
            </Table.Header>
            <Table.Body>
              {sortedRequests.map((request) => {
                const status = getStatus(request);

                return (
                  <Table.Row key={request.id} id={request.id}>
                    <Table.Cell className="pr-0" />
                    <Table.Cell className="font-medium">#{request.id}</Table.Cell>
                    <Table.Cell>
                      <div className="flex max-w-80 flex-col">
                        <span className="truncate text-sm font-medium">
                          {request.title}
                        </span>
                        <span className="truncate text-xs text-muted">
                          {request.description}
                        </span>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <Chip
                        color={status === "Completed" ? "success" : "default"}
                        size="sm"
                        variant="soft"
                      >
                        {status}
                      </Chip>
                    </Table.Cell>
                    <Table.Cell className="text-sm">
                      {request.propertyName ?? "Unknown property"}
                    </Table.Cell>
                    <Table.Cell className="text-sm">
                      {request.unitNumber ? `#${request.unitNumber}` : `ID ${request.unitId}`}
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex flex-col">
                        <span className="text-sm">
                          {request.createdByUser?.email ?? `User #${request.createdByUserId}`}
                        </span>
                        <span className="text-xs text-muted">
                          {request.createdByUser?.role ?? "Tenant"}
                        </span>
                      </div>
                    </Table.Cell>
                    <Table.Cell className="text-sm text-muted">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center justify-end gap-1">
                        <Button isIconOnly size="sm" variant="tertiary">
                          <Icon className="size-4" icon="gravity-ui:eye" />
                        </Button>
                        <Button isIconOnly size="sm" variant="tertiary">
                          <Icon className="size-4" icon="gravity-ui:pencil" />
                        </Button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
    </div>
  );
}
