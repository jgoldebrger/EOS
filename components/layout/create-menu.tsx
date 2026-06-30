"use client";

import Link from "next/link";
import { BarChart3, CheckSquare, FolderKanban, ListTodo, Megaphone, Mountain, Plus, Video } from "lucide-react";
import { useOrgContext } from "@/features/organizations/components/org-context";
import { getTeamNavHref } from "@/components/layout/team-nav-config";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CreateMenuProps {
  teamSlug?: string;
}

export function CreateMenu({ teamSlug }: CreateMenuProps) {
  const { orgSlug } = useOrgContext();
  const base = teamSlug
    ? (segment: string) => getTeamNavHref(orgSlug, teamSlug, segment)
    : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="h-8 gap-1">
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Create</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Create new</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {base ? (
          <>
            <DropdownMenuItem asChild>
              <Link href={`${base("scorecard")}?create=metric`}>
                <BarChart3 className="mr-2 h-4 w-4" />
                Metric
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`${base("rocks")}?create=rock`}>
                <Mountain className="mr-2 h-4 w-4" />
                Rock
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`${base("issues")}?create=issue`}>
                <ListTodo className="mr-2 h-4 w-4" />
                Issue
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`${base("todos")}?create=todo`}>
                <CheckSquare className="mr-2 h-4 w-4" />
                To-Do
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`${base("headlines")}?create=headline`}>
                <Megaphone className="mr-2 h-4 w-4" />
                Headline
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`${base("agendas")}?create=meeting`}>
                <Video className="mr-2 h-4 w-4" />
                Meeting
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/org/${orgSlug}/projects?create=project`}>
                <FolderKanban className="mr-2 h-4 w-4" />
                Project
              </Link>
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem asChild>
            <Link href={`/org/${orgSlug}/teams`}>Select a team first</Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
