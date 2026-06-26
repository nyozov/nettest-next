"use client";

import type { Selection, SortDescriptor } from "@heroui/react";
import { Avatar, Button, Checkbox, Chip, Table, cn } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useEffect, useMemo, useState } from "react";
import { useApiFetch } from "@/app/context/AuthContext";

interface User {
  id: number;
  email: string;
  role: string;
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

export default function UsersPage() {
  const apiFetch = useApiFetch();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set());
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "id",
    direction: "ascending",
  });

  useEffect(() => {
    apiFetch("http://localhost:5259/api/users")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch users");
        return res.json();
      })
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [apiFetch]);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const col = sortDescriptor.column as keyof User;
      const first = String(a[col]);
      const second = String(b[col]);
      let cmp = first.localeCompare(second);
      if (sortDescriptor.direction === "descending") cmp *= -1;
      return cmp;
    });
  }, [users, sortDescriptor]);

  if (loading) return <p className="p-6">Loading...</p>;
  if (error) return <p className="p-6 text-red-500">{error}</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Users</h1>
      <Table>
        <Table.ScrollContainer>
          <Table.Content
            aria-label="Users table"
            className="min-w-175"
            selectedKeys={selectedKeys}
            selectionMode="multiple"
            sortDescriptor={sortDescriptor}
            onSelectionChange={setSelectedKeys}
            onSortChange={setSortDescriptor}
          >
            <Table.Header>
              <Table.Column className="pr-0">
                <Checkbox aria-label="Select all" slot="selection">
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                </Checkbox>
              </Table.Column>
              <Table.Column
                allowsSorting
                isRowHeader
                className="after:hidden"
                id="id"
              >
                {({ sortDirection }) => (
                  <SortableColumnHeader sortDirection={sortDirection}>
                    ID
                  </SortableColumnHeader>
                )}
              </Table.Column>
              <Table.Column allowsSorting id="email">
                {({ sortDirection }) => (
                  <SortableColumnHeader sortDirection={sortDirection}>
                    Email
                  </SortableColumnHeader>
                )}
              </Table.Column>
              <Table.Column allowsSorting id="role">
                {({ sortDirection }) => (
                  <SortableColumnHeader sortDirection={sortDirection}>
                    Role
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
              {sortedUsers.map((user) => (
                <Table.Row key={user.id} id={user.id}>
                  <Table.Cell className="pr-0">
                    <Checkbox
                      aria-label={`Select ${user.email}`}
                      slot="selection"
                      variant="secondary"
                    >
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                    </Checkbox>
                  </Table.Cell>
                  <Table.Cell className="font-medium">
                    <div className="flex items-center gap-2">#{user.id}</div>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center gap-3">
                      <Avatar size="sm">
                        <Avatar.Fallback>
                          {user.email[0].toUpperCase()}
                        </Avatar.Fallback>
                      </Avatar>

                      <span className="text-sm">{user.email}</span>
                      <Button isIconOnly size="sm" variant="ghost">
                        <Icon
                          className="size-4 text-muted"
                          icon="gravity-ui:copy"
                        />
                      </Button>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <Chip
                      color={user.role === "Admin" ? "success" : "default"}
                      size="sm"
                      variant="soft"
                    >
                      {user.role}
                    </Chip>
                  </Table.Cell>
                  <Table.Cell className="text-sm text-muted">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center justify-end gap-1">
                      <Button isIconOnly size="sm" variant="tertiary">
                        <Icon className="size-4" icon="gravity-ui:eye" />
                      </Button>
                      <Button isIconOnly size="sm" variant="tertiary">
                        <Icon className="size-4" icon="gravity-ui:pencil" />
                      </Button>
                      <Button isIconOnly size="sm" variant="danger-soft">
                        <Icon className="size-4" icon="gravity-ui:trash-bin" />
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
