import type { ServiceAlias, ServiceAliasBundle } from "../types.js";
import { loadServiceAliasBundles } from "../load-catalog.js";

const matchPhrase = (line: string, alias: ServiceAlias): boolean => {
  const haystack = line.toLowerCase();
  const needle = alias.phrase.toLowerCase();
  if (alias.matchKind === "exact") return haystack === needle;
  if (alias.matchKind === "contains") return haystack.includes(needle);
  return new RegExp(alias.phrase, "i").test(line);
};

export const resolveCanonicalServiceFromLine = (
  line: string,
  options?: {
    bundles?: ServiceAliasBundle[];
    allowedCanonicalIds?: Set<string>;
  },
): string | null => {
  const bundles = options?.bundles ?? loadServiceAliasBundles();
  const matches = bundles
    .flatMap((bundle) => bundle.aliases)
    .filter((alias) => matchPhrase(line, alias))
    .filter(
      (alias) =>
        !options?.allowedCanonicalIds || options.allowedCanonicalIds.has(alias.canonicalServiceId),
    )
    .sort((a, b) => a.priority - b.priority);

  return matches[0]?.canonicalServiceId ?? null;
};
