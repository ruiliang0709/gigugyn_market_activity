import { getDb } from "../api/queries/connection";
import { sql } from "drizzle-orm";

const db = getDb();

db.execute(sql`ALTER TABLE events ADD COLUMN schedule_image TEXT`)
  .then(() => {
    console.log("Column schedule_image added successfully");
    process.exit(0);
  })
  .catch((err: any) => {
    if (err.message?.includes("Duplicate column") || err.message?.includes("already")) {
      console.log("Column already exists");
      process.exit(0);
    }
    console.error("Error:", err.message);
    process.exit(1);
  });
