import mongoose from 'mongoose';

// Serverless functions are recycled constantly, so the connection is cached on the
// global object. Without this each invocation would open a new pool and exhaust the
// database's connection limit.
let cached = global._hakimiMongoose;
if (!cached) cached = global._hakimiMongoose = { conn: null, promise: null };

// Mongo rejects database names containing . / \ " $ or spaces. The usual cause is a whole
// connection string pasted into MONGODB_DB, which surfaces deep in the driver as
// "Database names cannot contain the character '.'". Ignore an unusable value and take the
// database from the URI's own path instead, so one bad variable cannot down the deployment.
function resolveDbName(uri) {
  const configured = (process.env.MONGODB_DB || '').trim();
  if (configured && !/[.\/\\"$\s]/.test(configured)) return configured;
  if (configured) {
    console.warn(
      `MONGODB_DB is not a valid database name and was ignored. Set it to the database ` +
        `name only (e.g. hakimi_pharmacy_production), not the connection string.`
    );
  }
  const fromUri = uri.split('?')[0].split('/')[3];
  return fromUri ? decodeURIComponent(fromUri) : 'hakimi_pharmacy';
}

export default async function connectDB() {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, { dbName: resolveDbName(uri), bufferCommands: false })
      .catch((err) => {
        cached.promise = null;                       // let the next request retry
        throw err;
      });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
