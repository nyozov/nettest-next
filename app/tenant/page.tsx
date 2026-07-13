"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  FieldError,
  Form,
  Input,
  Label,
  Modal,
  TextArea,
  TextField,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useApiFetch, useAuth } from "../context/AuthContext";

const apiUrl = "http://localhost:5259/api";

interface TenantDashboard {
  email: string;
  unit: {
    id: number;
    unitNumber: number;
    property: {
      name: string;
      address: string;
    };
  };
}

export default function TenantDashboardPage() {
  const { user, isLoading } = useAuth();
  const apiFetch = useApiFetch();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<TenantDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);
  const [selectedImageNames, setSelectedImageNames] = useState<string[]>([]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/auth");
      return;
    }
    if (user.role !== "Tenant") {
      router.replace("/");
    }
  }, [isLoading, router, user]);

  useEffect(() => {
    if (!user || user.role !== "Tenant") return;

    apiFetch(`${apiUrl}/tenant/me`)
      .then(async (response) => {
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Could not load your dashboard.");
        }

        return response.json() as Promise<TenantDashboard>;
      })
      .then(setDashboard)
      .catch((loadError) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load your dashboard.",
        );
      });
  }, [apiFetch, user]);

  const handleCreateRequest = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!dashboard) return;

    setIsSubmittingRequest(true);
    setRequestError(null);
    setRequestSuccess(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const requestFormData = new FormData();
    requestFormData.set(
      "title",
      String(formData.get("title") ?? "").trim(),
    );
    requestFormData.set(
      "description",
      String(formData.get("description") ?? "").trim(),
    );

    formData
      .getAll("images")
      .filter((value): value is File => value instanceof File && value.size > 0)
      .slice(0, 5)
      .forEach((image) => requestFormData.append("images", image));

    try {
      const response = await apiFetch(
        `${apiUrl}/units/${dashboard.unit.id}/requests`,
        {
          method: "POST",
          body: requestFormData,
        },
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Could not create the maintenance request.");
      }

      form.reset();
      setSelectedImageNames([]);
      setIsRequestModalOpen(false);
      setRequestSuccess("Maintenance request created.");
    } catch (createError) {
      setRequestError(
        createError instanceof Error
          ? createError.message
          : "Could not create the maintenance request.",
      );
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  if (isLoading || !user || user.role !== "Tenant") {
    return <p className="p-6 text-sm text-muted">Redirecting...</p>;
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-6 sm:py-10">
      <div className="mb-8">
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Welcome home
        </h1>
      </div>

      {error ? (
        <div className="rounded-2xl border border-danger/30 bg-danger/5 p-6">
          <p className="text-sm text-danger">{error}</p>
        </div>
      ) : !dashboard ? (
        <div className="h-56 animate-pulse rounded-2xl bg-default/30" />
      ) : (
        <>
          {requestSuccess && (
            <div className="mb-4 rounded-2xl border border-success/30 bg-success/5 p-4">
              <p className="text-sm text-success">{requestSuccess}</p>
            </div>
          )}

          <section className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[2rem] border border-default/70 bg-surface p-6 shadow-sm">
              <div className="mb-8 flex size-12 items-center justify-center rounded-2xl bg-foreground text-background">
                <Icon icon="gravity-ui:house" className="size-5" />
              </div>
              <p className="text-sm text-muted">Property</p>
              <h2 className="mt-2 text-3xl font-semibold">
                {dashboard.unit.property.name}
              </h2>
              <p className="mt-2 text-sm text-muted">
                {dashboard.unit.property.address}
              </p>
            </div>

            <div className="rounded-[2rem] border border-default/70 bg-surface p-6 shadow-sm">
              <p className="text-sm text-muted">Your unit</p>
              <p className="mt-4 text-6xl font-semibold tracking-tight">
                {dashboard.unit.unitNumber}
              </p>
              <p className="mt-4 text-sm text-muted">{dashboard.email}</p>

              <Modal
                isOpen={isRequestModalOpen}
                onOpenChange={(isOpen) => {
                  setIsRequestModalOpen(isOpen);
                  if (!isOpen) {
                    setRequestError(null);
                    setSelectedImageNames([]);
                  }
                }}
              >
                <Modal.Trigger>
                  <Button
                    className="mt-8"
                    onPress={() => {
                      setRequestSuccess(null);
                      setRequestError(null);
                    }}
                  >
                    <Icon icon="gravity-ui:wrench" className="size-4" />
                    New maintenance request
                  </Button>
                </Modal.Trigger>
                <Modal.Backdrop>
                  <Modal.Container placement="center" size="md">
                    <Modal.Dialog>
                      <Modal.CloseTrigger />
                      <Modal.Header>
                        <Modal.Heading>Maintenance request</Modal.Heading>
                      </Modal.Header>

                      <Form
                        render={(props) => <form {...props} />}
                        onSubmit={handleCreateRequest}
                      >
                        <Modal.Body className="gap-5">
                          {requestError && (
                            <p className="text-sm text-danger">
                              {requestError}
                            </p>
                          )}

                          <TextField isRequired name="title">
                            <Label>Title</Label>
                            <Input placeholder="Kitchen sink leak" />
                            <FieldError />
                          </TextField>

                          <TextField isRequired name="description">
                            <Label>Description</Label>
                            <TextArea placeholder="Describe what is happening and where." />
                            <FieldError />
                          </TextField>

                          <div className="grid gap-2">
                            <Label htmlFor="maintenance-request-images">
                              Images
                            </Label>
                            <label
                              className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-default/70 bg-surface px-3 py-3 text-sm transition hover:border-foreground/30"
                              htmlFor="maintenance-request-images"
                            >
                              <span className="flex min-w-0 items-center gap-2 text-muted">
                                <Icon
                                  icon="gravity-ui:picture"
                                  className="size-4 shrink-0"
                                />
                                <span className="truncate">
                                  {selectedImageNames.length > 0
                                    ? `${selectedImageNames.length} image${
                                        selectedImageNames.length === 1
                                          ? ""
                                          : "s"
                                      } selected`
                                    : "Choose images"}
                                </span>
                              </span>
                              <span className="shrink-0 rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background">
                                Browse
                              </span>
                            </label>
                            <input
                              id="maintenance-request-images"
                              accept="image/jpeg,image/png,image/webp,image/gif"
                              className="sr-only"
                              multiple
                              name="images"
                              type="file"
                              onChange={(event) => {
                                const files = Array.from(
                                  event.currentTarget.files ?? [],
                                ).slice(0, 5);
                                setSelectedImageNames(
                                  files.map((file) => file.name),
                                );
                              }}
                            />
                          </div>

                          {selectedImageNames.length > 0 ? (
                            <div className="rounded-2xl bg-default/35 p-3">
                              <div className="flex items-center gap-2 text-xs font-medium text-muted">
                                <Icon icon="gravity-ui:picture" className="size-4" />
                                {selectedImageNames.length} selected
                              </div>
                              <div className="mt-2 space-y-1">
                                {selectedImageNames.map((name, index) => (
                                  <p
                                    key={`${name}-${index}`}
                                    className="truncate text-xs text-muted"
                                  >
                                    {name}
                                  </p>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </Modal.Body>

                        <Modal.Footer>
                          <Button
                            className="w-full"
                            type="submit"
                            isDisabled={isSubmittingRequest}
                          >
                            {isSubmittingRequest
                              ? "Creating..."
                              : "Create request"}
                          </Button>
                        </Modal.Footer>
                      </Form>
                    </Modal.Dialog>
                  </Modal.Container>
                </Modal.Backdrop>
              </Modal>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
