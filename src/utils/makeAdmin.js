import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";

export const makeAdmin = async () => {
  try {
    await setDoc(doc(db, "admins", "XUgwKOHhqnNMzg6EiNxcJC9c5n63"), {
      email: "admin@gmail.com",
      role: "admin",
      status: "active",
      fullName: "Admin User",
      adminId: "ADM001"
    });

    console.log("Admin access granted successfully");
  } catch (error) {
    console.error("Error:", error);
  }
};