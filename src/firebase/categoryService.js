// categoryService.js

import { 
    collection, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    getDocs,
    serverTimestamp
} from "firebase/firestore";
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from "firebase/storage";
import { db, app } from "../firebase/config.js";


const storage = getStorage(app);

export const categoryService = {

    // GET ALL
    getAll: async () => {
        const snapshot = await getDocs(collection(db, "category"));
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    },

    // ADD NEW CATEGORY
    add: async (data, imageFile) => {
        let imageUrl = data.image || null;

        // Upload image if provided
        if (imageFile) {
            const cleanName = imageFile.name.replace(/\s+/g, "_");
            const imgRef = ref(storage, `category/${Date.now()}_${cleanName}`);
            const snap = await uploadBytes(imgRef, imageFile);
            imageUrl = await getDownloadURL(snap.ref);
        }

        // Create empty doc so we get the doc ID
        const docRef = await addDoc(collection(db, "category"), {});

        const finalData = {
            id: docRef.id,          // <<--- IMPORTANT
            name: data.name,
            commission: data.commission,
            image: imageUrl,
            timestamp: serverTimestamp()
        };

        await updateDoc(docRef, finalData);

        return finalData;
    },

    // UPDATE CATEGORY
    update: async (id, data, imageFile) => {
        let imageUrl = data.image || null;

        if (imageFile) {
            const cleanName = imageFile.name.replace(/\s+/g, "_");
            const imgRef = ref(storage, `category/${Date.now()}_${cleanName}`);
            const snap = await uploadBytes(imgRef, imageFile);
            imageUrl = await getDownloadURL(snap.ref);
        }

        const docRef = doc(db, "category", id);

        const finalData = {
            id: id,                 // <<--- KEEP ID INSIDE DOC
            name: data.name,
            commission: data.commission,
            image: imageUrl,
            timestamp: serverTimestamp()
        };

        await updateDoc(docRef, finalData);

        return finalData;
    },

    // DELETE
    delete: async (id) => {
        await deleteDoc(doc(db, "category", id));
    }
};
