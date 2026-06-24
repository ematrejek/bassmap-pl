import { ServerError } from "@/components/auth/ServerError";
import { Button } from "@/components/ui/button";
import { fanPublicProfileAbsoluteUrl } from "@/lib/fan/profile-share";
import { Check, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const COPIED_FEEDBACK_MS = 2000;

interface Props {
  login: string;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export default function ProfileShareButton({ login }: Props) {
  const trimmedLogin = login.trim();
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current !== null) {
        clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  if (!trimmedLogin) {
    return null;
  }

  const shareUrl = fanPublicProfileAbsoluteUrl(trimmedLogin);
  const shareTitle = `Profil @${trimmedLogin} – BassMap PL`;

  async function copyToClipboard(): Promise<void> {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    if (copiedTimeoutRef.current !== null) {
      clearTimeout(copiedTimeoutRef.current);
    }
    copiedTimeoutRef.current = setTimeout(() => {
      setCopied(false);
      copiedTimeoutRef.current = null;
    }, COPIED_FEEDBACK_MS);
  }

  async function handleShare(): Promise<void> {
    if (isSharing) {
      return;
    }

    setIsSharing(true);
    setError(null);

    try {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        try {
          await navigator.share({ title: shareTitle, url: shareUrl });
          return;
        } catch (shareError: unknown) {
          if (isAbortError(shareError)) {
            return;
          }
        }
      }

      await copyToClipboard();
    } catch {
      setError("Nie udało się skopiować linku. Spróbuj ponownie.");
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <div className="w-full">
      <Button
        type="button"
        variant="outline"
        disabled={isSharing}
        onClick={() => {
          void handleShare();
        }}
        className="w-full font-semibold tracking-wider uppercase"
        aria-label="Udostępnij profil"
      >
        {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
        {copied ? "Skopiowano" : "Udostępnij"}
      </Button>
      <span className="sr-only" aria-live="polite">
        {copied ? "Skopiowano link do profilu" : ""}
      </span>
      <ServerError message={error} />
    </div>
  );
}
