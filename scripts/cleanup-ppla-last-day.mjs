/**
 * Deletes PPLA data created in the last N days and linked downstream records.
 *
 * Scope:
 * - Contracts (LA) in last N days + their subcollections: items, cutting_orders
 * - Bookings in last N days OR linked to deleted LA + rows subcollection
 * - Trips in last N days OR linked to deleted LA + cutting_orders subcollection
 *
 * Usage:
 *   CLEAN_FIRESTORE=yes CLEAN_DAYS=3 node scripts/cleanup-ppla-last-day.mjs
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
const BOOKING_PATH = 'app_data/bookings/booking_saving';
const TRIP_PATH = 'app_data/trips/trip_saving';

const CONFIRM_FLAG = process.env.CLEAN_FIRESTORE;
if (CONFIRM_FLAG !== 'yes' && CONFIRM_FLAG !== '1') {
  console.error('Aborted: set CLEAN_FIRESTORE=yes or CLEAN_FIRESTORE=1 to confirm deletion.');
  process.exit(1);
}

const daysRaw = Number(process.env.CLEAN_DAYS || 1);
const CLEAN_DAYS = Number.isFinite(daysRaw) && daysRaw > 0 ? daysRaw : 1;

const now = Date.now();
const cutoff = now - CLEAN_DAYS * 24 * 60 * 60 * 1000;

console.log('=== PPLA cleanup ===');
console.log(`Window (days)     : ${CLEAN_DAYS}`);
console.log(`Cutoff (inclusive): ${new Date(cutoff).toISOString()}`);
console.log(`Now              : ${new Date(now).toISOString()}\n`);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function toMs(ts) {
  if (!ts) return null;
  if (typeof ts?.toMillis === 'function') return ts.toMillis();
  if (typeof ts?.seconds === 'number') return ts.seconds * 1000;
  const num = Number(ts);
  return Number.isFinite(num) ? num : null;
}

function createdMs(data) {
  return toMs(
    data.receivedAt ??
      data.createdAt ??
      data._createdAt ??
      data.timestamp ??
      data.updatedAt ??
      null
  );
}

function isWithinWindow(data) {
  const ms = createdMs(data);
  return ms !== null && ms >= cutoff && ms <= now;
}

function isLinkedToContract(laId, contractIds) {
  if (!laId) return false;
  const value = String(laId).trim();
  if (!value) return false;

  for (const contractId of contractIds) {
    if (value === contractId || value.startsWith(`${contractId}-`)) {
      return true;
    }
  }
  return false;
}

async function deleteSubcollection(parentPath, parentDocId, subcollectionName) {
  const subPath = `${parentPath}/${parentDocId}/${subcollectionName}`;
  const subRef = collection(db, subPath);
  const subSnap = await getDocs(subRef);
  let count = 0;

  for (const subDoc of subSnap.docs) {
    await deleteDoc(doc(subRef, subDoc.id));
    count++;
  }

  return count;
}

async function main() {
  let contractsDeleted = 0;
  let contractItemsDeleted = 0;
  let contractCuttingOrdersDeleted = 0;

  let bookingsDeleted = 0;
  let bookingRowsDeleted = 0;

  let tripsDeleted = 0;
  let tripCuttingOrdersDeleted = 0;

  const contractSnap = await getDocs(collection(db, CONTRACT_PATH));
  const contractIdsToDelete = [];

  for (const contractDoc of contractSnap.docs) {
    const data = contractDoc.data();
    if (isWithinWindow(data)) {
      contractIdsToDelete.push(contractDoc.id);
    }
  }

  console.log(`Contracts selected (last ${CLEAN_DAYS} day(s)): ${contractIdsToDelete.length}`);

  for (const contractId of contractIdsToDelete) {
    contractItemsDeleted += await deleteSubcollection(CONTRACT_PATH, contractId, 'items');
    contractCuttingOrdersDeleted += await deleteSubcollection(CONTRACT_PATH, contractId, 'cutting_orders');
    await deleteDoc(doc(db, CONTRACT_PATH, contractId));
    contractsDeleted++;
  }

  const contractIdSet = new Set(contractIdsToDelete);

  const bookingSnap = await getDocs(collection(db, BOOKING_PATH));
  const bookingIdsToDelete = [];

  for (const bookingDoc of bookingSnap.docs) {
    const data = bookingDoc.data();
    const byTime = isWithinWindow(data);

    const topLaIdLinked = isLinkedToContract(data.laId, contractIdSet);
    const itemLaLinked = Array.isArray(data.items)
      ? data.items.some((item) => isLinkedToContract(item?.laId, contractIdSet))
      : false;
    const rowLaLinked = Array.isArray(data.rows)
      ? data.rows.some((row) => isLinkedToContract(row?.laId, contractIdSet))
      : false;

    if (byTime || topLaIdLinked || itemLaLinked || rowLaLinked) {
      bookingIdsToDelete.push(bookingDoc.id);
    }
  }

  console.log(`Bookings selected (last ${CLEAN_DAYS} day(s) or linked): ${bookingIdsToDelete.length}`);

  for (const bookingId of bookingIdsToDelete) {
    bookingRowsDeleted += await deleteSubcollection(BOOKING_PATH, bookingId, 'rows');
    await deleteDoc(doc(db, BOOKING_PATH, bookingId));
    bookingsDeleted++;
  }

  const tripSnap = await getDocs(collection(db, TRIP_PATH));
  const tripIdsToDelete = [];

  for (const tripDoc of tripSnap.docs) {
    const data = tripDoc.data();
    const byTime = isWithinWindow(data);

    const topLaIdLinked = isLinkedToContract(data.laId, contractIdSet);
    const cuttingOrderLaLinked = Array.isArray(data.cuttingOrders)
      ? data.cuttingOrders.some((item) => isLinkedToContract(item?.laId, contractIdSet))
      : false;

    if (byTime || topLaIdLinked || cuttingOrderLaLinked) {
      tripIdsToDelete.push(tripDoc.id);
    }
  }

  console.log(`Trips selected (last ${CLEAN_DAYS} day(s) or linked): ${tripIdsToDelete.length}`);

  for (const tripId of tripIdsToDelete) {
    tripCuttingOrdersDeleted += await deleteSubcollection(TRIP_PATH, tripId, 'cutting_orders');
    await deleteDoc(doc(db, TRIP_PATH, tripId));
    tripsDeleted++;
  }

  console.log('\n=== Deleted Summary ===');
  console.log(`Contracts: ${contractsDeleted}`);
  console.log(`Contract items subdocs: ${contractItemsDeleted}`);
  console.log(`Contract cutting_order subdocs: ${contractCuttingOrdersDeleted}`);
  console.log(`Bookings: ${bookingsDeleted}`);
  console.log(`Booking rows subdocs: ${bookingRowsDeleted}`);
  console.log(`Trips: ${tripsDeleted}`);
  console.log(`Trip cutting_order subdocs: ${tripCuttingOrdersDeleted}`);
  console.log('\nCleanup complete.');
}

main().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
