"use client";

import { useAuth } from "../context/AuthContext";
import {
  ArrowRightFromSquare,
  Gear,
  House,
  Persons,
  Wrench,
} from "@gravity-ui/icons";
import { Avatar, Dropdown, Label } from "@heroui/react";
import Link from "next/link";

const Nav = () => {
  const { user, logout } = useAuth();

  console.log("user", user)
  

  if (user === undefined) return null;
  if (!user) return null;

  return (
    <div className="w-full p-2 shadow-sm flex justify-end items-center ">
      <Dropdown>
        <Dropdown.Trigger className="rounded-full">
          <Avatar>
            <Avatar.Image
              alt={user.email}
              src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/orange.jpg"
            />
          </Avatar>
        </Dropdown.Trigger>
        <Dropdown.Popover>
          <div className="px-3 pt-3 pb-1">
            <div className="flex items-center gap-2">
              <Avatar size="sm">
                <Avatar.Image
                  alt="Jane"
                  src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/orange.jpg"
                />
              </Avatar>
              <div className="flex flex-col gap-0">
                <p className="text-sm leading-5 font-medium">{user?.email}</p>
                <span>{user?.role}</span>
              </div>
            </div>
          </div>
          <Dropdown.Menu>
            <Dropdown.Item id="dashboard" textValue="Dashboard">
              <Label>Dashboard</Label>
            </Dropdown.Item>
            <Dropdown.Item id="profile" textValue="Profile">
              <Label>Profile</Label>
            </Dropdown.Item>
            <Dropdown.Item id="settings" textValue="Settings">
              <div className="flex w-full items-center justify-between gap-2">
                <Label>Settings</Label>
                <Gear className="size-3.5 text-muted" />
              </div>
            </Dropdown.Item>
            <Dropdown.Item id="new-project" textValue="New project">
              <div className="flex w-full items-center justify-between gap-2">
                <Label>Create Team</Label>
                <Persons className="size-3.5 text-muted" />
              </div>
            </Dropdown.Item>
            <Dropdown.Item id="new-project" textValue="New project">
              <Link
                href="/users"
                className="flex w-full items-center justify-between gap-2"
              >
                <Label>Users</Label>
                <Persons className="size-3.5 text-muted" />
              </Link>
            </Dropdown.Item>
            <Dropdown.Item id="properties" textValue="Properties">
              <Link
                href="/properties"
                className="flex w-full items-center justify-between gap-2"
              >
                <Label>Properties</Label>
                <House className="size-3.5 text-muted" />
              </Link>
            </Dropdown.Item>
            <Dropdown.Item
              id="maintenance-requests"
              textValue="Maintenance requests"
            >
              <Link
                href="/maintenance-requests"
                className="flex w-full items-center justify-between gap-2"
              >
                <Label>Maintenance</Label>
                <Wrench className="size-3.5 text-muted" />
              </Link>
            </Dropdown.Item>
            <Dropdown.Item
              onPress={logout}
              id="logout"
              textValue="Logout"
              variant="danger"
            >
              <div className="flex w-full items-center justify-between gap-2">
                <Label>Log Out</Label>
                <ArrowRightFromSquare className="size-3.5 text-danger" />
              </div>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </div>
  );
};

export default Nav;
