import EventDiscoveryCard from "@/components/discovery/EventDiscoveryCard";
import { formatEventPrice } from "@/lib/events/format";
import type { EventWithCoverUrl } from "@/types";
import { SUBGENRE_LABELS } from "@/types";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

function buildDiscoveryEvent(overrides: Partial<EventWithCoverUrl> = {}): EventWithCoverUrl {
  return {
    id: "evt-discovery-test",
    name: "Neuro Night Warsaw",
    startsAt: "2026-12-01T19:00:00.000Z",
    city: "Warszawa",
    venueName: "Proxima",
    addressStreet: null,
    addressNumber: null,
    latitude: 52.23,
    longitude: 21.01,
    subgenres: ["neurofunk", "jump_up"],
    lineup: null,
    description: null,
    ticketUrl: null,
    isFree: false,
    priceMode: "exact",
    priceMin: 50,
    priceMax: null,
    currency: "PLN",
    status: "published",
    coverPath: null,
    coverAspect: null,
    descriptionRightsAcceptedAt: null,
    coverSource: null,
    coverDeclarationKind: null,
    coverCopyrightDeclaredAt: null,
    createdBy: null,
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-01T10:00:00.000Z",
    coverUrl: null,
    ...overrides,
  };
}

describe("EventDiscoveryCard", () => {
  it("renders name, price, going placeholder, and subgenre badges", () => {
    const event = buildDiscoveryEvent();

    render(<EventDiscoveryCard event={event} />);

    expect(screen.getByRole("heading", { name: event.name })).toBeInTheDocument();
    expect(screen.getByText(formatEventPrice(event))).toBeInTheDocument();
    const goingCounter = screen.getByText("Idzie").closest("span");
    expect(goingCounter).toHaveTextContent("0");
    expect(goingCounter).toHaveTextContent("Idzie");
    expect(screen.getByText(SUBGENRE_LABELS.neurofunk)).toBeInTheDocument();
    expect(screen.getByText(SUBGENRE_LABELS.jump_up)).toBeInTheDocument();
  });

  it("shows ticket link in a new tab when ticketUrl is set", () => {
    const event = buildDiscoveryEvent({ ticketUrl: "https://tickets.example.com/neuro" });

    render(<EventDiscoveryCard event={event} />);

    const ticketLink = screen.getByRole("link", { name: "Kup bilet" });
    expect(ticketLink).toHaveAttribute("href", "https://tickets.example.com/neuro");
    expect(ticketLink).toHaveAttribute("target", "_blank");
    expect(ticketLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("shows Zobacz link to event details when ticketUrl is missing", () => {
    const event = buildDiscoveryEvent({ ticketUrl: null });

    render(<EventDiscoveryCard event={event} />);

    const detailLinks = screen.getAllByRole("link", { name: /Zobacz|Neuro Night Warsaw/ });
    const zobaczLink = detailLinks.find((link) => link.textContent === "Zobacz");
    expect(zobaczLink).toHaveAttribute("href", `/events/${event.id}`);
  });
});
