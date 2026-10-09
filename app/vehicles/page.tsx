
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CarFront,
  RefreshCw,
  Package,
  CircleCheck,
  CircleDollarSign,
    Trash2,
     Pencil,
} from "lucide-react";

type Vehicle = {
  id: string;
  plateNumber: string | null;
  make: string | null;
  model: string;
  variant: string | null;
  year: number | null;
  color: string | null;
  acquisitionCost: string | null;
  acquisitionDate: string | null;
  status: "IN_STOCK" | "RESERVED" | "SOLD";
};

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");


  const [form, setForm] = useState({
    plateNumber: "",
    make: "",
    model: "",
    variant: "",
    year: "",
    color: "",
    acquisitionCost: "",
    acquisitionDate: "",
    });

    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");
    const [formSuccess, setFormSuccess] = useState("");

    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState("");

    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const [editForm, setEditForm] = useState({
    plateNumber: "",
    make: "",
    model: "",
    variant: "",
    year: "",
    color: "",
    acquisitionCost: "",
    acquisitionDate: "",
    });

    const [updating, setUpdating] = useState(false);
    const [editError, setEditError] = useState("");

  async function loadVehicles() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/vehicles", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ?? "Failed to load vehicles."
        );
      }

      setVehicles(result.vehicles);
      setLoaded(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to retrieve inventory."
      );
    } finally {
      setLoading(false);
    }
  }

  
    async function registerVehicle(
        event: React.SubmitEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        setFormError("");
        setFormSuccess("");

        if (!form.model.trim()) {
            setFormError("Vehicle model is required.");
            return;
        }

        setSaving(true);

        try {
            const response = await fetch("/api/vehicles", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                plateNumber: form.plateNumber.trim() || null,
                make: form.make.trim() || null,
                model: form.model.trim(),
                variant: form.variant.trim() || null,
                year: form.year ? Number(form.year) : null,
                color: form.color.trim() || null,
                acquisitionCost: form.acquisitionCost || null,
                acquisitionDate: form.acquisitionDate || null,
            }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Failed to register vehicle."
            );
            }

            setFormSuccess("Vehicle registered successfully.");

            setForm({
            plateNumber: "",
            make: "",
            model: "",
            variant: "",
            year: "",
            color: "",
            acquisitionCost: "",
            acquisitionDate: "",
            });

            await loadVehicles();
        } catch (err) {
            setFormError(
            err instanceof Error
                ? err.message
                : "Unable to register vehicle."
            );
        } finally {
            setSaving(false);
        }
    }

    
    async function deleteVehicle(vehicle: Vehicle) {
    const vehicleName = [
        vehicle.year,
        vehicle.make,
        vehicle.model,
        vehicle.plateNumber
        ? `(${vehicle.plateNumber})`
        : "",
    ]
        .filter(Boolean)
        .join(" ");

    const confirmed = window.confirm(
        `Are you sure you want to delete ${vehicleName}?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
        return;
    }

    setDeletingId(vehicle.id);
    setDeleteError("");

    try {
        const response = await fetch(
        `/api/vehicles/${encodeURIComponent(vehicle.id)}`,
        {
            method: "DELETE",
        }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
        throw new Error(
            result.message || "Failed to delete vehicle."
        );
        }

        await loadVehicles();
    } catch (err) {
        setDeleteError(
        err instanceof Error
            ? err.message
            : "Unable to delete vehicle."
        );
    } finally {
        setDeletingId(null);
    }
    }

    
    function startEditing(vehicle: Vehicle) {
    setEditingVehicle(vehicle);

    setEditForm({
        plateNumber: vehicle.plateNumber ?? "",
        make: vehicle.make ?? "",
        model: vehicle.model,
        variant: vehicle.variant ?? "",
        year: vehicle.year?.toString() ?? "",
        color: vehicle.color ?? "",
        acquisitionCost: vehicle.acquisitionCost ?? "",
        acquisitionDate: vehicle.acquisitionDate
        ? vehicle.acquisitionDate.slice(0, 10)
        : "",
    });

    setEditError("");
    }

    function cancelEditing() {
    setEditingVehicle(null);
    setEditError("");
    }

    async function updateVehicle(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingVehicle) return;

    setUpdating(true);
    setEditError("");

    try {
        const response = await fetch(
        `/api/vehicles/${encodeURIComponent(editingVehicle.id)}`,
        {
            method: "PATCH",
            headers: {
            "Content-Type": "application/json",
            },
            body: JSON.stringify({
            plateNumber: editForm.plateNumber.trim() || null,
            make: editForm.make.trim() || null,
            model: editForm.model.trim(),
            variant: editForm.variant.trim() || null,
            year: editForm.year ? Number(editForm.year) : null,
            color: editForm.color.trim() || null,
            acquisitionCost: editForm.acquisitionCost || null,
            acquisitionDate: editForm.acquisitionDate || null,
            }),
        }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to update vehicle.");
        }

        setEditingVehicle(null);
        await loadVehicles();
    } catch (err) {
        setEditError(
        err instanceof Error ? err.message : "Unable to update vehicle."
        );
    } finally {
        setUpdating(false);
    }
    }




  function formatCurrency(value: string | null) {
    if (value === null) {
      return "Not recorded";
    }

    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(Number(value));
  }

  const inStock = vehicles.filter(
    (vehicle) => vehicle.status === "IN_STOCK"
  ).length;

  const reserved = vehicles.filter(
    (vehicle) => vehicle.status === "RESERVED"
  ).length;

  const sold = vehicles.filter(
    (vehicle) => vehicle.status === "SOLD"
  ).length;

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Vehicle Inventory
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            View registered vehicles, acquisition costs, and
            inventory status.
          </p>
        </div>

        <Button
          onClick={loadVehicles}
          disabled={loading}
          variant="outline"
        >
          <RefreshCw
            className={loading ? "animate-spin" : ""}
          />
          {loading ? "Loading..." : "Load / Refresh"}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="h-4 w-4" />
            In Stock
          </div>
          <p className="mt-3 text-3xl font-semibold">
            {loaded ? inStock : "—"}
          </p>
        </div>

        <div className="rounded-xl border p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CarFront className="h-4 w-4" />
            Reserved
          </div>
          <p className="mt-3 text-3xl font-semibold">
            {loaded ? reserved : "—"}
          </p>
        </div>

        <div className="rounded-xl border p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CircleCheck className="h-4 w-4" />
            Sold
          </div>
          <p className="mt-3 text-3xl font-semibold">
            {loaded ? sold : "—"}
          </p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive"
        >
          {error}
        </div>
      )}

        {deleteError && (
        <div
            role="alert"
            className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive"
        >
            {deleteError}
        </div>
        )}

      
        <section className="rounded-xl border p-5">
        <h2 className="text-lg font-semibold">
            Register Vehicle
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
            Add a vehicle to inventory with its verified
            acquisition details.
        </p>

        <form
            onSubmit={registerVehicle}
            className="mt-5 space-y-5"
        >
            <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
                <label htmlFor="plateNumber" className="text-sm font-medium">
                Plate Number
                </label>
                <input
                id="plateNumber"
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.plateNumber}
                onChange={(event) =>
                    setForm((previous) => ({
                    ...previous,
                    plateNumber: event.target.value,
                    }))
                }
                placeholder="ABC 1234"
                />
            </div>

            <div className="space-y-2">
                <label htmlFor="make" className="text-sm font-medium">
                Make
                </label>
                <input
                id="make"
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.make}
                onChange={(event) =>
                    setForm((previous) => ({
                    ...previous,
                    make: event.target.value,
                    }))
                }
                placeholder="Toyota"
                />
            </div>

            <div className="space-y-2">
                <label htmlFor="model" className="text-sm font-medium">
                Model *
                </label>
                <input
                id="model"
                required
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.model}
                onChange={(event) =>
                    setForm((previous) => ({
                    ...previous,
                    model: event.target.value,
                    }))
                }
                placeholder="Vios"
                />
            </div>

            <div className="space-y-2">
                <label htmlFor="variant" className="text-sm font-medium">
                Variant
                </label>
                <input
                id="variant"
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.variant}
                onChange={(event) =>
                    setForm((previous) => ({
                    ...previous,
                    variant: event.target.value,
                    }))
                }
                placeholder="1.3 E CVT"
                />
            </div>

            <div className="space-y-2">
                <label htmlFor="year" className="text-sm font-medium">
                Year
                </label>
                <input
                id="year"
                type="number"
                min="1900"
                max="2100"
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.year}
                onChange={(event) =>
                    setForm((previous) => ({
                    ...previous,
                    year: event.target.value,
                    }))
                }
                placeholder="2020"
                />
            </div>

            <div className="space-y-2">
                <label htmlFor="color" className="text-sm font-medium">
                Color
                </label>
                <input
                id="color"
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.color}
                onChange={(event) =>
                    setForm((previous) => ({
                    ...previous,
                    color: event.target.value,
                    }))
                }
                placeholder="Silver"
                />
            </div>

            <div className="space-y-2">
                <label htmlFor="acquisitionCost" className="text-sm font-medium">
                Acquisition Cost (PHP)
                </label>
                <input
                id="acquisitionCost"
                type="number"
                min="0"
                step="0.01"
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.acquisitionCost}
                onChange={(event) =>
                    setForm((previous) => ({
                    ...previous,
                    acquisitionCost: event.target.value,
                    }))
                }
                placeholder="350000.00"
                />
            </div>

            <div className="space-y-2">
                <label htmlFor="acquisitionDate" className="text-sm font-medium">
                Acquisition Date
                </label>
                <input
                id="acquisitionDate"
                type="date"
                className="h-10 w-full rounded-md border bg-background px-3"
                value={form.acquisitionDate}
                onChange={(event) =>
                    setForm((previous) => ({
                    ...previous,
                    acquisitionDate: event.target.value,
                    }))
                }
                />
            </div>
            </div>

            {formError && (
            <p role="alert" className="text-sm text-destructive">
                {formError}
            </p>
            )}

            {formSuccess && (
            <p role="status" className="text-sm text-green-600">
                {formSuccess}
            </p>
            )}

            <Button type="submit" disabled={saving}>
            {saving ? "Registering..." : "Register Vehicle"}
            </Button>
        </form>
        </section>


        
        {editingVehicle && (
        <section className="rounded-xl border p-5">
            <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Edit Vehicle</h2>
            <Button
                type="button"
                variant="outline"
                onClick={cancelEditing}
                disabled={updating}
            >
                Cancel
            </Button>
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
            Update the registered vehicle information.
            Acquisition details are locked after a confirmed sale.
            </p>

            <form onSubmit={updateVehicle} className="mt-5 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
                {(
                [
                    ["plateNumber", "Plate Number"],
                    ["make", "Make"],
                    ["model", "Model"],
                    ["variant", "Variant"],
                    ["year", "Year"],
                    ["color", "Color"],
                    ["acquisitionCost", "Acquisition Cost (PHP)"],
                    ["acquisitionDate", "Acquisition Date"],
                ] as const
                ).map(([field, label]) => {
                const isAcquisitionField =
                    field === "acquisitionCost" || field === "acquisitionDate";

                const locked =
                    editingVehicle.status === "SOLD" && isAcquisitionField;

                return (
                    <div key={field} className="space-y-2">
                    <label htmlFor={`edit-${field}`} className="text-sm font-medium">
                        {label}
                    </label>

                    <input
                        id={`edit-${field}`}
                        type={
                        field === "acquisitionDate"
                            ? "date"
                            : field === "year" || field === "acquisitionCost"
                            ? "number"
                            : "text"
                        }
                        min={
                        field === "year"
                            ? 1900
                            : field === "acquisitionCost"
                            ? 0
                            : undefined
                        }
                        max={field === "year" ? 2100 : undefined}
                        step={field === "acquisitionCost" ? "0.01" : undefined}
                        required={field === "model"}
                        disabled={locked || updating}
                        value={editForm[field]}
                        onChange={(event) =>
                        setEditForm((previous) => ({
                            ...previous,
                            [field]: event.target.value,
                        }))
                        }
                        className="h-10 w-full rounded-md border bg-background px-3 disabled:opacity-50"
                    />
                    </div>
                );
                })}
            </div>

            {editError && (
                <p role="alert" className="text-sm text-destructive">
                {editError}
                </p>
            )}

            <Button type="submit" disabled={updating}>
                {updating ? "Saving Changes..." : "Save Changes"}
            </Button>
            </form>
        </section>
        )}



      <section className="rounded-xl border">
        <div className="flex items-center gap-2 border-b p-5">
          <CircleDollarSign className="h-5 w-5" />
          <h2 className="text-lg font-semibold">
            Registered Vehicles
          </h2>
        </div>

        {!loaded ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Click Load / Refresh to retrieve inventory.
          </div>
        ) : vehicles.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No vehicles registered yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-5 py-3 font-medium">
                    Vehicle
                  </th>
                  <th className="px-5 py-3 font-medium">
                    Plate Number
                  </th>
                  <th className="px-5 py-3 font-medium">
                    Acquisition Cost
                  </th>
                  <th className="px-5 py-3 font-medium">
                    Status
                  </th>
                  <th className="px-5 py-3 text-right font-medium">
                    Actions
                   </th>
                </tr>
              </thead>

              <tbody>
                {vehicles.map((vehicle) => (
                  <tr
                    key={vehicle.id}
                    className="border-b last:border-b-0"
                  >
                    <td className="px-5 py-4">
                      <div className="font-medium">
                        {[
                          vehicle.year,
                          vehicle.make,
                          vehicle.model,
                          vehicle.variant,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      </div>
                      {vehicle.color && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {vehicle.color}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {vehicle.plateNumber ?? "No plate"}
                    </td>

                    <td className="px-5 py-4">
                      {formatCurrency(
                        vehicle.acquisitionCost
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full border px-2.5 py-1 text-xs font-medium">
                        {vehicle.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                        <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => startEditing(vehicle)}
                        disabled={deletingId !== null || updating}
                        >
                        <Pencil className="h-4 w-4" />
                        Edit
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={
                            deletingId !== null ||
                            vehicle.status === "SOLD"
                            }
                            onClick={() => deleteVehicle(vehicle)}
                            className="text-destructive hover:text-destructive"
                            title={
                            vehicle.status === "SOLD"
                                ? "Sold vehicles cannot be deleted"
                                : "Delete vehicle"
                            }
                        >
                            <Trash2 className="h-4 w-4" />
                            {deletingId === vehicle.id
                            ? "Deleting..."
                            : "Delete"}
                        </Button>
                        </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
