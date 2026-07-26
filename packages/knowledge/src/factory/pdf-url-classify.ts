const MIRROR_URL_HOSTS = new Set(["manuals.startmycar.com", "manuals.opinautos.com"]);

export const isMirrorUrl = (url: string): boolean => {
  try {
    return MIRROR_URL_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
};

export const partitionUrls = (urls: string[]): { officialUrls: string[]; mirrorUrls: string[] } => {
  const officialUrls: string[] = [];
  const mirrorUrls: string[] = [];
  for (const url of urls) {
    if (isMirrorUrl(url)) mirrorUrls.push(url);
    else officialUrls.push(url);
  }
  return {
    officialUrls: Array.from(new Set(officialUrls)),
    mirrorUrls: Array.from(new Set(mirrorUrls)),
  };
};

export const mergeProvenanceUrls = (input: {
  existingOfficial?: string[];
  existingMirror?: string[];
  specOfficial?: string[];
  specMirror?: string[];
  downloadUrl?: string;
}): { officialUrls: string[]; mirrorUrls: string[] } => {
  const official = [...(input.existingOfficial ?? []), ...(input.specOfficial ?? [])];
  const mirror = [...(input.existingMirror ?? []), ...(input.specMirror ?? [])];

  if (input.downloadUrl) {
    if (isMirrorUrl(input.downloadUrl)) mirror.push(input.downloadUrl);
    else official.push(input.downloadUrl);
  }

  return partitionUrls([...official, ...mirror]);
};
