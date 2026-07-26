import { readFileSync } from "node:fs";

type PdfParseResult = {
  text: string;
  numpages: number;
};

type PdfParseFn = (buffer: Buffer) => Promise<PdfParseResult>;

let cachedParser: PdfParseFn | null = null;

const loadPdfParser = async (): Promise<PdfParseFn> => {
  if (cachedParser) return cachedParser;
  const module = await import("pdf-parse/lib/pdf-parse.js");
  const parser = (module.default ?? module) as PdfParseFn;
  cachedParser = parser;
  return parser;
};

export const parsePdfFile = async (pdfPath: string): Promise<PdfParseResult> => {
  const parser = await loadPdfParser();
  const buffer = readFileSync(pdfPath);
  return parser(buffer);
};
