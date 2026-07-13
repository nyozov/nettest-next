"use client";

import {
  Button,
  Chip,
  Description,
  Dropdown,
  FieldError,
  Form,
  Input,
  Kbd,
  Label,
  Modal,
  TextField,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  BuildingProperty,
  BuildingRequest,
  BuildingUnit,
} from "@/app/components/PropertyBuilding3D";
import { useApiFetch } from "@/app/context/AuthContext";

const PortfolioProperties3D = dynamic(
  () =>
    import("@/app/components/PropertyBuilding3D").then(
      (module) => module.PortfolioProperties3D,
    ),
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

interface UserSummary {
  id: number;
  email: string;
  role: string;
  createdAt: string;
}

interface Unit extends BuildingUnit {
  id: number;
  unitNumber: number;
  propertyId: number;
  tenants: UserSummary[];
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

interface InviteResponse {
  id: number;
  code: string;
  unitId: number;
  expiresAt: string;
  maxUses: number;
}

const apiUrl = "http://localhost:5259/api";
const propertiesUrl = `${apiUrl}/properties`;

export default function LandlordPropertiesPage() {
  const apiFetch = useApiFetch();
  const [properties, setProperties] = useState<Property[]>([]);
  const [unitsByProperty, setUnitsByProperty] = useState<
    Record<number, Unit[]>
  >({});
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeProperty, setActiveProperty] = useState<Property | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [unitError, setUnitError] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [sentInvite, setSentInvite] = useState<InviteResponse | null>(null);
  const [invitingUnit, setInvitingUnit] = useState<Unit | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [deletingProperty, setDeletingProperty] = useState<Property | null>(
    null,
  );
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [deletingUnit, setDeletingUnit] = useState<Unit | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const loadProperties = useCallback(() => {
    apiFetch(propertiesUrl)
      .then((response) => {
        if (!response.ok) throw new Error("Could not load your properties.");
        return response.json() as Promise<Property[]>;
      })
      .then((loadedProperties) => {
        setProperties(loadedProperties);

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
      setSelectedUnit(unit);
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

  const selectedUnitProperty = selectedUnit
    ? properties.find((property) => property.id === selectedUnit.propertyId)
    : null;

  const selectedPropertyRequests = selectedUnitProperty
    ? requests.filter(
        (request) => request.propertyId === selectedUnitProperty.id,
      )
    : [];

  const selectedUnitRequests = selectedUnit
    ? selectedPropertyRequests.filter(
        (request) =>
          request.unitId === selectedUnit.id &&
          (request.status === 0 || request.status === 1),
      )
    : [];
  const selectedUnitAllRequests = selectedUnit
    ? selectedPropertyRequests.filter(
        (request) => request.unitId === selectedUnit.id,
      )
    : [];
  const selectedUnitTenants = selectedUnit?.tenants ?? [];
  const canDeleteSelectedUnit =
    Boolean(selectedUnit) &&
    selectedUnitTenants.length === 0 &&
    selectedUnitAllRequests.length === 0;

  const portfolioBuildings = useMemo(
    () =>
      properties.map((property) => ({
        property,
        units: unitsByProperty[property.id] ?? [],
        requests: requests.filter(
          (request) => request.propertyId === property.id,
        ),
      })),
    [properties, requests, unitsByProperty],
  );

  const totalUnitCount = useMemo(
    () =>
      Object.values(unitsByProperty).reduce(
        (count, propertyUnits) => count + propertyUnits.length,
        0,
      ),
    [unitsByProperty],
  );

  const activeRequests = requests.filter(
    (request) => request.status === 0 || request.status === 1,
  );

  const handleAddUnitFromGrid = (property: BuildingProperty) => {
    const fullProperty = properties.find(
      (candidate) => candidate.id === property.id,
    );

    if (fullProperty) openUnitCreation(fullProperty);
  };

  const handleEditPropertyFromGrid = (property: BuildingProperty) => {
    const fullProperty = properties.find(
      (candidate) => candidate.id === property.id,
    );

    if (!fullProperty) return;
    setActionError(null);
    setEditingProperty(fullProperty);
  };

  const handleDeletePropertyFromGrid = (property: BuildingProperty) => {
    const fullProperty = properties.find(
      (candidate) => candidate.id === property.id,
    );

    if (!fullProperty) return;
    setActionError(null);
    setDeletingProperty(fullProperty);
  };

  const handleSelectUnit = (unit: BuildingUnit | null) => {
    const selectedFullUnit = unit
      ? (unitsByProperty[unit.propertyId] ?? []).find(
          (candidate) => candidate.id === unit.id,
        ) ?? null
      : null;

    setSelectedUnit(selectedFullUnit);
    setInviteError(null);
    setSentInvite(null);
    if (!selectedFullUnit) setInvitingUnit(null);
  };

  const handleSendInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!invitingUnit) return;

    setIsSendingInvite(true);
    setInviteError(null);
    setSentInvite(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const sentToEmail = String(formData.get("sentToEmail") ?? "").trim();

    try {
      const response = await apiFetch(
        `${apiUrl}/units/${invitingUnit.id}/invites`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sentToEmail, maxUses: 1 }),
        },
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(
          message.trim() || "Could not send that invite. Please try again.",
        );
      }

      const invite = (await response.json()) as InviteResponse;
      setSentInvite(invite);
      form.reset();
    } catch (sendInviteError) {
      setInviteError(
        sendInviteError instanceof Error
          ? sendInviteError.message
          : "Could not send that invite. Please try again.",
      );
    } finally {
      setIsSendingInvite(false);
    }
  };

  const readErrorMessage = async (response: Response, fallback: string) => {
    const message = await response.text();
    return message.trim() || fallback;
  };

  const handleUpdateProperty = async (
    event: React.FormEvent<HTMLFormElement>,
    property: Property,
  ) => {
    event.preventDefault();
    const actionKey = `property-update-${property.id}`;
    setBusyAction(actionKey);
    setActionError(null);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await apiFetch(`${propertiesUrl}/${property.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(formData.get("name") ?? "").trim(),
          address: String(formData.get("address") ?? "").trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Could not update the property."),
        );
      }

      const updatedProperty = (await response.json()) as Property;
      setProperties((current) =>
        current.map((candidate) =>
          candidate.id === updatedProperty.id ? updatedProperty : candidate,
        ),
      );
      setEditingProperty(null);
    } catch (updateError) {
      setActionError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update the property.",
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleDeleteProperty = async (property: Property) => {
    const actionKey = `property-delete-${property.id}`;
    setBusyAction(actionKey);
    setActionError(null);

    try {
      const response = await apiFetch(`${propertiesUrl}/${property.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Could not delete the property."),
        );
      }

      setProperties((current) =>
        current.filter((candidate) => candidate.id !== property.id),
      );
      setUnitsByProperty((current) => {
        const next = { ...current };
        delete next[property.id];
        return next;
      });
      if (selectedUnit?.propertyId === property.id) setSelectedUnit(null);
      setDeletingProperty(null);
    } catch (deleteError) {
      setActionError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete the property.",
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleUpdateUnit = async (
    event: React.FormEvent<HTMLFormElement>,
    propertyId: number,
    unit: Unit,
  ) => {
    event.preventDefault();
    const actionKey = `unit-update-${unit.id}`;
    setBusyAction(actionKey);
    setActionError(null);

    const formData = new FormData(event.currentTarget);
    const unitNumber = Number(formData.get("unitNumber"));

    try {
      const response = await apiFetch(
        `${propertiesUrl}/${propertyId}/units/${unit.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ unitNumber }),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Could not update the unit."),
        );
      }

      const updatedUnit = (await response.json()) as Unit;
      setUnitsByProperty((current) => ({
        ...current,
        [propertyId]: (current[propertyId] ?? []).map((candidate) =>
          candidate.id === updatedUnit.id ? updatedUnit : candidate,
        ),
      }));
      if (selectedUnit?.id === updatedUnit.id) setSelectedUnit(updatedUnit);
      setEditingUnit(null);
    } catch (updateError) {
      setActionError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update the unit.",
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleDeleteUnit = async (propertyId: number, unit: Unit) => {
    const actionKey = `unit-delete-${unit.id}`;
    setBusyAction(actionKey);
    setActionError(null);

    try {
      const response = await apiFetch(
        `${propertiesUrl}/${propertyId}/units/${unit.id}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Could not delete the unit."),
        );
      }

      setUnitsByProperty((current) => ({
        ...current,
        [propertyId]: (current[propertyId] ?? []).filter(
          (candidate) => candidate.id !== unit.id,
        ),
      }));
      if (selectedUnit?.id === unit.id) setSelectedUnit(null);
      setDeletingUnit(null);
    } catch (deleteError) {
      setActionError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete the unit.",
      );
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Properties</h1>
          {!isLoading && !error && (
            <p className="mt-2 text-sm text-muted">
              {properties.length === 0 &&
                "Add your first property to get started."}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
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
                      <Modal.Heading>Add units</Modal.Heading>
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

                        <div>
                          <TextField
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
                          className="w-full"
                          type="submit"
                          isDisabled={isAddingUnit}
                        >
                          {isAddingUnit ? "Adding..." : "Add unit"}
                        </Button>
                      </Modal.Footer>
                    </Form>
                  </>
                ) : (
                  <>
                    <Modal.Header>
                      <Modal.Heading>New property</Modal.Heading>
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
                          className="w-full"
                          type="submit"
                          isDisabled={isCreating}
                        >
                          {isCreating ? "Creating..." : "Create property"}
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
      </div>

      {editingProperty ? (
        <Modal
          isOpen
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setEditingProperty(null);
              setActionError(null);
            }
          }}
        >
          <Modal.Backdrop>
            <Modal.Container placement="center" size="md">
              <Modal.Dialog>
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Heading>Edit property</Modal.Heading>
                </Modal.Header>
                <Form
                  render={(props) => <form {...props} />}
                  onSubmit={(event) =>
                    handleUpdateProperty(event, editingProperty)
                  }
                >
                  <Modal.Body className="gap-5">
                    {actionError && (
                      <p className="text-sm text-danger">{actionError}</p>
                    )}
                    <TextField isRequired name="name">
                      <Label>Property name</Label>
                      <Input autoFocus defaultValue={editingProperty.name} />
                      <FieldError />
                    </TextField>
                    <TextField isRequired name="address">
                      <Label>Street address</Label>
                      <Input defaultValue={editingProperty.address} />
                      <FieldError />
                    </TextField>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button
                      className="w-full"
                      type="submit"
                      isDisabled={
                        busyAction === `property-update-${editingProperty.id}`
                      }
                    >
                      Save changes
                    </Button>
                  </Modal.Footer>
                </Form>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      ) : null}

      {deletingProperty ? (
        <Modal
          isOpen
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setDeletingProperty(null);
              setActionError(null);
            }
          }}
        >
          <Modal.Backdrop>
            <Modal.Container placement="center" size="sm">
              <Modal.Dialog>
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Heading>Delete property?</Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  {actionError ? (
                    <p className="text-sm text-danger">{actionError}</p>
                  ) : (
                    <p className="text-sm text-muted">
                      This can only be deleted while the property has no units.
                    </p>
                  )}
                </Modal.Body>
                <Modal.Footer>
                  <Button
                    type="button"
                    className="w-full text-danger"
                    variant="secondary"
                    isDisabled={
                      busyAction === `property-delete-${deletingProperty.id}`
                    }
                    onPress={() => handleDeleteProperty(deletingProperty)}
                  >
                    Delete
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      ) : null}

      {editingUnit ? (
        <Modal
          isOpen
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setEditingUnit(null);
              setActionError(null);
            }
          }}
        >
          <Modal.Backdrop>
            <Modal.Container placement="center" size="sm">
              <Modal.Dialog>
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Heading>Edit unit</Modal.Heading>
                </Modal.Header>
                <Form
                  render={(props) => <form {...props} />}
                  onSubmit={(event) =>
                    handleUpdateUnit(event, editingUnit.propertyId, editingUnit)
                  }
                >
                  <Modal.Body className="gap-5">
                    {actionError && (
                      <p className="text-sm text-danger">{actionError}</p>
                    )}
                    <TextField
                      isRequired
                      name="unitNumber"
                      type="number"
                      validate={(value) => {
                        const unitNumber = Number(value);
                        if (!Number.isInteger(unitNumber) || unitNumber < 1)
                          return "Enter a positive whole number";
                        if (
                          (unitsByProperty[editingUnit.propertyId] ?? []).some(
                            (unit) =>
                              unit.id !== editingUnit.id &&
                              unit.unitNumber === unitNumber,
                          )
                        )
                          return "That unit already exists";
                        return null;
                      }}
                    >
                      <Label>Unit number</Label>
                      <Input
                        autoFocus
                        defaultValue={String(editingUnit.unitNumber)}
                        min={1}
                      />
                      <FieldError />
                    </TextField>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button
                      className="w-full"
                      type="submit"
                      isDisabled={busyAction === `unit-update-${editingUnit.id}`}
                    >
                      Save changes
                    </Button>
                  </Modal.Footer>
                </Form>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      ) : null}

      {deletingUnit ? (
        <Modal
          isOpen
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setDeletingUnit(null);
              setActionError(null);
            }
          }}
        >
          <Modal.Backdrop>
            <Modal.Container placement="center" size="sm">
              <Modal.Dialog>
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Heading>Delete unit?</Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  {actionError ? (
                    <p className="text-sm text-danger">{actionError}</p>
                  ) : (
                    <p className="text-sm text-muted">
                      This is only available for units without tenants,
                      maintenance history, or pending invites.
                    </p>
                  )}
                </Modal.Body>
                <Modal.Footer>
                  <Button
                    type="button"
                    className="w-full text-danger"
                    variant="secondary"
                    isDisabled={busyAction === `unit-delete-${deletingUnit.id}`}
                    onPress={() =>
                      handleDeleteUnit(deletingUnit.propertyId, deletingUnit)
                    }
                  >
                    Delete
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      ) : null}

      {invitingUnit ? (
        <Modal
          isOpen
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setInvitingUnit(null);
              setInviteError(null);
              setSentInvite(null);
            }
          }}
        >
          <Modal.Backdrop>
            <Modal.Container placement="center" size="sm">
              <Modal.Dialog>
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Heading>Invite tenant</Modal.Heading>
                </Modal.Header>
                <Form
                  render={(props) => <form {...props} />}
                  onSubmit={handleSendInvite}
                >
                  <Modal.Body className="gap-5">
                    {sentInvite ? (
                      <div className="rounded-xl bg-success/10 px-3 py-2">
                        <p className="text-xs text-muted">Invite code</p>
                        <p className="mt-1 font-mono text-lg font-semibold tracking-normal">
                          {sentInvite.code}
                        </p>
                      </div>
                    ) : null}

                    {inviteError ? (
                      <p className="text-sm text-danger">{inviteError}</p>
                    ) : null}

                    <TextField
                      isRequired
                      name="sentToEmail"
                      type="email"
                    >
                      <Label>Email</Label>
                      <Input autoFocus placeholder="tenant@example.com" />
                      <FieldError />
                    </TextField>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button
                      className="w-full"
                      type="submit"
                      isDisabled={isSendingInvite}
                    >
                      {isSendingInvite ? "Sending..." : "Send invite"}
                    </Button>
                  </Modal.Footer>
                </Form>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      ) : null}

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
        <section className="overflow-hidden rounded-[2rem] border border-default/70 bg-surface shadow-sm">
          <div className="relative min-h-[680px] overflow-hidden bg-gradient-to-br from-slate-100 via-default/30 to-slate-200">
            <PortfolioProperties3D
              buildings={portfolioBuildings}
              className="h-[min(76vh,820px)] min-h-[680px] rounded-none border-0 bg-transparent shadow-none"
              selectedUnitId={selectedUnit?.id ?? null}
              onAddUnit={handleAddUnitFromGrid}
              onEditProperty={handleEditPropertyFromGrid}
              onDeleteProperty={handleDeletePropertyFromGrid}
              onSelectUnit={handleSelectUnit}
            />

            <div className="pointer-events-none absolute inset-x-4 top-4 z-10 flex flex-col gap-3 sm:inset-x-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="ios-glass pointer-events-auto flex flex-wrap justify-end gap-2 rounded-full p-1.5">
                <Chip size="sm" variant="soft">
                  {properties.length}{" "}
                  {properties.length === 1 ? "property" : "properties"}
                </Chip>
                <Chip size="sm" variant="soft">
                  {totalUnitCount} {totalUnitCount === 1 ? "unit" : "units"}
                </Chip>
                <Chip
                  color={activeRequests.length > 0 ? "danger" : "success"}
                  size="sm"
                  variant="soft"
                >
                  {activeRequests.length} active requests
                </Chip>
              </div>
            </div>

            <div className="ios-glass pointer-events-none absolute bottom-4 left-4 z-10 flex flex-wrap gap-2 rounded-3xl p-3 text-xs">
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
              <span className="text-muted">Double-click to center</span>
            </div>

            {selectedUnit ? (
              <aside className="ios-glass pointer-events-auto absolute inset-x-4 bottom-[4.5rem] z-20 max-h-[42%] overflow-y-auto rounded-3xl p-5 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:max-h-[calc(100%-10rem)] sm:w-[22rem]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="mt-1 text-xl font-semibold">
                      Unit {selectedUnit.unitNumber}
                    </h4>
                    {selectedUnitProperty && (
                      <p className="mt-1 text-sm text-muted">
                        {selectedUnitProperty.name}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Dropdown>
                      <Button
                        aria-label={`Unit ${selectedUnit.unitNumber} actions`}
                        isIconOnly
                        size="sm"
                        variant="secondary"
                      >
                        <Icon icon="gravity-ui:ellipsis" className="size-4" />
                      </Button>
                      <Dropdown.Popover>
                        <Dropdown.Menu
                          disabledKeys={
                            canDeleteSelectedUnit ? [] : ["delete"]
                          }
                          onAction={(key) => {
                            const action = String(key);
                            setActionError(null);
                            if (action === "invite") {
                              setInviteError(null);
                              setSentInvite(null);
                              setInvitingUnit(selectedUnit);
                            }
                            if (action === "edit") setEditingUnit(selectedUnit);
                            if (action === "delete" && canDeleteSelectedUnit) {
                              setDeletingUnit(selectedUnit);
                            }
                          }}
                        >
                          <Dropdown.Item id="invite" textValue="Invite tenant">
                            <div className="flex w-full items-center justify-between gap-3">
                              <Label>Invite tenant</Label>
                              <Kbd
                                className="ms-auto"
                                slot="keyboard"
                                variant="light"
                              >
                                <Kbd.Abbr keyValue="command" />
                                <Kbd.Content>I</Kbd.Content>
                              </Kbd>
                            </div>
                          </Dropdown.Item>
                          <Dropdown.Item id="edit" textValue="Edit unit">
                            <div className="flex w-full items-center justify-between gap-3">
                              <Label>Edit unit</Label>
                              <Kbd
                                className="ms-auto"
                                slot="keyboard"
                                variant="light"
                              >
                                <Kbd.Abbr keyValue="command" />
                                <Kbd.Content>E</Kbd.Content>
                              </Kbd>
                            </div>
                          </Dropdown.Item>
                          <Dropdown.Item
                            id="delete"
                            textValue={
                              canDeleteSelectedUnit
                                ? "Delete"
                                : "Delete blocked"
                            }
                            variant="danger"
                          >
                            <div className="flex w-full items-center justify-between gap-3">
                              <Label>
                                {canDeleteSelectedUnit
                                  ? "Delete"
                                  : "Delete blocked"}
                              </Label>
                              <Kbd
                                className="ms-auto"
                                slot="keyboard"
                                variant="light"
                              >
                                <Kbd.Abbr keyValue="command" />
                                <Kbd.Abbr keyValue="shift" />
                                <Kbd.Content>D</Kbd.Content>
                              </Kbd>
                            </div>
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown.Popover>
                    </Dropdown>
                    <Button
                      isIconOnly
                      aria-label="Clear selected unit"
                      size="sm"
                      variant="tertiary"
                      onPress={() => handleSelectUnit(null)}
                    >
                      <Icon icon="gravity-ui:xmark" className="size-4" />
                    </Button>
                  </div>
                </div>
                {!canDeleteSelectedUnit ? (
                  <p className="mt-2 text-xs text-muted">
                    Delete is blocked while this unit has tenants or maintenance
                    history.
                  </p>
                ) : null}

                <div className="mt-5 rounded-2xl bg-default/35 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Occupancy</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {selectedUnitTenants.length > 0
                          ? `${selectedUnitTenants.length} current ${
                              selectedUnitTenants.length === 1
                                ? "tenant"
                                : "tenants"
                            }`
                          : "No tenant assigned yet"}
                      </p>
                    </div>
                    {selectedUnitTenants.length > 0 ? (
                      <Chip color="success" size="sm" variant="soft">
                        Occupied
                      </Chip>
                    ) : (
                      <Chip size="sm" variant="soft">
                        Vacant
                      </Chip>
                    )}
                  </div>

                  {selectedUnitTenants.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {selectedUnitTenants.map((tenant) => (
                        <div
                          key={tenant.id}
                          className="rounded-xl bg-surface/70 px-3 py-2"
                        >
                          <p className="truncate text-sm font-medium">
                            {tenant.email}
                          </p>
                          <p className="mt-0.5 text-xs text-muted">
                            {tenant.role || "Assigned user"}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}

                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Active maintenance</p>
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
                          className="ios-glass-subtle rounded-2xl p-3"
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
            ) : totalUnitCount === 0 ? (
              <div className="ios-glass pointer-events-none absolute bottom-[4.5rem] right-4 z-20 max-w-xs rounded-3xl p-4 text-sm text-muted sm:bottom-5 sm:right-5">
                Use the Actions menu on a building label to add a unit and make it
                interactive.
              </div>
            ) : null}
          </div>
        </section>
      )}
    </main>
  );
}
