export type HubTab = "base" | "shop" | "guild" | "inventory";

export type ResourceKind = "gold" | "elixir" | "gems" | "builders";

export interface ResourceState {
  gold: number;
  elixir: number;
  gems: number;
  builders: number;
}

export type BuildingType =
  | "townhall"
  | "ore_mine"
  | "stone_quarry"
  | "metal_mine"
  | "crystal_mine"
  | "solar_plant"
  | "wind_turbine"
  | "nuclear_plant"
  | "farm_field"
  | "water_pump"
  | "water_treatment"
  | "foundry"
  | "crystal_refinery"
  | "food_factory"
  | "battery_plant"
  | "nova_market"
  | "gas_station"
  | "travel_agency"
  | "ai_center"
  | "restaurant";
export type BuildingState = "ready" | "building" | "upgrading";
export type BuildingCategory = "townhall" | "resource" | "processing" | "consumption";
export type TerrainType = "grass" | "path" | "water" | "flowers";

const GRID_DENSITY_SCALE = 2;
const BASE_VILLAGE_GRID_SIZE = 400;
const REDUCED_VILLAGE_GRID_SIZE = Math.round(BASE_VILLAGE_GRID_SIZE / 3);

function scaleTiles(value: number): number {
  return value * GRID_DENSITY_SCALE;
}

function scaleInitialPlacement(value: number): number {
  return Math.round(value * (REDUCED_VILLAGE_GRID_SIZE / BASE_VILLAGE_GRID_SIZE));
}

export interface BuildingTemplate {
  type: BuildingType;
  name: string;
  shortLabel: string;
  category: BuildingCategory;
  footprint: {
    width: number;
    height: number;
  };
  costKind: Exclude<ResourceKind, "builders">;
  cost: number;
  buildSeconds: number;
  upgradeSeconds: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  description: string;
}

export interface PlacedBuilding {
  id: string;
  type: BuildingType;
  tileX: number;
  tileY: number;
  level: number;
  state: BuildingState;
  startedAt: number | null;
  durationSeconds: number | null;
  queuedLevel: number | null;
}

export interface ShopOffer {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  price: string;
  highlight: string;
}

export interface GuildMember {
  id: string;
  name: string;
  role: string;
  trophies: number;
  online: boolean;
}

export interface GuildActivity {
  id: string;
  title: string;
  body: string;
  reward: string;
}

export const VILLAGE_GRID = {
  columns: REDUCED_VILLAGE_GRID_SIZE,
  rows: REDUCED_VILLAGE_GRID_SIZE,
};

export const BUILDING_CATEGORY_ORDER: BuildingCategory[] = ["townhall", "resource", "processing", "consumption"];

export const BUILDING_CATEGORY_LABELS: Record<BuildingCategory, string> = {
  townhall: "Rathaus",
  resource: "Rohstoff",
  processing: "Verarbeitung",
  consumption: "Verbrauch",
};

export const BUILDING_TEMPLATES: Record<BuildingType, BuildingTemplate> = {
  townhall: {
    type: "townhall",
    name: "Rathaus",
    shortLabel: "RH",
    category: "townhall",
    footprint: { width: scaleTiles(3), height: scaleTiles(3) },
    costKind: "gold",
    cost: 0,
    buildSeconds: 0,
    upgradeSeconds: 180,
    primaryColor: "#f0b357",
    secondaryColor: "#c56a33",
    accentColor: "#fff2b8",
    description: "Zentrale für Ausbau, Verwaltung und die wichtigsten Dorfentscheidungen.",
  },
  ore_mine: {
    type: "ore_mine",
    name: "Erzmine",
    shortLabel: "ER",
    category: "resource",
    footprint: { width: scaleTiles(2), height: scaleTiles(2) },
    costKind: "gold",
    cost: 920,
    buildSeconds: 18,
    upgradeSeconds: 30,
    primaryColor: "#d8a75d",
    secondaryColor: "#8b5c2f",
    accentColor: "#ffe4ae",
    description: "Fördert Erz aus tieferen Schichten für spätere Verarbeitung.",
  },
  stone_quarry: {
    type: "stone_quarry",
    name: "Steinbruch",
    shortLabel: "ST",
    category: "resource",
    footprint: { width: scaleTiles(2), height: scaleTiles(2) },
    costKind: "gold",
    cost: 980,
    buildSeconds: 18,
    upgradeSeconds: 30,
    primaryColor: "#b9b8bf",
    secondaryColor: "#666772",
    accentColor: "#efeff6",
    description: "Gewinnt Steinblöcke für Bau, Straßen und schwere Industrie.",
  },
  metal_mine: {
    type: "metal_mine",
    name: "Metallmine",
    shortLabel: "ME",
    category: "resource",
    footprint: { width: scaleTiles(2), height: scaleTiles(2) },
    costKind: "gold",
    cost: 1050,
    buildSeconds: 20,
    upgradeSeconds: 32,
    primaryColor: "#9ea5b5",
    secondaryColor: "#4f5668",
    accentColor: "#d9e1f4",
    description: "Fördert metallhaltiges Gestein für Werkstoffe und Technik.",
  },
  crystal_mine: {
    type: "crystal_mine",
    name: "Kristallmine",
    shortLabel: "KR",
    category: "resource",
    footprint: { width: scaleTiles(2), height: scaleTiles(2) },
    costKind: "elixir",
    cost: 1120,
    buildSeconds: 22,
    upgradeSeconds: 34,
    primaryColor: "#5ae4ff",
    secondaryColor: "#266f9d",
    accentColor: "#c9fbff",
    description: "Gewinnt seltene Kristalle für Hightech und Premium-Produkte.",
  },
  solar_plant: {
    type: "solar_plant",
    name: "Solarpark",
    shortLabel: "SO",
    category: "resource",
    footprint: { width: scaleTiles(3), height: scaleTiles(2) },
    costKind: "gold",
    cost: 1260,
    buildSeconds: 24,
    upgradeSeconds: 38,
    primaryColor: "#ffd666",
    secondaryColor: "#c28f1f",
    accentColor: "#fff3b0",
    description: "Erzeugt stabilen Strom aus Sonnenenergie für das Netz.",
  },
  wind_turbine: {
    type: "wind_turbine",
    name: "Windrad",
    shortLabel: "WI",
    category: "resource",
    footprint: { width: scaleTiles(2), height: scaleTiles(3) },
    costKind: "gold",
    cost: 1180,
    buildSeconds: 22,
    upgradeSeconds: 36,
    primaryColor: "#8ce4ff",
    secondaryColor: "#3f81a8",
    accentColor: "#e6f8ff",
    description: "Liefert Windenergie und entlastet das zentrale Stromnetz.",
  },
  nuclear_plant: {
    type: "nuclear_plant",
    name: "Atomkraftwerk",
    shortLabel: "AK",
    category: "resource",
    footprint: { width: scaleTiles(3), height: scaleTiles(3) },
    costKind: "gems",
    cost: 150,
    buildSeconds: 32,
    upgradeSeconds: 48,
    primaryColor: "#84ff8c",
    secondaryColor: "#2f8744",
    accentColor: "#dbffe3",
    description: "Versorgt Großprojekte mit enormer Leistung und Reservekapazität.",
  },
  farm_field: {
    type: "farm_field",
    name: "Feld",
    shortLabel: "FD",
    category: "resource",
    footprint: { width: scaleTiles(3), height: scaleTiles(2) },
    costKind: "elixir",
    cost: 960,
    buildSeconds: 18,
    upgradeSeconds: 30,
    primaryColor: "#9bd864",
    secondaryColor: "#5b8f2a",
    accentColor: "#edf9c2",
    description: "Baut Nahrung an und versorgt Bewohner sowie Fabriken mit Grundstoffen.",
  },
  water_pump: {
    type: "water_pump",
    name: "Wasserpumpe",
    shortLabel: "WP",
    category: "resource",
    footprint: { width: scaleTiles(2), height: scaleTiles(2) },
    costKind: "gold",
    cost: 880,
    buildSeconds: 18,
    upgradeSeconds: 28,
    primaryColor: "#4bb6ff",
    secondaryColor: "#165a92",
    accentColor: "#d7f2ff",
    description: "Fördert Rohwasser in Speicher und Produktionsketten.",
  },
  water_treatment: {
    type: "water_treatment",
    name: "Aufbereitung",
    shortLabel: "AW",
    category: "resource",
    footprint: { width: scaleTiles(3), height: scaleTiles(2) },
    costKind: "elixir",
    cost: 1090,
    buildSeconds: 20,
    upgradeSeconds: 32,
    primaryColor: "#62f0ff",
    secondaryColor: "#1d7aa1",
    accentColor: "#dcffff",
    description: "Reinigt Wasser für Haushalte, Industrie und Hightech-Gebäude.",
  },
  foundry: {
    type: "foundry",
    name: "Gießerei",
    shortLabel: "GI",
    category: "processing",
    footprint: { width: scaleTiles(3), height: scaleTiles(2) },
    costKind: "gold",
    cost: 1380,
    buildSeconds: 24,
    upgradeSeconds: 40,
    primaryColor: "#f1915f",
    secondaryColor: "#8b3d2f",
    accentColor: "#ffd0b7",
    description: "Verarbeitet Erz und Metall zu robusten Bauteilen und Legierungen.",
  },
  crystal_refinery: {
    type: "crystal_refinery",
    name: "Kristallraffinerie",
    shortLabel: "RF",
    category: "processing",
    footprint: { width: scaleTiles(3), height: scaleTiles(2) },
    costKind: "elixir",
    cost: 1440,
    buildSeconds: 26,
    upgradeSeconds: 42,
    primaryColor: "#7cefff",
    secondaryColor: "#30619f",
    accentColor: "#dfffff",
    description: "Veredelt Kristalle für präzisere Systeme und Premium-Herstellung.",
  },
  food_factory: {
    type: "food_factory",
    name: "Lebensmittelfabrik",
    shortLabel: "LF",
    category: "processing",
    footprint: { width: scaleTiles(3), height: scaleTiles(2) },
    costKind: "elixir",
    cost: 1320,
    buildSeconds: 24,
    upgradeSeconds: 38,
    primaryColor: "#ffb866",
    secondaryColor: "#aa6221",
    accentColor: "#ffe5be",
    description: "Verarbeitet Nahrung aus den Feldern zu haltbaren Waren.",
  },
  battery_plant: {
    type: "battery_plant",
    name: "Batteriewerk",
    shortLabel: "BW",
    category: "processing",
    footprint: { width: scaleTiles(3), height: scaleTiles(2) },
    costKind: "gems",
    cost: 95,
    buildSeconds: 24,
    upgradeSeconds: 40,
    primaryColor: "#9af178",
    secondaryColor: "#347736",
    accentColor: "#e0ffcd",
    description: "Speichert Energie in Paketen für Fahrzeuge, Netze und Technik.",
  },
  nova_market: {
    type: "nova_market",
    name: "Nova-Markt",
    shortLabel: "NM",
    category: "consumption",
    footprint: { width: scaleTiles(3), height: scaleTiles(2) },
    costKind: "gold",
    cost: 1500,
    buildSeconds: 26,
    upgradeSeconds: 42,
    primaryColor: "#ff7e8a",
    secondaryColor: "#922f52",
    accentColor: "#ffd5df",
    description: "Verkauft verarbeitete Waren direkt an Nova und steigert den Umsatz.",
  },
  gas_station: {
    type: "gas_station",
    name: "Tankstelle",
    shortLabel: "TS",
    category: "consumption",
    footprint: { width: scaleTiles(3), height: scaleTiles(2) },
    costKind: "gold",
    cost: 1420,
    buildSeconds: 24,
    upgradeSeconds: 38,
    primaryColor: "#5dd8ff",
    secondaryColor: "#22608b",
    accentColor: "#d8f7ff",
    description: "Versorgt Fahrzeuge und Logistikrouten im Verbrauchssektor.",
  },
  travel_agency: {
    type: "travel_agency",
    name: "Reisezentrum",
    shortLabel: "RZ",
    category: "consumption",
    footprint: { width: scaleTiles(3), height: scaleTiles(2) },
    costKind: "elixir",
    cost: 1480,
    buildSeconds: 24,
    upgradeSeconds: 40,
    primaryColor: "#8c95ff",
    secondaryColor: "#4147a4",
    accentColor: "#dbe0ff",
    description: "Organisiert Reisen, Besucherströme und Einnahmen aus Mobilität.",
  },
  ai_center: {
    type: "ai_center",
    name: "KI-Rechenzentrum",
    shortLabel: "KI",
    category: "consumption",
    footprint: { width: scaleTiles(3), height: scaleTiles(3) },
    costKind: "gems",
    cost: 140,
    buildSeconds: 30,
    upgradeSeconds: 48,
    primaryColor: "#8a7dff",
    secondaryColor: "#37308e",
    accentColor: "#e7e1ff",
    description: "Vermarktet Rechenleistung, Analysen und digitale Dienste an Nova.",
  },
  restaurant: {
    type: "restaurant",
    name: "Restaurant",
    shortLabel: "RE",
    category: "consumption",
    footprint: { width: scaleTiles(3), height: scaleTiles(2) },
    costKind: "elixir",
    cost: 1340,
    buildSeconds: 22,
    upgradeSeconds: 36,
    primaryColor: "#ff9e67",
    secondaryColor: "#8a4726",
    accentColor: "#ffe0c8",
    description: "Verkauft veredelte Nahrung und zieht neue Nachfrage ins Dorf.",
  },
};

export const BUILD_MENU: BuildingType[] = [
  "ore_mine",
  "stone_quarry",
  "metal_mine",
  "crystal_mine",
  "solar_plant",
  "wind_turbine",
  "nuclear_plant",
  "farm_field",
  "water_pump",
  "water_treatment",
  "foundry",
  "crystal_refinery",
  "food_factory",
  "battery_plant",
  "nova_market",
  "gas_station",
  "travel_agency",
  "ai_center",
  "restaurant",
];

export const INITIAL_RESOURCES: ResourceState = {
  gold: 6200,
  elixir: 5100,
  gems: 220,
  builders: 2,
};

export const INITIAL_BUILDINGS: PlacedBuilding[] = [
  {
    id: "townhall-main",
    type: "townhall",
    tileX: scaleInitialPlacement(scaleTiles(98)),
    tileY: scaleInitialPlacement(scaleTiles(98)),
    level: 4,
    state: "ready",
    startedAt: null,
    durationSeconds: null,
    queuedLevel: null,
  },
  {
    id: "ore-1",
    type: "ore_mine",
    tileX: scaleInitialPlacement(scaleTiles(92)),
    tileY: scaleInitialPlacement(scaleTiles(98)),
    level: 3,
    state: "ready",
    startedAt: null,
    durationSeconds: null,
    queuedLevel: null,
  },
  {
    id: "stone-1",
    type: "stone_quarry",
    tileX: scaleInitialPlacement(scaleTiles(106)),
    tileY: scaleInitialPlacement(scaleTiles(98)),
    level: 3,
    state: "ready",
    startedAt: null,
    durationSeconds: null,
    queuedLevel: null,
  },
  {
    id: "water-1",
    type: "water_pump",
    tileX: scaleInitialPlacement(scaleTiles(92)),
    tileY: scaleInitialPlacement(scaleTiles(106)),
    level: 2,
    state: "ready",
    startedAt: null,
    durationSeconds: null,
    queuedLevel: null,
  },
  {
    id: "solar-1",
    type: "solar_plant",
    tileX: scaleInitialPlacement(scaleTiles(104)),
    tileY: scaleInitialPlacement(scaleTiles(106)),
    level: 2,
    state: "ready",
    startedAt: null,
    durationSeconds: null,
    queuedLevel: null,
  },
  {
    id: "foundry-1",
    type: "foundry",
    tileX: scaleInitialPlacement(scaleTiles(97)),
    tileY: scaleInitialPlacement(scaleTiles(89)),
    level: 2,
    state: "ready",
    startedAt: null,
    durationSeconds: null,
    queuedLevel: null,
  },
  {
    id: "battery-1",
    type: "battery_plant",
    tileX: scaleInitialPlacement(scaleTiles(104)),
    tileY: scaleInitialPlacement(scaleTiles(90)),
    level: 1,
    state: "ready",
    startedAt: null,
    durationSeconds: null,
    queuedLevel: null,
  },
  {
    id: "market-1",
    type: "nova_market",
    tileX: scaleInitialPlacement(scaleTiles(96)),
    tileY: scaleInitialPlacement(scaleTiles(113)),
    level: 2,
    state: "ready",
    startedAt: null,
    durationSeconds: null,
    queuedLevel: null,
  },
  {
    id: "restaurant-1",
    type: "restaurant",
    tileX: scaleInitialPlacement(scaleTiles(104)),
    tileY: scaleInitialPlacement(scaleTiles(113)),
    level: 2,
    state: "ready",
    startedAt: null,
    durationSeconds: null,
    queuedLevel: null,
  },
];

export const SHOP_OFFERS: ShopOffer[] = [
  {
    id: "offer-1",
    title: "Startpaket der Baumeister",
    subtitle: "Mehr Kapital für neue Förder- und Verbrauchsgebäude.",
    badge: "Beliebt",
    price: "4,99 €",
    highlight: "#f2b24c",
  },
  {
    id: "offer-2",
    title: "Industriebooster",
    subtitle: "Hilft Fabriken, Energie und Verarbeitung schneller zu starten.",
    badge: "Neu",
    price: "2,99 €",
    highlight: "#8bc7ff",
  },
  {
    id: "offer-3",
    title: "Nova Premium",
    subtitle: "Mehr Elixier und Gems für Hightech- und Konsumgebäude.",
    badge: "Sofort",
    price: "1,99 €",
    highlight: "#eb8cff",
  },
];

export const GUILD_MEMBERS: GuildMember[] = [
  {
    id: "gm-1",
    name: "LunaForge",
    role: "Anführerin",
    trophies: 2480,
    online: true,
  },
  {
    id: "gm-2",
    name: "Bergklinge",
    role: "Ältester",
    trophies: 2215,
    online: true,
  },
  {
    id: "gm-3",
    name: "NovaNest",
    role: "Veteran",
    trophies: 2042,
    online: false,
  },
  {
    id: "gm-4",
    name: "Kieselherz",
    role: "Mitglied",
    trophies: 1886,
    online: true,
  },
];

export const GUILD_ACTIVITIES: GuildActivity[] = [
  {
    id: "ga-1",
    title: "Gildenkrieg morgen 19:00",
    body: "Stelle deine Produktionskette bis heute Abend fertig und teile dein Layout.",
    reward: "+320 Ruhm",
  },
  {
    id: "ga-2",
    title: "Spendenziel fast erreicht",
    body: "Noch 12 Spenden bis zur Wochenbelohnung für alle Mitglieder.",
    reward: "Kiste x1",
  },
  {
    id: "ga-3",
    title: "Verbrauchssektor wächst",
    body: "Zeige deine Nova-Geschäfte in der Gilde und sammle Verteidigungstipps.",
    reward: "+40 XP",
  },
];
