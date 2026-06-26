import { Product, Category, Order, StatusLog, Account } from "../types";
import { DEFAULT_PRODUCTS, DEFAULT_CATEGORIES } from "../data/defaults";
import { 
  syncOrderToFirestore, 
  deleteOrderFromFirestore,
  syncProductToFirestore,
  deleteProductFromFirestore,
  syncCategoryToFirestore,
  deleteCategoryFromFirestore,
  syncAccountToFirestore,
  deleteAccountFromFirestore,
  syncLogToFirestore
} from "./firebaseSync";

const PRODUCTS_KEY = "papimeal_products";
const CATEGORIES_KEY = "papimeal_categories";
const ORDERS_KEY = "papimeal_orders";
const LOGS_KEY = "papimeal_logs";

export const CUTOFF_HOUR = 14;
export const SHOP_ADDRESS = "16B Trần Văn Thành, Phường Chánh Hưng, Quận 8";
export const SHOP_PHONE = "0901 464 021";

const ACCOUNTS_KEY = "papimeal_accounts";
const DEFAULT_ACCOUNTS: Account[] = [
  { phone: "0901464021", password: "KHOINGHIEP", role: "ADMIN", name: "Chủ Quán PaPi" },
  { phone: "0917106326", password: "THANHCONG", role: "KITCHEN", name: "Bếp Trưởng PaPi" },
  { phone: "0922222222", password: "DONGGOI", role: "PACKER", name: "Nhân viên Đóng Gói" },
  { phone: "0933333333", password: "GIAOHANG", role: "SHIPPER", name: "Shipper Giao Hàng" }
];

export function loadAccounts(): Account[] {
  const data = localStorage.getItem(ACCOUNTS_KEY);
  if (!data) {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(DEFAULT_ACCOUNTS));
    return DEFAULT_ACCOUNTS;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return DEFAULT_ACCOUNTS;
  }
}

export function saveAccounts(accounts: Account[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  accounts.forEach(acc => {
    syncAccountToFirestore(acc);
  });
  try {
    const prevStr = localStorage.getItem("papimeal_accounts_prev");
    if (prevStr) {
      const prev: Account[] = JSON.parse(prevStr);
      prev.forEach(a => {
        if (!accounts.find(x => x.phone === a.phone)) {
          deleteAccountFromFirestore(a.phone);
        }
      });
    }
  } catch (e) {}
  localStorage.setItem("papimeal_accounts_prev", JSON.stringify(accounts));
}

// Kept for legacy backward compatibility
export const ACCOUNTS = loadAccounts();

export const STATUS_FLOW = [
  "Chờ xử lý",
  "Đang chế biến",
  "Bếp đã chuẩn bị xong",
  "Chờ nhận hàng/giao hàng",
  "Đang giao",
  "Hoàn tất"
];

export const STATUS_CANCEL = "Đã Hủy";

export function loadProducts(): Product[] {
  const data = localStorage.getItem(PRODUCTS_KEY);
  if (!data) {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(DEFAULT_PRODUCTS));
    return DEFAULT_PRODUCTS;
  }
  return JSON.parse(data);
}

export function saveProducts(products: Product[]) {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  products.forEach(prod => {
    syncProductToFirestore(prod);
  });
  try {
    const prevStr = localStorage.getItem("papimeal_products_prev");
    if (prevStr) {
      const prev: Product[] = JSON.parse(prevStr);
      prev.forEach(p => {
        if (!products.find(x => x.id === p.id)) {
          deleteProductFromFirestore(p.id);
        }
      });
    }
  } catch (e) {}
  localStorage.setItem("papimeal_products_prev", JSON.stringify(products));
}

export function loadCategories(): Category[] {
  const data = localStorage.getItem(CATEGORIES_KEY);
  if (!data) {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES));
    return DEFAULT_CATEGORIES;
  }
  return JSON.parse(data);
}

export function saveCategories(categories: Category[]) {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  categories.forEach(cat => {
    syncCategoryToFirestore(cat);
  });
  try {
    const prevStr = localStorage.getItem("papimeal_categories_prev");
    if (prevStr) {
      const prev: Category[] = JSON.parse(prevStr);
      prev.forEach(c => {
        if (!categories.find(x => x.id === c.id)) {
          deleteCategoryFromFirestore(c.id);
        }
      });
    }
  } catch (e) {}
  localStorage.setItem("papimeal_categories_prev", JSON.stringify(categories));
}

export function loadOrders(): Order[] {
  const data = localStorage.getItem(ORDERS_KEY);
  if (!data) {
    return [];
  }
  return JSON.parse(data);
}

export function saveOrders(orders: Order[]) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  orders.forEach(order => {
    syncOrderToFirestore(order);
  });
  try {
    const oldOrdersStr = localStorage.getItem("papimeal_orders_prev");
    if (oldOrdersStr) {
      const oldOrders: Order[] = JSON.parse(oldOrdersStr);
      oldOrders.forEach(oldO => {
        if (!orders.find(o => o.id === oldO.id)) {
          deleteOrderFromFirestore(oldO.id);
        }
      });
    }
  } catch (e) {}
  localStorage.setItem("papimeal_orders_prev", JSON.stringify(orders));
}

export function loadLogs(): StatusLog[] {
  const data = localStorage.getItem(LOGS_KEY);
  if (!data) {
    return [];
  }
  return JSON.parse(data);
}

export function saveLogs(logs: StatusLog[]) {
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  logs.forEach(log => {
    syncLogToFirestore(log);
  });
}

export function addStatusLog(orderId: string, oldStatus: string, newStatus: string, updatedBy: string) {
  const logs = loadLogs();
  const newLog: StatusLog = {
    id: "LOG" + Date.now() + Math.floor(Math.random() * 1000),
    orderId,
    oldStatus,
    newStatus,
    updatedBy,
    timestamp: new Date().toISOString().replace("T", " ").substring(0, 19)
  };
  logs.push(newLog);
  saveLogs(logs);
}

// Check cutoff rules
// Standard Apps Script Date formatting
export function formatDateString(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export interface CutoffInfo {
  minDate: string; // YYYY-MM-DD
  cutoffPassed: boolean;
  cutoffHour: number;
}

export function getEarliestOrderDate(currentDate: Date = new Date()): CutoffInfo {
  const minDate = new Date(currentDate);
  const hour = currentDate.getHours();
  const cutoffPassed = hour >= CUTOFF_HOUR;
  
  // If cutoff passed (14:00+), early delivery is tomorrow + 1 (day after tomorrow)
  // Else early delivery is tomorrow
  minDate.setDate(minDate.getDate() + (cutoffPassed ? 2 : 1));
  
  return {
    minDate: formatDateString(minDate),
    cutoffPassed,
    cutoffHour: CUTOFF_HOUR
  };
}

export function generateOrderCode(phone: string): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yy = String(now.getFullYear()).substring(2);
  const cleanPhone = phone.replace(/\D/g, "");
  const last4 = cleanPhone.length >= 4 ? cleanPhone.slice(-4) : "0000";
  const baseCode = `PPM${mm}${yy}-${last4}`;
  
  const orders = loadOrders();
  const existingCodes = orders.map(o => o.id);
  
  if (!existingCodes.includes(baseCode)) {
    return baseCode;
  }
  
  let counter = 2;
  while (existingCodes.includes(`${baseCode}-${counter}`)) {
    counter++;
  }
  return `${baseCode}-${counter}`;
}
