const WHATSAPP_PHONE = "917778881259";

export function formatCurrency(value) {
  return new Intl.NumberFormat("en-IE", {
    currency: "EUR",
    maximumFractionDigits: 2,
    style: "currency"
  }).format(value);
}

export function createWhatsAppOrderUrl(cart, total, customer = {}, phone = WHATSAPP_PHONE) {
  const orderLines = cart
    .map((item, index) => {
      const lineTotal = item.price * item.quantity;
      return `${index + 1}. ${item.name}\n   Quantity: ${item.quantity}\n   Price: ${formatCurrency(item.price)}\n   Line total: ${formatCurrency(lineTotal)}`;
    })
    .join("\n");

  const message = [
    "Store: Mota Bhai",
    "Hello Mota Bhai, I would like to place an order.",
    "",
    `Customer name: ${customer.name || ""}`,
    `Mobile number: ${customer.phone || ""}`,
    `Address: ${customer.address || ""}`,
    `Note: ${customer.note || "No note"}`,
    "",
    "Products:",
    orderLines,
    "",
    `Total amount: ${formatCurrency(total)}`,
    "",
    "Please confirm availability and delivery time."
  ].join("\n");

  const cleanPhone = String(phone || WHATSAPP_PHONE).replace(/\D/g, "");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
