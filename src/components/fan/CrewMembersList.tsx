import CrewContactCard from "@/components/fan/CrewContactCard";
import { Button } from "@/components/ui/button";
import type { CrewContact, CrewMember } from "@/types";
import { fanPublicProfilePath } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { Loader2, Trash2, User } from "lucide-react";
import { useState } from "react";

interface Props {
  members: CrewMember[];
  viewerUserId: string;
  isOwner: boolean;
  pendingAction: string | null;
  onRemoveMember: (memberUserId: string) => void;
  onFetchContact: (memberUserId: string) => Promise<{ data: CrewContact } | { error: string }>;
}

function MemberLogin({ member }: { member: CrewMember }) {
  if (member.login) {
    return (
      <a href={fanPublicProfilePath(member.login)} className="text-primary font-semibold hover:underline">
        @{member.login}
      </a>
    );
  }

  return <span className="text-muted-foreground font-semibold">Fan bez publicznego loginu</span>;
}

function RoleBadge({ role }: { role: CrewMember["role"] }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-semibold tracking-wider uppercase",
        role === "owner" ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
      )}
    >
      {role === "owner" ? "Właściciel" : "Członek"}
    </span>
  );
}

export default function CrewMembersList({
  members,
  viewerUserId,
  isOwner,
  pendingAction,
  onRemoveMember,
  onFetchContact,
}: Props) {
  const [expandedContactUserId, setExpandedContactUserId] = useState<string | null>(null);
  const [contactByUserId, setContactByUserId] = useState<Record<string, CrewContact>>({});
  const [contactErrorByUserId, setContactErrorByUserId] = useState<Record<string, string>>({});
  const [loadingContactUserId, setLoadingContactUserId] = useState<string | null>(null);

  async function handleToggleContact(member: CrewMember) {
    if (member.userId === viewerUserId) {
      return;
    }

    if (expandedContactUserId === member.userId) {
      setExpandedContactUserId(null);
      return;
    }

    setExpandedContactUserId(member.userId);
    setContactErrorByUserId((prev) => {
      const { [member.userId]: _removed, ...rest } = prev;
      return rest;
    });

    if (member.userId in contactByUserId) {
      return;
    }

    setLoadingContactUserId(member.userId);
    const result = await onFetchContact(member.userId);
    setLoadingContactUserId(null);

    if ("error" in result) {
      setContactErrorByUserId((prev) => ({ ...prev, [member.userId]: result.error }));
      return;
    }

    setContactByUserId((prev) => ({ ...prev, [member.userId]: result.data }));
  }

  if (members.length === 0) {
    return <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-sm">Brak członków w ekipie.</p>;
  }

  return (
    <ul className="space-y-3">
      {members.map((member) => {
        const isSelf = member.userId === viewerUserId;
        const canRemove = isOwner && member.role === "member";
        const showContactToggle = !isSelf;
        const isContactExpanded = expandedContactUserId === member.userId;

        return (
          <li key={member.userId} className="border-border bg-background/40 rounded-xl border p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <User className="text-muted-foreground h-4 w-4" />
                  <MemberLogin member={member} />
                  <RoleBadge role={member.role} />
                </div>
                <p className="text-muted-foreground text-xs">
                  W ekipie od {new Date(member.joinedAt).toLocaleDateString("pl-PL")}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {showContactToggle ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void handleToggleContact(member);
                    }}
                    className="font-semibold tracking-wider uppercase"
                  >
                    {isContactExpanded ? "Ukryj kontakt" : "Pokaż kontakt"}
                  </Button>
                ) : null}

                {canRemove ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onRemoveMember(member.userId);
                    }}
                    disabled={pendingAction === `remove:${member.userId}`}
                    className="font-semibold tracking-wider uppercase"
                  >
                    {pendingAction === `remove:${member.userId}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Usuń
                  </Button>
                ) : null}
              </div>
            </div>

            {isContactExpanded ? (
              <CrewContactCard
                contact={contactByUserId[member.userId] ?? null}
                isLoading={loadingContactUserId === member.userId}
                error={contactErrorByUserId[member.userId] ?? null}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
