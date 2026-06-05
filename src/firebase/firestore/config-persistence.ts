import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

/**
 * Configuration types that can be persisted
 */
type ConfigType = 
  | 'pricing-condition' 
  | 'incoterm' 
  | 'customer-mapping' 
  | 'pack-type' 
  | 'shipping-lines' 
  | 'vessels' 
  | 'port-of-loading' 
  | 'port-of-destination'
  | 'customer-to-packtype';

/**
 * Save imported configuration data to Firestore
 */
export async function saveConfigToFirestore(
  configData: Record<ConfigType, any[]>
): Promise<boolean> {
  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      console.warn('No user logged in, skipping Firestore save');
      return false;
    }

    const firestore = getFirestore();
    const configDocRef = doc(
      firestore,
      'users',
      currentUser.uid,
      'settings',
      'importedConfigs'
    );

    // Count total records being saved
    const recordCounts = Object.entries(configData).reduce((acc, [key, value]) => {
      acc[key] = Array.isArray(value) ? value.length : 0;
      return acc;
    }, {} as Record<string, number>);

    console.log('Saving config to Firestore for user:', currentUser.uid, 'Records:', recordCounts);

    // Save with timestamp for tracking
    await setDoc(configDocRef, {
      ...configData,
      lastImportedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    console.log('Config data saved to Firestore successfully');
    return true;
  } catch (error) {
    console.error('Error saving config to Firestore:', error);
    return false;
  }
}

/**
 * Load imported configuration data from Firestore
 */
export async function loadConfigFromFirestore(): Promise<Record<ConfigType, any[]> | null> {
  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      console.warn('No user logged in, cannot load config from Firestore');
      return null;
    }

    const firestore = getFirestore();
    const configDocRef = doc(
      firestore,
      'users',
      currentUser.uid,
      'settings',
      'importedConfigs'
    );

    console.log('Loading config from Firestore for user:', currentUser.uid);

    const docSnap = await getDoc(configDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      // Remove metadata fields before returning
      const { lastImportedAt, updatedAt, clearedAt, ...configData } = data;
      
      // Count loaded records
      const recordCounts = Object.entries(configData).reduce((acc, [key, value]) => {
        acc[key] = Array.isArray(value) ? value.length : 0;
        return acc;
      }, {} as Record<string, number>);

      console.log('Config data loaded from Firestore. Records:', recordCounts, 'Last imported:', lastImportedAt);
      return configData as Record<ConfigType, any[]>;
    } else {
      console.log('No persisted config found in Firestore for user:', currentUser.uid);
      return null;
    }
  } catch (error) {
    console.error('Error loading config from Firestore:', error);
    return null;
  }
}

/**
 * Clear all persisted configuration data from Firestore
 */
export async function clearConfigFromFirestore(): Promise<boolean> {
  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      return false;
    }

    const firestore = getFirestore();
    const configDocRef = doc(
      firestore,
      'users',
      currentUser.uid,
      'settings',
      'importedConfigs'
    );

    // Delete the document
    await setDoc(configDocRef, {
      'pricing-condition': [],
      'incoterm': [],
      'customer-mapping': [],
      'pack-type': [],
      'shipping-lines': [],
      'vessels': [],
      'port-of-loading': [],
      'customer-to-packtype': [],
      clearedAt: new Date().toISOString(),
    });

    console.log('Config data cleared from Firestore');
    return true;
  } catch (error) {
    console.error('Error clearing config from Firestore:', error);
    return false;
  }
}
