import type {
  ResearchImportDraft,
  ResearchRecordReview,
  ResearchServiceItemReview,
  ResearchServiceRecord,
} from "./types";

export type ResearchReviewProgress = {
  totalVisits: number;
  reviewedVisits: number;
  totalServiceItems: number;
  reviewedServiceItems: number;
  complete: boolean;
};

export type ResearchRecordAttention = {
  reasons: string[];
  needsAttention: boolean;
};

export type ResearchRecordSourceGuidanceCode =
  | "work-not-itemized"
  | "visit-details-missing"
  | "source-evidence-unclear"
  | "low-confidence";

export type ResearchRecordSourceGuidance = {
  code: ResearchRecordSourceGuidanceCode;
  title: string;
  why: string;
  nextStep: string;
};

const genericServicePattern = /^(vehicle )?(serviced|service performed|maintenance performed|service completed)$/i;
const sourceUnclearPattern = /not (fully )?(visible|shown|itemized)|specific services? (?:are |were )?not|service details? (?:are |were )?(?:not )?(?:visible|available)|could not (?:see|read|identify)/i;

const cloneServiceItem = (item: ResearchServiceItemReview): ResearchServiceItemReview => ({ ...item });

const defaultServiceItems = (record: ResearchServiceRecord): ResearchServiceItemReview[] =>
  record.lineItems.length
    ? record.lineItems.map((item) => ({ originalItem: item, finalItem: item, outcome: "unreviewed" }))
    : [{ originalItem: null, finalItem: null, outcome: "unreviewed" }];

export const createResearchRecordReview = (record: ResearchServiceRecord): ResearchRecordReview => ({
  visitOutcome: "unreviewed",
  serviceItems: defaultServiceItems(record),
});

const normalizedReview = (record: ResearchServiceRecord): ResearchRecordReview => {
  const review = record.review;
  if (!review) return createResearchRecordReview(record);
  return {
    visitOutcome: review.visitOutcome,
    serviceItems: review.serviceItems.length ? review.serviceItems.map(cloneServiceItem) : defaultServiceItems(record),
  };
};

const finalServiceItems = (review: ResearchRecordReview): string[] =>
  review.serviceItems
    .map((item) => item.finalItem?.trim() ?? "")
    .filter(Boolean);

export const applyResearchRecordReview = (
  record: ResearchServiceRecord,
  review: ResearchRecordReview,
): ResearchServiceRecord => ({
  ...record,
  lineItems: review.visitOutcome === "not-a-visit" ? [] : finalServiceItems(review),
  review: {
    visitOutcome: review.visitOutcome,
    serviceItems: review.serviceItems.map(cloneServiceItem),
  },
});

const normalizedServiceLine = (value: string): string =>
  value.trim().replace(/\s+/g, " ").toLocaleLowerCase();

const sourceDoesNotItemize = (record: ResearchServiceRecord): boolean =>
  record.serviceDetailStatus === "not-itemized"
  || record.lineItems.length === 0
  || record.lineItems.every((item) => genericServicePattern.test(item.trim()));

const listWords = (values: string[]): string => {
  if (values.length <= 1) return values[0] ?? "";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
};

// These codes are derived from validated record fields, not from an arbitrary
// service-description phrase. They make every source limitation explainable
// without adding another model call or another participant choice.
export const researchRecordSourceGuidance = (
  record: ResearchServiceRecord,
): ResearchRecordSourceGuidance | null => {
  const missingVisitDetails = [
    !record.serviceDate ? "date" : null,
    record.mileage === null ? "mileage" : null,
    !record.provider ? "shop" : null,
  ].filter((value): value is string => value !== null);

  if (
    record.serviceDetailStatus === "not-itemized"
    || (record.recordKind === "service" && record.reportedBy !== "owner" && sourceDoesNotItemize(record))
  ) {
    return {
      code: "work-not-itemized",
      title: "CARFAX did not list the exact work",
      why: "CARFAX shows a visit, but does not name a specific maintenance task.",
      nextStep: "Check that the date, mileage, and shop match your PDF. If they do, choose Looks right. You do not need to guess or add the missing work.",
    };
  }
  if (missingVisitDetails.length) {
    return {
      code: "visit-details-missing",
      title: "CARFAX did not show every visit detail",
      why: `The draft does not show the ${listWords(missingVisitDetails)} for this visit.`,
      nextStep: "Check your PDF. Use Fix it only if it shows a different value; if the PDF also leaves it out, leave it blank and choose Looks right.",
    };
  }
  if (sourceUnclearPattern.test(record.evidence)) {
    return {
      code: "source-evidence-unclear",
      title: "This part of the report was not clear",
      why: "The source text for this visit was not fully visible or readable in the draft.",
      nextStep: "Compare the shown details with your PDF. Choose Looks right when they match, or Fix it when a shown detail is wrong.",
    };
  }
  if (record.confidence < 0.8) {
    return {
      code: "low-confidence",
      title: "This visit needs a quick source check",
      why: "The extraction had limited confidence in the details it found.",
      nextStep: "Compare the shown details with your PDF. Choose Looks right when they match, or Fix it when a shown detail is wrong.",
    };
  }
  return null;
};

// The cohort asks a person to make one source-backed judgment per visit. This
// records the corresponding per-action labels deterministically, so the
// operator can still calculate precision/recall without making the person
// answer a separate mini-survey for every line.
export const confirmResearchRecord = (record: ResearchServiceRecord): ResearchServiceRecord => {
  const review = createResearchRecordReview(record);
  const notItemized = sourceDoesNotItemize(record);
  return applyResearchRecordReview(record, {
    visitOutcome: "confirmed",
    serviceItems: review.serviceItems.map((item) => ({
      ...item,
      finalItem: notItemized ? null : item.finalItem,
      outcome: notItemized ? "not-itemized" : "confirmed",
    })),
  });
};

export type ResearchRecordCorrection = Pick<ResearchServiceRecord, "serviceDate" | "mileage" | "provider" | "lineItems">;

// A compact visit edit reconciles action labels by position. It preserves an
// unchanged line as confirmed, records a replacement as corrected, and makes
// additions/removals visible to the existing comparison metrics.
export const correctResearchRecord = (
  record: ResearchServiceRecord,
  correction: ResearchRecordCorrection,
): ResearchServiceRecord => {
  const nextLineItems = correction.lineItems.map((item) => item.trim()).filter(Boolean);
  const originalItems = createResearchRecordReview(record).serviceItems;
  const serviceItems: ResearchServiceItemReview[] = [];
  const itemCount = Math.max(originalItems.length, nextLineItems.length);
  for (let index = 0; index < itemCount; index += 1) {
    const original = originalItems[index];
    const finalItem = nextLineItems[index] ?? null;
    if (!original) {
      serviceItems.push({ originalItem: null, finalItem, outcome: "added" });
    } else if (!finalItem) {
      serviceItems.push({ originalItem: original.originalItem, finalItem: null, outcome: "not-supported" });
    } else if (original.finalItem && normalizedServiceLine(original.finalItem) === normalizedServiceLine(finalItem)) {
      serviceItems.push({ originalItem: original.originalItem, finalItem, outcome: "confirmed" });
    } else {
      serviceItems.push({ originalItem: original.originalItem, finalItem, outcome: "corrected" });
    }
  }
  return applyResearchRecordReview({ ...record, ...correction, lineItems: nextLineItems }, {
    visitOutcome: "corrected",
    serviceItems,
  });
};

export const resetResearchRecordReview = (record: ResearchServiceRecord): ResearchServiceRecord => {
  const review = record.review ?? createResearchRecordReview(record);
  return applyResearchRecordReview(record, {
    visitOutcome: "unreviewed",
    serviceItems: review.serviceItems.map((item) => ({
      ...item,
      finalItem: item.originalItem,
      outcome: "unreviewed",
    })),
  });
};

export const prepareResearchDraftForReview = (draft: ResearchImportDraft): ResearchImportDraft => ({
  ...draft,
  records: draft.records.map((record) => applyResearchRecordReview(record, normalizedReview(record))),
  warnings: [...draft.warnings],
});

const isCompletedServiceItem = (item: ResearchServiceItemReview): boolean => {
  if (item.outcome === "unreviewed") return false;
  if (["confirmed", "corrected", "added"].includes(item.outcome)) return Boolean(item.finalItem?.trim());
  return true;
};

export const isResearchRecordReviewComplete = (record: ResearchServiceRecord): boolean => {
  const review = record.review;
  if (!review || review.visitOutcome === "unreviewed") return false;
  if (review.visitOutcome === "not-a-visit") return true;
  return review.serviceItems.length > 0 && review.serviceItems.every(isCompletedServiceItem);
};

export const researchReviewProgress = (draft: ResearchImportDraft): ResearchReviewProgress => {
  const reviewableRecords = draft.records.filter((record) => record.review?.visitOutcome !== "not-a-visit");
  const serviceItems = reviewableRecords.flatMap((record) => record.review?.serviceItems ?? []);
  const reviewedVisits = draft.records.filter(isResearchRecordReviewComplete).length;
  const reviewedServiceItems = serviceItems.filter(isCompletedServiceItem).length;
  return {
    totalVisits: draft.records.length,
    reviewedVisits,
    totalServiceItems: serviceItems.length,
    reviewedServiceItems,
    complete: draft.records.length > 0 && reviewedVisits === draft.records.length,
  };
};

export const researchRecordAttention = (record: ResearchServiceRecord): ResearchRecordAttention => {
  const reasons: string[] = [];
  if (sourceUnclearPattern.test(record.evidence)) {
    reasons.push("CARFAX does not clearly name the work performed for this visit.");
  }
  if (record.lineItems.some((item) => genericServicePattern.test(item.trim()))) {
    reasons.push("CARFAX uses a general service label but does not say what work was done.");
  }
  if (record.serviceDetailStatus === "not-itemized" && !record.lineItems.some((item) => genericServicePattern.test(item.trim()))) {
    reasons.push("CARFAX shows this visit but does not list the work performed.");
  }
  if (!record.serviceDate || record.mileage === null || !record.provider) {
    reasons.push("One or more visit details were not shown in the draft.");
  }
  if (record.confidence < 0.8) {
    reasons.push("This visit needs a closer look before it becomes evaluation feedback.");
  }
  return { reasons, needsAttention: reasons.length > 0 };
};

export const isResearchRecordSourceUnverifiable = (record: ResearchServiceRecord): boolean => {
  const review = record.review;
  return review?.visitOutcome === "unsure" || review?.serviceItems.some(
    (item) => item.outcome === "not-itemized" || item.outcome === "unsure",
  ) === true;
};

export const isResearchRecordRejected = (record: ResearchServiceRecord): boolean =>
  record.review?.visitOutcome === "not-a-visit";
