import { compileServiceAliasRegistry, type ServiceAliasRegistry } from "@vehicleos/domain";
import { loadServiceAliasBundles } from "@vehicleos/knowledge";

let cachedRegistry: ServiceAliasRegistry | null = null;

export const getServiceAliasRegistry = (): ServiceAliasRegistry => {
  if (!cachedRegistry) {
    cachedRegistry = compileServiceAliasRegistry(loadServiceAliasBundles());
  }
  return cachedRegistry;
};

export const resetServiceAliasRegistryForTests = (): void => {
  cachedRegistry = null;
};
