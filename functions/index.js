const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();

// 🔐 EmailJS Config
const SERVICE_ID = "service_zz6fgjp";
const TEMPLATE_ID = "template_j0ed6us";
const PUBLIC_KEY = "BC9CJEdLpemI19ubS";


// =====================================================
// 🔥 ADMIN ROLE SET FUNCTION (ADD THIS)
// =====================================================
exports.makeAdmin = functions.https.onRequest(async (req, res) => {
  try {

    const email = "admin@gmail.com"; // 👈 change if needed

    const user = await admin.auth().getUserByEmail(email);

    await admin.auth().setCustomUserClaims(user.uid, {
      role: "admin"
    });

    res.send(`✅ ${email} is now an Admin 🔥`);

  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});


// =====================================================
// 🛒 ORDER CREATED MAIL
// =====================================================
exports.sendOrderCreatedEmail = onDocumentCreated(
  {
    document: "users/{userId}/orders/{orderId}",
  },
  async (event) => {

    const order = event.data?.data();
    const { userId, orderId } = event.params;

    if (!order) return;

    try {

      const userSnap = await admin.firestore()
        .collection("users")
        .doc(userId)
        .get();

      if (!userSnap.exists) return;

      const user = userSnap.data();

      await axios.post("https://api.emailjs.com/api/v1.0/email/send", {
        service_id: SERVICE_ID,
        template_id: TEMPLATE_ID,
        public_key: PUBLIC_KEY,
        template_params: {
          to_email: user.email,
          to_name: user.name || "Customer",
          order_id: orderId,
          order_status: "Order Placed",
          order_status_message: "🎉 Your order has been placed successfully!"
        },
      });

      console.log("✅ Order placed mail sent");

    } catch (error) {
      console.error("❌ Order mail error:", error.response?.data || error);
    }
  }
);


// =====================================================
// ❌ CANCEL & 🔁 RETURN MAIL
// =====================================================
exports.sendOrderStatusEmail = onDocumentUpdated(
  {
    document: "users/{userId}/orders/{orderId}",
  },
  async (event) => {

    const before = event.data.before.data();
    const after = event.data.after.data();
    const { userId, orderId } = event.params;

    if (before.status === after.status) return;

    try {

      const userSnap = await admin.firestore()
        .collection("users")
        .doc(userId)
        .get();

      if (!userSnap.exists) return;

      const user = userSnap.data();

      let message = "";

      if (after.status === "cancelled") {
        message = "❌ Your order has been cancelled successfully.";
      }

      if (after.status === "returned") {
        message = "🔁 Your return request has been received successfully.";
      }

      if (!message) return;

      await axios.post("https://api.emailjs.com/api/v1.0/email/send", {
        service_id: SERVICE_ID,
        template_id: TEMPLATE_ID,
        public_key: PUBLIC_KEY,
        template_params: {
          to_email: user.email,
          to_name: user.name || "Customer",
          order_id: orderId,
          order_status: after.status,
          order_status_message: message
        },
      });

      console.log("✅ Status mail sent:", after.status);

    } catch (error) {
      console.error("❌ Status mail error:", error.response?.data || error);
    }
  }
);


// =====================================================
// 📦 SHIPROCKET RETURN & 💰 AUTOMATED REFUND FLOW
// =====================================================

// Helper: Get Shiprocket Token
async function getShiprocketToken() {
  try {
    const response = await axios.post("https://apiv2.shiprocket.in/v1/external/auth/login", {
      email: "appasharan@gmail.com", // 👈 Replace with actual Shiprocket Email
      password: "sadhanaCart@83"       // 👈 Replace with actual Shiprocket Password
    });
    return response.data.token;
  } catch (error) {
    console.error("❌ Shiprocket Login Error:", error.response?.data || error.message);
    return null;
  }
}

// 🚚 Step A: Create Shiprocket Return Order
exports.onReturnRequestWritten = onDocumentUpdated(
  {
    document: "users/{userId}/return_requests/{returnId}",
  },
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    const { userId, returnId } = event.params;

    // Trigger only when approved for pickup
    if (before.status === after.status || after.status !== "approved") return;

    try {
      const db = admin.firestore();

      // 1. Get User and Warehouse details
      const userSnap = await db.collection("users").doc(userId).get();
      if (!userSnap.exists) return;
      const user = userSnap.data();

      // 2. Fetch original order for details
      const orderId = after.orderId;
      const orderSnap = await db.collection("users").doc(userId).collection("orders").doc(orderId).get();
      if (!orderSnap.exists) {
        console.error("Original order not found:", orderId);
        return;
      }
      const order = orderSnap.data();

      // 3. Get Shiprocket Token
      const token = await getShiprocketToken();
      if (!token) return;

      // 4. Prepare Shiprocket Return Payload
      // Note: Data normalization based on your database schema
      const returnPayload = {
        order_id: `${orderId}_RET`,
        order_date: new Date().toISOString().split('T')[0],
        channel_id: "", // 👈 Fill if needed
        pickup_customer_name: user.name || "Customer",
        pickup_last_name: "",
        pickup_address: order.shippingAddress || "Main Street",
        pickup_city: order.city || "City",
        pickup_state: order.state || "State",
        pickup_country: "India",
        pickup_pincode: order.pincode || "000000",
        pickup_email: user.email,
        pickup_phone: user.contactNo || order.phone || "0000000000",
        shipping_customer_name: "Nirmala B",
        shipping_address: "A NO 4-14-155/36a, Ground Floor, Ward No 24, Nearby Lic Office, Teachers Colony, Gangawati",
        shipping_city: "Koppal",
        shipping_pincode: "583227",
        shipping_state: "Karnataka",
        shipping_country: "India",
        shipping_phone: "9448810877",
        shipping_email: "appasharan@gmail.com",
        order_items: [
          {
            sku: after.product?.sku || "SKU",
            name: after.product?.name || "Product",
            units: 1,
            selling_price: after.refundAmount || 0,
            qc_enable: true
          }
        ],
        payment_method: "Prepaid",
        sub_total: after.refundAmount || 0,
        length: 10,
        breadth: 10,
        height: 10,
        weight: 0.5
      };

      // 5. Create Shiprocket Return
      const response = await axios.post(
        "https://apiv2.shiprocket.in/v1/external/orders/create/return",
        returnPayload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data) {
        await event.data.after.ref.update({
          shiprocketOrderId: response.data.order_id,
          shipmentId: response.data.shipment_id,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log("✅ Shiprocket Return Created:", response.data.order_id);
      }

    } catch (error) {
      console.error("❌ Shiprocket Return Error:", error.response?.data || error.message);
    }
  }
);

// 💰 Step B: Process Wallet Refund
exports.autoCompleteRefund = onDocumentUpdated(
  {
    document: "users/{userId}/return_requests/{returnId}",
  },
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    const { userId, returnId } = event.params;

    // Trigger only when refund is approved
    if (before.status === after.status || after.status !== "refund_approved") return;

    try {
      const db = admin.firestore();
      const userRef = db.collection("users").doc(userId);

      const refundAmount = Number(after.refundAmount || 0);
      const coinsToRefund = Number(after.coinsToRefund || 0);
      const totalRefundCoins = Math.round(refundAmount + coinsToRefund);

      if (totalRefundCoins <= 0) return;

      // 1. Credit User Wallet
      await db.runTransaction(async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists) return;

        const currentBalance = Number(userSnap.data().walletBalance || 0);
        const newBalance = currentBalance + totalRefundCoins;

        // Update balance
        transaction.update(userRef, {
          walletBalance: newBalance,
          "wallet.data.coins": admin.firestore.FieldValue.increment(totalRefundCoins)
        });

        // Create Transaction Record
        const transRef = userRef.collection("wallet_transactions").doc();
        transaction.set(transRef, {
          amount: totalRefundCoins,
          type: "credit",
          reason: `Refund for Order #${after.orderId}`,
          status: "completed",
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      // 2. Sync Order status
      const orderRef = db.collection("users").doc(userId).collection("orders").doc(after.orderId);
      const orderSnap = await orderRef.get();
      if (orderSnap.exists()) {
        const products = orderSnap.data().products || [];
        const updatedProducts = products.map(p => {
          if (p.id === after.productId || p.sku === after.product?.sku) {
            return { ...p, returnStatus: "returned" };
          }
          return p;
        });

        await orderRef.update({
          products: updatedProducts,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      // 3. Mark Request as Completed
      await event.data.after.ref.update({
        status: "refund_completed",
        refundProcessedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`✅ Refund of ${totalRefundCoins} coins completed for user ${userId}`);

    } catch (error) {
      console.error("❌ Refund Processing Error:", error);
    }
  }
);