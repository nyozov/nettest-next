"use client";

import {
  Button,
  Chip,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  Modal,
  TextField,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  BuildingRequest,
  BuildingUnit,
} from "@/app/components/PropertyBuilding3D";
import { useApiFetch } from "@/app/context/AuthContext";

const PropertyBuilding3D = dynamic(
  () => import("@/app/components/PropertyBuilding3D"),
  {
    ssr: false,
    loading: () => (
      <div className="flex size-full items-center justify-center text-sm text-muted">
        Preparing 3D property view...
      </div>
    ),
  },
);

interface Property {
  id: number;
  name: string;
  address: string;
  landlordId: number;
  createdAt: string;
}

interface Unit {
  id: number;
  unitNumber: number;
  propertyId: number;
  createdAt: string;
}

interface MaintenanceRequest extends BuildingRequest {
  title: string;
  description: string;
  propertyId: number;
  propertyName: string;
  unitNumber: number;
  createdAt: string;
}

const apiUrl = "http://localhost:5259/api";
const propertiesUrl = `${apiUrl}/properties`;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function LandlordPropertiesPage() {
  const apiFetch = useApiFetch();
  const [properties, setProperties] = useState<Property[]>([]);
  const [unitsByProperty, setUnitsByProperty] = useState<
    Record<number, Unit[]>
  >({});
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(
    null,
  );
  const [selectedUnit, setSelectedUnit] = useState<BuildingUnit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeProperty, setActiveProperty] = useState<Property | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [unitError, setUnitError] = useState<string | null>(null);

  const loadProperties = useCallback(() => {
    apiFetch(propertiesUrl)
      .then((response) => {
        if (!response.ok) throw new Error("Could not load your properties.");
        return response.json() as Promise<Property[]>;
      })
      .then((loadedProperties) => {
        setProperties(loadedProperties);
        setSelectedPropertyId((currentPropertyId) => {
          if (
            currentPropertyId &&
            loadedProperties.some(
              (property) => property.id === currentPropertyId,
            )
          ) {
            return currentPropertyId;
          }

          return loadedProperties[0]?.id ?? null;
        });

        const unitsPromise: Promise<Array<readonly [number, Unit[]]>> =
          Promise.all(
            loadedProperties.map(async (property) => {
              const response = await apiFetch(
                `${propertiesUrl}/${property.id}/units`,
              );

              if (!response.ok) return [property.id, [] as Unit[]] as const;
              return [property.id, (await response.json()) as Unit[]] as const;
            }),
          );

        const requestsPromise = apiFetch(`${apiUrl}/maintenance-requests`).then(
          async (response) => {
            if (!response.ok) return [];
            return (await response.json()) as MaintenanceRequest[];
          },
        );

        return Promise.all([unitsPromise, requestsPromise] as const);
      })
      .then(([unitEntries, loadedRequests]) => {
        setUnitsByProperty(Object.fromEntries(unitEntries));
        setRequests(loadedRequests);
      })
      .catch((loadError: unknown) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load your properties.",
        );
      })
      .finally(() => setIsLoading(false));
  }, [apiFetch]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const resetCreationFlow = () => {
    setActiveProperty(null);
    setCreateError(null);
    setUnitError(null);
  };

  const handleModalOpenChange = (isOpen: boolean) => {
    setIsModalOpen(isOpen);
    if (!isOpen) resetCreationFlow();
  };

  const openUnitCreation = (property: Property) => {
    setActiveProperty(property);
    setCreateError(null);
    setUnitError(null);
    setIsModalOpen(true);
  };

  const handleCreateProperty = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setIsCreating(true);
    setCreateError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await apiFetch(propertiesUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          address: formData.get("address"),
        }),
      });

      if (!response.ok) {
        throw new Error("Could not create the property. Please try again.");
      }

      const property = (await response.json()) as Property;
      setProperties((current) => [property, ...current]);
      setUnitsByProperty((current) => ({ ...current, [property.id]: [] }));
      setSelectedPropertyId(property.id);
      setSelectedUnit(null);
      setActiveProperty(property);
      form.reset();
    } catch (createPropertyError) {
      setCreateError(
        createPropertyError instanceof Error
          ? createPropertyError.message
          : "Could not create the property. Please try again.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddUnit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeProperty) return;

    setIsAddingUnit(true);
    setUnitError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const unitNumber = Number(formData.get("unitNumber"));

    try {
      const response = await apiFetch(
        `${propertiesUrl}/${activeProperty.id}/units`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ unitNumber }),
        },
      );

      if (!response.ok) {
        throw new Error("Could not add that unit. Please try again.");
      }

      const unit = (await response.json()) as Unit;
      setUnitsByProperty((current) => ({
        ...current,
        [activeProperty.id]: [...(current[activeProperty.id] ?? []), unit],
      }));
      if (selectedPropertyId === activeProperty.id) {
        setSelectedUnit(unit);
      }
      form.reset();
    } catch (addUnitError) {
      setUnitError(
        addUnitError instanceof Error
          ? addUnitError.message
          : "Could not add that unit. Please try again.",
      );
    } finally {
      setIsAddingUnit(false);
    }
  };

  const activeUnits = activeProperty
    ? (unitsByProperty[activeProperty.id] ?? [])
    : [];

  const selectedProperty = useMemo(() => {
    if (properties.length === 0) return null;

    return (
      properties.find((property) => property.id === selectedPropertyId) ??
      properties[0]
    );
  }, [properties, selectedPropertyId]);

  const selectedUnits = selectedProperty
    ? (unitsByProperty[selectedProperty.id] ?? [])
    : [];

  const selectedRequests = selectedProperty
    ? requests.filter((request) => request.propertyId === selectedProperty.id)
    : [];

  const activeRequests = selectedRequests.filter(
    (request) => request.status === 0 || request.status === 1,
  );

  const selectedUnitRequests = selectedUnit
    ? selectedRequests.filter(
        (request) =>
          request.unitId === selectedUnit.id &&
          (request.status === 0 || request.status === 1),
      )
    : [];

  const openProperty = (property: Property) => {
    setSelectedPropertyId(property.id);
    setSelectedUnit(null);
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          
          <h1 className="text-3xl font-semibold tracking-tight">Properties</h1>
          {!isLoading && !error && (
            <p className="mt-2 text-sm text-muted">
              {properties.length === 0
                ? "Add your first property to get started."
                : `${properties.length} ${
                    properties.length === 1 ? "property" : "properties"
                  } under management.`}
            </p>
          )}
        </div>

        <Modal isOpen={isModalOpen} onOpenChange={handleModalOpenChange}>
          <Modal.Trigger>
            <Button onPress={resetCreationFlow}>
              <Icon icon="gravity-ui:plus" className="size-4" />
              New property
            </Button>
          </Modal.Trigger>
          <Modal.Backdrop>
            <Modal.Container placement="center" size="md">
              <Modal.Dialog>
                <Modal.CloseTrigger />

                {activeProperty ? (
                  <>
                    <Modal.Header>
                      <Modal.Icon>
                        <Icon icon="gravity-ui:door" className="size-5" />
                      </Modal.Icon>
                      <div>
                        <Modal.Heading>Add units</Modal.Heading>
                        <p className="mt-1 text-sm font-normal text-muted">
                          {activeProperty.name}
                        </p>
                      </div>
                    </Modal.Header>

                    <Form
                      render={(props) => <form {...props} />}
                      onSubmit={handleAddUnit}
                    >
                      <Modal.Body className="gap-5">
                        <div className="rounded-xl bg-default/30 px-4 py-3">
                          <p className="text-sm font-medium">
                            {activeProperty.address}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            Add one unit at a time. The field clears after each
                            addition so you can keep typing.
                          </p>
                        </div>

                        {unitError && (
                          <p className="text-sm text-danger">{unitError}</p>
                        )}

                        <div className="flex items-start gap-2">
                          <TextField
                            className="flex-1"
                            isRequired
                            name="unitNumber"
                            type="number"
                            validate={(value) => {
                              const unitNumber = Number(value);
                              if (
                                !Number.isInteger(unitNumber) ||
                                unitNumber < 1
                              )
                                return "Enter a positive whole number";
                              if (
                                activeUnits.some(
                                  (unit) => unit.unitNumber === unitNumber,
                                )
                              )
                                return "That unit has already been added";
                              return null;
                            }}
                          >
                            <Label>Unit number</Label>
                            <Input autoFocus min={1} placeholder="101" />
                            <Description>Press Enter to add</Description>
                            <FieldError />
                          </TextField>
                          <Button
                            className="mt-6"
                            type="submit"
                            isDisabled={isAddingUnit}
                          >
                            {isAddingUnit ? "Adding..." : "Add"}
                          </Button>
                        </div>

                        {activeUnits.length > 0 && (
                          <div>
                            <div className="mb-3 flex items-center justify-between">
                              <p className="text-sm font-medium">Units added</p>
                              <span className="text-xs text-muted">
                                {activeUnits.length} total
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {[...activeUnits]
                                .sort((a, b) => a.unitNumber - b.unitNumber)
                                .map((unit) => (
                                  <Chip key={unit.id} size="sm" variant="soft">
                                    Unit {unit.unitNumber}
                                  </Chip>
                                ))}
                            </div>
                          </div>
                        )}
                      </Modal.Body>

                      <Modal.Footer>
                        <Button
                          type="button"
                          variant="secondary"
                          onPress={() => handleModalOpenChange(false)}
                        >
                          {activeUnits.length > 0 ? "Done" : "Skip for now"}
                        </Button>
                      </Modal.Footer>
                    </Form>
                  </>
                ) : (
                  <>
                    <Modal.Header>
                      <Modal.Icon>
                        <Icon icon="gravity-ui:house" className="size-5" />
                      </Modal.Icon>
                      <div>
                        <Modal.Heading>New property</Modal.Heading>
                        <p className="mt-1 text-sm font-normal text-muted">
                          Just the essentials. Units come next.
                        </p>
                      </div>
                    </Modal.Header>

                    <Form
                      render={(props) => <form {...props} />}
                      onSubmit={handleCreateProperty}
                    >
                      <Modal.Body className="gap-5">
                        {createError && (
                          <p className="text-sm text-danger">{createError}</p>
                        )}

                        <TextField isRequired name="name">
                          <Label>Property name</Label>
                          <Input autoFocus placeholder="Maple House" />
                          <Description>
                            Use the name you recognize at a glance.
                          </Description>
                          <FieldError />
                        </TextField>

                        <TextField isRequired name="address">
                          <Label>Street address</Label>
                          <Input placeholder="123 Maple Street, Toronto" />
                          <FieldError />
                        </TextField>
                      </Modal.Body>

                      <Modal.Footer>
                        <Button
                          type="button"
                          variant="secondary"
                          isDisabled={isCreating}
                          onPress={() => handleModalOpenChange(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" isDisabled={isCreating}>
                          {isCreating ? "Creating..." : "Create property"}
                          {!isCreating && (
                            <Icon
                              icon="gravity-ui:arrow-right"
                              className="size-4"
                            />
                          )}
                        </Button>
                      </Modal.Footer>
                    </Form>
                  </>
                )}
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-52 animate-pulse rounded-2xl bg-default/30"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-danger/30 bg-danger/5 p-6">
          <p className="text-sm text-danger">{error}</p>
          <Button
            className="mt-4"
            size="sm"
            variant="secondary"
            onPress={() => {
              setIsLoading(true);
              setError(null);
              loadProperties();
            }}
          >
            Try again
          </Button>
        </div>
      ) : properties.length === 0 ? (
        <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-default p-8 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-default/40">
            <Icon icon="gravity-ui:house" className="size-5" />
          </div>
          <h2 className="font-medium">Start your portfolio</h2>
          <p className="mt-2 max-w-sm text-sm text-muted">
            Add a property, then enter its units right away. It only takes a
            minute.
          </p>
          <Button
            className="mt-5"
            onPress={() => {
              resetCreationFlow();
              setIsModalOpen(true);
            }}
          >
            <Icon icon="gravity-ui:plus" className="size-4" />
            Add first property
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {selectedProperty && (
            <section className="overflow-hidden rounded-[2rem] border border-default/70 bg-surface shadow-sm">
              <div className="relative min-h-[620px] overflow-hidden bg-gradient-to-br from-slate-100 via-default/30 to-slate-200">
                <PropertyBuilding3D
                  className="h-[min(72vh,760px)] min-h-[620px] rounded-none border-0 bg-transparent shadow-none"
                  requests={selectedRequests}
                  selectedUnitId={selectedUnit?.id ?? null}
                  showHud={false}
                  units={selectedUnits}
                  onSelectUnit={setSelectedUnit}
                />

                <div className="pointer-events-none absolute inset-x-4 top-4 z-10 flex flex-col gap-3 sm:inset-x-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="max-w-md rounded-3xl border border-white/45 bg-white/10 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.16)] backdrop-blur-2xl backdrop-saturate-150">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
                      Active property
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                      {selectedProperty.name}
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      {selectedProperty.address}
                    </p>
                  </div>

                  <div className="pointer-events-auto flex flex-wrap justify-end gap-2 rounded-full border border-white/45 bg-white/10 p-1.5 shadow-[0_18px_60px_rgba(15,23,42,0.14)] backdrop-blur-2xl backdrop-saturate-150">
                    <Chip size="sm" variant="soft">
                      {selectedUnits.length}{" "}
                      {selectedUnits.length === 1 ? "unit" : "units"}
                    </Chip>
                    <Chip
                      color={activeRequests.length > 0 ? "danger" : "success"}
                      size="sm"
                      variant="soft"
                    >
                      {activeRequests.length} active requests
                    </Chip>
                    <Button
                      size="sm"
                      variant="primary"
                      className="bg-black"
                      onPress={() => openUnitCreation(selectedProperty)}
                    >
                      <Icon icon="gravity-ui:plus" className="size-3.5" />
                      Add unit
                    </Button>
                  </div>
                </div>

                <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex flex-wrap gap-2 rounded-3xl border border-white/45 bg-white/10 p-3 text-xs shadow-[0_18px_60px_rgba(15,23,42,0.14)] backdrop-blur-2xl backdrop-saturate-150">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm bg-emerald-400" />
                    Unit
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm bg-amber-500" />
                    Open
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm bg-blue-500" />
                    In progress
                  </span>
                  <span className="text-muted">Drag to rotate</span>
                </div>

                {selectedUnit ? (
                  <aside className="pointer-events-auto absolute inset-x-4 bottom-[4.5rem] z-20 max-h-[42%] overflow-y-auto rounded-3xl border border-white/45 bg-white/30 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.22)] backdrop-blur-2xl backdrop-saturate-150 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:max-h-[calc(100%-10rem)] sm:w-[22rem]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-muted">
                          Selected unit
                        </p>
                        <h4 className="mt-1 text-xl font-semibold">
                          Unit {selectedUnit.unitNumber}
                        </h4>
                      </div>
                      <Button
                        isIconOnly
                        aria-label="Clear selected unit"
                        size="sm"
                        variant="tertiary"
                        onPress={() => setSelectedUnit(null)}
                      >
                        <Icon icon="gravity-ui:xmark" className="size-4" />
                      </Button>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          Active maintenance
                        </p>
                        <Chip size="sm" variant="soft">
                          {selectedUnitRequests.length}
                        </Chip>
                      </div>

                      {selectedUnitRequests.length === 0 ? (
                        <p className="mt-3 text-sm text-muted">
                          No open maintenance for this unit.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {selectedUnitRequests.map((request) => (
                            <div
                              key={request.id}
                              className="rounded-2xl border border-white/35 bg-white/10 p-3 shadow-sm backdrop-blur-xl backdrop-saturate-150"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-sm font-medium">
                                  {request.title}
                                </p>
                                <span
                                  className={`size-2 shrink-0 rounded-full ${
                                    request.status === 0
                                      ? "bg-amber-500"
                                      : "bg-blue-500"
                                  }`}
                                />
                              </div>
                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                                {request.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </aside>
                ) : selectedUnits.length === 0 ? (
                  <div className="pointer-events-none absolute bottom-[4.5rem] right-4 z-20 max-w-xs rounded-3xl border border-white/45 bg-white/30 p-4 text-sm text-muted shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-2xl backdrop-saturate-150 sm:bottom-5 sm:right-5">
                    Add units to make this building interactive.
                  </div>
                ) : null}
              </div>
            </section>
          )}

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium">Portfolio</h2>
             
              </div>
              <Button
                size="sm"
                variant="tertiary"
                onPress={() => {
                  resetCreationFlow();
                  setIsModalOpen(true);
                }}
              >
                <Icon icon="gravity-ui:plus" className="size-3.5" />
                New
              </Button>
            </div>

            <div className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-2 sm:mx-0 sm:px-0">
              {properties.map((property) => {
                const units = unitsByProperty[property.id] ?? [];
                const propertyRequests = requests.filter(
                  (request) => request.propertyId === property.id,
                );
                const propertyActiveRequests = propertyRequests.filter(
                  (request) => request.status === 0 || request.status === 1,
                );
                const isSelected = property.id === selectedProperty?.id;

                return (
                  <button
                    key={property.id}
                    type="button"
                    className={`min-w-[260px] snap-start rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                      isSelected
                        ? "border-foreground/30 bg-foreground text-background"
                        : "border-default/70 bg-surface"
                    }`}
                    onClick={() => openProperty(property)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex size-9 items-center justify-center rounded-xl bg-default/40">
                        <Icon icon="gravity-ui:house" className="size-4" />
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs ${
                          isSelected ? "bg-background/15" : "bg-default/40"
                        }`}
                      >
                        {units.length} {units.length === 1 ? "unit" : "units"}
                      </span>
                    </div>

                    <h3 className="mt-4 truncate text-sm font-semibold">
                      {property.name}
                    </h3>
                    <p
                      className={`mt-1 line-clamp-2 text-xs ${
                        isSelected ? "text-background/70" : "text-muted"
                      }`}
                    >
                      {property.address}
                    </p>

                    <div
                      className={`mt-4 flex items-center justify-between border-t pt-3 text-xs ${
                        isSelected
                          ? "border-background/20 text-background/70"
                          : "border-default/60 text-muted"
                      }`}
                    >
                      <span>Added {formatDate(property.createdAt)}</span>
                      <span>{propertyActiveRequests.length} active</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
