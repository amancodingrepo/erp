import { createDbDump } from "../src/lib/db-backup.ts";

createDbDump()
  .then((row) => {
    console.log(row.name);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
