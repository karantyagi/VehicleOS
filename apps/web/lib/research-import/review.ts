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
    reasons.push("The report did not clearly name the work performed.");
  }
  if (record.lineItems.some((item) => genericServicePattern.test(item.trim()))) {
    reasons.push("The service description is too general to verify as a maintenance action.");
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
