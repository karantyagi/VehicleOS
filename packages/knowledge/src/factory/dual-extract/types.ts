export type ExtractedScheduleRow = {
  rowKey: string;
  serviceName: string;
  intervalMiles: number | null;
  intervalMonths: number | null;
  sourcePage: string;
  mainItemCode?: string;
  subItemCode?: string;
};

export type DualExtractResult = {
  passA: ExtractedScheduleRow[];
  passB: ExtractedScheduleRow[];
  pdfPath: string;
  pageCount: number;
};

export type ExtractMismatch = {
  rowKey: string;
  issue: string;
  passA?: ExtractedScheduleRow;
  passB?: ExtractedScheduleRow;
};
