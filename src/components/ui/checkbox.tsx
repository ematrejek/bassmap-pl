import {
  Indicator,
  type CheckedState,
  unstable_CheckboxProvider as CheckboxProvider,
  unstable_CheckboxTrigger as CheckboxTrigger,
} from "@radix-ui/react-checkbox";
import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface CheckboxProps {
  className?: string;
  id?: string;
  checked?: CheckedState;
  defaultChecked?: CheckedState;
  onCheckedChange?: (checked: CheckedState) => void;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  value?: string;
  "aria-invalid"?: boolean;
}

function Checkbox({
  className,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  required,
  name,
  value,
  id,
  "aria-invalid": ariaInvalid,
}: CheckboxProps) {
  return (
    <CheckboxProvider
      checked={checked}
      defaultChecked={defaultChecked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      required={required}
      name={name}
      value={value}
    >
      <CheckboxTrigger
        id={id}
        aria-invalid={ariaInvalid}
        data-slot="checkbox"
        className={cn(
          "border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:bg-input/30 dark:aria-invalid:ring-destructive/40 dark:data-[state=checked]:bg-primary relative z-10 size-4 shrink-0 cursor-pointer rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        <Indicator data-slot="checkbox-indicator" className="grid place-content-center text-current transition-none">
          <CheckIcon className="size-3.5" />
        </Indicator>
      </CheckboxTrigger>
    </CheckboxProvider>
  );
}

export { Checkbox };
