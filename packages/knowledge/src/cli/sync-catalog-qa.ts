import { syncCatalogQaFromPacks } from "../factory/promote-pack.js";

const main = () => {
  const { updated, catalog } = syncCatalogQaFromPacks();
  const verified = catalog.vehicles.filter((row) => row.qaStatus === "auto_verified").length;
  const inReview = catalog.vehicles.filter((row) => row.qaStatus === "creator_review_required").length;

  console.log(`Catalog synced. Updated ${updated} row(s).`);
  console.log(`  auto_verified: ${verified}`);
  console.log(`  creator_review_required: ${inReview}`);
  console.log(`  total: ${catalog.vehicles.length}`);
};

main();
