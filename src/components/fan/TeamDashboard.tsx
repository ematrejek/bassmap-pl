import FriendsDashboard from "@/components/fan/FriendsDashboard";
import CrewDashboard from "@/components/fan/CrewDashboard";
import { cn } from "@/lib/utils";
import { useState } from "react";

type TeamTab = "friends" | "crew";

const TABS: { id: TeamTab; label: string }[] = [
  { id: "friends", label: "Znajomi" },
  { id: "crew", label: "Moja ekipa" },
];

export default function TeamDashboard() {
  const [activeTab, setActiveTab] = useState<TeamTab>("friends");

  return (
    <div>
      <div
        className="border-border mt-8 flex flex-wrap gap-2 border-b pb-1"
        role="tablist"
        aria-label="Sekcje znajomych i ekipy"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={cn(
                "rounded-t-lg px-4 py-2 text-sm font-semibold tracking-wider uppercase transition-colors",
                isActive
                  ? "bg-primary/15 text-primary border-primary border-b-2"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
              )}
              onClick={() => {
                setActiveTab(tab.id);
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" hidden={activeTab !== "friends"}>
        {activeTab === "friends" ? <FriendsDashboard /> : null}
      </div>

      <div role="tabpanel" hidden={activeTab !== "crew"}>
        {activeTab === "crew" ? <CrewDashboard /> : null}
      </div>
    </div>
  );
}
