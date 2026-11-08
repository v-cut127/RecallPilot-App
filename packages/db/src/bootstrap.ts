import { bootstrapLocalDatabase, migrateDatabase } from "./migrate";

bootstrapLocalDatabase()
  .then(() => migrateDatabase())
  .then(() => {
    console.log("Database bootstrap complete.");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
