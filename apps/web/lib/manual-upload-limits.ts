/** OEM owner manual upload limits — ADR-007. Shared by client + API routes. */

export const MAX_MANUAL_BYTES = 50 * 1024 * 1024;
export const MAX_MANUAL_MB = Math.round(MAX_MANUAL_BYTES / (1024 * 1024));

export const MANUAL_UPLOAD_GUIDANCE =
  "Download the official owner’s manual PDF from your automaker’s owner portal — usually 20–40 MB. The maintenance schedule section alone is enough if the full manual is large.";

export const MANUAL_UPLOAD_DROPZONE_HINT = `PDF only · up to ${MAX_MANUAL_MB} MB · direct to secure storage`;

export const manualFileTooLargeMessage = (fileSizeBytes: number): string => {
  const fileMb = Math.max(1, Math.round(fileSizeBytes / (1024 * 1024)));
  return `This file is ${fileMb} MB — over our ${MAX_MANUAL_MB} MB limit. Official owner manuals are usually 20–40 MB. Factory service manuals and phone scans are often much larger; upload only the Maintenance Schedule section as a separate PDF, or use the digital owner manual from your OEM site.`;
};

export const manualStorageRejectedMessage = (): string =>
  `Upload failed — file may exceed ${MAX_MANUAL_MB} MB or your connection dropped. Use the official owner manual PDF (typically 20–40 MB), not a factory service manual.`;
