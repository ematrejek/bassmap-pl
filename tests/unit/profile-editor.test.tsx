import ProfileEditor from "@/components/fan/ProfileEditor";
import type { FanProfile } from "@/types";
import { SUBGENRE_LABELS } from "@/types";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  cleanup();
});

function buildProfile(overrides: Partial<FanProfile> = {}): FanProfile {
  return {
    userId: "11111111-1111-1111-1111-111111111111",
    login: "test_fan",
    bio: "Bio testowe",
    city: "Warszawa",
    favoriteSubgenres: [],
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
    ...overrides,
  };
}

describe("ProfileEditor", () => {
  it("shows bio character counter", () => {
    render(<ProfileEditor initialProfile={buildProfile({ bio: "12345" })} onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByText("5/200")).toBeInTheDocument();
  });

  it("blocks selecting more than five subgenres", () => {
    const onSave = vi.fn();

    render(
      <ProfileEditor
        initialProfile={buildProfile({
          favoriteSubgenres: ["jungle", "liquid_dnb", "jump_up", "neurofunk", "dancefloor"],
        })}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: SUBGENRE_LABELS.techstep }));

    expect(screen.getByText("Możesz wybrać maksymalnie 5 podgatunków")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("submits normalized profile on save", () => {
    const onSave = vi.fn();

    render(<ProfileEditor initialProfile={buildProfile()} onSave={onSave} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Login"), { target: { value: " NOWY_LOGIN " } });
    fireEvent.click(screen.getByRole("button", { name: /Zapisz zmiany/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        login: "nowy_login",
      }),
    );
  });
});
