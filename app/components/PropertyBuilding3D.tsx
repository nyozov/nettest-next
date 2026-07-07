"use client";

import { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  ContactShadows,
  Edges,
  Html,
  OrbitControls,
  RoundedBox,
  useCursor,
} from "@react-three/drei";

export interface BuildingUnit {
  id: number;
  unitNumber: number;
  propertyId: number;
}

export interface BuildingRequest {
  id: number;
  status: number;
  unitId: number;
}

interface PropertyBuilding3DProps {
  units: BuildingUnit[];
  requests: BuildingRequest[];
  selectedUnitId: number | null;
  onSelectUnit: (unit: BuildingUnit | null) => void;

  /**
   * Optional wrapper height/classes.
   * Example: className="h-[640px]"
   */
  className?: string;
}

interface FloorGroup {
  floorNumber: number;
  units: BuildingUnit[];
}

const STATUS_LABEL: Record<number, string> = {
  0: "Open request",
  1: "In progress",
  2: "Resolved",
};

function inferFloor(unitNumber: number) {
  const safeUnitNumber = Math.abs(Math.trunc(unitNumber));

  if (safeUnitNumber >= 100) {
    return Math.max(1, Math.floor(safeUnitNumber / 100));
  }

  return 1;
}

function groupUnitsByFloor(units: BuildingUnit[]): FloorGroup[] {
  if (units.length === 0) return [];

  const groups = new Map<number, BuildingUnit[]>();

  units.forEach((unit) => {
    const floor = inferFloor(unit.unitNumber);
    groups.set(floor, [...(groups.get(floor) ?? []), unit]);
  });

  const maxFloor = Math.max(1, ...Array.from(groups.keys()));

  return Array.from({ length: maxFloor }, (_, index) => {
    const floorNumber = index + 1;

    return {
      floorNumber,
      units: [...(groups.get(floorNumber) ?? [])].sort(
        (first, second) => first.unitNumber - second.unitNumber,
      ),
    };
  });
}

function getPriorityRequestStatus(
  requests: BuildingRequest[],
  unitId?: number,
): number | null {
  let status: number | null = null;

  for (const request of requests) {
    if (unitId !== undefined && request.unitId !== unitId) continue;

    // Open request should always win visually.
    if (request.status === 0) return 0;

    // In-progress is second priority.
    if (request.status === 1) {
      status = 1;
      continue;
    }

    if (status === null) {
      status = request.status;
    }
  }

  return status;
}

function getStatusLabel(status: number | null) {
  if (status === null) return "No active requests";
  return STATUS_LABEL[status] ?? `Status ${status}`;
}

function getUnitVisual(status: number | null) {
  if (status === 0) {
    return {
      accent: "#d97706",
      dot: "bg-amber-500",
    };
  }

  if (status === 1) {
    return {
      accent: "#2563eb",
      dot: "bg-blue-500",
    };
  }

  if (status === 2) {
    return {
      accent: "#16a34a",
      dot: "bg-emerald-500",
    };
  }

  return {
    accent: "#94a3b8",
    dot: "bg-slate-300",
  };
}

function StatusLegendRow({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-600">
      <span className={`h-2 w-2 rounded-full ${className}`} />
      <span>{label}</span>
    </div>
  );
}

function PlaceholderFacadePanel({
  position,
  width,
  height,
}: {
  position: [number, number, number];
  width: number;
  height: number;
}) {
  return (
    <RoundedBox
      args={[width, height, 0.08]}
      radius={0.025}
      smoothness={3}
      position={position}
      receiveShadow
    >
      <meshStandardMaterial
        color="#edf2f7"
        roughness={0.58}
        metalness={0.03}
      />
    </RoundedBox>
  );
}

function UnitFacadePanel({
  unit,
  position,
  width,
  height,
  isSelected,
  requestStatus,
  onSelect,
}: {
  unit: BuildingUnit;
  position: [number, number, number];
  width: number;
  height: number;
  isSelected: boolean;
  requestStatus: number | null;
  onSelect: (unit: BuildingUnit) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  useCursor(isHovered, "pointer", "grab");

  const visual = getUnitVisual(requestStatus);

  const panelColor = "#22c55e";
  const panelOpacity = isSelected ? 0.58 : isHovered ? 0.46 : 0.32;

  const edgeColor = isSelected
    ? "#064e3b"
    : isHovered
      ? "#15803d"
      : "#86efac";

  return (
    <group
      position={position}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(unit);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setIsHovered(true);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        setIsHovered(false);
      }}
    >
      <RoundedBox
        args={[width, height, 0.14]}
        radius={0.035}
        smoothness={4}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={panelColor}
          roughness={0.26}
          metalness={0.02}
          transparent
          opacity={panelOpacity}
          depthWrite={false}
        />
        <Edges color={edgeColor} />
      </RoundedBox>

      <mesh position={[0, -height / 2 + 0.055, 0.085]} renderOrder={2}>
        <boxGeometry args={[width * 0.68, 0.035, 0.018]} />
        <meshStandardMaterial color={visual.accent} roughness={0.5} />
      </mesh>

      {isSelected ? (
        <mesh position={[0, 0, 0.105]} renderOrder={3}>
          <boxGeometry args={[width + 0.08, height + 0.08, 0.016]} />
          <meshStandardMaterial
            color="#16a34a"
            roughness={0.4}
            transparent
            opacity={0.22}
            depthWrite={false}
          />
        </mesh>
      ) : null}

      {(isHovered || isSelected) && (
        <Html center position={[0, height / 2 + 0.34, 0.24]} distanceFactor={8}>
          <div className="pointer-events-none whitespace-nowrap rounded-full border border-emerald-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-xl">
            Unit {unit.unitNumber} · {getStatusLabel(requestStatus)}
          </div>
        </Html>
      )}
    </group>
  );
}

function RoofEquipment({
  buildingWidth,
  buildingDepth,
  y,
}: {
  buildingWidth: number;
  buildingDepth: number;
  y: number;
}) {
  const equipmentCount = Math.min(4, Math.max(2, Math.floor(buildingWidth / 4)));

  return (
    <group>
      {Array.from({ length: equipmentCount }).map((_, index) => {
        const x = (index - (equipmentCount - 1) / 2) * 1.35;

        return (
          <RoundedBox
            key={index}
            args={[0.9, 0.28, 0.7]}
            radius={0.04}
            smoothness={3}
            position={[x, y, -buildingDepth * 0.12]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial color="#cbd5e1" roughness={0.72} />
            <Edges color="#94a3b8" />
          </RoundedBox>
        );
      })}
    </group>
  );
}

function BuildingScene({
  units,
  requests,
  selectedUnitId,
  onSelectUnit,
}: PropertyBuilding3DProps) {
  const floors = useMemo(() => groupUnitsByFloor(units), [units]);

  const visibleFloors =
    floors.length > 0
      ? floors
      : Array.from({ length: 4 }, (_, index) => ({
          floorNumber: index + 1,
          units: [],
        }));

  const floorHeight = 1.08;
  const podiumHeight = 0.82;
  const roofCapHeight = 0.2;

  const maxUnitsOnFloor = Math.max(
    4,
    ...visibleFloors.map((floor) => floor.units.length),
  );

  const panelWidth =
    maxUnitsOnFloor > 14
      ? 0.82
      : maxUnitsOnFloor > 10
        ? 0.96
        : maxUnitsOnFloor > 7
          ? 1.12
          : 1.38;

  const panelHeight = 0.78;
  const panelGap = 0.12;
  const pitch = panelWidth + panelGap;

  const facadeWidth =
    maxUnitsOnFloor * panelWidth + (maxUnitsOnFloor - 1) * panelGap;

  const buildingWidth = facadeWidth + 0.9;
  const buildingDepth = Math.max(3.4, Math.min(6.8, buildingWidth * 0.42));
  const bodyHeight = visibleFloors.length * floorHeight;
  const totalHeight = podiumHeight + bodyHeight + roofCapHeight + 0.38;

  const frontZ = buildingDepth / 2 + 0.07;
  const groundY = -totalHeight / 2 - 0.035;

  const requestStatusByUnit = useMemo(() => {
    const statuses = new Map<number, number>();

    units.forEach((unit) => {
      const status = getPriorityRequestStatus(requests, unit.id);
      if (status !== null) statuses.set(unit.id, status);
    });

    return statuses;
  }, [requests, units]);

  const slotX = (slotIndex: number) => {
    return (slotIndex - (maxUnitsOnFloor - 1) / 2) * pitch;
  };

  const showFloorLabel = (floor: FloorGroup, floorIndex: number) => {
    if (visibleFloors.length <= 14) return true;
    if (floorIndex === 0) return true;
    if (floorIndex === visibleFloors.length - 1) return true;
    return floor.floorNumber % 5 === 0;
  };

  return (
    <>
      <color attach="background" args={["#eef0f3"]} />
      <fog attach="fog" args={["#eef0f3", 24, 46]} />

      <ambientLight intensity={0.82} />
      <hemisphereLight intensity={0.75} groundColor="#e2e8f0" />
      <directionalLight
        castShadow
        intensity={2.25}
        position={[8, 14, 10]}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={18}
        shadow-camera-bottom={-12}
      />

      <group position={[0, -totalHeight / 2, 0]}>
        <RoundedBox
          args={[buildingWidth, bodyHeight + 0.24, buildingDepth]}
          radius={0.08}
          smoothness={5}
          position={[0, podiumHeight + bodyHeight / 2, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#f8fafc" roughness={0.76} />
        </RoundedBox>

        <RoundedBox
          args={[buildingWidth + 0.65, podiumHeight, buildingDepth + 0.38]}
          radius={0.08}
          smoothness={5}
          position={[0, podiumHeight / 2, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#e5e7eb" roughness={0.72} />
        </RoundedBox>

        {/* Lobby glazing */}
        {Array.from({ length: maxUnitsOnFloor }).map((_, slotIndex) => (
          <RoundedBox
            key={`podium-${slotIndex}`}
            args={[panelWidth, podiumHeight * 0.52, 0.09]}
            radius={0.025}
            smoothness={3}
            position={[slotX(slotIndex), podiumHeight / 2, frontZ + 0.025]}
            receiveShadow
          >
            <meshStandardMaterial
              color="#cbd5e1"
              roughness={0.32}
              metalness={0.06}
              transparent
              opacity={0.92}
            />
          </RoundedBox>
        ))}

        {/* Floors */}
        {visibleFloors.map((floor, floorIndex) => {
          const y = podiumHeight + floorIndex * floorHeight + floorHeight / 2;
          const firstSlot = Math.max(
            0,
            Math.floor((maxUnitsOnFloor - floor.units.length) / 2),
          );

          return (
            <group key={floor.floorNumber}>
              {Array.from({ length: maxUnitsOnFloor }).map((_, slotIndex) => (
                <PlaceholderFacadePanel
                  key={`floor-${floor.floorNumber}-placeholder-${slotIndex}`}
                  position={[slotX(slotIndex), y, frontZ]}
                  width={panelWidth}
                  height={panelHeight}
                />
              ))}

              {floor.units.map((unit, unitIndex) => {
                const slotIndex = Math.min(
                  maxUnitsOnFloor - 1,
                  firstSlot + unitIndex,
                );

                return (
                  <UnitFacadePanel
                    key={unit.id}
                    unit={unit}
                    position={[slotX(slotIndex), y, frontZ + 0.035]}
                    width={panelWidth}
                    height={panelHeight}
                    isSelected={selectedUnitId === unit.id}
                    requestStatus={requestStatusByUnit.get(unit.id) ?? null}
                    onSelect={onSelectUnit}
                  />
                );
              })}

              {showFloorLabel(floor, floorIndex) ? (
                <Html
                  center
                  position={[-buildingWidth / 2 - 0.48, y, frontZ + 0.08]}
                  distanceFactor={10}
                >
                  <div className="pointer-events-none rounded-md border border-slate-200 bg-white/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 shadow-sm">
                    F{floor.floorNumber}
                  </div>
                </Html>
              ) : null}
            </group>
          );
        })}

        {/* Horizontal slab lines */}
        {Array.from({ length: visibleFloors.length + 1 }).map((_, index) => {
          const y = podiumHeight + index * floorHeight;

          return (
            <mesh
              key={`slab-${index}`}
              position={[0, y, frontZ + 0.085]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[buildingWidth + 0.12, 0.04, 0.08]} />
              <meshStandardMaterial color="#cbd5e1" roughness={0.82} />
            </mesh>
          );
        })}

        {/* Vertical mullions */}
        {Array.from({ length: maxUnitsOnFloor + 1 }).map((_, index) => {
          const leftEdge = -facadeWidth / 2;
          const x = leftEdge + index * pitch - panelGap / 2;

          return (
            <mesh
              key={`mullion-${index}`}
              position={[x, podiumHeight + bodyHeight / 2, frontZ + 0.09]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[0.035, bodyHeight, 0.075]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.8} />
            </mesh>
          );
        })}

        {/* Roof cap */}
        <RoundedBox
          args={[buildingWidth + 0.55, roofCapHeight, buildingDepth + 0.28]}
          radius={0.055}
          smoothness={4}
          position={[0, podiumHeight + bodyHeight + roofCapHeight / 2, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#cbd5e1" roughness={0.78} />
        </RoundedBox>

        <RoofEquipment
          buildingWidth={buildingWidth}
          buildingDepth={buildingDepth}
          y={podiumHeight + bodyHeight + roofCapHeight + 0.18}
        />
      </group>

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, groundY, 0]}
        receiveShadow
      >
        <planeGeometry
          args={[
            Math.max(42, buildingWidth * 4),
            Math.max(42, buildingWidth * 4),
          ]}
        />
        <meshStandardMaterial color="#e5e7eb" roughness={1} />
      </mesh>

      <gridHelper
        args={[
          Math.max(42, buildingWidth * 4),
          42,
          "#cbd5e1",
          "#e2e8f0",
        ]}
        position={[0, groundY + 0.012, 0]}
      />

      <ContactShadows
        position={[0, groundY + 0.015, 0]}
        opacity={0.28}
        scale={Math.max(20, buildingWidth * 2.4)}
        blur={2.6}
        far={16}
      />

      <OrbitControls
        makeDefault
        target={[0, 0, 0]}
        minDistance={Math.max(7, buildingWidth * 0.85)}
        maxDistance={Math.max(26, totalHeight * 2.2, buildingWidth * 3)}
        maxPolarAngle={Math.PI / 2.08}
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
      />
    </>
  );
}

export default function PropertyBuilding3D(props: PropertyBuilding3DProps) {
  const floors = useMemo(() => groupUnitsByFloor(props.units), [props.units]);

  const floorCount = Math.max(4, floors.length);
  const maxUnitsOnFloor = Math.max(
    4,
    ...floors.map((floor) => floor.units.length),
  );

  const openRequestCount = props.requests.filter(
    (request) => request.status === 0,
  ).length;

  const activeRequestCount = props.requests.filter(
    (request) => request.status === 1,
  ).length;

  const cameraDistance = Math.max(13, maxUnitsOnFloor * 1.3 + floorCount * 0.22);
  const cameraHeight = Math.max(6, floorCount * 0.58 + 4.5);

  return (
    <div
      className={`relative h-[560px] min-h-[420px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm ${
        props.className ?? ""
      }`}
    >
      

      <div className="pointer-events-none absolute bottom-4 right-4 z-10 rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm backdrop-blur-md">
        Drag to rotate · Click a green unit
      </div>

      {(openRequestCount > 0 || activeRequestCount > 0) && (
        <div className="pointer-events-none absolute right-4 top-4 z-10 rounded-2xl border border-white/70 bg-white/85 p-3 shadow-lg backdrop-blur-md">
          {openRequestCount > 0 ? (
            <div className="text-xs font-medium text-amber-700">
              {openRequestCount} open
            </div>
          ) : null}

          {activeRequestCount > 0 ? (
            <div className="text-xs font-medium text-blue-700">
              {activeRequestCount} in progress
            </div>
          ) : null}
        </div>
      )}

      <Canvas
        shadows
        dpr={[1, 1.75]}
        gl={{ antialias: true }}
        camera={{
          position: [cameraDistance * 0.72, cameraHeight, cameraDistance],
          fov: 39,
        }}
        style={{ height: "100%", width: "100%", cursor: "grab" }}
        onPointerMissed={() => props.onSelectUnit(null)}
      >
        <BuildingScene {...props} />
      </Canvas>
    </div>
  );
}