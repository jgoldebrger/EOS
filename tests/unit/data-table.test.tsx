import { describe, expect, it, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { OwnerAvatar } from "@/components/shared/owner-avatar";

interface Row {
  name: string;
  status: string;
}

const columns: ColumnDef<Row>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "status", header: "Status" },
];

afterEach(() => {
  cleanup();
});

describe("DataTable", () => {
  it("renders rows and column headers", () => {
    render(
      <DataTable
        columns={columns}
        data={[
          { name: "Revenue", status: "active" },
          { name: "NPS", status: "pending" },
        ]}
        showPagination={false}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "Name" })).toBeTruthy();
    expect(screen.getByRole("cell", { name: "Revenue" })).toBeTruthy();
    expect(screen.getByRole("cell", { name: "NPS" })).toBeTruthy();
  });

  it("shows empty state when data is empty", () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        emptyTitle="No metrics"
        emptyDescription="Add your first metric to get started."
      />,
    );

    expect(screen.getByRole("heading", { name: "No metrics" })).toBeTruthy();
    expect(screen.getByText(/add your first metric/i)).toBeTruthy();
  });

  it("shows loading skeleton while loading", () => {
    render(<DataTable columns={columns} data={[]} isLoading />);

    expect(screen.getByLabelText("Loading table")).toBeTruthy();
  });
});

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(
      <EmptyState
        title="Nothing here"
        description="Create something to populate this view."
      />,
    );

    expect(screen.getByRole("heading", { name: "Nothing here" })).toBeTruthy();
    expect(screen.getByText(/create something/i)).toBeTruthy();
  });
});

describe("StatusBadge", () => {
  it("renders formatted status label", () => {
    render(<StatusBadge status="in_progress" />);
    expect(screen.getByText("In Progress")).toBeTruthy();
  });
});

describe("OwnerAvatar", () => {
  it("renders initials fallback with accessible name", () => {
    render(<OwnerAvatar name="Jane Doe" />);
    expect(screen.getByLabelText("Jane Doe")).toBeTruthy();
    expect(screen.getByText("JD")).toBeTruthy();
  });
});
