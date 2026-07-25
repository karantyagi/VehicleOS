#!/usr/bin/env node
import { loadOemSchedulePack, loadServiceAliasBundles, loadSupportedVehicleCatalog, runPackQaRules } from "../index.js";

const main = (): void => {
  const catalog = loadSupportedVehicleCatalog();
  let failed = false;

  for (const row of catalog.vehicles) {
    const pack = loadOemSchedulePack(row.packId);
    const issues = runPackQaRules(pack);
    if (pack.qaStatus === "auto_verified" && issues.length > 0) {
      console.error(`FAIL ${row.packId}:`, issues);
      failed = true;
    } else {
      console.log(`OK ${row.packId} (${pack.qaStatus}) entries=${pack.entries.length}`);
    }
  }

  for (const bundle of loadServiceAliasBundles()) {
    console.log(`OK alias bundle ${bundle.bundleId} aliases=${bundle.aliases.length}`);
  }

  if (failed) process.exit(1);
};

main();
