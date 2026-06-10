/** Closed catalog — 1:1 with `public.subgenre` enum in Postgres. */
export type Subgenre =
  | "jungle"
  | "hardcore_oldschool"
  | "liquid_dnb"
  | "liquid_funk"
  | "jump_up"
  | "anthem_dnb"
  | "darkstep"
  | "neurofunk"
  | "techstep"
  | "doomcore"
  | "funk_dnb"
  | "jazz_step"
  | "soul_dnb"
  | "drumfunk"
  | "abstract_dnb"
  | "autonomic"
  | "halftime"
  | "sambass"
  | "clownstep"
  | "trancestep"
  | "drumstep"
  | "crossbreed"
  | "ragga_dnb"
  | "ambient_dnb"
  | "intelligent_dnb";

export const SUBGENRES: readonly Subgenre[] = [
  "jungle",
  "hardcore_oldschool",
  "liquid_dnb",
  "liquid_funk",
  "jump_up",
  "anthem_dnb",
  "darkstep",
  "neurofunk",
  "techstep",
  "doomcore",
  "funk_dnb",
  "jazz_step",
  "soul_dnb",
  "drumfunk",
  "abstract_dnb",
  "autonomic",
  "halftime",
  "sambass",
  "clownstep",
  "trancestep",
  "drumstep",
  "crossbreed",
  "ragga_dnb",
  "ambient_dnb",
  "intelligent_dnb",
] as const;

export const SUBGENRE_LABELS: Record<Subgenre, string> = {
  jungle: "Jungle",
  hardcore_oldschool: "Hardcore (oldschool)",
  liquid_dnb: "Liquid DnB",
  liquid_funk: "Liquid Funk",
  jump_up: "Jump-up",
  anthem_dnb: "Anthem DnB",
  darkstep: "Darkstep",
  neurofunk: "Neurofunk",
  techstep: "Techstep",
  doomcore: "Doomcore",
  funk_dnb: "Funk DnB",
  jazz_step: "Jazz-step",
  soul_dnb: "Soul DnB",
  drumfunk: "Drumfunk",
  abstract_dnb: "Abstract DnB",
  autonomic: "Autonomic",
  halftime: "Halftime",
  sambass: "Sambass",
  clownstep: "Clownstep",
  trancestep: "Trancestep",
  drumstep: "Drumstep",
  crossbreed: "Crossbreed",
  ragga_dnb: "Ragga DnB",
  ambient_dnb: "Ambient DnB",
  intelligent_dnb: "Intelligent DnB",
};

export type EventStatus = "draft" | "pending" | "published" | "rejected";

export interface Event {
  id: string;
  name: string;
  startsAt: string;
  city: string;
  venueName: string;
  addressStreet: string;
  addressNumber: string;
  latitude: number | null;
  longitude: number | null;
  subgenres: Subgenre[];
  lineup: string[] | null;
  ticketUrl: string | null;
  isFree: boolean;
  price: string | null;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EventInsert {
  name: string;
  startsAt: string;
  city: string;
  venueName: string;
  addressStreet: string;
  addressNumber: string;
  subgenres: Subgenre[];
  latitude?: number | null;
  longitude?: number | null;
  lineup?: string[] | null;
  ticketUrl?: string | null;
  isFree?: boolean;
  price?: string | null;
  status?: EventStatus;
}

export type EventUpdate = Partial<EventInsert>;
