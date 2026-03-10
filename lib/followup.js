export function calculateFollowupDate(lastOrderDate, amountStr, items = []) {
  if (!lastOrderDate) return null;

  let daysToAdd = 0;
  let matchedSpecificItems = false;

  // Rule-based calculation
  items.forEach((item) => {
    const title = (item.title || "").toLowerCase();
    const variant = (item.variantTitle || "").toLowerCase();
    const qty = parseInt(item.quantity) || 1;

    let itemDays = 0;

    if (title.includes("circa")) {
      if (variant.includes("250")) itemDays = 15;
      else if (variant.includes("950")) itemDays = 45;
    } else if (title.includes("honey")) {
      if (variant.includes("360")) itemDays = 20;
      else if (variant.includes("1300")) itemDays = 60;
    } else if (title.includes("joint") || title.includes("afrc")) {
      itemDays = 15;
    } else if (title.includes("estirol")) {
      itemDays = 15;
    } else if (title.includes("acknil")) {
      itemDays = 30;
    }

    if (itemDays > 0) {
      daysToAdd += itemDays * qty;
      matchedSpecificItems = true;
    }
  });

  // Fallback to amount-based logic if no specific items matched
  if (!matchedSpecificItems) {
    const amount = parseFloat(amountStr) || 0;
    if (amount < 500) {
      daysToAdd = 7;
    } else if (amount >= 500 && amount <= 999) {
      daysToAdd = 10;
    } else if (amount >= 1000 && amount <= 2499) {
      daysToAdd = 15;
    } else if (amount >= 2500 && amount <= 4999) {
      daysToAdd = 21;
    } else if (amount >= 5000 && amount <= 9999) {
      daysToAdd = 30;
    } else {
      daysToAdd = 45;
    }
  }

  const date = new Date(lastOrderDate);
  if (isNaN(date.getTime())) return null;

  date.setDate(date.getDate() + daysToAdd);

  // Format as "24 Mar 2026"
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleString("en-GB", { month: "short" });
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

export function getFollowupStatus(followupDateStr, isDone) {
  if (isDone) return "done";
  if (!followupDateStr) return null;

  const followupDate = new Date(followupDateStr);
  const today = new Date();

  // Reset time portions for accurate day comparison
  followupDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  if (followupDate < today) return "overdue";
  if (followupDate.getTime() === today.getTime()) return "due-today";
  return "upcoming";
}
