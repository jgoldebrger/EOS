"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createLoad } from "@/features/transport/actions";
import type {
  TransportCarrier,
  TransportDepot,
  TransportMemberOption,
} from "@/features/transport/types";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StopDraft {
  address: string;
  latitude: string;
  longitude: string;
}

interface CreateLoadDialogProps {
  organizationId: string;
  orgSlug: string;
  carriers: TransportCarrier[];
  depots: TransportDepot[];
  members: TransportMemberOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm";

export function CreateLoadDialog({
  organizationId,
  orgSlug,
  carriers,
  depots,
  members,
  open,
  onOpenChange,
}: CreateLoadDialogProps) {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [depotId, setDepotId] = useState("");
  const [carrierId, setCarrierId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [stops, setStops] = useState<StopDraft[]>([
    { address: "", latitude: "", longitude: "" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetForm() {
    setCustomerName("");
    setDepotId("");
    setCarrierId("");
    setDriverId("");
    setStops([{ address: "", latitude: "", longitude: "" }]);
  }

  function updateStop(index: number, patch: Partial<StopDraft>) {
    setStops((prev) =>
      prev.map((stop, i) => (i === index ? { ...stop, ...patch } : stop)),
    );
  }

  async function handleSubmit() {
    if (!customerName.trim()) {
      showErrorToast("Customer required", "Enter a customer name.");
      return;
    }

    const validStops = stops.filter((s) => s.address.trim());
    if (validStops.length === 0) {
      showErrorToast("Stops required", "Add at least one delivery stop.");
      return;
    }

    setIsSubmitting(true);
    const result = await createLoad({
      organizationId,
      orgSlug,
      customerName: customerName.trim(),
      depotId: depotId || null,
      carrierId: carrierId || null,
      driverId: driverId || null,
      stops: validStops.map((s) => ({
        address: s.address.trim(),
        latitude: s.latitude ? Number(s.latitude) : null,
        longitude: s.longitude ? Number(s.longitude) : null,
        stopType: "delivery" as const,
      })),
    });
    setIsSubmitting(false);

    if (!result.success) {
      showErrorToast("Could not create load", result.error);
      return;
    }

    showSuccessToast("Load created");
    resetForm();
    onOpenChange(false);
    router.refresh();
    router.push(`/org/${orgSlug}/transport/${result.loadId}`);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) resetForm();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New load</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Customer</Label>
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Depot</Label>
              <select
                className={selectClassName}
                value={depotId}
                onChange={(e) => setDepotId(e.target.value)}
              >
                <option value="">None</option>
                {depots.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Carrier</Label>
              <select
                className={selectClassName}
                value={carrierId}
                onChange={(e) => setCarrierId(e.target.value)}
              >
                <option value="">None</option>
                {carriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Driver</Label>
            <select
              className={selectClassName}
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Delivery stops</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setStops((prev) => [
                    ...prev,
                    { address: "", latitude: "", longitude: "" },
                  ])
                }
              >
                Add stop
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Addresses without coordinates are geocoded automatically via OpenStreetMap.
            </p>
            {stops.map((stop, index) => (
              <div key={index} className="space-y-2 rounded-md border p-3">
                <Input
                  placeholder="Address"
                  value={stop.address}
                  onChange={(e) => updateStop(index, { address: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Latitude"
                    value={stop.latitude}
                    onChange={(e) => updateStop(index, { latitude: e.target.value })}
                  />
                  <Input
                    placeholder="Longitude"
                    value={stop.longitude}
                    onChange={(e) => updateStop(index, { longitude: e.target.value })}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Creating…" : "Create load"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
