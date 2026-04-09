import { db } from './config'; // ASSUMPTION: Update path if needed
import { doc, getDoc, updateDoc, setDoc, runTransaction } from 'firebase/firestore';

/**
 * Gets the current balance of a specific wallet.
 * @param {string} id - The wallet ID (e.g., 'admin' or a seller ID).
 * @returns {Promise<{balance: number}|null>} The wallet object or null.
 */
export const getWallet = async (id) => {
  if (!id) return null;
  const walletRef = doc(db, 'wallets', id);
  try {
    const walletSnap = await getDoc(walletRef);
    if (walletSnap.exists()) {
      return walletSnap.data();
    }
    // Wallet doesn't exist, create it with a 0 balance
    await setDoc(walletRef, { balance: 0 });
    return { balance: 0 };
  } catch (error) {
    console.error(`Error getting or creating wallet ${id}:`, error);
    return null;
  }
};

/**
 * Updates a wallet balance by adding a specific amount using a transaction.
 * Creates the wallet if it doesn't exist.
 * @param {string} id - The wallet ID (e.g., 'admin' or a seller ID).
 * @param {number} amount - The amount to add (positive for earning).
 */
export const updateWallet = async (id, amount) => {
  if (!id || amount === 0) return;
  const walletRef = doc(db, 'wallets', id);

  try {
    await runTransaction(db, async (transaction) => {
      const walletSnap = await transaction.get(walletRef);
      let newBalance = 0;

      if (!walletSnap.exists()) {
        // Initialize new wallet with the amount
        newBalance = amount;
        transaction.set(walletRef, { balance: newBalance });
      } else {
        const currentBalance = walletSnap.data().balance || 0;
        newBalance = parseFloat((currentBalance + amount).toFixed(2));
        transaction.update(walletRef, { balance: newBalance });
      }

      console.log(`Wallet ${id} new balance: ${newBalance}`);
    });
  } catch (error) {
    console.error(`Transaction failed for wallet ${id} update:`, error);
    throw error;
  }
};

/**
 * Sets a wallet balance to a specific amount (used for Payout: setting to 0).
 * @param {string} id - The wallet ID.
 * @param {number} newBalance - The balance to set (0 for payout).
 */
export const setBalance = async (id, newBalance) => {
  if (!id) return;
  const walletRef = doc(db, 'wallets', id);

  try {
    // Note: For simplicity, we just set the balance. In a real app, you'd record a Payout Transaction.
    await updateDoc(walletRef, { balance: newBalance });
    console.log(`Wallet ${id} balance set to ${newBalance} (Payout processed)`);
  } catch (error) {
    // If the wallet doesn't exist, setDoc can create it.
    if (error.code === 'not-found') {
        await setDoc(walletRef, { balance: newBalance });
    } else {
        console.error(`Error setting balance for wallet ${id}:`, error);
        throw error;
    }
  }
};