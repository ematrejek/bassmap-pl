/** Closed catalog – 1:1 with `public.subgenre` enum in Postgres. */
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
  | "intelligent_dnb"
  | "dancefloor";

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
  "dancefloor",
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
  dancefloor: "Dancefloor",
};

export type EventStatus = "draft" | "pending" | "published" | "rejected";

/** Portrait = event poster; landscape = wide social / FB cover. */
export type CoverAspect = "portrait" | "landscape";

/** Where the cover image was sourced from (S-17 audit). */
export type CoverSource = "facebook" | "instagram" | "organizer_website" | "own";

/** Kind of copyright declaration for cover upload (S-17 audit). */
export type CoverDeclarationKind = "creator_consent" | "own_copyright";

export type EventPriceMode = "exact" | "from" | "range";
export type EventCurrency = "PLN" | "EUR" | "CZK";

export interface Event {
  id: string;
  name: string;
  startsAt: string;
  city: string;
  venueName: string;
  addressStreet: string | null;
  addressNumber: string | null;
  latitude: number | null;
  longitude: number | null;
  subgenres: Subgenre[];
  lineup: string[] | null;
  description: string | null;
  ticketUrl: string | null;
  isFree: boolean;
  priceMode: EventPriceMode | null;
  priceMin: number | null;
  priceMax: number | null;
  currency: EventCurrency | null;
  status: EventStatus;
  coverPath: string | null;
  coverAspect: CoverAspect | null;
  descriptionRightsAcceptedAt: string | null;
  coverSource: CoverSource | null;
  coverDeclarationKind: CoverDeclarationKind | null;
  coverCopyrightDeclaredAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AttendanceStatus = "going" | "interested";

export interface EventAttendanceRow {
  id: string;
  user_id: string;
  event_id: string;
  status: AttendanceStatus;
  created_at: string;
  updated_at: string;
}

export interface EventAttendanceSummary {
  goingCount: number;
  interestedCount: number;
  userStatus: AttendanceStatus | null;
}

/** Event z gotowym publicznym URL okładki (dodawany na SSR przed przekazaniem do UI). */
export type EventWithCoverUrl = Event & {
  coverUrl: string | null;
  goingCount?: number;
  userAttendanceStatus?: AttendanceStatus | null;
};

/** Wiersz w panelu admina – opcjonalnie z danymi zgłaszającego fana. */
export type AdminEventRow = EventWithCoverUrl & {
  submitterEmail?: string | null;
  submitterLogin?: string | null;
};

export interface EventInsert {
  name: string;
  startsAt: string;
  city: string;
  venueName: string;
  addressStreet: string | null;
  addressNumber: string | null;
  subgenres: Subgenre[];
  latitude?: number | null;
  longitude?: number | null;
  lineup?: string[] | null;
  description?: string | null;
  ticketUrl?: string | null;
  isFree?: boolean;
  priceMode?: EventPriceMode | null;
  priceMin?: number | null;
  priceMax?: number | null;
  currency?: EventCurrency | null;
  status?: EventStatus;
  coverPath?: string | null;
  coverAspect?: CoverAspect | null;
  descriptionRightsAcceptedAt?: string | null;
  coverSource?: CoverSource | null;
  coverDeclarationKind?: CoverDeclarationKind | null;
  coverCopyrightDeclaredAt?: string | null;
  createdBy?: string | null;
}

export type EventUpdate = Partial<EventInsert>;

export type ChangeSuggestionStatus = "pending" | "accepted" | "rejected";

/** Where the suggestion was submitted from (duplicate_flow = S-13; event_page = S-14). */
export type ChangeSuggestionSource = "duplicate_flow" | "event_page";

/** Partial event field updates for event_page suggestions (camelCase, same keys as EventUpdate). */
export type ChangeSuggestionPayload = Partial<
  Pick<
    EventUpdate,
    | "startsAt"
    | "city"
    | "venueName"
    | "addressStreet"
    | "addressNumber"
    | "latitude"
    | "longitude"
    | "description"
    | "lineup"
    | "ticketUrl"
    | "isFree"
    | "priceMode"
    | "priceMin"
    | "priceMax"
    | "currency"
  >
> & {
  locationMode?: "address" | "coordinates";
};

export interface ChangeSuggestion {
  id: string;
  eventId: string;
  submittedBy: string | null;
  /** Text comment; required for duplicate_flow, optional for event_page. */
  body: string | null;
  payload: ChangeSuggestionPayload | null;
  status: ChangeSuggestionStatus;
  source: ChangeSuggestionSource;
  createdAt: string;
  updatedAt: string;
}

export interface EventCommentRow {
  id: string;
  event_id: string;
  author_id: string | null;
  author_label: string;
  body: string;
  created_at: string;
}

export interface EventComment {
  id: string;
  eventId: string;
  authorId: string | null;
  authorLabel: string;
  body: string;
  createdAt: string;
}

export type ForumThreadCategory =
  | "szukam_ekipy"
  | "jestesmy_ekipa"
  | "podziel_sie_muzyka"
  | "sprzet_produkcja"
  | "transport_noclegi"
  | "pozostale";

export interface ForumThreadRow {
  id: string;
  category: ForumThreadCategory;
  title: string;
  body: string;
  city: string | null;
  tags: string[];
  author_id: string | null;
  author_label: string;
  crew_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ForumThread {
  id: string;
  category: ForumThreadCategory;
  title: string;
  body: string;
  city: string | null;
  tags: string[];
  authorId: string | null;
  authorLabel: string;
  crewId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ForumCommentRow {
  id: string;
  thread_id: string;
  author_id: string | null;
  author_label: string;
  body: string;
  created_at: string;
}

export interface ForumComment {
  id: string;
  threadId: string;
  authorId: string | null;
  authorLabel: string;
  body: string;
  createdAt: string;
}

export type FavouriteTrackPlatform = "spotify" | "soundcloud";

export interface FanProfileRow {
  user_id: string;
  login: string;
  bio: string | null;
  city: string | null;
  favorite_subgenres: Subgenre[];
  instagram_url: string | null;
  soundcloud_url: string | null;
  facebook_url: string | null;
  spotify_url: string | null;
  twitch_url: string | null;
  favourite_track_platform: FavouriteTrackPlatform | null;
  favourite_track_url: string | null;
  favourite_track_title: string | null;
  created_at: string;
  updated_at: string;
}

export interface FanProfile {
  userId: string;
  login: string;
  bio: string | null;
  city: string | null;
  favoriteSubgenres: Subgenre[];
  instagramUrl: string | null;
  soundcloudUrl: string | null;
  facebookUrl: string | null;
  spotifyUrl: string | null;
  twitchUrl: string | null;
  favouriteTrackPlatform: FavouriteTrackPlatform | null;
  favouriteTrackUrl: string | null;
  favouriteTrackTitle: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Fan profile fields safe to expose on public pages (no internal user id). */
export type PublicFanProfile = Omit<FanProfile, "userId">;

export interface FanProfileUpdate {
  login?: string;
  bio?: string | null;
  city?: string | null;
  favoriteSubgenres?: Subgenre[];
  instagramUrl?: string | null;
  soundcloudUrl?: string | null;
  facebookUrl?: string | null;
  spotifyUrl?: string | null;
  twitchUrl?: string | null;
  favouriteTrackPlatform?: FavouriteTrackPlatform | null;
  favouriteTrackUrl?: string | null;
  favouriteTrackTitle?: string | null;
}

export type FriendRequestStatus = "pending" | "accepted" | "declined";

export interface FriendRequestRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendRequestStatus;
  pair_user_low: string;
  pair_user_high: string;
  created_at: string;
  updated_at: string;
}

export interface FriendRequest {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: FriendRequestStatus;
  createdAt: string;
  updatedAt: string;
}

/** Accepted friendship surfaced to the UI (login resolved in services). */
export interface Friend {
  id: string;
  userId: string;
  login: string;
  acceptedAt: string;
}

export type NotificationType =
  | "friend_request"
  | "friend_request_accepted"
  | "event_recommendation"
  | "crew_join_request"
  | "crew_join_accepted";

export interface NotificationRow {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  actor_label: string;
  type: NotificationType;
  event_id: string | null;
  friend_request_id: string | null;
  crew_join_request_id: string | null;
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  recipientId: string;
  actorId: string | null;
  actorLabel: string;
  type: NotificationType;
  eventId: string | null;
  friendRequestId: string | null;
  crewJoinRequestId: string | null;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface EventRecommendationRow {
  id: string;
  event_id: string;
  sender_id: string | null;
  recipient_id: string;
  sender_label: string;
  message: string | null;
  notification_id: string | null;
  read_at: string | null;
  created_at: string;
}

export interface EventRecommendation {
  id: string;
  eventId: string;
  senderId: string | null;
  recipientId: string;
  senderLabel: string;
  message: string | null;
  notificationId: string | null;
  readAt: string | null;
  createdAt: string;
}

export type CrewRole = "owner" | "member";

export type CrewJoinRequestStatus = "pending" | "accepted" | "declined";

export interface CrewRow {
  id: string;
  owner_id: string;
  name: string;
  city: string | null;
  subgenres: Subgenre[];
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Crew {
  id: string;
  ownerId: string;
  name: string;
  city: string | null;
  subgenres: Subgenre[];
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrewMemberRow {
  crew_id: string;
  user_id: string;
  role: CrewRole;
  joined_at: string;
}

export interface CrewMember {
  crewId: string;
  userId: string;
  role: CrewRole;
  login: string | null;
  joinedAt: string;
}

export interface CrewJoinRequestRow {
  id: string;
  crew_id: string;
  requester_id: string;
  status: CrewJoinRequestStatus;
  created_at: string;
  updated_at: string;
}

export interface CrewJoinRequest {
  id: string;
  crewId: string;
  requesterId: string;
  requesterLogin: string | null;
  status: CrewJoinRequestStatus;
  createdAt: string;
  updatedAt: string;
}

/** Login and social links shared after an accepted crew join request. */
export interface CrewContact {
  login: string | null;
  instagramUrl: string | null;
  soundcloudUrl: string | null;
  facebookUrl: string | null;
  spotifyUrl: string | null;
  twitchUrl: string | null;
}

/** Fan-facing snapshot for the /team crew tab. */
export interface CrewOverview {
  ownCrew: Crew | null;
  membership: CrewMember | null;
  members: CrewMember[];
  incomingRequests: CrewJoinRequest[];
  outgoingRequest: CrewJoinRequest | null;
}
