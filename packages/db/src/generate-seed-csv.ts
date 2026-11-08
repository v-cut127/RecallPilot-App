import fs from "node:fs/promises";
import path from "node:path";
import { format } from "date-fns";
import { REPO_ROOT } from "./env";
import { csvBuffer, generateSyntheticClinic } from "./seed-data";

export async function writeSeedFiles(): Promise<{
  commaPath: string;
  semicolonPath: string;
  e2ePath: string;
  rowCount: number;
}> {
  const seedDir = path.join(REPO_ROOT, "seed");
  const fixturesDir = path.join(REPO_ROOT, "fixtures");
  await fs.mkdir(seedDir, { recursive: true });
  await fs.mkdir(fixturesDir, { recursive: true });

  const asOfDate = format(new Date(), "yyyy-MM-dd");
  const clinic = generateSyntheticClinic({ count: 2_500, asOfDate, seed: 42 });
  const commaPath = path.join(seedDir, "bright-dental-comma-iso.csv");
  const semicolonPath = path.join(seedDir, "bright-dental-semicolon-ddmmyyyy.csv");
  await fs.writeFile(commaPath, csvBuffer(clinic, "comma"));
  await fs.writeFile(semicolonPath, csvBuffer(clinic, "semicolon"));

  const e2eClinic = generateSyntheticClinic({ count: 120, asOfDate, seed: 7 });
  const e2ePath = path.join(fixturesDir, "e2e-import.csv");
  await fs.writeFile(e2ePath, csvBuffer(e2eClinic, "comma"));

  return {
    commaPath,
    semicolonPath,
    e2ePath,
    rowCount: clinic.rows.length + clinic.messyRows.length,
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  writeSeedFiles()
    .then((result) => {
      console.log(`Wrote ${result.rowCount} rows to:`);
      console.log(`- ${result.commaPath}`);
      console.log(`- ${result.semicolonPath}`);
      console.log(`- ${result.e2ePath}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
