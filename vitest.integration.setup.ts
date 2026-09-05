import { config } from "dotenv";
import path from "path";

// Point every test in this run at the dedicated test database BEFORE any
// test file (and therefore before src/db/client.ts) gets imported.
config({ path: path.resolve(__dirname, ".env.test") });
