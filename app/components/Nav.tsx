"use client";

import {
  ArrowRightFromSquare,
  Bars,
  Gear,
  Person,
} from "@gravity-ui/icons";
import { Avatar, Button, Dropdown, Label } from "@heroui/react";
import { useAuth } from "../context/AuthContext";

export default function Nav({
  onOpenNavigation,
}: {
  onOpenNavigation: () => void;
}) {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center border-b border-default/70 bg-background/90 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3 lg:hidden">
        <Button
          isIconOnly
          aria-label="Open navigation"
          size="sm"
          variant="secondary"
          onPress={onOpenNavigation}
        >
          <Bars className="size-4" />
        </Button>
        <span className="text-sm font-semibold tracking-tight">NestOps</span>
      </div>

      <div className="ml-auto">
        <Dropdown>
          <Dropdown.Trigger
            aria-label="Open user menu"
            className="rounded-full"
          >
            <Avatar size="sm">
              <Avatar.Fallback>
                {user.email.charAt(0).toUpperCase()}
              </Avatar.Fallback>
            </Avatar>
          </Dropdown.Trigger>
          <Dropdown.Popover>
            <div className="border-b border-default/60 px-3 pb-3 pt-3">
              <p className="max-w-56 truncate text-sm font-medium">
                {user.email}
              </p>
              <p className="mt-0.5 text-xs text-muted">{user.role}</p>
            </div>
            <Dropdown.Menu>
              <Dropdown.Item id="profile" textValue="Profile">
                <div className="flex w-full items-center justify-between gap-3">
                  <Label>Profile</Label>
                  <Person className="size-3.5 text-muted" />
                </div>
              </Dropdown.Item>
              <Dropdown.Item id="settings" textValue="Settings">
                <div className="flex w-full items-center justify-between gap-3">
                  <Label>Settings</Label>
                  <Gear className="size-3.5 text-muted" />
                </div>
              </Dropdown.Item>
              <Dropdown.Item
                id="logout"
                textValue="Log out"
                variant="danger"
                onPress={logout}
              >
                <div className="flex w-full items-center justify-between gap-3">
                  <Label>Log out</Label>
                  <ArrowRightFromSquare className="size-3.5 text-danger" />
                </div>
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>
    </header>
  );
}
