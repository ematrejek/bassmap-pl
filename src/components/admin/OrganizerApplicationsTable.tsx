import OrganizerApplicationActions from "@/components/admin/OrganizerApplicationActions";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DELETED_USER_AUTHOR_LABEL } from "@/lib/auth/display-name";
import { formatEventDate } from "@/lib/events/format";
import { shellPanel, shellPanelFlat, shellTextMuted } from "@/lib/shell-styles";
import { cn } from "@/lib/utils";
import type { OrganizerApplicationListItem, OrganizerApplicationStatus, OrganizerSocialPlatform } from "@/types";

export type OrganizerApplicationTableRow = OrganizerApplicationListItem;

interface Props {
  applications: OrganizerApplicationTableRow[];
  emptyMessage?: string;
}

const STATUS_LABELS: Record<OrganizerApplicationStatus, string> = {
  pending: "Oczekuje",
  code_issued: "Kod wysłany",
  code_verified: "Zweryfikowany",
  approved: "Zaakceptowany",
  rejected: "Odrzucony",
};

const PLATFORM_LABELS: Record<OrganizerSocialPlatform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
};

function statusBadgeClass(status: OrganizerApplicationStatus): string {
  switch (status) {
    case "pending":
      return "border-neon-orange/40 bg-neon-orange/15 text-foreground";
    case "code_issued":
      return "border-primary/40 bg-primary/15 text-foreground";
    case "code_verified":
      return "border-neon-green/40 bg-neon-green/15 text-foreground";
    case "approved":
      return "border-neon-green/40 bg-neon-green/15 text-foreground";
    case "rejected":
      return "border-destructive/40 bg-destructive/15 text-foreground";
  }
}

export default function OrganizerApplicationsTable({
  applications,
  emptyMessage = "Brak wniosków organizatorów.",
}: Props) {
  if (applications.length === 0) {
    return <div className={cn("p-8 text-center", shellPanelFlat, shellTextMuted)}>{emptyMessage}</div>;
  }

  return (
    <div className={cn("p-4 sm:p-6", shellPanel)}>
      <Table>
        <TableHeader>
          <TableRow className="border-border/70 hover:bg-transparent">
            <TableHead className="text-muted-foreground">Data</TableHead>
            <TableHead className="text-muted-foreground">Nazwa</TableHead>
            <TableHead className="text-muted-foreground">Platforma</TableHead>
            <TableHead className="text-muted-foreground">Profil</TableHead>
            <TableHead className="text-muted-foreground">Zgłaszający</TableHead>
            <TableHead className="text-muted-foreground">Status</TableHead>
            <TableHead className="text-muted-foreground text-right">Akcje</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((application) => (
            <TableRow key={application.id} className="border-border/70 hover:bg-secondary/40">
              <TableCell className={shellTextMuted}>{formatEventDate(application.createdAt)}</TableCell>
              <TableCell className="max-w-[180px] font-medium">{application.businessName}</TableCell>
              <TableCell className={shellTextMuted}>{PLATFORM_LABELS[application.socialPlatform]}</TableCell>
              <TableCell className="max-w-[200px]">
                <a
                  href={application.socialProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 truncate text-sm underline-offset-2 hover:underline"
                >
                  {application.socialProfileUrl.replace(/^https?:\/\//, "")}
                </a>
              </TableCell>
              <TableCell className="max-w-[180px]">
                {application.submitterLogin || application.submitterEmail ? (
                  <div className="flex flex-col gap-0.5">
                    {application.submitterLogin ? (
                      <span className="text-primary font-mono text-sm">@{application.submitterLogin}</span>
                    ) : null}
                    {application.submitterEmail ? (
                      <span className={cn("truncate text-xs", shellTextMuted)}>{application.submitterEmail}</span>
                    ) : null}
                  </div>
                ) : (
                  <span className={shellTextMuted}>{DELETED_USER_AUTHOR_LABEL}</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={cn("border", statusBadgeClass(application.status))}>
                  {STATUS_LABELS[application.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <OrganizerApplicationActions applicationId={application.id} status={application.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
