import { db } from "../firebase/config";
import { collection, getDocs, query, limit, orderBy, startAfter } from "firebase/firestore";

export const productService = {
  getPaginated: async (pageSize = 20, lastVisibleDoc = null) => {
    let q;

    if (lastVisibleDoc) {
      q = query(
        collection(db, "products"),
        orderBy("createdAt", "desc"),
        startAfter(lastVisibleDoc),
        limit(pageSize)
      );
    } else {
      q = query(
        collection(db, "products"),
        orderBy("createdAt", "desc"),
        limit(pageSize)
      );
    }

    // 🔹 Try cache first (fast)
    let snap = await getDocs(q, { source: "cache" });

    // 🔹 If cache empty, fetch from server
    if (snap.empty) {
      snap = await getDocs(q);
    }

    const lastDoc = snap.docs[snap.docs.length - 1];

    const products = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    return { products, lastDoc };
  }
};