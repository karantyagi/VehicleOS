"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_DOGFOOD_FIXTURE_ID,
  DOGFOOD_FIXTURE_PROFILES,
  type DogfoodFixtureId,
} from "@/lib/dogfood-fixtures";

type DogfoodFixturePickerProps = {
  value: DogfoodFixtureId;
  onValueChange: (value: DogfoodFixtureId) => void;
  disabled?: boolean;
  id?: string;
};

export function DogfoodFixturePicker({
  value,
  onValueChange,
  disabled = false,
  id = "dogfood-fixture",
}: DogfoodFixturePickerProps) {
  const selected =
    DOGFOOD_FIXTURE_PROFILES.find((profile) => profile.id === value) ??
    DOGFOOD_FIXTURE_PROFILES.find((profile) => profile.id === DEFAULT_DOGFOOD_FIXTURE_ID)!;

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        Dogfood profile
      </Label>
      <Select
        value={value}
        onValueChange={(next) => onValueChange(next as DogfoodFixtureId)}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="h-9 text-sm">
          <SelectValue placeholder="Select dogfood profile" />
        </SelectTrigger>
        <SelectContent>
          {DOGFOOD_FIXTURE_PROFILES.map((profile) => (
            <SelectItem key={profile.id} value={profile.id}>
              {profile.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">{selected.description}</p>
    </div>
  );
}
