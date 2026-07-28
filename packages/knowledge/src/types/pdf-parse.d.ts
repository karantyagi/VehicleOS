declare module "pdf-parse/lib/pdf-parse.js" {
  type PdfParseResult = {
    text: string;
    numpages: number;
  };

  type PdfParse = (buffer: Buffer) => Promise<PdfParseResult>;

  const parse: PdfParse;
  export default parse;
}
