const Counter = require("../models/Counter");
const Business = require("../models/Business");
const Order = require("../models/Order");

const nextSeq = async (key) => {
  const counter = await Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
};

// BUG FIX ("Duplicate value for field" when placing an order / registering a
// business):
// The Counter collection tracks the "next number to hand out" separately
// from the Business/Order collections themselves. If the Counter ever gets
// out of sync with what's actually in the database - e.g. test data was
// created across earlier broken versions of this app before the Counter
// existed, or a document was deleted/reset by hand - `nextSeq()` can hand
// out a number (BUS-000001, ORD-000001, ...) that already belongs to an
// existing document. Since businessId/orderNumber are unique indexes, that
// collision throws "Duplicate value for field: businessId/orderNumber".
// Fix: after getting a candidate number from the counter, confirm no
// document already uses it; if one does (stale/drifted counter), keep
// pulling the next number until we find one that's actually free. This is
// the same self-healing pattern already used for generateStoreSlug below.
const generateBusinessId = async () => {
  let businessId;
  do {
    const seq = await nextSeq("businessId");
    businessId = `BUS-${String(seq).padStart(6, "0")}`;
  } while (await Business.exists({ businessId }));
  return businessId;
};

const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const generateStoreSlug = async (businessName) => {
  const base = slugify(businessName) || "store";
  let slug = base;
  let counter = 1;
  while (await Business.exists({ storeSlug: slug })) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
};

const generateOrderNumber = async () => {
  let orderNumber;
  do {
    const seq = await nextSeq("orderNumber");
    orderNumber = `ORD-${String(seq).padStart(6, "0")}`;
  } while (await Order.exists({ orderNumber }));
  return orderNumber;
};

module.exports = { generateBusinessId, generateStoreSlug, generateOrderNumber, slugify };
