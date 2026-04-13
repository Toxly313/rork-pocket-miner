import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import {
  Clock3,
  Coins,
  Gem,
  Hammer,
  House,
  Package,
  Store,
  Users,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  GestureResponderEvent,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import {
  BUILD_MENU,
  BUILDING_CATEGORY_LABELS,
  BUILDING_CATEGORY_ORDER,
  BUILDING_TEMPLATES,
  BuildingCategory,
  BuildingType,
  GUILD_ACTIVITIES,
  GUILD_MEMBERS,
  HubTab,
  INITIAL_BUILDINGS,
  INITIAL_RESOURCES,
  PlacedBuilding,
  ResourceState,
  SHOP_OFFERS,
  TerrainType,
  VILLAGE_GRID,
} from "@/constants/village";

type SpendableResource = "gold" | "elixir" | "gems";

interface ViewportSize {
  width: number;
  height: number;
}

interface CameraState {
  x: number;
  y: number;
}

interface PlacementResult {
  ok: boolean;
  reason: string;
}

interface HubButtonProps {
  label: string;
  active: boolean;
  icon: React.ReactNode;
  onPress: () => void;
  testID: string;
}

interface BuildOptionProps {
  type: BuildingType;
  active: boolean;
  onPress: () => void;
}

interface ShopOfferCardProps {
  title: string;
  subtitle: string;
  badge: string;
  price: string;
  highlight: string;
}

interface GuildMemberRowProps {
  name: string;
  role: string;
  trophies: number;
  online: boolean;
}

interface GuildActivityCardProps {
  title: string;
  body: string;
  reward: string;
}

interface VisibleRange {
  startCol: number;
  endCol: number;
  startRow: number;
  endRow: number;
}

interface TerrainFeatureTile {
  key: string;
  left: number;
  top: number;
  width: number;
  height: number;
  color: string;
}

interface TerrainMarker {
  key: string;
  x: number;
  y: number;
  terrain: TerrainType;
  color: string;
}

interface GridLineData {
  key: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

interface BuildingTapState {
  buildingId: string | null;
  occurredAt: number;
}

interface BuildingPlaceholderCard {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
}

interface BuildingLayoutData {
  building: PlacedBuilding;
  rect: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

const TILE_BUFFER = 2;
const TAP_MOVE_THRESHOLD = 4;
const MIN_ZOOM = 0.82;
const MAX_ZOOM = 1.25;
const DRAG_RELEASE_COOLDOWN_MS = 80;
const GRID_HIDE_ZOOM = 1.08;
const DOUBLE_TAP_DELAY_MS = 260;
const INTERACTION_SETTLE_DELAY_MS = 96;

function getTerrainAt(x: number, y: number): TerrainType {
  const cols = VILLAGE_GRID.columns;
  const rows = VILLAGE_GRID.rows;
  const cx = cols / 2;
  const cy = rows / 2;
  const terrainScale = Math.min(cols, rows) / 200;
  const riverWidth = Math.max(2, Math.round(2 * terrainScale));
  const pathWidth = Math.max(1, Math.round(terrainScale));
  const lakeRadius = Math.pow(Math.max(12, 14 * terrainScale), 2);
  const lakeRadius2 = Math.pow(Math.max(10, 12 * terrainScale), 2);

  const river1 =
    Math.abs(y - (cy + Math.sin(x * 0.08) * 12 * terrainScale)) < riverWidth &&
    x > cols * 0.15 &&
    x < cols * 0.85;
  const river2 =
    Math.abs(x - (cx - cols * 0.13 + Math.sin(y * 0.06) * 8 * terrainScale)) < riverWidth &&
    y > rows * 0.3 &&
    y < rows * 0.8;
  const lake = Math.pow(x - cols * 0.28, 2) + Math.pow(y - rows * 0.72, 2) < lakeRadius;
  const lake2 = Math.pow(x - cols * 0.76, 2) + Math.pow(y - rows * 0.26, 2) < lakeRadius2;

  if (river1 || river2 || lake || lake2) return "water";

  const pathMainV = Math.abs(x - cx) < pathWidth && y > cy - rows * 0.1 && y < cy + rows * 0.1;
  const pathMainH = Math.abs(y - cy) < pathWidth && x > cx - cols * 0.1 && x < cx + cols * 0.1;
  const pathRing = Math.abs(Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2)) - 15 * terrainScale) < pathWidth;

  if (pathMainV || pathMainH || pathRing) return "path";

  const hash = ((x * 2654435761) ^ (y * 2246822519)) >>> 0;
  const flowerChance = (hash % 100) < 6;
  if (flowerChance) return "flowers";

  return "grass";
}

function getTerrainColor(terrain: TerrainType, x: number, y: number): string {
  const hash = ((x * 13 + y * 7) % 5) * 0.03;
  if (terrain === "path") {
    const b = 0.58 + hash;
    return `rgb(${Math.round(180 * b)},${Math.round(155 * b)},${Math.round(95 * b)})`;
  }
  if (terrain === "water") {
    const b = 0.7 + hash;
    return `rgb(${Math.round(50 * b)},${Math.round(140 * b)},${Math.round(210 * b)})`;
  }
  if (terrain === "flowers") {
    const b = 0.75 + hash;
    return `rgb(${Math.round(75 * b)},${Math.round(175 * b)},${Math.round(80 * b)})`;
  }
  const b = 0.72 + hash;
  return `rgb(${Math.round(62 * b)},${Math.round(148 * b)},${Math.round(65 * b)})`;
}

const TERRAIN_MARKERS: TerrainMarker[] = (() => {
  const markers: TerrainMarker[] = [];

  for (let row = 0; row < VILLAGE_GRID.rows; row += 1) {
    for (let col = 0; col < VILLAGE_GRID.columns; col += 1) {
      const terrain = getTerrainAt(col, row);
      if (terrain === "grass") continue;
      markers.push({
        key: `${col}-${row}`,
        x: col,
        y: row,
        terrain,
        color: getTerrainColor(terrain, col, row),
      });
    }
  }

  console.log("[village] terrain markers prepared", { count: markers.length });
  return markers;
})();

const HubButton = React.memo(function HubButton({ label, active, icon, onPress, testID }: HubButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.hubButton,
        active ? styles.hubButtonActive : undefined,
        pressed ? styles.hubButtonPressed : undefined,
      ]}
      testID={testID}
    >
      <View style={[styles.hubIconWrap, active ? styles.hubIconWrapActive : undefined]}>{icon}</View>
      <Text style={[styles.hubButtonLabel, active ? styles.hubButtonLabelActive : undefined]}>{label}</Text>
    </Pressable>
  );
});

const BuildOptionCard = React.memo(function BuildOptionCard({ type, active, onPress }: BuildOptionProps) {
  const template = BUILDING_TEMPLATES[type];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.buildOption,
        active ? styles.buildOptionActive : undefined,
        pressed ? styles.buildOptionPressed : undefined,
      ]}
      testID={`build-option-${type}`}
    >
      <LinearGradient
        colors={[template.primaryColor, template.secondaryColor]}
        style={styles.buildOptionSwatch}
      >
        <Text style={styles.buildOptionShort}>{template.shortLabel}</Text>
      </LinearGradient>
      <Text style={styles.buildOptionTitle} numberOfLines={1}>{template.name}</Text>
      <Text style={styles.buildOptionMeta}>
        {formatResourceLabel(template.costKind)} {formatCompactNumber(template.cost)}
      </Text>
    </Pressable>
  );
});

const ShopOfferCard = React.memo(function ShopOfferCard({ title, subtitle, badge, price, highlight }: ShopOfferCardProps) {
  return (
    <View style={[styles.offerCard, { borderColor: `${highlight}55` }]}>
      <View style={styles.offerHeader}>
        <View style={[styles.offerBadge, { backgroundColor: `${highlight}22` }]}>
          <Text style={[styles.offerBadgeText, { color: highlight }]}>{badge}</Text>
        </View>
        <Text style={[styles.offerPrice, { color: highlight }]}>{price}</Text>
      </View>
      <Text style={styles.offerTitle}>{title}</Text>
      <Text style={styles.offerSubtitle}>{subtitle}</Text>
    </View>
  );
});

const GuildMemberRow = React.memo(function GuildMemberRow({ name, role, trophies, online }: GuildMemberRowProps) {
  return (
    <View style={styles.memberRow}>
      <View style={styles.memberIdentity}>
        <View style={[styles.memberDot, online ? styles.memberDotOnline : styles.memberDotOffline]} />
        <View>
          <Text style={styles.memberName}>{name}</Text>
          <Text style={styles.memberRole}>{role}</Text>
        </View>
      </View>
      <Text style={styles.memberTrophies}>{trophies}</Text>
    </View>
  );
});

const GuildActivityCard = React.memo(function GuildActivityCard({ title, body, reward }: GuildActivityCardProps) {
  return (
    <View style={styles.activityCard}>
      <Text style={styles.activityTitle}>{title}</Text>
      <Text style={styles.activityBody}>{body}</Text>
      <Text style={styles.activityReward}>{reward}</Text>
    </View>
  );
});

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    notation: value >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatTimer(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m > 0) return `${m}:${String(r).padStart(2, "0")}`;
  return `${r}s`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatResourceLabel(resource: SpendableResource): string {
  if (resource === "gold") return "Gold";
  if (resource === "elixir") return "Elixier";
  return "Gems";
}

function spendResource(resources: ResourceState, resource: SpendableResource, amount: number): ResourceState {
  if (resource === "gold") return { ...resources, gold: resources.gold - amount };
  if (resource === "elixir") return { ...resources, elixir: resources.elixir - amount };
  return { ...resources, gems: resources.gems - amount };
}

function hasEnoughResource(resources: ResourceState, resource: SpendableResource, amount: number): boolean {
  if (resource === "gold") return resources.gold >= amount;
  if (resource === "elixir") return resources.elixir >= amount;
  return resources.gems >= amount;
}

function getUpgradeCost(type: BuildingType, currentLevel: number): number {
  const template = BUILDING_TEMPLATES[type];
  if (type === "townhall") return 2400 + currentLevel * 900;
  return Math.round(template.cost * (1 + currentLevel * 0.45));
}

function getUpgradeDuration(type: BuildingType, currentLevel: number): number {
  const template = BUILDING_TEMPLATES[type];
  if (type === "townhall") return template.upgradeSeconds + currentLevel * 28;
  return template.upgradeSeconds + currentLevel * 8;
}

function getRemainingSeconds(building: PlacedBuilding, now: number): number {
  if (building.startedAt === null || building.durationSeconds === null || building.state === "ready") return 0;
  const elapsed = Math.floor((now - building.startedAt) / 1000);
  return Math.max(0, building.durationSeconds - elapsed);
}

function getFootprintTiles(type: BuildingType, tileX: number, tileY: number): { x: number; y: number }[] {
  const template = BUILDING_TEMPLATES[type];
  const tiles: { x: number; y: number }[] = [];
  for (let row = 0; row < template.footprint.height; row += 1) {
    for (let col = 0; col < template.footprint.width; col += 1) {
      tiles.push({ x: tileX + col, y: tileY + row });
    }
  }
  return tiles;
}

function getBuildingRect(building: PlacedBuilding, tileSize: number, tileGap: number) {
  const template = BUILDING_TEMPLATES[building.type];
  const unit = tileSize + tileGap;
  return {
    left: building.tileX * unit,
    top: building.tileY * unit,
    width: template.footprint.width * unit - tileGap,
    height: template.footprint.height * unit - tileGap,
  };
}

function getPlaceholderCards(category: BuildingCategory): BuildingPlaceholderCard[] {
  if (category === "townhall") {
    return [
      {
        id: "th-1",
        eyebrow: "Verwaltung",
        title: "Dorfleitung",
        body: "Platzhalter für globale Verwaltung, Ausbauziele und zentrale Entscheidungen des Dorfes.",
      },
      {
        id: "th-2",
        eyebrow: "Strategie",
        title: "Prioritäten",
        body: "Hier kommen später Bau-Queues, Freischaltungen und langfristige Entwicklungspläne hinein.",
      },
      {
        id: "th-3",
        eyebrow: "Koordination",
        title: "Zentrale Übersicht",
        body: "Platzhalter für Kennzahlen zu Bevölkerung, Stromnetz, Wasser und Verbrauch im ganzen Dorf.",
      },
    ];
  }

  if (category === "resource") {
    return [
      {
        id: "re-1",
        eyebrow: "Förderung",
        title: "Echtzeit-Produktion",
        body: "Platzhalter für Förderrate, laufende Zyklen und den Input aus Feldern, Minen oder Energieanlagen.",
      },
      {
        id: "re-2",
        eyebrow: "Netzwerk",
        title: "Zuleitung & Speicher",
        body: "Hier werden später Speicherstände, Leitungen und Engpässe für Strom, Wasser oder Rohstoffe sichtbar.",
      },
      {
        id: "re-3",
        eyebrow: "Wartung",
        title: "Anlagenstatus",
        body: "Platzhalter für Effizienz, Wartung und Optimierungen einzelner Fördergebäude.",
      },
    ];
  }

  if (category === "processing") {
    return [
      {
        id: "pr-1",
        eyebrow: "Input",
        title: "Rohstoffeingang",
        body: "Platzhalter für ankommende Materialien aus Minen, Feldern, Pumpen und Energiequellen.",
      },
      {
        id: "pr-2",
        eyebrow: "Produktion",
        title: "Fabriklinien",
        body: "Hier erscheinen später Fertigungsslots, Rezepte und aktuelle Verarbeitungsaufträge.",
      },
      {
        id: "pr-3",
        eyebrow: "Output",
        title: "Auslieferung",
        body: "Platzhalter für veredelte Waren, interne Weiterleitung und Absatz in Verbrauchsgebäude.",
      },
    ];
  }

  return [
    {
      id: "co-1",
      eyebrow: "Verkauf",
      title: "Nova-Nachfrage",
      body: "Platzhalter für Umsätze, Nachfrage und die besten Produkte für deine Kunden in Nova.",
    },
    {
      id: "co-2",
      eyebrow: "Besucher",
      title: "Publikumsstrom",
      body: "Hier werden später Besucherzahlen, Stoßzeiten und Service-Qualität des Gebäudes angezeigt.",
    },
    {
      id: "co-3",
      eyebrow: "Verträge",
      title: "Geschäftsmodelle",
      body: "Platzhalter für Preise, laufende Verträge und Spezialisierungen wie Reise, Energie oder KI-Dienste.",
    },
  ];
}

function computeVisibleRange(
  camera: CameraState,
  vpWidth: number,
  vpHeight: number,
  worldUnit: number,
  scale: number,
): VisibleRange {
  const effectiveVpWidth = vpWidth / scale;
  const effectiveVpHeight = vpHeight / scale;
  const offsetX = -camera.x / scale;
  const offsetY = -camera.y / scale;
  const startCol = Math.max(0, Math.floor(offsetX / worldUnit) - TILE_BUFFER);
  const endCol = Math.min(VILLAGE_GRID.columns - 1, Math.ceil((offsetX + effectiveVpWidth) / worldUnit) + TILE_BUFFER);
  const startRow = Math.max(0, Math.floor(offsetY / worldUnit) - TILE_BUFFER);
  const endRow = Math.min(VILLAGE_GRID.rows - 1, Math.ceil((offsetY + effectiveVpHeight) / worldUnit) + TILE_BUFFER);
  return { startCol, endCol, startRow, endRow };
}

function getTouchDistance(event: GestureResponderEvent): number {
  const touches = event.nativeEvent.touches;
  if (!touches || touches.length < 2) return 0;
  const dx = touches[0].pageX - touches[1].pageX;
  const dy = touches[0].pageY - touches[1].pageY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getTouchCenter(event: GestureResponderEvent): { x: number; y: number } {
  const touches = event.nativeEvent.touches;
  if (!touches || touches.length < 2) return { x: 0, y: 0 };
  return {
    x: (touches[0].pageX + touches[1].pageX) / 2,
    y: (touches[0].pageY + touches[1].pageY) / 2,
  };
}

function getTapLocation(event: GestureResponderEvent): { x: number; y: number } {
  const touch = event.nativeEvent.changedTouches?.[0];
  return {
    x: touch?.locationX ?? event.nativeEvent.locationX ?? 0,
    y: touch?.locationY ?? event.nativeEvent.locationY ?? 0,
  };
}

export default function MineGameScreen() {
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<HubTab>("base");
  const [resources, setResources] = useState<ResourceState>(() => INITIAL_RESOURCES);
  const [buildings, setBuildings] = useState<PlacedBuilding[]>(() => INITIAL_BUILDINGS);
  const [selectedBuildType, setSelectedBuildType] = useState<BuildingType | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [openedBuildingId, setOpenedBuildingId] = useState<string | null>(null);
  const [showBuildTray, setShowBuildTray] = useState<boolean>(false);
  const [viewportSize, setViewportSize] = useState<ViewportSize>({ width: 0, height: 0 });
  const [camera, setCamera] = useState<CameraState>({ x: 0, y: 0 });
  const [scale, setScale] = useState<number>(1);
  const [now, setNow] = useState<number>(Date.now());
  const [isWorldSettled, setIsWorldSettled] = useState<boolean>(true);
  const cameraStartRef = useRef<CameraState>({ x: 0, y: 0 });
  const scaleStartRef = useRef<number>(1);
  const pinchStartDistRef = useRef<number>(0);
  const isPinchingRef = useRef<boolean>(false);
  const initialCameraAppliedRef = useRef<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);
  const lastBuildingTapRef = useRef<BuildingTapState>({ buildingId: null, occurredAt: 0 });
  const scaleRef = useRef<number>(1);
  const cameraRef = useRef<CameraState>({ x: 0, y: 0 });
  const dragCooldownUntilRef = useRef<number>(0);
  const interactionSettleFrameRef = useRef<number | null>(null);
  const interactionSettleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animatedCamera = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const animatedScale = useRef(new Animated.Value(1)).current;

  const compact = width < 420;
  const tileSize = compact ? 8 : 10;
  const tileGap = 1;
  const worldUnit = tileSize + tileGap;
  const worldWidth = VILLAGE_GRID.columns * worldUnit - tileGap;
  const worldHeight = VILLAGE_GRID.rows * worldUnit - tileGap;

  const buildMenu = useMemo(() => BUILD_MENU.map((type) => BUILDING_TEMPLATES[type]), []);
  const buildMenuSections = useMemo(
    () =>
      BUILDING_CATEGORY_ORDER.map((category) => ({
        category,
        items: buildMenu.filter((template) => template.category === category),
      })).filter((section) => section.items.length > 0),
    [buildMenu]
  );
  const sortedBuildings = useMemo(
    () => [...buildings].sort((a, b) => a.tileY - b.tileY || a.tileX - b.tileX),
    [buildings]
  );
  const buildingLayouts = useMemo<BuildingLayoutData[]>(
    () =>
      sortedBuildings.map((building) => ({
        building,
        rect: getBuildingRect(building, tileSize, tileGap),
      })),
    [sortedBuildings, tileGap, tileSize]
  );

  const occupancyMap = useMemo(() => {
    const nextMap = new Map<string, string>();
    buildings.forEach((building) => {
      getFootprintTiles(building.type, building.tileX, building.tileY).forEach((tile) => {
        nextMap.set(`${tile.x}-${tile.y}`, building.id);
      });
    });
    return nextMap;
  }, [buildings]);

  const selectedBuilding = useMemo(
    () => buildings.find((building) => building.id === selectedBuildingId) ?? null,
    [buildings, selectedBuildingId]
  );
  const openedBuilding = useMemo(
    () => buildings.find((building) => building.id === openedBuildingId) ?? null,
    [buildings, openedBuildingId]
  );
  const activeBuilds = useMemo(
    () => buildings.filter((building) => building.state !== "ready"),
    [buildings]
  );
  const freeBuilders = Math.max(0, resources.builders - activeBuilds.length);
  const buildingCategoryCounts = useMemo(() => {
    const counts: Record<BuildingCategory, number> = {
      townhall: 0,
      resource: 0,
      processing: 0,
      consumption: 0,
    };
    buildings.forEach((building) => {
      counts[BUILDING_TEMPLATES[building.type].category] += 1;
    });
    return counts;
  }, [buildings]);

  const triggerSelectionHaptic = useCallback(() => {
    void Haptics.selectionAsync().catch(() => {});
  }, []);

  const triggerImpactHaptic = useCallback((style: Haptics.ImpactFeedbackStyle) => {
    void Haptics.impactAsync(style).catch(() => {});
  }, []);

  const clampCameraPosition = useCallback(
    (nextCamera: CameraState, currentScale?: number): CameraState => {
      const s = currentScale ?? scaleRef.current;
      const scaledWorldWidth = worldWidth * s;
      const scaledWorldHeight = worldHeight * s;
      const centeredX = viewportSize.width > scaledWorldWidth ? (viewportSize.width - scaledWorldWidth) / 2 : 0;
      const centeredY = viewportSize.height > scaledWorldHeight ? (viewportSize.height - scaledWorldHeight) / 2 : 0;
      const minX = viewportSize.width > scaledWorldWidth ? centeredX : viewportSize.width - scaledWorldWidth;
      const minY = viewportSize.height > scaledWorldHeight ? centeredY : viewportSize.height - scaledWorldHeight;
      const maxX = viewportSize.width > scaledWorldWidth ? centeredX : 0;
      const maxY = viewportSize.height > scaledWorldHeight ? centeredY : 0;
      return {
        x: clamp(nextCamera.x, minX, maxX),
        y: clamp(nextCamera.y, minY, maxY),
      };
    },
    [viewportSize.height, viewportSize.width, worldHeight, worldWidth]
  );

  const commitVisibleViewportState = useCallback((nextCamera: CameraState, nextScale: number) => {
    setCamera(nextCamera);
    setScale(nextScale);
  }, []);

  const cancelInteractionSettle = useCallback(() => {
    if (interactionSettleFrameRef.current !== null) {
      cancelAnimationFrame(interactionSettleFrameRef.current);
      interactionSettleFrameRef.current = null;
    }
    if (interactionSettleTimeoutRef.current !== null) {
      clearTimeout(interactionSettleTimeoutRef.current);
      interactionSettleTimeoutRef.current = null;
    }
  }, []);

  const scheduleInteractionSettle = useCallback(() => {
    cancelInteractionSettle();
    interactionSettleFrameRef.current = requestAnimationFrame(() => {
      interactionSettleFrameRef.current = null;
      interactionSettleTimeoutRef.current = setTimeout(() => {
        interactionSettleTimeoutRef.current = null;
        setIsWorldSettled(true);
        commitVisibleViewportState(cameraRef.current, scaleRef.current);
      }, INTERACTION_SETTLE_DELAY_MS);
    });
  }, [cancelInteractionSettle, commitVisibleViewportState]);

  const markInteractionActive = useCallback(() => {
    cancelInteractionSettle();
    setIsWorldSettled((current) => (current ? false : current));
  }, [cancelInteractionSettle]);

  const applyInteractiveTransform = useCallback(
    (nextCamera: CameraState, nextScale: number, commitImmediately?: boolean) => {
      cameraRef.current = nextCamera;
      scaleRef.current = nextScale;
      animatedCamera.setValue(nextCamera);
      animatedScale.setValue(nextScale);
      if (commitImmediately) {
        commitVisibleViewportState(nextCamera, nextScale);
      }
    },
    [animatedCamera, animatedScale, commitVisibleViewportState]
  );

  useEffect(() => {
    return () => {
      cancelInteractionSettle();
    };
  }, [cancelInteractionSettle]);

  useEffect(() => {
    if (viewportSize.width <= 0 || viewportSize.height <= 0) return;
    const townhall = INITIAL_BUILDINGS.find((b) => b.type === "townhall") ?? INITIAL_BUILDINGS[0];
    const townhallRect = getBuildingRect(townhall, tileSize, tileGap);
    const s = scaleRef.current;
    const centeredCamera = clampCameraPosition({
      x: viewportSize.width / 2 - (townhallRect.left + townhallRect.width / 2) * s,
      y: viewportSize.height / 2 - (townhallRect.top + townhallRect.height / 2) * s,
    }, s);
    if (!initialCameraAppliedRef.current) {
      console.log("[village] set initial camera", centeredCamera);
      applyInteractiveTransform(centeredCamera, s, true);
      initialCameraAppliedRef.current = true;
      return;
    }
    const clamped = clampCameraPosition(cameraRef.current, s);
    applyInteractiveTransform(clamped, s, true);
  }, [applyInteractiveTransform, clampCameraPosition, tileSize, viewportSize.height, viewportSize.width]);

  const hasTimers = activeBuilds.length > 0;

  useEffect(() => {
    if (!hasTimers) return;
    const intervalId = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, [hasTimers]);

  useEffect(() => {
    if (!hasTimers) return;
    const completed = buildings.filter((b) => getRemainingSeconds(b, now) === 0 && b.state !== "ready");
    if (completed.length === 0) return;
    setBuildings((current) =>
      current.map((building) => {
        if (!completed.some((item) => item.id === building.id)) return building;
        return {
          ...building,
          level: building.state === "upgrading" ? building.queuedLevel ?? building.level : building.level,
          state: "ready" as const,
          startedAt: null,
          durationSeconds: null,
          queuedLevel: null,
        };
      })
    );
    triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light);
  }, [buildings, hasTimers, now, triggerImpactHaptic]);

  const handleSelectTab = useCallback(
    (tab: HubTab) => {
      console.log("[hub] select tab", tab);
      setActiveTab(tab);
      setSelectedBuildType(null);
      setShowBuildTray(false);
      if (tab !== "base") setSelectedBuildingId(null);
      if (tab !== "base") setOpenedBuildingId(null);
      triggerSelectionHaptic();
    },
    [triggerSelectionHaptic]
  );

  const getPlacementResult = useCallback(
    (type: BuildingType, tileX: number, tileY: number): PlacementResult => {
      const template = BUILDING_TEMPLATES[type];
      const fitsWidth = tileX >= 0 && tileX + template.footprint.width <= VILLAGE_GRID.columns;
      const fitsHeight = tileY >= 0 && tileY + template.footprint.height <= VILLAGE_GRID.rows;
      if (!fitsWidth || !fitsHeight) return { ok: false, reason: "Außerhalb des Dorfes." };
      const footprintTiles = getFootprintTiles(type, tileX, tileY);
      const hitsWater = footprintTiles.some((tile) => getTerrainAt(tile.x, tile.y) === "water");
      if (hitsWater) return { ok: false, reason: "Nicht auf Wasser baubar." };
      const occupied = footprintTiles.some((tile) => occupancyMap.has(`${tile.x}-${tile.y}`));
      if (occupied) return { ok: false, reason: "Feld belegt." };
      return { ok: true, reason: "frei" };
    },
    [occupancyMap]
  );

  const handleSelectBuildType = useCallback(
    (type: BuildingType) => {
      console.log("[build] select build type", type);
      setSelectedBuildingId(null);
      setOpenedBuildingId(null);
      setSelectedBuildType((current) => (current === type ? null : type));
      triggerSelectionHaptic();
    },
    [triggerSelectionHaptic]
  );

  const handleGroundPress = useCallback(
    (tileX: number, tileY: number) => {
      if (isDraggingRef.current || Date.now() < dragCooldownUntilRef.current) return;
      console.log("[base] ground press", { tileX, tileY, selectedBuildType });
      lastBuildingTapRef.current = { buildingId: null, occurredAt: 0 };
      setOpenedBuildingId(null);

      if (selectedBuildType === null) {
        setSelectedBuildingId(null);
        setShowBuildTray(true);
        triggerSelectionHaptic();
        return;
      }

      const template = BUILDING_TEMPLATES[selectedBuildType];
      const placement = getPlacementResult(selectedBuildType, tileX, tileY);

      if (!placement.ok) {
        triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Medium);
        return;
      }

      if (freeBuilders <= 0) {
        triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Heavy);
        return;
      }

      if (!hasEnoughResource(resources, template.costKind, template.cost)) {
        triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Heavy);
        return;
      }

      const startedAt = Date.now();
      const nextBuilding: PlacedBuilding = {
        id: `${selectedBuildType}-${startedAt}`,
        type: selectedBuildType,
        tileX,
        tileY,
        level: 1,
        state: "building",
        startedAt,
        durationSeconds: template.buildSeconds,
        queuedLevel: null,
      };

      console.log("[build] place building", nextBuilding);
      setResources((current) => spendResource(current, template.costKind, template.cost));
      setBuildings((current) => [...current, nextBuilding]);
      setSelectedBuildType(null);
      setSelectedBuildingId(nextBuilding.id);
      setShowBuildTray(false);
      setNow(startedAt);
      triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light);
    },
    [freeBuilders, getPlacementResult, resources, selectedBuildType, triggerImpactHaptic, triggerSelectionHaptic]
  );

  const handleOpenBuilding = useCallback(
    (buildingId: string) => {
      const nextBuilding = buildings.find((b) => b.id === buildingId);
      if (!nextBuilding) return;
      console.log("[base] open building", { buildingId, type: nextBuilding.type });
      setOpenedBuildingId(buildingId);
      setSelectedBuildType(null);
      setShowBuildTray(false);
      setSelectedBuildingId(buildingId);
      triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light);
    },
    [buildings, triggerImpactHaptic]
  );

  const handleCloseOpenedBuilding = useCallback(() => {
    console.log("[base] close building panel", { openedBuildingId });
    setOpenedBuildingId(null);
    triggerSelectionHaptic();
  }, [openedBuildingId, triggerSelectionHaptic]);

  const handleSelectBuilding = useCallback(
    (buildingId: string) => {
      if (isDraggingRef.current || Date.now() < dragCooldownUntilRef.current) return;
      const nextBuilding = buildings.find((b) => b.id === buildingId);
      if (!nextBuilding) return;

      const nowTs = Date.now();
      const isDoubleTap =
        lastBuildingTapRef.current.buildingId === buildingId &&
        nowTs - lastBuildingTapRef.current.occurredAt <= DOUBLE_TAP_DELAY_MS;

      console.log("[base] select building", { buildingId, type: nextBuilding.type, isDoubleTap });
      setSelectedBuildType(null);
      setSelectedBuildingId(buildingId);
      setShowBuildTray(false);

      if (isDoubleTap) {
        lastBuildingTapRef.current = { buildingId: null, occurredAt: 0 };
        handleOpenBuilding(buildingId);
        return;
      }

      lastBuildingTapRef.current = { buildingId, occurredAt: nowTs };
      setOpenedBuildingId(null);
      triggerSelectionHaptic();
    },
    [buildings, handleOpenBuilding, triggerSelectionHaptic]
  );

  const handleUpgradeSelected = useCallback(() => {
    if (!selectedBuilding) return;
    const template = BUILDING_TEMPLATES[selectedBuilding.type];
    const upgradeCost = getUpgradeCost(selectedBuilding.type, selectedBuilding.level);
    const upgradeDuration = getUpgradeDuration(selectedBuilding.type, selectedBuilding.level);

    if (selectedBuilding.state !== "ready") { triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Medium); return; }
    if (freeBuilders <= 0) { triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Heavy); return; }
    if (!hasEnoughResource(resources, template.costKind, upgradeCost)) { triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Heavy); return; }

    const startedAt = Date.now();
    setResources((current) => spendResource(current, template.costKind, upgradeCost));
    setBuildings((current) =>
      current.map((building) => {
        if (building.id !== selectedBuilding.id) return building;
        return { ...building, state: "upgrading" as const, startedAt, durationSeconds: upgradeDuration, queuedLevel: building.level + 1 };
      })
    );
    setNow(startedAt);
    triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light);
  }, [freeBuilders, resources, selectedBuilding, triggerImpactHaptic]);

  const getWorldTapData = useCallback(
    (locationX: number, locationY: number) => {
      const currentCamera = cameraRef.current;
      const currentScale = scaleRef.current;
      const worldX = (locationX - currentCamera.x) / currentScale;
      const worldY = (locationY - currentCamera.y) / currentScale;

      if (worldX < 0 || worldY < 0 || worldX > worldWidth || worldY > worldHeight) {
        return null;
      }

      return {
        worldX,
        worldY,
        tileX: clamp(Math.floor(worldX / worldUnit), 0, VILLAGE_GRID.columns - 1),
        tileY: clamp(Math.floor(worldY / worldUnit), 0, VILLAGE_GRID.rows - 1),
      };
    },
    [worldHeight, worldUnit, worldWidth]
  );

  const getBuildingIdAtWorldPoint = useCallback(
    (worldX: number, worldY: number): string | null => {
      for (let index = buildingLayouts.length - 1; index >= 0; index -= 1) {
        const layout = buildingLayouts[index];
        const withinX = worldX >= layout.rect.left && worldX <= layout.rect.left + layout.rect.width;
        const withinY = worldY >= layout.rect.top && worldY <= layout.rect.top + layout.rect.height;
        if (withinX && withinY) {
          return layout.building.id;
        }
      }
      return null;
    },
    [buildingLayouts]
  );

  const handleViewportTap = useCallback(
    (event: GestureResponderEvent) => {
      const location = getTapLocation(event);
      const tapData = getWorldTapData(location.x, location.y);
      if (!tapData) return;

      const buildingId = getBuildingIdAtWorldPoint(tapData.worldX, tapData.worldY);
      if (buildingId) {
        handleSelectBuilding(buildingId);
        return;
      }

      handleGroundPress(tapData.tileX, tapData.tileY);
    },
    [getBuildingIdAtWorldPoint, getWorldTapData, handleGroundPress, handleSelectBuilding]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: (evt, gs) => {
          const touches = evt.nativeEvent.touches;
          if (touches && touches.length >= 2) return true;
          return Math.abs(gs.dx) > 1 || Math.abs(gs.dy) > 1;
        },
        onMoveShouldSetPanResponderCapture: (evt, gs) => {
          const touches = evt.nativeEvent.touches;
          if (touches && touches.length >= 2) return true;
          return Math.abs(gs.dx) > 1 || Math.abs(gs.dy) > 1;
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (evt) => {
          cancelInteractionSettle();
          cameraStartRef.current = cameraRef.current;
          scaleStartRef.current = scaleRef.current;
          isDraggingRef.current = false;
          isPinchingRef.current = false;
          const touches = evt.nativeEvent.touches;
          if (touches && touches.length >= 2) {
            pinchStartDistRef.current = getTouchDistance(evt);
            isPinchingRef.current = true;
            isDraggingRef.current = true;
            markInteractionActive();
          }
        },
        onPanResponderMove: (evt, gs) => {
          const touches = evt.nativeEvent.touches;
          const movedEnough = Math.abs(gs.dx) > TAP_MOVE_THRESHOLD || Math.abs(gs.dy) > TAP_MOVE_THRESHOLD;

          if (touches && touches.length >= 2) {
            isDraggingRef.current = true;
            markInteractionActive();
            if (!isPinchingRef.current) {
              pinchStartDistRef.current = getTouchDistance(evt);
              scaleStartRef.current = scaleRef.current;
              cameraStartRef.current = cameraRef.current;
              isPinchingRef.current = true;
            }
            const currentDist = getTouchDistance(evt);
            if (pinchStartDistRef.current > 0 && currentDist > 0) {
              const ratio = currentDist / pinchStartDistRef.current;
              const newScale = clamp(scaleStartRef.current * ratio, MIN_ZOOM, MAX_ZOOM);
              const center = getTouchCenter(evt);
              const worldFocusX = (center.x - cameraStartRef.current.x) / scaleStartRef.current;
              const worldFocusY = (center.y - cameraStartRef.current.y) / scaleStartRef.current;
              const newCamX = center.x - worldFocusX * newScale;
              const newCamY = center.y - worldFocusY * newScale;
              const clampedCam = clampCameraPosition({ x: newCamX, y: newCamY }, newScale);
              applyInteractiveTransform(clampedCam, newScale);
            }
            return;
          }

          if (isPinchingRef.current) {
            cameraStartRef.current = cameraRef.current;
            scaleStartRef.current = scaleRef.current;
            isPinchingRef.current = false;
          }

          if (!movedEnough) return;

          isDraggingRef.current = true;
          markInteractionActive();
          const newCam = clampCameraPosition({
            x: cameraStartRef.current.x + gs.dx,
            y: cameraStartRef.current.y + gs.dy,
          }, scaleRef.current);
          applyInteractiveTransform(newCam, scaleRef.current);
        },
        onPanResponderRelease: (evt, gs) => {
          const movedEnough = Math.abs(gs.dx) > TAP_MOVE_THRESHOLD || Math.abs(gs.dy) > TAP_MOVE_THRESHOLD;
          const endedWhilePinching = isPinchingRef.current;
          const didDrag = isDraggingRef.current;
          isPinchingRef.current = false;
          isDraggingRef.current = false;

          if (!endedWhilePinching && !movedEnough && !didDrag) {
            handleViewportTap(evt);
            return;
          }

          dragCooldownUntilRef.current = Date.now() + DRAG_RELEASE_COOLDOWN_MS;
          scheduleInteractionSettle();
        },
        onPanResponderTerminate: () => {
          isPinchingRef.current = false;
          isDraggingRef.current = false;
          dragCooldownUntilRef.current = Date.now() + DRAG_RELEASE_COOLDOWN_MS;
          scheduleInteractionSettle();
        },
      }),
    [applyInteractiveTransform, cancelInteractionSettle, clampCameraPosition, handleViewportTap, markInteractionActive, scheduleInteractionSettle]
  );

  const visibleRange = useMemo<VisibleRange>(() => {
    if (viewportSize.width <= 0 || viewportSize.height <= 0) {
      return { startCol: 0, endCol: 0, startRow: 0, endRow: 0 };
    }
    return computeVisibleRange(camera, viewportSize.width, viewportSize.height, worldUnit, scale);
  }, [camera, viewportSize.width, viewportSize.height, worldUnit, scale]);

  const visibleTerrainFeatures = useMemo<TerrainFeatureTile[]>(() => {
    if (!isWorldSettled) return [];

    const showFlowers = scale >= 1.02;
    return TERRAIN_MARKERS.filter((marker) => {
      if (marker.x < visibleRange.startCol || marker.x > visibleRange.endCol) return false;
      if (marker.y < visibleRange.startRow || marker.y > visibleRange.endRow) return false;
      if (marker.terrain === "flowers" && !showFlowers) return false;
      return true;
    }).map((marker) => {
      const left = marker.x * worldUnit;
      const top = marker.y * worldUnit;
      return {
        key: marker.key,
        left,
        top,
        width: Math.min(worldUnit - tileGap, worldWidth - left),
        height: Math.min(worldUnit - tileGap, worldHeight - top),
        color: marker.color,
      };
    });
  }, [isWorldSettled, scale, tileGap, visibleRange, worldHeight, worldUnit, worldWidth]);

  const gridLines = useMemo<GridLineData[]>(() => {
    if (!isWorldSettled || scale < GRID_HIDE_ZOOM) return [];

    const lines: GridLineData[] = [];
    const step = 1;
    const startCol = Math.max(0, visibleRange.startCol - 1);
    const endCol = Math.min(VILLAGE_GRID.columns, visibleRange.endCol + 1);
    const startRow = Math.max(0, visibleRange.startRow - 1);
    const endRow = Math.min(VILLAGE_GRID.rows, visibleRange.endRow + 1);
    const lineThickness = 1;
    const lineHeight = Math.max(0, (endRow - startRow + 1) * worldUnit);
    const lineWidth = Math.max(0, (endCol - startCol + 1) * worldUnit);

    for (let col = startCol; col <= endCol; col += step) {
      lines.push({
        key: `grid-v-${col}`,
        left: col * worldUnit,
        top: startRow * worldUnit,
        width: lineThickness,
        height: lineHeight,
      });
    }

    for (let row = startRow; row <= endRow; row += step) {
      lines.push({
        key: `grid-h-${row}`,
        left: startCol * worldUnit,
        top: row * worldUnit,
        width: lineWidth,
        height: lineThickness,
      });
    }

    return lines;
  }, [isWorldSettled, scale, visibleRange, worldUnit]);

  const terrainFeatureElements = useMemo(
    () => visibleTerrainFeatures.map((tile) => (
      <View
        key={tile.key}
        style={[
          styles.terrainFeature,
          { left: tile.left, top: tile.top, width: tile.width, height: tile.height, backgroundColor: tile.color },
        ]}
      />
    )),
    [visibleTerrainFeatures]
  );

  const gridLineElements = useMemo(
    () => gridLines.map((line) => (
      <View
        key={line.key}
        style={[
          styles.gridLine,
          { left: line.left, top: line.top, width: line.width, height: line.height },
        ]}
      />
    )),
    [gridLines]
  );
  const renderedBuildingLayouts = useMemo(() => {
    if (!isWorldSettled) return buildingLayouts;

    return buildingLayouts.filter(({ building }) => {
      const template = BUILDING_TEMPLATES[building.type];
      const bRight = building.tileX + template.footprint.width;
      const bBottom = building.tileY + template.footprint.height;
      return bRight >= visibleRange.startCol && building.tileX <= visibleRange.endCol &&
             bBottom >= visibleRange.startRow && building.tileY <= visibleRange.endRow;
    });
  }, [buildingLayouts, isWorldSettled, visibleRange]);

  const renderOpenedBuildingContent = () => {
    if (!openedBuilding) return null;

    const template = BUILDING_TEMPLATES[openedBuilding.type];
    const categoryLabel = BUILDING_CATEGORY_LABELS[template.category];
    const placeholderCards = getPlaceholderCards(template.category);
    const remaining = getRemainingSeconds(openedBuilding, now);

    return (
      <View style={styles.buildingDetailScreen} testID="opened-building-screen">
        <LinearGradient
          colors={["#08111d", "#0d1727", "#111f33"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.buildingDetailBackdrop}
        />
        <View style={styles.buildingDetailHeader}>
          <View style={styles.buildingDetailHeaderContent}>
            <LinearGradient colors={[template.primaryColor, template.secondaryColor]} style={styles.buildingDetailIcon}>
              <Text style={styles.buildingDetailIconText}>{template.shortLabel}</Text>
            </LinearGradient>
            <View style={styles.buildingDetailTitleWrap}>
              <Text style={styles.buildingDetailEyebrow}>{categoryLabel}</Text>
              <Text style={styles.buildingDetailTitle}>{template.name}</Text>
              <Text style={styles.buildingDetailMeta}>
                Stufe {openedBuilding.level} · {openedBuilding.state === "ready" ? "Bereit" : `${formatTimer(remaining)} aktiv`}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={handleCloseOpenedBuilding}
            style={({ pressed }) => [styles.buildingDetailClose, pressed ? styles.buildingDetailClosePressed : undefined]}
            testID="close-opened-building"
          >
            <X color="#f4f7fb" size={18} />
          </Pressable>
        </View>

        <View style={styles.buildingDetailHero}>
          <Text style={styles.buildingDetailHeroTitle}>Management-Panel</Text>
          <Text style={styles.buildingDetailHeroBody}>{template.description}</Text>
          <Text style={styles.buildingDetailHint}>Doppeltipp erkannt · Platzhalter bis die echte Gebäudelogik kommt.</Text>
        </View>

        <ScrollView contentContainerStyle={styles.buildingDetailContent} showsVerticalScrollIndicator={false} testID="opened-building-scroll">
          {placeholderCards.map((card) => (
            <View key={card.id} style={styles.buildingDetailCard}>
              <Text style={styles.buildingDetailCardEyebrow}>{card.eyebrow}</Text>
              <Text style={styles.buildingDetailCardTitle}>{card.title}</Text>
              <Text style={styles.buildingDetailCardBody}>{card.body}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderBaseContent = () => {
    return (
      <View style={styles.baseStage} testID="base-stage">
        <View style={styles.viewportFrame}>
          {openedBuilding ? (
            renderOpenedBuildingContent()
          ) : (
            <View
              style={styles.viewport}
              onLayout={(event) => {
                setViewportSize({
                  width: event.nativeEvent.layout.width,
                  height: event.nativeEvent.layout.height,
                });
              }}
              {...panResponder.panHandlers}
              testID="base-viewport"
            >
              <LinearGradient
                colors={["#87ceeb", "#68b8e0", "#4a9d5b"]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.viewportSky}
              />
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.worldLayer,
                  {
                    width: worldWidth,
                    height: worldHeight,
                    transform: [
                      { translateX: animatedCamera.x },
                      { translateY: animatedCamera.y },
                      { scale: animatedScale },
                    ],
                    transformOrigin: "top left",
                  },
                ]}
              >
                <View style={styles.worldBackdrop} />
                {terrainFeatureElements}
                {gridLineElements}

                {renderedBuildingLayouts.map(({ building, rect }) => {
                  const template = BUILDING_TEMPLATES[building.type];
                  const remaining = getRemainingSeconds(building, now);
                  const isSelected = selectedBuildingId === building.id;

                  return (
                    <View
                      key={building.id}
                      style={[
                        styles.buildingPressable,
                        {
                          left: rect.left,
                          top: rect.top,
                          width: rect.width,
                          height: rect.height,
                          zIndex: 20 + building.tileY,
                        },
                      ]}
                      testID={`building-${building.id}`}
                    >
                      <View style={[styles.buildingBase, { backgroundColor: `${template.secondaryColor}44` }]} />
                      <LinearGradient
                        colors={[template.accentColor, template.primaryColor, template.secondaryColor]}
                        locations={[0, 0.3, 1]}
                        style={[
                          styles.buildingShell,
                          isSelected ? styles.buildingShellSelected : undefined,
                        ]}
                      >
                        <Text style={styles.buildingShort}>{template.shortLabel}</Text>
                        <Text style={styles.buildingLevel}>Lv{building.level}</Text>
                        {building.state !== "ready" ? (
                          <View style={styles.buildingTimerChip}>
                            <Clock3 color="#fff" size={8} />
                            <Text style={styles.buildingTimerText}>{formatTimer(remaining)}</Text>
                          </View>
                        ) : null}
                      </LinearGradient>
                    </View>
                  );
                })}
              </Animated.View>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderShopContent = () => (
    <ScrollView style={styles.fullTabScroll} contentContainerStyle={styles.fullTabContent} testID="shop-screen">
      <LinearGradient colors={["#15324d", "#1e243a"]} style={styles.heroCard}>
        <Text style={styles.heroTitle}>Shop</Text>
        <Text style={styles.heroBody}>Pakete und Booster für deinen Ausbau.</Text>
      </LinearGradient>
      {SHOP_OFFERS.map((offer) => (
        <ShopOfferCard key={offer.id} title={offer.title} subtitle={offer.subtitle} badge={offer.badge} price={offer.price} highlight={offer.highlight} />
      ))}
    </ScrollView>
  );

  const renderGuildContent = () => (
    <ScrollView style={styles.fullTabScroll} contentContainerStyle={styles.fullTabContent} testID="guild-screen">
      <LinearGradient colors={["#2b1d4d", "#1c243e"]} style={styles.heroCard}>
        <Text style={styles.heroTitle}>Sonnenwacht</Text>
        <Text style={styles.heroBody}>Koordiniere Kriege und Strategien mit deinem Team.</Text>
      </LinearGradient>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Mitglieder</Text>
        {GUILD_MEMBERS.map((m) => (
          <GuildMemberRow key={m.id} name={m.name} role={m.role} trophies={m.trophies} online={m.online} />
        ))}
      </View>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Aktivität</Text>
        {GUILD_ACTIVITIES.map((a) => (
          <GuildActivityCard key={a.id} title={a.title} body={a.body} reward={a.reward} />
        ))}
      </View>
    </ScrollView>
  );

  const renderInventoryContent = () => (
    <ScrollView style={styles.fullTabScroll} contentContainerStyle={styles.fullTabContent} testID="inventory-screen">
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Ressourcen</Text>
        <View style={styles.inventoryGrid}>
          <View style={styles.inventoryItem}><Coins color="#ffd064" size={20} /><Text style={styles.inventoryValue}>{formatCompactNumber(resources.gold)}</Text><Text style={styles.inventoryLabel}>Gold</Text></View>
          <View style={styles.inventoryItem}><Gem color="#ef84ff" size={20} /><Text style={styles.inventoryValue}>{formatCompactNumber(resources.elixir)}</Text><Text style={styles.inventoryLabel}>Elixier</Text></View>
          <View style={styles.inventoryItem}><Gem color="#6ce9ff" size={20} /><Text style={styles.inventoryValue}>{formatCompactNumber(resources.gems)}</Text><Text style={styles.inventoryLabel}>Gems</Text></View>
          <View style={styles.inventoryItem}><Hammer color="#9ef58b" size={20} /><Text style={styles.inventoryValue}>{freeBuilders}/{resources.builders}</Text><Text style={styles.inventoryLabel}>Baumeister</Text></View>
        </View>
      </View>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Gebäude</Text>
        <Text style={styles.inventoryMeta}>{buildings.length} platziert · {activeBuilds.length} im Bau · {buildingCategoryCounts.resource} Rohstoff · {buildingCategoryCounts.processing} Fabrik · {buildingCategoryCounts.consumption} Verbrauch</Text>
        {activeBuilds.map((b) => {
          const t = BUILDING_TEMPLATES[b.type];
          return (
            <View key={b.id} style={styles.inventoryBuildRow}>
              <View style={[styles.inventoryBuildDot, { backgroundColor: t.primaryColor }]} />
              <Text style={styles.inventoryBuildName}>{t.name}</Text>
              <Text style={styles.inventoryBuildTimer}>{formatTimer(getRemainingSeconds(b, now))}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );

  const renderBottomPanel = () => {
    if (activeTab !== "base" || openedBuilding) return null;

    if (selectedBuilding) {
      const template = BUILDING_TEMPLATES[selectedBuilding.type];
      const upgradeCost = getUpgradeCost(selectedBuilding.type, selectedBuilding.level);
      const upgradeDuration = getUpgradeDuration(selectedBuilding.type, selectedBuilding.level);
      const upgradeBlocked = selectedBuilding.state !== "ready" || freeBuilders <= 0;

      return (
        <View style={styles.bottomPanel} testID="building-panel">
          <View style={styles.panelRow}>
            <LinearGradient colors={[template.primaryColor, template.secondaryColor]} style={styles.panelIcon}>
              <Text style={styles.panelIconText}>{template.shortLabel}</Text>
            </LinearGradient>
            <View style={styles.panelInfo}>
              <Text style={styles.panelTitle}>{template.name} <Text style={styles.panelLevel}>Lv{selectedBuilding.level}</Text></Text>
              <Text style={styles.panelMeta}>
                {selectedBuilding.state === "ready"
                  ? `${BUILDING_CATEGORY_LABELS[template.category]} · Doppeltipp öffnet · Upgrade: ${formatCompactNumber(upgradeCost)} ${formatResourceLabel(template.costKind)} · ${upgradeDuration}s`
                  : `${formatTimer(getRemainingSeconds(selectedBuilding, now))} verbleibend`}
              </Text>
            </View>
            <Pressable
              onPress={handleUpgradeSelected}
              style={({ pressed }) => [styles.upgradeBtn, upgradeBlocked ? styles.upgradeBtnDisabled : undefined, pressed && !upgradeBlocked ? styles.upgradeBtnPressed : undefined]}
              disabled={upgradeBlocked}
              testID="upgrade-building-button"
            >
              <Text style={styles.upgradeBtnText}>{selectedBuilding.state === "ready" ? "▲" : "⏳"}</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    if (showBuildTray) {
      return (
        <View style={styles.bottomPanel} testID="build-tray">
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.buildTraySectionStack} testID="build-tray-scroll">
            {buildMenuSections.map((section) => (
              <View key={section.category} style={styles.buildSection}>
                <Text style={styles.buildSectionTitle}>{BUILDING_CATEGORY_LABELS[section.category]}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.buildTrayContent}>
                  {section.items.map((template) => (
                    <BuildOptionCard
                      key={template.type}
                      type={template.type}
                      active={selectedBuildType === template.type}
                      onPress={() => handleSelectBuildType(template.type)}
                    />
                  ))}
                </ScrollView>
              </View>
            ))}
          </ScrollView>
        </View>
      );
    }

    return null;
  };

  const isBaseTab = activeTab === "base";

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <LinearGradient colors={["#0b1a2e", "#0f1f33", "#081220"]} style={StyleSheet.absoluteFillObject} />

      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        {isBaseTab ? (
          <View style={styles.baseFullscreenShell}>
            <View style={styles.mainArea}>{renderBaseContent()}</View>

            <View style={styles.baseTopOverlay} pointerEvents="box-none">
              <View style={styles.resourceBar}>
                <View style={styles.resourceChip}><Coins color="#ffd064" size={14} /><Text style={styles.resourceChipValue}>{formatCompactNumber(resources.gold)}</Text></View>
                <View style={styles.resourceChip}><Gem color="#ef84ff" size={14} /><Text style={styles.resourceChipValue}>{formatCompactNumber(resources.elixir)}</Text></View>
                <View style={styles.resourceChip}><Gem color="#6ce9ff" size={14} /><Text style={styles.resourceChipValue}>{formatCompactNumber(resources.gems)}</Text></View>
                <View style={styles.resourceChip}><Hammer color="#9ef58b" size={14} /><Text style={styles.resourceChipValue}>{freeBuilders}/{resources.builders}</Text></View>
              </View>
            </View>

            <View style={styles.baseBottomOverlay} pointerEvents="box-none">
              {renderBottomPanel()}
              <View style={styles.hubBar} testID="hub-bar">
                <HubButton label="Dorf" active={activeTab === "base"} icon={<House color={activeTab === "base" ? "#0b1a2e" : Colors.text} size={18} />} onPress={() => handleSelectTab("base")} testID="hub-base" />
                <HubButton label="Shop" active={activeTab === "shop"} icon={<Store color={activeTab === "shop" ? "#0b1a2e" : Colors.text} size={18} />} onPress={() => handleSelectTab("shop")} testID="hub-shop" />
                <HubButton label="Gilde" active={activeTab === "guild"} icon={<Users color={activeTab === "guild" ? "#0b1a2e" : Colors.text} size={18} />} onPress={() => handleSelectTab("guild")} testID="hub-guild" />
                <HubButton label="Inventar" active={activeTab === "inventory"} icon={<Package color={activeTab === "inventory" ? "#0b1a2e" : Colors.text} size={18} />} onPress={() => handleSelectTab("inventory")} testID="hub-inventory" />
              </View>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.resourceBar}>
              <View style={styles.resourceChip}><Coins color="#ffd064" size={14} /><Text style={styles.resourceChipValue}>{formatCompactNumber(resources.gold)}</Text></View>
              <View style={styles.resourceChip}><Gem color="#ef84ff" size={14} /><Text style={styles.resourceChipValue}>{formatCompactNumber(resources.elixir)}</Text></View>
              <View style={styles.resourceChip}><Gem color="#6ce9ff" size={14} /><Text style={styles.resourceChipValue}>{formatCompactNumber(resources.gems)}</Text></View>
              <View style={styles.resourceChip}><Hammer color="#9ef58b" size={14} /><Text style={styles.resourceChipValue}>{freeBuilders}/{resources.builders}</Text></View>
            </View>

            <View style={styles.mainArea}>
              {activeTab === "shop" ? renderShopContent() : activeTab === "guild" ? renderGuildContent() : renderInventoryContent()}
            </View>

            <View style={styles.hubBar} testID="hub-bar">
              <HubButton label="Dorf" active={activeTab === "base"} icon={<House color={activeTab === "base" ? "#0b1a2e" : Colors.text} size={18} />} onPress={() => handleSelectTab("base")} testID="hub-base" />
              <HubButton label="Shop" active={activeTab === "shop"} icon={<Store color={activeTab === "shop" ? "#0b1a2e" : Colors.text} size={18} />} onPress={() => handleSelectTab("shop")} testID="hub-shop" />
              <HubButton label="Gilde" active={activeTab === "guild"} icon={<Users color={activeTab === "guild" ? "#0b1a2e" : Colors.text} size={18} />} onPress={() => handleSelectTab("guild")} testID="hub-guild" />
              <HubButton label="Inventar" active={activeTab === "inventory"} icon={<Package color={activeTab === "inventory" ? "#0b1a2e" : Colors.text} size={18} />} onPress={() => handleSelectTab("inventory")} testID="hub-inventory" />
            </View>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  resourceBar: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  resourceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  resourceChipValue: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800" as const,
  },
  mainArea: {
    flex: 1,
    minHeight: 0,
  },
  baseFullscreenShell: {
    flex: 1,
  },
  baseTopOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 4,
    paddingHorizontal: 10,
  },
  baseBottomOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    gap: 8,
    paddingHorizontal: 10,
    paddingBottom: 4,
  },
  baseStage: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    alignItems: "stretch",
    justifyContent: "flex-start",
  },
  viewportFrame: {
    flex: 1,
    width: "100%",
    minHeight: 0,
    borderRadius: 0,
    overflow: "hidden",
    borderWidth: 0,
    backgroundColor: "#07111d",
  },
  viewport: {
    flex: 1,
    borderRadius: 0,
    overflow: "hidden",
    backgroundColor: "#4a8c52",
  },
  viewportSky: {
    ...StyleSheet.absoluteFillObject,
  },
  worldLayer: {
    position: "absolute",
  },
  worldBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#5b9449",
  },
  terrainFeature: {
    position: "absolute",
    borderRadius: 1,
  },
  gridLine: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  buildingPressable: {
    position: "absolute",
  },
  buildingBase: {
    position: "absolute",
    bottom: 0,
    left: 2,
    right: 2,
    height: 6,
    borderRadius: 3,
  },
  buildingShell: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
    padding: 4,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  buildingShellSelected: {
    borderColor: "#ffe566",
    borderWidth: 2.5,
    shadowColor: "#ffe566",
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  buildingShort: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "900" as const,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  buildingLevel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 9,
    fontWeight: "800" as const,
  },
  buildingTimerChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  buildingTimerText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "800" as const,
  },
  buildingDetailScreen: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: Colors.shell,
  },
  buildingDetailBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  buildingDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(2,6,12,0.26)",
  },
  buildingDetailHeaderContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  buildingDetailIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.36,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 7,
  },
  buildingDetailIconText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900" as const,
  },
  buildingDetailTitleWrap: {
    flex: 1,
    gap: 3,
  },
  buildingDetailEyebrow: {
    color: Colors.teal,
    fontSize: 11,
    fontWeight: "800" as const,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  buildingDetailTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900" as const,
  },
  buildingDetailMeta: {
    color: "rgba(255,255,255,0.56)",
    fontSize: 12,
    fontWeight: "700" as const,
  },
  buildingDetailClose: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  buildingDetailClosePressed: {
    transform: [{ scale: 0.96 }],
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  buildingDetailHero: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(10,17,29,0.9)",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 6,
  },
  buildingDetailHeroTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900" as const,
  },
  buildingDetailHeroBody: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 13,
    lineHeight: 19,
  },
  buildingDetailHint: {
    color: Colors.amber,
    fontSize: 11,
    fontWeight: "800" as const,
  },
  buildingDetailContent: {
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  buildingDetailCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(9,14,24,0.94)",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 6,
  },
  buildingDetailCardEyebrow: {
    color: "rgba(255,255,255,0.42)",
    fontSize: 11,
    fontWeight: "800" as const,
    textTransform: "uppercase",
  },
  buildingDetailCardTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800" as const,
  },
  buildingDetailCardBody: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 13,
    lineHeight: 19,
  },
  fullTabScroll: {
    flex: 1,
  },
  fullTabContent: {
    gap: 10,
    padding: 12,
    paddingBottom: 8,
  },
  heroCard: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 6,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900" as const,
  },
  heroBody: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    lineHeight: 18,
  },
  offerCard: {
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: "rgba(10,17,29,0.92)",
    padding: 14,
    gap: 8,
  },
  offerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  offerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  offerBadgeText: {
    fontSize: 10,
    fontWeight: "800" as const,
    textTransform: "uppercase",
  },
  offerPrice: {
    fontSize: 16,
    fontWeight: "900" as const,
  },
  offerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800" as const,
  },
  offerSubtitle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    lineHeight: 17,
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(10,17,29,0.92)",
    padding: 14,
    gap: 10,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800" as const,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  memberIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  memberDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  memberDotOnline: {
    backgroundColor: "#5cf09d",
  },
  memberDotOffline: {
    backgroundColor: "#555",
  },
  memberName: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700" as const,
  },
  memberRole: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
  },
  memberTrophies: {
    color: "#ffd56b",
    fontSize: 13,
    fontWeight: "800" as const,
  },
  activityCard: {
    borderRadius: 14,
    backgroundColor: "rgba(17,28,44,0.95)",
    padding: 12,
    gap: 6,
  },
  activityTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800" as const,
  },
  activityBody: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    lineHeight: 17,
  },
  activityReward: {
    color: Colors.teal,
    fontSize: 11,
    fontWeight: "800" as const,
  },
  inventoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  inventoryItem: {
    flex: 1,
    minWidth: 70,
    borderRadius: 14,
    backgroundColor: "rgba(17,28,44,0.9)",
    padding: 10,
    alignItems: "center",
    gap: 4,
  },
  inventoryValue: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800" as const,
  },
  inventoryLabel: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 10,
    fontWeight: "700" as const,
    textTransform: "uppercase",
  },
  inventoryMeta: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
  },
  inventoryBuildRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  inventoryBuildDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  inventoryBuildName: {
    flex: 1,
    color: "#fff",
    fontSize: 13,
    fontWeight: "700" as const,
  },
  inventoryBuildTimer: {
    color: Colors.amber,
    fontSize: 12,
    fontWeight: "800" as const,
  },
  bottomPanel: {
    marginHorizontal: 0,
    marginBottom: 0,
    borderRadius: 18,
    backgroundColor: "rgba(8,14,26,0.95)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 10,
    maxHeight: 236,
    overflow: "hidden",
  },
  panelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  panelIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  panelIconText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900" as const,
  },
  panelInfo: {
    flex: 1,
    gap: 2,
  },
  panelTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800" as const,
  },
  panelLevel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "700" as const,
  },
  panelMeta: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
  },
  upgradeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeBtnDisabled: {
    opacity: 0.35,
  },
  upgradeBtnPressed: {
    transform: [{ scale: 0.95 }],
  },
  upgradeBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900" as const,
  },
  buildTraySectionStack: {
    gap: 10,
    paddingBottom: 4,
  },
  buildSection: {
    gap: 6,
  },
  buildSectionTitle: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 11,
    fontWeight: "800" as const,
    textTransform: "uppercase",
    paddingHorizontal: 4,
    letterSpacing: 0.5,
  },
  buildTrayContent: {
    gap: 8,
    paddingHorizontal: 2,
  },
  buildOption: {
    width: 108,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(19,30,46,0.96)",
    padding: 8,
    gap: 4,
  },
  buildOptionActive: {
    borderColor: "#ffe566",
    backgroundColor: "rgba(40,50,70,0.98)",
  },
  buildOptionPressed: {
    transform: [{ scale: 0.97 }],
  },
  buildOptionSwatch: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  buildOptionShort: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900" as const,
  },
  buildOptionTitle: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700" as const,
  },
  buildOptionMeta: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 10,
    fontWeight: "700" as const,
  },
  hubBar: {
    flexDirection: "row",
    gap: 6,
    marginHorizontal: 0,
    marginBottom: 0,
    padding: 6,
    borderRadius: 20,
    backgroundColor: "rgba(8,14,26,0.96)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  hubButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    backgroundColor: "rgba(17,28,44,0.9)",
  },
  hubButtonActive: {
    backgroundColor: "#e8f4ff",
  },
  hubButtonPressed: {
    transform: [{ scale: 0.96 }],
  },
  hubIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  hubIconWrapActive: {},
  hubButtonLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    fontWeight: "800" as const,
  },
  hubButtonLabelActive: {
    color: "#0b1a2e",
  },
});
