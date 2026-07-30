import { db, storage } from './config';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';

const COLLECTION_NAME = 'popups';

// Helper to upload image
const uploadImage = async (file) => {
  if (!file) return null;
  const storageRef = ref(storage, `popups/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
};

// Add a new popup
export const addPopup = async (popupData, imageFile) => {
  try {
    let imageUrl = '';
    if (imageFile) {
      imageUrl = await uploadImage(imageFile);
    }
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...popupData,
      imageUrl,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { id: docRef.id, ...popupData, imageUrl };
  } catch (error) {
    console.error("Error adding popup:", error);
    throw error;
  }
};

// Get all popups
export const getPopups = async () => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching popups:", error);
    throw error;
  }
};

// Update an existing popup
export const updatePopup = async (id, popupData, imageFile, oldImageUrl) => {
  try {
    let imageUrl = oldImageUrl;
    if (imageFile) {
      imageUrl = await uploadImage(imageFile);
      // Optional: Delete old image if needed (ignoring for now to keep it simple and safe, 
      // or we can implement it if needed, but it's better to clean up)
      if (oldImageUrl) {
        try {
          const oldImageRef = ref(storage, oldImageUrl);
          await deleteObject(oldImageRef);
        } catch (e) {
          console.error("Failed to delete old image, continuing...", e);
        }
      }
    }

    const popupRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(popupRef, {
      ...popupData,
      imageUrl,
      updatedAt: serverTimestamp(),
    });
    
    return { id, ...popupData, imageUrl };
  } catch (error) {
    console.error("Error updating popup:", error);
    throw error;
  }
};

// Delete a popup
export const deletePopup = async (id, imageUrl) => {
  try {
    // Delete from Firestore
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    
    // Delete image from Storage
    if (imageUrl) {
      try {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef);
      } catch (e) {
        console.error("Failed to delete image, continuing...", e);
      }
    }
    return true;
  } catch (error) {
    console.error("Error deleting popup:", error);
    throw error;
  }
};

// Toggle active status
export const togglePopupActive = async (id, currentStatus) => {
  try {
    const popupRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(popupRef, {
      isActive: !currentStatus,
      updatedAt: serverTimestamp(),
    });
    return !currentStatus;
  } catch (error) {
    console.error("Error toggling popup status:", error);
    throw error;
  }
};
