import { useCrews } from "@/components/hooks/useCrews";
import CrewForm from "@/components/fan/CrewForm";
import CrewMembersList from "@/components/fan/CrewMembersList";
import CrewRequestsList from "@/components/fan/CrewRequestsList";
import EventCardSubgenreBadges from "@/components/discovery/EventCardSubgenreBadges";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { Crew } from "@/types";
import { Loader2, Shield, Users } from "lucide-react";
import { useState } from "react";

function EmptyState({ children }: { children: string }) {
  return <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-sm">{children}</p>;
}

function CrewSummary({ crew }: { crew: Crew }) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-heading text-foreground text-2xl font-bold tracking-tight uppercase">{crew.name}</h3>
        {crew.city ? <p className="text-muted-foreground mt-1 text-sm">{crew.city}</p> : null}
      </div>

      {crew.subgenres.length > 0 ? <EventCardSubgenreBadges subgenres={crew.subgenres} /> : null}

      {crew.description ? <p className="text-foreground/90 text-sm leading-relaxed">{crew.description}</p> : null}
    </div>
  );
}

export default function CrewDashboard() {
  const {
    overview,
    displayedCrew,
    isLoading,
    error,
    pendingAction,
    createCrew,
    updateCrew,
    deleteCrew,
    acceptRequest,
    declineRequest,
    leaveCrew,
    removeMember,
    fetchContact,
  } = useCrews();

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  const ownCrew = overview.ownCrew;
  const membership = overview.membership;
  const crewId = ownCrew?.id ?? membership?.crewId ?? null;
  const isOwner = membership?.role === "owner";
  const isMember = membership !== null;
  const hasCrewContext = ownCrew !== null || isMember;

  async function handleCreate(values: Parameters<typeof createCrew>[0]) {
    setSuccessMessage(null);
    const result = await createCrew(values);
    if ("data" in result) {
      setSuccessMessage("Ekipa utworzona – jesteś właścicielem.");
    }
  }

  async function handleUpdate(values: Parameters<typeof updateCrew>[1]) {
    if (!ownCrew) {
      return;
    }
    setSuccessMessage(null);
    const result = await updateCrew(ownCrew.id, values);
    if ("data" in result) {
      setSuccessMessage("Zmiany w ekipie zapisane.");
    }
  }

  async function handleDelete() {
    if (!ownCrew) {
      return;
    }
    setSuccessMessage(null);
    const result = await deleteCrew(ownCrew.id);
    if ("data" in result) {
      setDeleteDialogOpen(false);
      setSuccessMessage("Ekipa została usunięta.");
    }
  }

  async function handleLeave() {
    if (!crewId) {
      return;
    }
    setSuccessMessage(null);
    const result = await leaveCrew(crewId);
    if ("data" in result) {
      setLeaveDialogOpen(false);
      setSuccessMessage("Opuszczono ekipę.");
    }
  }

  async function handleAccept(requestId: string) {
    setSuccessMessage(null);
    const result = await acceptRequest(requestId);
    if ("data" in result) {
      setSuccessMessage("Prośba zaakceptowana – nowy członek dołączył do ekipy.");
    }
  }

  async function handleDecline(requestId: string) {
    setSuccessMessage(null);
    const result = await declineRequest(requestId);
    if ("data" in result) {
      setSuccessMessage("Prośba odrzucona.");
    }
  }

  async function handleRemoveMember(memberUserId: string) {
    if (!crewId) {
      return;
    }
    setSuccessMessage(null);
    const result = await removeMember(crewId, memberUserId);
    if ("data" in result) {
      setSuccessMessage("Członek usunięty z ekipy.");
    }
  }

  if (isLoading) {
    return (
      <p className="text-muted-foreground mt-8 flex items-center gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Ładowanie ekipy...
      </p>
    );
  }

  if (!hasCrewContext && overview.outgoingRequest) {
    return (
      <div className="mt-8 space-y-4">
        <EmptyState>
          Prośba o dołączenie została wysłana – czekaj na odpowiedź właściciela ekipy. Możesz też utworzyć własną ekipę
          poniżej, jeśli jeszcze jej nie masz.
        </EmptyState>

        <div className="surface-panel p-6">
          <div className="flex items-center gap-2">
            <Shield className="text-primary h-5 w-5" />
            <h2 className="font-heading text-foreground text-xl font-bold tracking-tight uppercase">Utwórz ekipę</h2>
          </div>
          <p className="text-muted-foreground mt-2 text-sm">
            Możesz mieć jedną własną ekipę. Po utworzeniu zarządzasz członkami i prośbami o dołączenie.
          </p>
          <div className="mt-5">
            <CrewForm
              mode="create"
              pendingAction={pendingAction}
              submitActionKey="create"
              submitLabel="Utwórz ekipę"
              onSubmit={handleCreate}
            />
          </div>
        </div>

        {successMessage ? <p className="text-accent text-sm">{successMessage}</p> : null}
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </div>
    );
  }

  if (!hasCrewContext) {
    return (
      <div className="mt-8 space-y-4">
        <div className="surface-panel p-6">
          <div className="flex items-center gap-2">
            <Shield className="text-primary h-5 w-5" />
            <h2 className="font-heading text-foreground text-xl font-bold tracking-tight uppercase">Utwórz ekipę</h2>
          </div>
          <p className="text-muted-foreground mt-2 text-sm">
            Jeszcze nie masz własnej ekipy. Utwórz ją, aby zbierać ludzi do wspólnych wyjazdów na eventy DnB.
          </p>
          <div className="mt-5">
            <CrewForm
              mode="create"
              pendingAction={pendingAction}
              submitActionKey="create"
              submitLabel="Utwórz ekipę"
              onSubmit={handleCreate}
            />
          </div>
        </div>

        {successMessage ? <p className="text-accent text-sm">{successMessage}</p> : null}
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
      <section className="space-y-6">
        <div className="surface-panel p-6">
          <div className="flex items-center gap-2">
            <Users className="text-accent h-5 w-5" />
            <h2 className="font-heading text-foreground text-xl font-bold tracking-tight uppercase">
              {isOwner ? "Twoja ekipa" : "Ekipa, do której należysz"}
            </h2>
          </div>

          <div className="mt-4">
            {displayedCrew ? (
              <CrewSummary crew={displayedCrew} />
            ) : (
              <EmptyState>Nie udało się wczytać szczegółów ekipy.</EmptyState>
            )}
          </div>
        </div>

        {isMember && crewId ? (
          <div className="surface-panel p-6">
            <h2 className="font-heading text-foreground text-xl font-bold tracking-tight uppercase">Członkowie</h2>
            <div className="mt-4">
              <CrewMembersList
                members={overview.members}
                viewerUserId={membership.userId}
                isOwner={isOwner}
                pendingAction={pendingAction}
                onRemoveMember={(memberUserId) => {
                  void handleRemoveMember(memberUserId);
                }}
                onFetchContact={(memberUserId) => fetchContact(crewId, memberUserId)}
              />
            </div>
          </div>
        ) : null}

        {isOwner ? (
          <div className="surface-panel p-6">
            <h2 className="font-heading text-foreground text-xl font-bold tracking-tight uppercase">
              Prośby o dołączenie
            </h2>
            <div className="mt-4">
              <CrewRequestsList
                requests={overview.incomingRequests}
                pendingAction={pendingAction}
                onAccept={(requestId) => {
                  void handleAccept(requestId);
                }}
                onDecline={(requestId) => {
                  void handleDecline(requestId);
                }}
              />
            </div>
          </div>
        ) : null}
      </section>

      <aside className="space-y-6">
        {isOwner && ownCrew ? (
          <div className="surface-panel h-fit p-6">
            <h2 className="font-heading text-foreground text-xl font-bold tracking-tight uppercase">Edytuj ekipę</h2>
            <div className="mt-5">
              <CrewForm
                mode="edit"
                initialValues={{
                  name: ownCrew.name,
                  city: ownCrew.city,
                  description: ownCrew.description,
                  subgenres: ownCrew.subgenres,
                }}
                pendingAction={pendingAction}
                submitActionKey={`update:${ownCrew.id}`}
                submitLabel="Zapisz zmiany"
                onSubmit={handleUpdate}
              />
            </div>
          </div>
        ) : null}

        {!isOwner && isMember && crewId ? (
          <div className="surface-panel h-fit p-6">
            <h2 className="font-heading text-foreground text-xl font-bold tracking-tight uppercase">
              Opuszczenie ekipy
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Możesz w każdej chwili opuścić ekipę. Właściciel zostaje do momentu usunięcia całej ekipy.
            </p>
            <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pendingAction !== null}
                  className="mt-4 w-full font-semibold tracking-wider uppercase"
                >
                  Opuść ekipę
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Opuścić ekipę?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Stracisz dostęp do listy członków i kontaktu w tej ekipie. Możesz ponownie poprosić o dołączenie
                    później.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Anuluj</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(event) => {
                      event.preventDefault();
                      void handleLeave();
                    }}
                  >
                    {pendingAction === `leave:${crewId}` ? <Loader2 className="h-4 w-4 animate-spin" /> : "Opuść ekipę"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : null}

        {isOwner && ownCrew ? (
          <div className="surface-panel h-fit border-red-400/20 p-6">
            <h2 className="font-heading text-foreground text-xl font-bold tracking-tight uppercase">Usuń ekipę</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Usunięcie ekipy usuwa też członków i oczekujące prośby. Tej operacji nie da się cofnąć.
            </p>
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pendingAction !== null}
                  className="mt-4 w-full border-red-400/40 font-semibold tracking-wider text-red-400 uppercase hover:bg-red-400/10"
                >
                  Usuń ekipę
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Usunąć ekipę na stałe?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Wszyscy członkowie stracą dostęp, a oczekujące prośby zostaną usunięte.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Anuluj</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700"
                    onClick={(event) => {
                      event.preventDefault();
                      void handleDelete();
                    }}
                  >
                    {pendingAction === `delete:${ownCrew.id}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Usuń ekipę"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : null}

        {successMessage ? <p className="text-accent text-sm">{successMessage}</p> : null}
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </aside>
    </div>
  );
}
