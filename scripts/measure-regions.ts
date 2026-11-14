import { writeFileSync, mkdirSync } from "node:fs";
import { worldAreaReport } from "../src/game/world/measure";
const report = worldAreaReport();
mkdirSync("docs/regions", { recursive: true });
writeFileSync(
  "docs/regions/dimensions.json",
  JSON.stringify(report, null, 2) + "\n",
);
for (const r of report.regions)
  console.log(
    `${r.id}: city ${r.city.width}×${r.city.height}, ${r.city.reachableArea.toLocaleString()} reachable; wilderness ${r.wilderness.width}×${r.wilderness.height}, ${r.wilderness.reachableArea.toLocaleString()} reachable`,
  );
console.log(
  `Unique reachable total ${report.totalReachableArea.toLocaleString()} units² (${(report.targetRatio * 100).toFixed(1)}% of 20.8M target).`,
);
