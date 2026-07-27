export type ServiceAliasDefinition = {
  canonicalServiceId: string;
  phrase: string;
  matchKind: "exact" | "contains" | "regex";
  priority: number;
};

export type ServiceAliasBundleInput = {
  bundleId: string;
  aliases: ServiceAliasDefinition[];
};

type CompiledAlias = {
  canonicalServiceId: string;
  priority: number;
  test: (line: string) => boolean;
};

export type ServiceAliasRegistry = {
  byCanonicalId: Map<string, CompiledAlias[]>;
};

const compileAlias = (alias: ServiceAliasDefinition): CompiledAlias => {
  const phrase = alias.phrase.trim();
  if (alias.matchKind === "exact") {
    const normalized = phrase.toLowerCase();
    return {
      canonicalServiceId: alias.canonicalServiceId,
      priority: alias.priority,
      test: (line) => line.trim().toLowerCase() === normalized,
    };
  }

  if (alias.matchKind === "regex") {
    const pattern = new RegExp(phrase, "i");
    return {
      canonicalServiceId: alias.canonicalServiceId,
      priority: alias.priority,
      test: (line) => pattern.test(line),
    };
  }

  const normalized = phrase.toLowerCase();
  return {
    canonicalServiceId: alias.canonicalServiceId,
    priority: alias.priority,
    test: (line) => line.toLowerCase().includes(normalized),
  };
};

export const compileServiceAliasRegistry = (
  bundles: ServiceAliasBundleInput[],
): ServiceAliasRegistry => {
  const byCanonicalId = new Map<string, CompiledAlias[]>();

  for (const bundle of bundles) {
    for (const alias of bundle.aliases) {
      const compiled = compileAlias(alias);
      const existing = byCanonicalId.get(alias.canonicalServiceId) ?? [];
      existing.push(compiled);
      byCanonicalId.set(alias.canonicalServiceId, existing);
    }
  }

  for (const aliases of byCanonicalId.values()) {
    aliases.sort((left, right) => left.priority - right.priority);
  }

  return { byCanonicalId };
};

export const lineMatchesCanonicalService = (input: {
  lineItem: string;
  canonicalServiceId: string;
  registry: ServiceAliasRegistry;
}): boolean => {
  const aliases = input.registry.byCanonicalId.get(input.canonicalServiceId) ?? [];
  return aliases.some((alias) => alias.test(input.lineItem));
};
