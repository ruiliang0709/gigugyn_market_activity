import { getDb } from "../api/queries/connection";
import { sql } from "drizzle-orm";

const db = getDb();

// Change schedule_image from TEXT to LONGTEXT to support large base64 images
db.execute(sql`ALTER TABLE events MODIFY COLUMN schedule_image LONGTEXT`)
  .then(() => {
    console.log("Column schedule_image changed to LONGTEXT successfully");
    process.exit(0);
  })
  .catch((err: any) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
