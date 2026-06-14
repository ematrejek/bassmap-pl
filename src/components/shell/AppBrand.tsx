import { MapPin } from "lucide-react";

import { HOME_PATH } from "@/lib/routes";

import { Equalizer } from "./Equalizer";

/** React logo for islands (e.g. AppMenu). Header uses AppBrand.astro for instant equalizer animation. */
export function AppBrand() {
  return (
    <a
      href={HOME_PATH}
      className="focus-visible:ring-ring/50 inline-flex items-center gap-2 rounded-md transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none"
    >
      <span className="border-primary/60 bg-primary/10 text-primary shadow-glow-violet relative flex h-9 w-9 items-center justify-center rounded-md border">
        <MapPin className="h-5 w-5" aria-hidden />
        <Equalizer bars={3} className="text-accent absolute -right-1 -bottom-1 h-3" />
      </span>
      <span className="font-heading text-foreground text-lg font-black tracking-widest">
        BASS<span className="text-primary text-glow-violet">MAP</span>
        <span className="text-accent ml-1 text-xs font-bold">PL</span>
      </span>
    </a>
  );
}
