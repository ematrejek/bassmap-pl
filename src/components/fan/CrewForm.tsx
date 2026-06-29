import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CreateCrewInput, UpdateCrewInput } from "@/lib/fan/crew-schema";
import { filterActiveSubgenres, activeSubgenresChanged } from "@/lib/subgenres";
import { cn } from "@/lib/utils";
import { SUBGENRES, SUBGENRE_LABELS, type Subgenre } from "@/types";
import { Loader2 } from "lucide-react";
import type { SyntheticEvent } from "react";
import { useState } from "react";

const MAX_SUBGENRES = 5;
const MAX_DESCRIPTION = 500;

function sortSelected(subgenres: Iterable<Subgenre>): Subgenre[] {
  const set = new Set(subgenres);
  return SUBGENRES.filter((subgenre) => set.has(subgenre));
}

export type CrewFormValues = CreateCrewInput | UpdateCrewInput;

interface Props {
  mode: "create" | "edit";
  initialValues?: Partial<CreateCrewInput>;
  pendingAction: string | null;
  submitActionKey: string;
  submitLabel: string;
  onSubmit: (values: CrewFormValues) => Promise<void>;
}

export default function CrewForm({
  mode,
  initialValues,
  pendingAction,
  submitActionKey,
  submitLabel,
  onSubmit,
}: Props) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [city, setCity] = useState(initialValues?.city ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [selectedSubgenres, setSelectedSubgenres] = useState<Set<Subgenre>>(
    () => new Set(filterActiveSubgenres(initialValues?.subgenres ?? [])),
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const selectedList = sortSelected(selectedSubgenres);
  const isSubmitting = pendingAction === submitActionKey;

  function toggleSubgenre(subgenre: Subgenre, checked: boolean) {
    setValidationError(null);
    setSelectedSubgenres((prev) => {
      const next = new Set(prev);
      if (checked) {
        if (next.size >= MAX_SUBGENRES) {
          setValidationError("Możesz wybrać maksymalnie 5 podgatunków");
          return prev;
        }
        next.add(subgenre);
      } else {
        next.delete(subgenre);
      }
      return next;
    });
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);

    if (name.trim().length === 0) {
      setValidationError("Nazwa ekipy jest wymagana");
      return;
    }

    const payload: CrewFormValues = {
      name: name.trim(),
      city: city.trim() === "" ? null : city.trim(),
      description: description.trim() === "" ? null : description.trim(),
      subgenres: selectedList,
    };

    if (mode === "edit" && initialValues?.subgenres && !activeSubgenresChanged(initialValues.subgenres, selectedList)) {
      const { subgenres: _omitted, ...withoutSubgenres } = payload;
      await onSubmit(withoutSubgenres);
      return;
    }

    await onSubmit(payload);
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
      <div className="space-y-2">
        <Label htmlFor={`crew-name-${mode}`}>Nazwa ekipy</Label>
        <Input
          id={`crew-name-${mode}`}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
          placeholder="np. Bass Crew PL"
          maxLength={80}
          autoComplete="off"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`crew-city-${mode}`}>Miasto (opcjonalnie)</Label>
        <Input
          id={`crew-city-${mode}`}
          value={city}
          onChange={(event) => {
            setCity(event.target.value);
          }}
          placeholder="np. Warszawa"
          maxLength={80}
          autoComplete="off"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label>Podgatunki</Label>
          {selectedList.length > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => {
                setSelectedSubgenres(new Set());
                setValidationError(null);
              }}
            >
              Wyczyść
            </Button>
          ) : null}
        </div>
        <div
          className="border-border bg-card/40 max-h-44 overflow-y-auto rounded-lg border p-2 sm:max-h-52"
          role="group"
          aria-label="Wybór podgatunków ekipy"
        >
          <div className="space-y-1">
            {SUBGENRES.map((subgenre) => (
              <label
                key={subgenre}
                className="text-foreground hover:bg-secondary flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm"
              >
                <Checkbox
                  checked={selectedSubgenres.has(subgenre)}
                  onCheckedChange={(checked) => {
                    toggleSubgenre(subgenre, checked === true);
                  }}
                  className="border-border data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                />
                <span>{SUBGENRE_LABELS[subgenre]}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={`crew-description-${mode}`}>Opis (opcjonalnie)</Label>
          <span className="text-muted-foreground text-xs">
            {description.length}/{MAX_DESCRIPTION}
          </span>
        </div>
        <Textarea
          id={`crew-description-${mode}`}
          value={description}
          onChange={(event) => {
            setDescription(event.target.value.slice(0, MAX_DESCRIPTION));
          }}
          placeholder="Krótko opisz styl ekipy i czego szukacie..."
          rows={4}
          maxLength={MAX_DESCRIPTION}
        />
      </div>

      {validationError ? <p className="text-destructive text-sm">{validationError}</p> : null}

      <Button
        type="submit"
        disabled={isSubmitting || name.trim().length === 0}
        className={cn("font-semibold tracking-wider uppercase", mode === "create" ? "w-full sm:w-auto" : "")}
      >
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {submitLabel}
      </Button>
    </form>
  );
}
