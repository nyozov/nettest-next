"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Vector3 } from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
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

export interface BuildingProperty {
  id: number;
  name: string;
  address: string;
}

export interface PortfolioBuilding {
  property: BuildingProperty;
  units: BuildingUnit[];
  requests: BuildingRequest[];
}

interface PropertyBuilding3DProps {
  units: BuildingUnit[];
  requests: BuildingRequest[];
  selectedUnitId: number | null;
  onSelectUnit: (unit: BuildingUnit | null) => void;
  showHud?: boolean;

  /**
   * Optional wrapper height/classes.
   * Example: className="h-[640px]"
   */
  className?: string;
}

interface PortfolioProperties3DProps {
  buildings: PortfolioBuilding[];
  selectedUnitId: number | null;
  onSelectUnit: (unit: BuildingUnit | null) => void;
  onAddUnit?: (property: BuildingProperty) => void;
  className?: string;
}

interface FloorGroup {
  floorNumber: number;
  units: BuildingUnit[];
}

interface BuildingMetrics {
  visibleFloors: FloorGroup[];
  floorHeight: number;
  podiumHeight: number;
  roofCapHeight: number;
  maxUnitsOnFloor: number;
  panelWidth: number;
  panelHeight: number;
  panelGap: number;
  pitch: number;
  facadeWidth: number;
  buildingWidth: number;
  buildingDepth: number;
  bodyHeight: number;
  totalHeight: number;
  frontZ: number;
}

type VectorTuple = [number, number, number];

interface CameraFocus {
  target: VectorTuple;
  camera: VectorTuple;
  token: number;
}

interface CameraControls {
  target: Vector3;
  update: () => void;
  addEventListener: (type: "start", listener: () => void) => void;
  removeEventListener: (type: "start", listener: () => void) => void;
}

const HTML_OVERLAY_Z_INDEX_RANGE: [number, number] = [5, 0];
const UNIT_AVAILABLE_COLOR = "#22c55e";
const UNIT_OPEN_REQUEST_COLOR = "#f59e0b";
const UNIT_IN_PROGRESS_COLOR = "#2563eb";

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

function getActiveRequestStatuses(
  requests: BuildingRequest[],
  unitId?: number,
): number[] {
  return requests
    .filter((request) => {
      if (unitId !== undefined && request.unitId !== unitId) return false;
      return request.status === 0 || request.status === 1;
    })
    .map((request) => request.status);
}

function getRequestStatusColor(status: number) {
  if (status === 0) return UNIT_OPEN_REQUEST_COLOR;
  if (status === 1) return UNIT_IN_PROGRESS_COLOR;
  return UNIT_AVAILABLE_COLOR;
}

function getBuildingMetrics(units: BuildingUnit[]): BuildingMetrics {
  const floors = groupUnitsByFloor(units);
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

  return {
    visibleFloors,
    floorHeight,
    podiumHeight,
    roofCapHeight,
    maxUnitsOnFloor,
    panelWidth,
    panelHeight,
    panelGap,
    pitch,
    facadeWidth,
    buildingWidth,
    buildingDepth,
    bodyHeight,
    totalHeight,
    frontZ,
  };
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
      <meshStandardMaterial color="#edf2f7" roughness={0.58} metalness={0.03} />
    </RoundedBox>
  );
}

function UnitFacadePanel({
  unit,
  position,
  width,
  height,
  isSelected,
  requestStatuses,
  onSelect,
}: {
  unit: BuildingUnit;
  position: [number, number, number];
  width: number;
  height: number;
  isSelected: boolean;
  requestStatuses: number[];
  onSelect: (unit: BuildingUnit) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  useCursor(isHovered, "pointer", "grab");

  const hasActiveRequests = requestStatuses.length > 0;
  const panelSegments =
    hasActiveRequests ? requestStatuses : [Number.NaN];
  const panelOpacity = hasActiveRequests
    ? isSelected
      ? 0.32
      : isHovered
        ? 0.24
        : 0.16
    : isSelected
      ? 0.58
      : isHovered
        ? 0.46
        : 0.32;

  const edgeColor = isSelected ? "#0f172a" : isHovered ? "#334155" : "#86efac";

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
          color={UNIT_AVAILABLE_COLOR}
          roughness={0.26}
          metalness={0.02}
          transparent
          opacity={panelOpacity}
          depthWrite={false}
        />
        <Edges color={edgeColor} />
      </RoundedBox>

      {panelSegments.map((status, index) => {
        const segmentHeight = height / panelSegments.length;
        const y = height / 2 - segmentHeight / 2 - index * segmentHeight;
        const color = Number.isNaN(status)
          ? UNIT_AVAILABLE_COLOR
          : getRequestStatusColor(status);

        return (
          <mesh
            key={`${unit.id}-status-${index}`}
            position={[0, y, 0.09 + index * 0.001]}
            renderOrder={2 + index}
          >
            <boxGeometry args={[width * 0.92, segmentHeight * 0.9, 0.018]} />
            <meshStandardMaterial
              color={color}
              roughness={0.32}
              metalness={0.03}
              transparent
              opacity={
                hasActiveRequests
                  ? isSelected
                    ? 0.94
                    : isHovered
                      ? 0.9
                      : 0.84
                  : isSelected
                    ? 0.76
                    : isHovered
                      ? 0.68
                      : 0.56
              }
              depthWrite={false}
            />
          </mesh>
        );
      })}

      {isSelected ? (
        <mesh position={[0, 0, 0.12]} renderOrder={30}>
          <boxGeometry args={[width + 0.08, height + 0.08, 0.016]} />
          <meshStandardMaterial
            color="#f8fafc"
            roughness={0.4}
            transparent
            opacity={0.24}
            depthWrite={false}
          />
        </mesh>
      ) : null}

      {(isHovered || isSelected) && (
        <Html
          center
          distanceFactor={8}
          position={[0, height / 2 + 0.34, 0.24]}
          zIndexRange={HTML_OVERLAY_Z_INDEX_RANGE}
        >
          <div className="ios-glass pointer-events-none whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold text-slate-900">
            Unit {unit.unitNumber}
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
  const equipmentCount = Math.min(
    4,
    Math.max(2, Math.floor(buildingWidth / 4)),
  );

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

function PropertyLabel({
  property,
  unitCount,
  activeRequestCount,
  position,
  distanceFactor = 14,
  onAddUnit,
}: {
  property: BuildingProperty;
  unitCount: number;
  activeRequestCount: number;
  position: [number, number, number];
  distanceFactor?: number;
  onAddUnit?: (property: BuildingProperty) => void;
}) {
  return (
    <Html
      center
      distanceFactor={distanceFactor}
      position={position}
      zIndexRange={HTML_OVERLAY_Z_INDEX_RANGE}
    >
      <div className="ios-glass pointer-events-auto min-w-56 rounded-3xl p-3 text-slate-900">
        <p className="truncate text-sm font-semibold">{property.name}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-slate-600">
          {property.address}
        </p>
        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-600">
          <span>
            {unitCount} {unitCount === 1 ? "unit" : "units"}
          </span>
          <span
            className={
              activeRequestCount > 0 ? "text-amber-700" : "text-emerald-700"
            }
          >
            {activeRequestCount} active
          </span>
        </div>
        {onAddUnit ? (
          <button
            type="button"
            className="mt-3 w-full rounded-full bg-slate-950 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-slate-800 cursor-pointer"
            onClick={(event) => {
              event.stopPropagation();
              onAddUnit(property);
            }}
            onDoubleClick={(event) => event.stopPropagation()}
          >
            Add unit
          </button>
        ) : null}
      </div>
    </Html>
  );
}

function BuildingModel({
  units,
  requests,
  selectedUnitId,
  onSelectUnit,
  property,
  onAddUnit,
  position = [0, 0, 0],
  showPropertyLabel = false,
  showFloorLabels = true,
  onSceneDoubleClick,
}: {
  units: BuildingUnit[];
  requests: BuildingRequest[];
  selectedUnitId: number | null;
  onSelectUnit: (unit: BuildingUnit | null) => void;
  property?: BuildingProperty;
  onAddUnit?: (property: BuildingProperty) => void;
  position?: [number, number, number];
  showPropertyLabel?: boolean;
  showFloorLabels?: boolean;
  onSceneDoubleClick?: (point: Vector3) => void;
}) {
  const metrics = useMemo(() => getBuildingMetrics(units), [units]);

  const {
    visibleFloors,
    floorHeight,
    podiumHeight,
    roofCapHeight,
    maxUnitsOnFloor,
    panelWidth,
    panelHeight,
    panelGap,
    pitch,
    facadeWidth,
    buildingWidth,
    buildingDepth,
    bodyHeight,
    totalHeight,
    frontZ,
  } = metrics;

  const requestStatusesByUnit = useMemo(() => {
    const statuses = new Map<number, number[]>();

    units.forEach((unit) => {
      const unitStatuses = getActiveRequestStatuses(requests, unit.id);
      if (unitStatuses.length > 0) statuses.set(unit.id, unitStatuses);
    });

    return statuses;
  }, [requests, units]);

  const activeRequestCount = requests.filter(
    (request) => request.status === 0 || request.status === 1,
  ).length;

  const slotX = (slotIndex: number) => {
    return (slotIndex - (maxUnitsOnFloor - 1) / 2) * pitch;
  };

  const showFloorLabel = (floor: FloorGroup, floorIndex: number) => {
    if (!showFloorLabels) return false;
    if (visibleFloors.length <= 14) return true;
    if (floorIndex === 0) return true;
    if (floorIndex === visibleFloors.length - 1) return true;
    return floor.floorNumber % 5 === 0;
  };

  return (
    <group
      position={position}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onSceneDoubleClick?.(event.point.clone());
      }}
    >
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
                    requestStatuses={requestStatusesByUnit.get(unit.id) ?? []}
                    onSelect={onSelectUnit}
                  />
                );
              })}

              {showFloorLabel(floor, floorIndex) ? (
                <Html
                  center
                  zIndexRange={HTML_OVERLAY_Z_INDEX_RANGE}
                  position={[-buildingWidth / 2 - 0.48, y, frontZ + 0.08]}
                  distanceFactor={10}
                >
                  <div className="ios-glass-subtle pointer-events-none rounded-xl px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    F{floor.floorNumber}
                  </div>
                </Html>
              ) : null}
            </group>
          );
        })}

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

      {showPropertyLabel && property ? (
        <PropertyLabel
          property={property}
          unitCount={units.length}
          activeRequestCount={activeRequestCount}
          onAddUnit={onAddUnit}
          position={[0, totalHeight / 2 + 1.25, metrics.frontZ + 0.2]}
        />
      ) : null}
    </group>
  );
}

function SceneLights({ shadowSize = 18 }: { shadowSize?: number }) {
  return (
    <>
      <ambientLight intensity={0.82} />
      <hemisphereLight intensity={0.75} groundColor="#e2e8f0" />
      <directionalLight
        castShadow
        intensity={2.25}
        position={[8, 14, 10]}
        shadow-normalBias={0.04}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-shadowSize}
        shadow-camera-right={shadowSize}
        shadow-camera-top={shadowSize}
        shadow-camera-bottom={-shadowSize}
      />
    </>
  );
}

function CameraFocusController({
  focus,
  onComplete,
}: {
  focus: CameraFocus;
  onComplete: () => void;
}) {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls) as unknown as
    CameraControls | undefined;
  const invalidate = useThree((state) => state.invalidate);
  const isAnimatingRef = useRef(true);
  const startedRef = useRef(false);

  const targetPosition = useMemo(
    () => new Vector3(...focus.target),
    [focus.target],
  );
  const cameraPosition = useMemo(
    () => new Vector3(...focus.camera),
    [focus.camera],
  );

  useEffect(() => {
    isAnimatingRef.current = true;
    startedRef.current = false;
    invalidate();
  }, [focus.token, invalidate]);

  useEffect(() => {
    if (!controls) return;

    const cancelFocus = () => {
      if (!startedRef.current) return;
      isAnimatingRef.current = false;
      onComplete();
    };

    controls.addEventListener("start", cancelFocus);
    return () => controls.removeEventListener("start", cancelFocus);
  }, [controls, onComplete]);

  useFrame(() => {
    if (!isAnimatingRef.current) return;

    startedRef.current = true;
    camera.position.lerp(cameraPosition, 0.09);

    if (controls) {
      controls.target.lerp(targetPosition, 0.12);
      controls.update();
    }

    const isCameraSettled = camera.position.distanceTo(cameraPosition) < 0.05;
    const isTargetSettled =
      !controls || controls.target.distanceTo(targetPosition) < 0.05;

    if (!isCameraSettled || !isTargetSettled) {
      invalidate();
    } else {
      camera.position.copy(cameraPosition);
      if (controls) {
        controls.target.copy(targetPosition);
        controls.update();
      }
      isAnimatingRef.current = false;
      onComplete();
    }
  });

  return null;
}

function SingleBuildingScene({
  units,
  requests,
  selectedUnitId,
  onSelectUnit,
}: PropertyBuilding3DProps) {
  const metrics = useMemo(() => getBuildingMetrics(units), [units]);
  const groundY = -metrics.totalHeight / 2 - 0.035;

  return (
    <>
      <color attach="background" args={["#eef0f3"]} />
      <fog attach="fog" args={["#eef0f3", 24, 46]} />
      <SceneLights />

      <BuildingModel
        units={units}
        requests={requests}
        selectedUnitId={selectedUnitId}
        onSelectUnit={onSelectUnit}
      />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, groundY, 0]}
        receiveShadow
      >
        <planeGeometry
          args={[
            Math.max(42, metrics.buildingWidth * 4),
            Math.max(42, metrics.buildingWidth * 4),
          ]}
        />
        <meshStandardMaterial color="#e5e7eb" roughness={1} />
      </mesh>

      <gridHelper
        args={[
          Math.max(42, metrics.buildingWidth * 4),
          42,
          "#cbd5e1",
          "#e2e8f0",
        ]}
        position={[0, groundY + 0.012, 0]}
      />

      <ContactShadows
        frames={1}
        position={[0, groundY + 0.015, 0]}
        opacity={0.28}
        scale={Math.max(20, metrics.buildingWidth * 2.4)}
        blur={2.6}
        far={16}
      />

      <OrbitControls
        makeDefault
        target={[0, 0, 0]}
        minDistance={Math.max(7, metrics.buildingWidth * 0.85)}
        maxDistance={Math.max(
          26,
          metrics.totalHeight * 2.2,
          metrics.buildingWidth * 3,
        )}
        maxPolarAngle={Math.PI / 2.08}
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
      />
    </>
  );
}

function getPortfolioLayout(buildings: PortfolioBuilding[]) {
  const count = Math.max(1, buildings.length);
  const columns = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);
  const metrics = buildings.map((building) =>
    getBuildingMetrics(building.units),
  );
  const maxWidth = Math.max(6, ...metrics.map((item) => item.buildingWidth));
  const maxDepth = Math.max(4, ...metrics.map((item) => item.buildingDepth));
  const spacingX = Math.max(11, maxWidth + 5.5);
  const spacingZ = Math.max(10, maxDepth + 7);
  const worldWidth = Math.max(32, columns * spacingX + 14);
  const worldDepth = Math.max(32, rows * spacingZ + 14);

  return {
    columns,
    rows,
    metrics,
    spacingX,
    spacingZ,
    worldWidth,
    worldDepth,
    worldSize: Math.max(worldWidth, worldDepth),
  };
}

function PortfolioScene({
  buildings,
  selectedUnitId,
  onSelectUnit,
  onAddUnit,
  focus,
  onFocus,
  onFocusComplete,
}: PortfolioProperties3DProps & {
  focus: CameraFocus | null;
  onFocus: (focus: CameraFocus) => void;
  onFocusComplete: () => void;
}) {
  const layout = useMemo(() => getPortfolioLayout(buildings), [buildings]);
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls) as unknown as
    CameraControls | undefined;
  const targetY = 0.6;

  const focusOnPoint = (point: Vector3) => {
    const currentTarget =
      controls?.target.clone() ?? new Vector3(0, targetY, 0);
    const nextTarget = new Vector3(point.x, currentTarget.y, point.z);
    const delta = nextTarget.clone().sub(currentTarget);
    const nextCamera = camera.position.clone().add(delta);

    onFocus({
      target: nextTarget.toArray() as VectorTuple,
      camera: nextCamera.toArray() as VectorTuple,
      token: Date.now(),
    });
  };

  return (
    <>
      <color attach="background" args={["#eef0f3"]} />
      <fog attach="fog" args={["#eef0f3", 38, 82]} />
      <SceneLights shadowSize={layout.worldSize / 1.4} />
      {focus ? (
        <CameraFocusController focus={focus} onComplete={onFocusComplete} />
      ) : null}

      {buildings.map((building, index) => {
        const column = index % layout.columns;
        const row = Math.floor(index / layout.columns);
        const x = (column - (layout.columns - 1) / 2) * layout.spacingX;
        const z = (row - (layout.rows - 1) / 2) * layout.spacingZ;
        const metrics =
          layout.metrics[index] ?? getBuildingMetrics(building.units);

        return (
          <BuildingModel
            key={building.property.id}
            property={building.property}
            units={building.units}
            requests={building.requests}
            selectedUnitId={selectedUnitId}
            showPropertyLabel
            showFloorLabels={layout.worldSize < 58}
            position={[x, metrics.totalHeight / 2 + 0.02, z]}
            onAddUnit={onAddUnit}
            onSceneDoubleClick={focusOnPoint}
            onSelectUnit={onSelectUnit}
          />
        );
      })}

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.04, 0]}
        receiveShadow
        onDoubleClick={(event) => {
          event.stopPropagation();
          focusOnPoint(event.point.clone());
        }}
      >
        <planeGeometry args={[layout.worldSize, layout.worldSize]} />
        <meshStandardMaterial color="#e5e7eb" roughness={1} />
      </mesh>

      <gridHelper
        args={[
          layout.worldSize,
          Math.max(28, Math.round(layout.worldSize)),
          "#cbd5e1",
          "#e2e8f0",
        ]}
        position={[0, -0.025, 0]}
      />

      <ContactShadows
        frames={1}
        position={[0, -0.02, 0]}
        opacity={0.26}
        scale={layout.worldSize * 0.72}
        blur={2.8}
        far={20}
      />

      <OrbitControls
        makeDefault
        target={[0, targetY, 0]}
        minDistance={Math.max(12, layout.worldSize * 0.28)}
        maxDistance={Math.max(42, layout.worldSize * 1.35)}
        maxPolarAngle={Math.PI / 2.08}
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
      />
    </>
  );
}

export function PortfolioProperties3D(props: PortfolioProperties3DProps) {
  const layout = useMemo(
    () => getPortfolioLayout(props.buildings),
    [props.buildings],
  );
  const cameraDistance = Math.max(24, layout.worldSize * 0.68);
  const cameraHeight = Math.max(12, layout.rows * 4.5 + 8);
  const initialCamera: VectorTuple = [
    cameraDistance * 0.82,
    cameraHeight,
    cameraDistance,
  ];
  const [focus, setFocus] = useState<CameraFocus | null>(null);

  return (
    <div
      className={`relative h-[640px] min-h-[520px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm ${
        props.className ?? ""
      }`}
    >
      <Canvas
        shadows
        frameloop="demand"
        dpr={[1, 1.75]}
        gl={{ antialias: true }}
        camera={{
          position: initialCamera,
          fov: 42,
        }}
        style={{ height: "100%", width: "100%", cursor: "grab" }}
        onPointerMissed={() => props.onSelectUnit(null)}
      >
        <PortfolioScene
          {...props}
          focus={focus}
          onFocus={setFocus}
          onFocusComplete={() => setFocus(null)}
        />
      </Canvas>
    </div>
  );
}

export default function PropertyBuilding3D(props: PropertyBuilding3DProps) {
  const metrics = useMemo(() => getBuildingMetrics(props.units), [props.units]);

  const openRequestCount = props.requests.filter(
    (request) => request.status === 0,
  ).length;

  const activeRequestCount = props.requests.filter(
    (request) => request.status === 1,
  ).length;

  const cameraDistance = Math.max(
    13,
    metrics.maxUnitsOnFloor * 1.3 + metrics.visibleFloors.length * 0.22,
  );
  const cameraHeight = Math.max(6, metrics.visibleFloors.length * 0.58 + 4.5);

  return (
    <div
      className={`relative h-[560px] min-h-[420px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm ${
        props.className ?? ""
      }`}
    >
      {props.showHud !== false && (
        <div className="ios-glass pointer-events-none absolute bottom-4 right-4 z-10 rounded-full px-3 py-1.5 text-xs font-medium text-slate-500">
          Drag to rotate · Click a green unit
        </div>
      )}

      {props.showHud !== false &&
        (openRequestCount > 0 || activeRequestCount > 0) && (
          <div className="ios-glass pointer-events-none absolute right-4 top-4 z-10 rounded-3xl p-3">
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
        frameloop="demand"
        dpr={[1, 1.75]}
        gl={{ antialias: true }}
        camera={{
          position: [cameraDistance * 0.72, cameraHeight, cameraDistance],
          fov: 39,
        }}
        style={{ height: "100%", width: "100%", cursor: "grab" }}
        onPointerMissed={() => props.onSelectUnit(null)}
      >
        <SingleBuildingScene {...props} />
      </Canvas>
    </div>
  );
}
