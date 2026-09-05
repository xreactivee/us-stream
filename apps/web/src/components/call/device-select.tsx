"use client";

import { useId } from "react";
import { Label } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export function DeviceSelect({
  label,
  devices,
  value,
  onChange,
  emptyLabel,
  className,
}: {
  label: string;
  devices: MediaDeviceInfo[];
  value: string;
  onChange: (deviceId: string) => void;
  emptyLabel: string;
  className?: string;
}) {
  const id = useId();

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        disabled={devices.length === 0}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full cursor-pointer truncate rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {devices.length === 0 ? (
          <option value="">{emptyLabel}</option>
        ) : (
          devices.map((device) => (
            <option
              key={device.deviceId}
              value={device.deviceId}
              className="bg-popover text-popover-foreground"
            >
              {device.label || device.deviceId.slice(0, 12)}
            </option>
          ))
        )}
      </select>
    </div>
  );
}
