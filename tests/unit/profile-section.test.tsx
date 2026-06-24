import ProfileSection from "@/components/fan/ProfileSection";
import type { FanProfile } from "@/types";
import { SUBGENRE_LABELS } from "@/types";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const mockProfile: FanProfile = {
  userId: "11111111-1111-1111-1111-111111111111",
  login: "test_fan",
  bio: "Moje bio",
  city: "Kraków",
  favoriteSubgenres: ["neurofunk"],
  instagramUrl: null,
  soundcloudUrl: null,
  facebookUrl: null,
  spotifyUrl: null,
  twitchUrl: null,
  favouriteTrackPlatform: null,
  favouriteTrackUrl: null,
  favouriteTrackTitle: null,
  createdAt: "2026-06-24T10:00:00.000Z",
  updatedAt: "2026-06-24T10:00:00.000Z",
};

describe("ProfileSection", () => {
  it("renders ProfileView and switches to ProfileEditor", () => {
    render(
      <ProfileSection
        email="fan@example.com"
        userId={mockProfile.userId}
        initialProfile={mockProfile}
        goingEvents={[]}
      />,
    );

    expect(screen.getByRole("heading", { name: /@test_fan/i })).toBeInTheDocument();
    expect(screen.getByText(SUBGENRE_LABELS.neurofunk)).toBeInTheDocument();
    expect(screen.getByText("fan@example.com")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Edytuj profil/i }));

    expect(screen.getByRole("heading", { name: /Edytuj profil/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Login")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Edytuj profil/i })).not.toBeInTheDocument();
  });

  it("returns to view mode on cancel without saving", () => {
    render(
      <ProfileSection
        email="fan@example.com"
        userId={mockProfile.userId}
        initialProfile={mockProfile}
        goingEvents={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Edytuj profil/i }));
    fireEvent.change(screen.getByLabelText("Login"), { target: { value: "zmieniony_login" } });
    fireEvent.click(screen.getByRole("button", { name: /Anuluj/i }));

    expect(screen.getByRole("heading", { name: /@test_fan/i })).toBeInTheDocument();
    expect(screen.queryByDisplayValue("zmieniony_login")).not.toBeInTheDocument();
  });

  it("starts in edit mode when profile is missing", () => {
    render(
      <ProfileSection email="fan@example.com" userId={mockProfile.userId} initialProfile={null} goingEvents={[]} />,
    );

    expect(screen.getByRole("heading", { name: /Edytuj profil/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Login")).toBeInTheDocument();
  });

  it("stays in edit mode on cancel when profile was never saved", () => {
    render(
      <ProfileSection
        email="jan.kowalski@example.com"
        userId={mockProfile.userId}
        initialProfile={null}
        goingEvents={[]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Login"), { target: { value: "jan_kowalski" } });
    fireEvent.click(screen.getByRole("button", { name: /Anuluj/i }));

    expect(screen.getByRole("heading", { name: /Edytuj profil/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Login")).toBeInTheDocument();
  });
});
