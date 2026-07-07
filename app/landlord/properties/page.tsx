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
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useApiFetch } from "@/app/context/AuthContext";

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

const propertiesUrl = "http://localhost:5259/api/properties";

export default function LandlordPropertiesPage() {
  const apiFetch = useApiFetch();
  const [properties, setProperties] = useState<Property[]>([]);
  const [unitsByProperty, setUnitsByProperty] = useState<
    Record<number, Unit[]>
  >({});
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

        return Promise.all(
          loadedProperties.map(async (property) => {
            const response = await apiFetch(
              `${propertiesUrl}/${property.id}/units`,
            );

            if (!response.ok) return [property.id, []] as const;
            return [
              property.id,
              (await response.json()) as Unit[],
            ] as const;
          }),
        );
      })
      .then((unitEntries) => {
        setUnitsByProperty(Object.fromEntries(unitEntries));
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
        [activeProperty.id]: [
          ...(current[activeProperty.id] ?? []),
          unit,
        ],
      }));
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

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-muted">
            Portfolio
          </p>
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
                        <Icon
                          icon="gravity-ui:door"
                          className="size-5"
                        />
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
                              if (!Number.isInteger(unitNumber) || unitNumber < 1)
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
                                  <Chip
                                    key={unit.id}
                                    size="sm"
                                    variant="soft"
                                  >
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
                        <Icon
                          icon="gravity-ui:house"
                          className="size-5"
                        />
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {properties.map((property) => {
            const units = unitsByProperty[property.id] ?? [];

            return (
              <article
                key={property.id}
                className="flex min-h-52 flex-col rounded-2xl border border-default/70 bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-default/40">
                    <Icon icon="gravity-ui:house" className="size-4" />
                  </div>
                  <Chip size="sm" variant="soft">
                    {units.length} {units.length === 1 ? "unit" : "units"}
                  </Chip>
                </div>

                <div className="pt-5">
                  <h2 className="font-medium">{property.name}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">
                    {property.address}
                  </p>
                </div>

                <div className="mt-auto flex items-center justify-between gap-3 border-t border-default/60 pt-4">
                  <span className="text-xs text-muted">
                    Added {new Date(property.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1">
                    <Link href={`/landlord/properties/${property.id}/3d`}>
                      <Button size="sm" variant="tertiary">
                        <Icon icon="gravity-ui:cube" className="size-3.5" />
                        View 3D
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() => openUnitCreation(property)}
                    >
                      <Icon icon="gravity-ui:plus" className="size-3.5" />
                      Add unit
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
