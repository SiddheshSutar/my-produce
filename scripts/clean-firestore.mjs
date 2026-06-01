import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

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
  console.error('Aborted: set CLEAN_FIRESTORE=yes or CLEAN_FIRESTORE=1 to confirm Firestore cleanup.');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function deleteCollectionDocs(path) {
  const collectionRef = collection(db, path);
  const snapshot = await getDocs(collectionRef);
  if (snapshot.empty) {
    console.log(`No documents found in collection: ${path}`);
    return [];
  }

  console.log(`Deleting ${snapshot.size} documents from ${path}`);
  const deletedIds = [];
  for (const docSnapshot of snapshot.docs) {
    await deleteDoc(doc(collectionRef, docSnapshot.id));
    deletedIds.push(docSnapshot.id);
  }
  return deletedIds;
}

async function deleteSubcollectionDocs(parentPath, subcollectionName) {
  const parentCollection = collection(db, parentPath);
  const parentSnapshot = await getDocs(parentCollection);
  for (const parentDoc of parentSnapshot.docs) {
    const subcollectionPath = `${parentPath}/${parentDoc.id}/${subcollectionName}`;
    const subcollectionRef = collection(db, subcollectionPath);
    const snapshot = await getDocs(subcollectionRef);
    if (snapshot.empty) continue;
    console.log(`Deleting ${snapshot.size} docs from ${subcollectionPath}`);
    for (const docSnapshot of snapshot.docs) {
      await deleteDoc(doc(subcollectionRef, docSnapshot.id));
    }
  }
}

async function main() {
  console.log('Firestore cleanup starting for project:', firebaseConfig.projectId);
  await deleteSubcollectionDocs(CONTRACT_PATH, 'cutting_orders');
  await deleteCollectionDocs(CONTRACT_PATH);
  await deleteSubcollectionDocs(BOOKING_PATH, 'rows');
  await deleteCollectionDocs(BOOKING_PATH);
  await deleteSubcollectionDocs(TRIP_PATH, 'cutting_orders');
  await deleteCollectionDocs(TRIP_PATH);
  console.log('Firestore cleanup completed.');
}

main().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});