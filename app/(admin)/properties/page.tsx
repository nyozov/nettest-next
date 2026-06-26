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

export default function PropertiesPage() {
  const apiFetch = useApiFetch();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set());
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "id",
    direction: "ascending",
  });

  useEffect(() => {
    apiFetch("http://localhost:5259/api/properties")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch properties");
        return res.json();
      })
      .then(setProperties)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [apiFetch]);

  const sortedProperties = useMemo(() => {
    return [...properties].sort((a, b) => {
      const column = sortDescriptor.column as keyof Property;
      const first = String(a[column] ?? "");
      const second = String(b[column] ?? "");
      let cmp = first.localeCompare(second);
      if (sortDescriptor.direction === "descending") cmp *= -1;
      return cmp;
    });
  }, [properties, sortDescriptor]);

  if (loading) return <p className="p-6">Loading...</p>;
  if (error) return <p className="p-6 text-red-500">{error}</p>;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Properties</h1>
        <Chip size="sm" variant="soft">
          {properties.length} total
        </Chip>
      </div>

      <Table>
        <Table.ScrollContainer>
          <Table.Content
            aria-label="Properties table"
            className="min-w-200"
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
              <Table.Column allowsSorting id="name">
                {({ sortDirection }) => (
                  <SortableColumnHeader sortDirection={sortDirection}>
                    Property
                  </SortableColumnHeader>
                )}
              </Table.Column>
              <Table.Column allowsSorting id="address">
                {({ sortDirection }) => (
                  <SortableColumnHeader sortDirection={sortDirection}>
                    Address
                  </SortableColumnHeader>
                )}
              </Table.Column>
              <Table.Column allowsSorting id="landlordId">
                {({ sortDirection }) => (
                  <SortableColumnHeader sortDirection={sortDirection}>
                    Landlord
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
              {sortedProperties.map((property) => (
                <Table.Row key={property.id} id={property.id}>
                  <Table.Cell className="pr-0" />
                  <Table.Cell className="font-medium">#{property.id}</Table.Cell>
                  <Table.Cell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{property.name}</span>
                      <span className="text-xs text-muted">
                        Landlord #{property.landlordId}
                      </span>
                    </div>
                  </Table.Cell>
                  <Table.Cell className="text-sm">{property.address}</Table.Cell>
                  <Table.Cell>
                    <div className="flex flex-col">
                      <span className="text-sm">
                        {property.landlord?.email ?? "Unknown landlord"}
                      </span>
                      <span className="text-xs text-muted">
                        {property.landlord?.role ?? "Landlord"}
                      </span>
                    </div>
                  </Table.Cell>
                  <Table.Cell className="text-sm text-muted">
                    {new Date(property.createdAt).toLocaleDateString()}
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
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
    </div>
  );
}
