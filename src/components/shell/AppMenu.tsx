import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ADMIN_PATH,
  ARCHIVE_PATH,
  DISCOVERY_PATH,
  FORUM_PATH,
  MY_EVENTS_NEW_PATH,
  MY_EVENTS_PATH,
  PROFILE_PATH,
  REPORT_ISSUE_PATH,
  SIGN_IN_PATH,
  SIGN_UP_PATH,
  TEAM_PATH,
} from "@/lib/routes";
import { shellMenuLink } from "@/lib/shell-styles";
import { cn } from "@/lib/utils";

import { AppBrand } from "./AppBrand";

interface MenuLink {
  href: string;
  label: string;
}

interface Props {
  userEmail: string | null;
  isAdmin: boolean;
}

export default function AppMenu({ userEmail, isAdmin }: Props) {
  const isLoggedIn = userEmail !== null;

  const navLinks: MenuLink[] = [
    { label: "Lista eventów", href: DISCOVERY_PATH },
    { label: "Archiwum wydarzeń", href: ARCHIVE_PATH },
    { label: "Zgłoś problem", href: REPORT_ISSUE_PATH },
  ];

  const fanLinks: MenuLink[] = [
    { label: "Mój profil", href: PROFILE_PATH },
    { label: "Moje eventy", href: MY_EVENTS_PATH },
    { label: "Dodaj wydarzenie", href: MY_EVENTS_NEW_PATH },
    { label: "Znajomi i ekipa", href: TEAM_PATH },
    { label: "Forum", href: FORUM_PATH },
  ];

  const adminLinks: MenuLink[] = [
    { label: "Panel admina", href: ADMIN_PATH },
    { label: "Znajomi i ekipa", href: TEAM_PATH },
    { label: "Forum", href: FORUM_PATH },
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Otwórz menu nawigacji"
          className={cn(
            "font-heading border-border bg-card/60 text-foreground shadow-glow-violet h-10 gap-2 rounded-md px-3 uppercase backdrop-blur-md",
            "hover:border-primary/50 hover:bg-secondary hover:text-accent tracking-wider",
            "focus-visible:border-primary/50 focus-visible:ring-ring/30",
          )}
        >
          <Menu className="text-accent size-4" aria-hidden />
          <span className="hidden sm:inline">Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className={cn(
          "border-primary/30 bg-card/95 text-foreground shadow-glow-violet backdrop-blur-xl",
          "motion-reduce:animate-none motion-reduce:transition-none",
        )}
      >
        <SheetHeader className="border-border border-b pb-4 text-left">
          <SheetTitle className="sr-only">Menu nawigacji</SheetTitle>
          <div className="mb-2">
            <AppBrand />
          </div>
          <SheetDescription className="text-muted-foreground">Nawigacja</SheetDescription>
        </SheetHeader>

        <nav className="flex flex-col gap-1 py-2" aria-label="Menu główne">
          {navLinks.map((link) => (
            <SheetClose asChild key={link.href}>
              <a href={link.href} className={shellMenuLink}>
                {link.label}
              </a>
            </SheetClose>
          ))}
        </nav>

        <div className="border-border mt-2 border-t pt-4">
          {isLoggedIn ? (
            <div className="space-y-2">
              <p className="text-muted-foreground truncate px-3 text-xs">{userEmail}</p>
              {!isAdmin ? (
                <>
                  <div className="border-border my-2 border-t" aria-hidden />
                  {fanLinks.map((link) => (
                    <SheetClose asChild key={link.href}>
                      <a href={link.href} className={shellMenuLink}>
                        {link.label}
                      </a>
                    </SheetClose>
                  ))}
                </>
              ) : (
                <>
                  {adminLinks.map((link) => (
                    <SheetClose asChild key={link.href}>
                      <a href={link.href} className={shellMenuLink}>
                        {link.label}
                      </a>
                    </SheetClose>
                  ))}
                </>
              )}
              <form method="POST" action="/api/auth/signout" className="px-3">
                <button type="submit" className={cn(shellMenuLink, "w-full text-left")}>
                  Wyloguj
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <SheetClose asChild>
                <a href={SIGN_IN_PATH} className={shellMenuLink}>
                  Zaloguj się
                </a>
              </SheetClose>
              <SheetClose asChild>
                <a href={SIGN_UP_PATH} className={shellMenuLink}>
                  Zarejestruj się
                </a>
              </SheetClose>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
