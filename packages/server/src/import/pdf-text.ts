import type { Buffer } from "node:buffer";

type PdfParseResult = {
  text: string;
};

type PdfParseFn = (buffer: Buffer) => Promise<PdfParseResult>;

let cachedParser: PdfParseFn | null = null;

const loadPdfParser = async (): Promise<PdfParseFn> => {
  if (cachedParser) return cachedParser;
  const module = await import("pdf-parse");
  const parser = (module.default ?? module) as PdfParseFn;
  cachedParser = parser;
  return parser;
};

export const extractPdfText = async (buffer: Buffer): Promise<string> => {
  const parser = await loadPdfParser();
  const result = await parser(buffer);
  return result.text ?? "";
};
