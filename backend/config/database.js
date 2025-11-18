import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load dotenv from the root directory (parent of backend)
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Connect to MongoDB with retry/backoff and clearer logging for development.
 * - Retries up to `maxRetries` times with exponential backoff.
 * - In production it will still exit the process on repeated failure.
 */
const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('[MongoDB] MONGODB_URI is not set. Skipping DB connection.');
    return;
  }

  const maxRetries = 5;
  const baseDelay = 2000; // ms

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[MongoDB] Attempt ${attempt} to connect to MongoDB...`);
      const conn = await mongoose.connect(mongoUri, {
        // keep default options; mongoose will warn about deprecated options if any
      });
      console.log(`[MongoDB] Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      const message = error && error.message ? error.message : String(error);
      console.error(`[MongoDB] Connection attempt ${attempt} failed: ${message}`);

      if (attempt < maxRetries) {
        const wait = baseDelay * Math.pow(2, attempt - 1);
        console.log(`[MongoDB] Retrying in ${wait}ms... (attempt ${attempt + 1}/${maxRetries})`);
        // eslint-disable-next-line no-await-in-loop
        await new Promise((res) => setTimeout(res, wait));
      } else {
        console.error(`[MongoDB] All ${maxRetries} connection attempts failed.`);
        console.error(`[MongoDB] Last error: ${message}`);
        console.error(`[MongoDB] Please ensure MongoDB is running and MONGODB_URI is correct.`);
        console.error(`[MongoDB] Current MONGODB_URI: ${mongoUri}`);

        // In production, fail hard so the process manager can restart / alert.
        if (process.env.NODE_ENV === 'production') {
          console.error('[MongoDB] Exiting process due to failed DB connection in production.');
          process.exit(1);
        }

        // In development, continue without exiting; server will start but DB requests will fail until connected.
        console.warn('[MongoDB] Continuing without DB connection (development). Requests that need the DB will fail until connection is established.');
      }
    }
  }
};

export default connectDB;