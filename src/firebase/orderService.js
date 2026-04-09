import emailjs from "@emailjs/browser";

const SERVICE_ID = "service_p0q4jed";
const TEMPLATE_ID = "template_tu4jetb";
const PUBLIC_KEY = "GagsbTDn7e50G8zL_";

export const sendOrderEmail = async (order, status) => {
  try {
    let message = "";
 const normalizedStatus = status.trim().toLowerCase();
    switch (normalizedStatus) {
       case "confirmed":
        message = "🛒 Your order has been placed successfully.";
        break;
      case "processing":
        message = "🛠 Your order is being processed.";
        break;
      case "shipped":
        message = "🚚 Your order has been shipped.";
        break;
      case "delivered":
        message = "📦 Your order has been delivered.";
        break;
      case "cancelled":
        message = "❌ Your order has been cancelled.";
        break;
     case "returned":
        message = "📦 Your order has been returned .";
        break;
       case "approved":
        message = "✅ Refund Completed! The amount has been processed to your original payment.";
        break;
      default:
        message = `Order status updated to ${status}`;
    }

    const response = await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        to_email: order.userEmail,
        to_name: order.userName,
        order_id: order._id,
      order_status: status.replace("_", " ").toUpperCase(),
        order_status_message: message,
      product_details: order.products || "N/A",
      },
      PUBLIC_KEY
    );

    console.log("📧 EmailJS Success:", response);
  } catch (error) {
    console.error("❌ EmailJS Error:", error);
  }
};