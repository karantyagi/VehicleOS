/** Canonical API/storage format for owner-entered dates */
export type IsoDateString = `${number}-${string}-${string}`;

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDateString(value: string): value is IsoDateString {
  return ISO_DATE_RE.test(value);
}

export function isoDateToLocalDate(iso: string): Date | null {
  if (!isIsoDateString(iso)) return null;
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

export function localDateToIsoDate(date: Date): IsoDateString {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isoDateToDisplay(iso: string): string {
  const date = isoDateToLocalDate(iso);
  if (!date) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}/${date.getFullYear()}`;
}

export function todayIsoDate(): IsoDateString {
  return localDateToIsoDate(new Date());
}

export type ParseDateInputResult =
  | { ok: true; iso: IsoDateString | "" }
  | { ok: false; error: string };

export function parseDateInput(raw: string, bounds?: { min?: string; max?: string }): ParseDateInputResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, iso: "" };

  let iso: string | null = null;

  if (isIsoDateString(trimmed)) {
    iso = trimmed;
  } else {
    const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
    if (slashMatch) {
      const [, monthRaw, dayRaw, yearRaw] = slashMatch;
      iso = `${yearRaw}-${monthRaw.padStart(2, "0")}-${dayRaw.padStart(2, "0")}`;
    } else {
      return { ok: false, error: "Use MM/DD/YYYY" };
    }
  }

  const date = isoDateToLocalDate(iso);
  if (!date) return { ok: false, error: "That date is not valid" };

  const normalized = localDateToIsoDate(date);

  if (bounds?.min) {
    const minDate = isoDateToLocalDate(bounds.min);
    if (minDate && date < minDate) {
      return { ok: false, error: `Date must be on or after ${isoDateToDisplay(bounds.min)}` };
    }
  }

  if (bounds?.max) {
    const maxDate = isoDateToLocalDate(bounds.max);
    if (maxDate && date > maxDate) {
      return { ok: false, error: `Date must be on or before ${isoDateToDisplay(bounds.max)}` };
    }
  }

  return { ok: true, iso: normalized };
}

export function formatDateInputWhileTyping(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}
