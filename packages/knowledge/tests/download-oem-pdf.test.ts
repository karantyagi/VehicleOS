import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockOwnerManualPdfPath = vi.fn<(packId: string) => string>();
const mockSourceDirForPack = vi.fn<(packId: string) => string>();

vi.mock("../src/factory/paths.js", () => ({
  ownerManualPdfPath: (packId: string) => mockOwnerManualPdfPath(packId),
  sourceDirForPack: (packId: string) => mockSourceDirForPack(packId),
}));

import { downloadOemPdf } from "../src/factory/download-oem-pdf.js";

const sha256Buffer = (buffer: Buffer): string =>
  createHash("sha256").update(buffer).digest("hex");

describe("downloadOemPdf SHA hygiene", () => {
  let tempRoot = "";
  let pdfPath = "";

  beforeEach(() => {
    tempRoot = mkdtempSync(join(tmpdir(), "vos-pdf-"));
    pdfPath = join(tempRoot, "owner-manual.pdf");
    mockOwnerManualPdfPath.mockReturnValue(pdfPath);
    mockSourceDirForPack.mockReturnValue(tempRoot);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (tempRoot) rmSync(tempRoot, { recursive: true, force: true });
  });

  it("reuses local PDF when SHA matches manifest expectation", async () => {
    const pdf = Buffer.from("%PDF-test-content-for-sha-match");
    writeFileSync(pdfPath, pdf);

    vi.stubGlobal("fetch", vi.fn());

    const result = await downloadOemPdf({
      packId: "test-pack-sha-match",
      candidateUrls: ["https://example.com/manual.pdf"],
      expectedSha256: sha256Buffer(pdf),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.skippedDownload).toBe(true);
    expect(result.sha256Verified).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("re-downloads when local PDF SHA does not match manifest expectation", async () => {
    writeFileSync(pdfPath, Buffer.from("%PDF-stale-content"));

    const freshPdf = Buffer.alloc(10_500, 0x41);
    freshPdf.write("%PDF", 0);
    const freshSha256 = sha256Buffer(freshPdf);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        headers: { get: () => "application/pdf" },
        arrayBuffer: async () =>
          freshPdf.buffer.slice(freshPdf.byteOffset, freshPdf.byteOffset + freshPdf.byteLength),
      })),
    );

    const result = await downloadOemPdf({
      packId: "test-pack-sha-mismatch",
      candidateUrls: ["https://manuals.startmycar.com/published/test.pdf"],
      expectedSha256: freshSha256,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.redownloaded).toBe(true);
    expect(result.sha256).toBe(freshSha256);
    expect(readFileSync(pdfPath).equals(freshPdf)).toBe(true);
  });
});
