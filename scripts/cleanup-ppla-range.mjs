/**
 * Deletes PPLA data (contracts, bookings, trips) created between 12h ago and 20 min ago.
 * Documents created within the last 20 minutes are preserved.
 * Documents older than 12 hours are preserved.
 *
 * Usage:
 *   CLEAN_FIRESTORE=yes node scripts/cleanup-ppla-range.mjs
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
  doc,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBeGHaSfwA5G3_MVtb5KEoXw4bb8yu1E3Q",
  authDomain: "studio-1509262531-2336b.firebaseapp.com",
  projectId: "studio-1509262531-2336b",
  storageBucket: "studio-1509262531-2336b.firebasestorage.app",
  messagingSenderId: "1082020993784",
  appId: "1:1082020993784:web:ad140434e9594aae3bf90d"
};

const CONTRACT_PATH = 'app_data/contracts/contract_saving';
const BOOKING_PATH  = 'app_data/bookings/booking_saving';
const TRIP_PATH     = 'app_data/trips/trip_saving';

const CONFIRM_FLAG = process.env.CLEAN_FIRESTORE;
if (CONFIRM_FLAG !== 'yes' && CONFIRM_FLAG !== '1') {
  console.error('Aborted: set CLEAN_FIRESTORE=yes to confirm deletion.');
  process.exit(1);
}

const now      = Date.now();
const keepAfter  = now - 20 * 60 * 1000;        // last 20 min — KEEP
const deleteAfter = now - 12 * 60 * 60 * 1000;  // older than 12h — KEEP

console.log(`Deletion window:`);
console.log(`  From : ${new Date(deleteAfter).toISOString()}  (12 h ago)`);
console.log(`  To   : ${new Date(keepAfter).toISOString()}   (20 min ago)`);
console.log(`  Docs within the last 20 min will be preserved.\n`);

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

/**
 * Returns true if a Firestore document falls within the deletion window.
 * Checks receivedAt (creation), then updatedAt, then timestamp, then createdAt.
 */
function inRange(data) {
  // receivedAt = creation time for contracts & bookings; prefer it
  const ts = data.receivedAt ?? data.createdAt ?? data._createdAt ?? data.timestamp ?? data.updatedAt ?? null;
  if (!ts) {
    // no timestamp field at all — log and skip to be safe
    return false;
  }
  const ms = ts.toMillis ? ts.toMillis() : (ts.seconds ? ts.seconds * 1000 : Number(ts));
  return ms >= deleteAfter && ms < keepAfter;
}

async function cleanCollection(path) {
  const colRef = collection(db, path);
  const snap   = await getDocs(colRef);
  if (snap.empty) { console.log(`  (empty) ${path}`); return 0; }

  let deleted = 0;
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    if (!inRange(data)) continue;
    await deleteDoc(doc(colRef, docSnap.id));
    console.log(`  deleted: ${path}/${docSnap.id}  (createdAt: ${
      (data.createdAt ?? data._createdAt ?? data.timestamp)?.toDate?.().toISOString() ?? 'unknown'
    })`);
    deleted++;
  }
  console.log(`  → ${deleted} / ${snap.size} docs deleted from ${path}`);
  return deleted;
}

async function cleanSubcollection(parentPath, subcollection) {
  const parentSnap = await getDocs(collection(db, parentPath));
  let deleted = 0;
  for (const parentDoc of parentSnap.docs) {
    const subPath = `${parentPath}/${parentDoc.id}/${subcollection}`;
    const subSnap = await getDocs(collection(db, subPath));
    for (const subDoc of subSnap.docs) {
      const data = subDoc.data();
      if (!inRange(data)) continue;
      await deleteDoc(doc(db, subPath, subDoc.id));
      deleted++;
    }
  }
  console.log(`  → ${deleted} subcollection docs deleted from ${parentPath}/**/${subcollection}`);
  return deleted;
}

async function main() {
  console.log('=== PPLA range cleanup ===\n');

  console.log('Contracts + cutting_orders subcollection:');
  await cleanSubcollection(CONTRACT_PATH, 'cutting_orders');
  await cleanCollection(CONTRACT_PATH);

  console.log('\nBookings + rows subcollection:');
  await cleanSubcollection(BOOKING_PATH, 'rows');
  await cleanCollection(BOOKING_PATH);

  console.log('\nTrips + cutting_orders subcollection:');
  await cleanSubcollection(TRIP_PATH, 'cutting_orders');
  await cleanCollection(TRIP_PATH);

  console.log('\n=== Done ===');
}

main().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
