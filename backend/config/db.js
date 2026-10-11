const mongoose = require("mongoose");

/**
 * Connects to MongoDB and then "self-heals" indexes on the collections that
 * have historically caused problems in this project (in particular the
 * Customer collection).
 *
 * WHY THIS EXISTS:
 * During earlier development (V1 -> V4) the Customer schema's unique index
 * changed shape (from a plain single-field unique index on `email` to a
 * compound `{ business: 1, email: 1 }` unique index). Mongo does NOT drop or
 * rewrite existing indexes automatically when a schema's `index()` call
 * changes - it only creates indexes that don't already exist. If a stale
 * single-field unique index on `email` is still sitting on the collection
 * from an earlier run, MongoDB will reject ANY second customer with that
 * same email GLOBALLY (across every business), even though the application
 * code only ever checks for a duplicate scoped to one business. This shows
 * up as "already registered" for what looks like a brand-new email, because
 * a different business's test customer with the same email already exists.
 *
 * The fix: on every server startup, after connecting, call
 * `Model.syncIndexes()` for the models that matter. `syncIndexes()` compares
 * the indexes defined in the current Mongoose schema against what's actually
 * on the collection in MongoDB, drops any index that is no longer defined in
 * the schema (including a stale single-field `email_1` unique index), and
 * creates any index that's missing (the compound `{business:1, email:1}`
 * unique index). This makes the fix apply automatically for every developer
 * / every environment without anyone needing to manually drop indexes in
 * Atlas or Compass.
 */
const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("MONGO_URI is not set in .env - cannot start server.");
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB connected: ${conn.connection.host}`);

    await syncCriticalIndexes();
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

/**
 * Removes orphan documents that are left over from earlier buggy runs of
 * this app (e.g. the old "create Business with owner: null" bug, or any
 * run that crashed mid-registration) and that would otherwise make
 * `syncIndexes()` fail with an E11000 duplicate key error when it tries to
 * build a NEW unique index (e.g. storeSlug: null showing up more than
 * once, because several broken test registrations never got a real
 * storeSlug). These documents are unusable anyway - they can never be
 * logged into or ordered from - so it's safe to delete them automatically.
 */
const removeOrphans = async (name, model, filter) => {
  const result = await model.deleteMany(filter);
  if (result.deletedCount > 0) {
    console.log(
      `[index-sync] Removed ${result.deletedCount} orphan ${name} document(s) left over from earlier broken test runs.`
    );
  }
};

const syncCriticalIndexes = async () => {
  // Require lazily to avoid circular require issues at module load time.
  const Customer = require("../models/Customer");
  const Business = require("../models/Business");
  const User = require("../models/User");
  const Order = require("../models/Order");
  const Counter = require("../models/Counter");
  const Category = require("../models/Category");
  const Product = require("../models/Product");
  const Cart = require("../models/Cart");
  const RefreshToken = require("../models/RefreshToken");

  await removeOrphans("Business", Business, {
    $or: [{ storeSlug: null }, { storeSlug: { $exists: false } }, { owner: null }],
  }).catch((err) => console.error("[index-sync] Failed to clean up orphan Business records:", err.message));

  // BUG FIX (owner can't add categories - "duplicate key" on Category):
  // Same root cause as the Business/Counter bugs above: leftover Category
  // documents from earlier broken test runs with business: null (created
  // before the current required `business` field existed) block
  // syncIndexes() from building the current unique `{business, name}`
  // compound index below - the create step fails with E11000, which is
  // caught and logged, but it also means the CORRECT index never gets
  // created and the collection is left with whatever stale index was
  // there before (e.g. a legacy global unique index on `name` alone),
  // which then rejects a perfectly fine new category as a duplicate.
  await removeOrphans("Category", Category, {
    $or: [{ business: null }, { business: { $exists: false } }],
  }).catch((err) => console.error("[index-sync] Failed to clean up orphan Category records:", err.message));

  await removeOrphans("Product", Product, {
    $or: [{ business: null }, { business: { $exists: false } }],
  }).catch((err) => console.error("[index-sync] Failed to clean up orphan Product records:", err.message));

  // BUG FIX ("Duplicate value for field: key" when placing an order):
  // An earlier iteration of this project used a different Counter schema
  // shape (a `key` field instead of using `_id` as the key, as the current
  // Counter model does). That earlier version left behind a UNIQUE index
  // on `key` on the `counters` collection. Our current Counter documents
  // never set a `key` field at all, so every counter document's `key` is
  // effectively null - and MongoDB's unique index treats a second document
  // with key: null as a duplicate of the first. The very first counter
  // created (businessId) succeeds; the second one (orderNumber) collides
  // with it and throws "Duplicate value for field: key", which blocked
  // every order placement. Counter now goes through the same index-sync
  // as the other models below, which drops that stale `key_1` index since
  // the current Counter schema doesn't define it.
  const modelsToSync = [
    { name: "Customer", model: Customer },
    { name: "Business", model: Business },
    { name: "User", model: User },
    { name: "Order", model: Order },
    { name: "Counter", model: Counter },
    // This database has gone through several earlier, different schema
    // versions of this project (the logs showed leftover indexes like
    // razorpayOrderId_1, customerId_1, a text index, etc.). Syncing every
    // model with a unique index - not just the ones already hit - avoids
    // playing whack-a-mole with one stale index at a time.
    { name: "Category", model: Category },
    { name: "Product", model: Product },
    { name: "Cart", model: Cart },
    { name: "RefreshToken", model: RefreshToken },
  ];

  for (const { name, model } of modelsToSync) {
    try {
      const before = await model.collection.indexes().catch(() => []);
      await model.syncIndexes();
      const after = await model.collection.indexes().catch(() => []);

      const beforeNames = before.map((i) => i.name).sort().join(",");
      const afterNames = after.map((i) => i.name).sort().join(",");

      if (beforeNames !== afterNames) {
        console.log(
          `[index-sync] ${name}: indexes changed.\n  before: [${beforeNames}]\n  after:  [${afterNames}]`
        );
      } else {
        console.log(`[index-sync] ${name}: indexes already up to date.`);
      }
    } catch (err) {
      // Never crash the server over an index-sync problem - log and continue.
      console.error(`[index-sync] Failed to sync indexes for ${name}:`, err.message);
    }
  }
};

module.exports = connectDB;
