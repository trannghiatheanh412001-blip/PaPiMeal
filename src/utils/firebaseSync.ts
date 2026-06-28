import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch
} from "firebase/firestore";
import { db } from "./firebase";
import { sendToGoogleSheets } from "./googleSheets";
import { Order, Product, Category, StatusLog, Account } from "../types";
import { DEFAULT_PRODUCTS, DEFAULT_CATEGORIES } from "../data/defaults";

const DEFAULT_ACCOUNTS: Account[] = [
  { phone: "0901464021", password: "KHOINGHIEP", role: "ADMIN", name: "Chủ Quán PaPi" },
  { phone: "0917106326", password: "THANHCONG", role: "KITCHEN", name: "Bếp Trưởng PaPi" },
  { phone: "0922222222", password: "DONGGOI", role: "PACKER", name: "Nhân viên Đóng Gói" },
  { phone: "0933333333", password: "GIAOHANG", role: "SHIPPER", name: "Shipper Giao Hàng" }
];

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  const jsonErrorString = JSON.stringify(errInfo);
  console.error('Firestore Error: ', jsonErrorString);
  throw new Error(jsonErrorString);
}

function toFirestoreOrder(order: Order): any {
  return {
    ...order,
    portions: JSON.stringify(order.portions)
  };
}

function fromFirestoreOrder(docData: any): Order {
  let portions: any[] = [];
  if (typeof docData.portions === "string") {
    try {
      portions = JSON.parse(docData.portions);
    } catch (e) {
      console.error("Error parsing portions JSON:", e);
    }
  } else if (Array.isArray(docData.portions)) {
    portions = docData.portions;
  }
  return {
    ...docData,
    portions
  } as Order;
}

export function initFirebaseSync(onUpdate: () => void) {
  console.log("🔄 Starting real-time Firebase synchronization...");

  // 1. SYNC CONFIG
  onSnapshot(doc(db, "config", "general"), async (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      let hasUpdate = false;
      const updatedData = { ...data };
      Object.entries(updatedData).forEach(([key, val]) => {
        if (typeof val === "string" && val.includes("PaPiMeal")) {
          const newVal = val.replace(/PaPiMeal/g, "PaPi(ml)");
          updatedData[key] = newVal;
          localStorage.setItem(key, newVal);
          hasUpdate = true;
        } else if (val !== undefined && val !== null) {
          localStorage.setItem(key, String(val));
        }
      });
      if (hasUpdate) {
        try {
          await setDoc(doc(db, "config", "general"), updatedData);
        } catch (err) {
          console.error("Failed to auto-migrate app name in Firestore config:", err);
        }
      }
      onUpdate();
    } else {
      // Seed default config
      const defaultConfig: Record<string, string> = {
        "papimeal_google_sheet_url": localStorage.getItem("papimeal_google_sheet_url") || "",
        "papimeal_admin_email": localStorage.getItem("papimeal_admin_email") || "",
        "papimeal_cfg_app_name": "PaPi(ml)",
        "papimeal_cfg_slogan": "Cơm Trưa Ngày Mai",
        "papimeal_cfg_home_banner_title": "Giải Pháp Ăn Trưa Thông Minh Cho Bạn",
        "papimeal_cfg_home_banner_subtitle": "Đặt cơm tách biệt từng khẩu phần cho nhóm bạn, tự động thống kê đi chợ và nấu ăn.",
        "papimeal_cfg_success_message": "Đơn hàng của bạn đã gửi đến nhà bếp thành công! Chúc bạn có một bữa ăn ngon miệng.",
        "papimeal_cfg_step1_title": "Chọn Số Lượng & Hẹn Giờ Giao",
        "papimeal_cfg_step1_sub": "Đặt bao nhiêu suất cho nhóm? Bếp sẽ nấu đúng định lượng & chuẩn bị đóng hộp riêng rẽ từng phần cơm cho bạn!",
        "papimeal_cfg_header_logo": "P",
        "papimeal_cfg_home_round_logo": "/src/assets/images/papimeal_logo_1782435524190.jpg",
        "papimeal_cfg_home_banner_image": "🥗",
        "papimeal_cfg_vp1_icon": "👥",
        "papimeal_cfg_vp1_title": "Đặt Món Theo Từng Khẩu Phần",
        "papimeal_cfg_vp1_desc": "Đặt nhóm tiện lợi, bóc tách hóa đơn rõ ràng theo từng người ăn.",
        "papimeal_cfg_vp2_icon": "⏰",
        "papimeal_cfg_vp2_title": "Chuẩn Bị Chỉ Chu Chu Đáo",
        "papimeal_cfg_vp2_desc": "Chốt nguyên liệu tươi ngon lúc 14h00 hàng ngày, tuyệt đối vệ sinh.",
        "papimeal_cfg_vp3_icon": "🚀",
        "papimeal_cfg_vp3_title": "Tra Cứu Trực Quan Realtime",
        "papimeal_cfg_vp3_desc": "Xem tiến trình chế biến món ăn từ bếp của PaPi(ml) bất cứ lúc nào.",
        "papimeal_cfg_shop_address": "16B Trần Văn Thành, Phường Chánh Hưng, Quận 8",
        "papimeal_cfg_shop_phone": "0901 464 021",
        "papimeal_cfg_start_order_btn": "Đặt Món Ngay",
        "papimeal_cfg_home_back_btn": "Quay lại trang chủ",
        "papimeal_cfg_step2_title": "Chọn Món Theo Phần",
        "papimeal_cfg_step2_sub": "Lựa chọn các món ăn ngon miệng riêng biệt cho từng người.",
        "papimeal_cfg_confirm_title": "Xác Nhận & Gửi Đơn Hàng",
        "papimeal_cfg_confirm_sub": "Kiểm tra kỹ thông tin từng phần ăn & địa điểm trước khi gửi đến bếp nhé.",
        "papimeal_cfg_role_customer_title": "Khách Hàng",
        "papimeal_cfg_role_customer_sub": "Đặt món theo khẩu phần",
        "papimeal_cfg_role_tracking_title": "Tra Cứu Đơn",
        "papimeal_cfg_role_tracking_sub": "Theo dõi thời gian thực",
        "papimeal_cfg_role_kitchen_title": "Màn Hình Bếp",
        "papimeal_cfg_role_kitchen_sub": "Nấu theo tiến trình live",
        "papimeal_cfg_role_admin_title": "Ban Quản Trị",
        "papimeal_cfg_role_admin_sub": "Menu, giá cả & duyệt đơn",
        "papimeal_cfg_demo_guide_title": "Mách nhỏ cách trải nghiệm Demo:",
        "papimeal_cfg_demo_guide_text": "1. Vào vai Khách Hàng để tạo 1 đơn hàng (có thể chọn đặt nhiều suất ăn khác nhau).\n2. Vào vai Ban Quản Trị để phê duyệt đơn hàng & tự động tổng hợp nguyên liệu đi chợ.\n3. Vào vai Màn Hình Bếp để chế biến và báo hoàn tất.\n4. Quay lại Tra Cứu Đơn để cập nhật tiến độ nấu nướng trực quan thời gian thực!"
      };
      
      // Merge with any current local items
      Object.keys(defaultConfig).forEach(key => {
        const local = localStorage.getItem(key);
        if (local) defaultConfig[key] = local;
      });

      try {
        setDoc(doc(db, "config", "general"), defaultConfig);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, "config/general");
      }
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, "config/general");
  });

  // 2. SYNC PRODUCTS
  onSnapshot(collection(db, "products"), async (snapshot) => {
    if (snapshot.empty) {
      console.log("🌱 Firestore 'products' is empty. Seeding defaults...");
      const batch = writeBatch(db);
      DEFAULT_PRODUCTS.forEach((prod) => {
        batch.set(doc(db, "products", prod.id), prod);
      });
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, "products");
      }
    } else {
      const products: Product[] = [];
      snapshot.forEach((d) => products.push(d.data() as Product));
      products.sort((a, b) => a.name.localeCompare(b.name));
      localStorage.setItem("papimeal_products", JSON.stringify(products));
      onUpdate();
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, "products");
  });

  // 3. SYNC CATEGORIES
  onSnapshot(collection(db, "categories"), async (snapshot) => {
    if (snapshot.empty) {
      console.log("🌱 Firestore 'categories' is empty. Seeding defaults...");
      const batch = writeBatch(db);
      DEFAULT_CATEGORIES.forEach((cat) => {
        batch.set(doc(db, "categories", cat.id), cat);
      });
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, "categories");
      }
    } else {
      const categories: Category[] = [];
      snapshot.forEach((d) => categories.push(d.data() as Category));
      categories.sort((a, b) => a.name.localeCompare(b.name));
      localStorage.setItem("papimeal_categories", JSON.stringify(categories));
      onUpdate();
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, "categories");
  });

  // 4. SYNC ACCOUNTS
  onSnapshot(collection(db, "accounts"), async (snapshot) => {
    if (snapshot.empty) {
      console.log("🌱 Firestore 'accounts' is empty. Seeding defaults...");
      const batch = writeBatch(db);
      let localAccs = DEFAULT_ACCOUNTS;
      try {
        const local = localStorage.getItem("papimeal_accounts");
        if (local) localAccs = JSON.parse(local);
      } catch (e) {}

      localAccs.forEach((acc) => {
        batch.set(doc(db, "accounts", acc.phone), acc);
      });
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, "accounts");
      }
    } else {
      const accounts: Account[] = [];
      snapshot.forEach((d) => accounts.push(d.data() as Account));
      localStorage.setItem("papimeal_accounts", JSON.stringify(accounts));
      onUpdate();
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, "accounts");
  });

  // 5. SYNC LOGS
  onSnapshot(collection(db, "logs"), (snapshot) => {
    const logs: StatusLog[] = [];
    snapshot.forEach((d) => logs.push(d.data() as StatusLog));
    logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    localStorage.setItem("papimeal_logs", JSON.stringify(logs));
    onUpdate();
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, "logs");
  });

  // 6. SYNC ORDERS (CRITICAL!)
  onSnapshot(collection(db, "orders"), (snapshot) => {
    const orders: Order[] = [];
    snapshot.forEach((d) => orders.push(fromFirestoreOrder(d.data())));
    orders.sort((a, b) => b.id.localeCompare(a.id));
    localStorage.setItem("papimeal_orders", JSON.stringify(orders));
    console.log(`📥 Sync completed: loaded ${orders.length} orders from Firestore.`);
    onUpdate();
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, "orders");
  });
}

export async function syncOrderToFirestore(order: Order) {
  try {
    await setDoc(doc(db, "orders", order.id), toFirestoreOrder(order));
    console.log(`📤 Order ${order.id} saved to Firestore.`);
    sendToGoogleSheets("BULK_SYNC", order);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `orders/${order.id}`);
  }
}

export async function deleteOrderFromFirestore(orderId: string) {
  try {
    await deleteDoc(doc(db, "orders", orderId));
    console.log(`🗑️ Order ${orderId} deleted from Firestore.`);
    sendToGoogleSheets("BULK_SYNC");
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `orders/${orderId}`);
  }
}

export async function syncProductToFirestore(product: Product) {
  try {
    await setDoc(doc(db, "products", product.id), product);
    sendToGoogleSheets("BULK_SYNC");
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `products/${product.id}`);
  }
}

export async function deleteProductFromFirestore(productId: string) {
  try {
    await deleteDoc(doc(db, "products", productId));
    sendToGoogleSheets("BULK_SYNC");
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `products/${productId}`);
  }
}

export async function syncCategoryToFirestore(category: Category) {
  try {
    await setDoc(doc(db, "categories", category.id), category);
    sendToGoogleSheets("BULK_SYNC");
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `categories/${category.id}`);
  }
}

export async function deleteCategoryFromFirestore(categoryId: string) {
  try {
    await deleteDoc(doc(db, "categories", categoryId));
    sendToGoogleSheets("BULK_SYNC");
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `categories/${categoryId}`);
  }
}

export async function syncAccountToFirestore(account: Account) {
  try {
    await setDoc(doc(db, "accounts", account.phone), account);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `accounts/${account.phone}`);
  }
}

export async function deleteAccountFromFirestore(phone: string) {
  try {
    await deleteDoc(doc(db, "accounts", phone));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `accounts/${phone}`);
  }
}

export async function syncLogToFirestore(log: StatusLog) {
  try {
    await setDoc(doc(db, "logs", log.id), log);
    sendToGoogleSheets("BULK_SYNC");
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `logs/${log.id}`);
  }
}

export async function deleteAllLogsFromFirestore() {
  try {
    const qSnapshot = await getDocs(collection(db, "logs"));
    const batch = writeBatch(db);
    qSnapshot.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    sendToGoogleSheets("BULK_SYNC");
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, "logs");
  }
}

export async function deleteAllOrdersFromFirestore() {
  try {
    const qSnapshot = await getDocs(collection(db, "orders"));
    const batch = writeBatch(db);
    qSnapshot.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    sendToGoogleSheets("BULK_SYNC");
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, "orders");
  }
}

export async function syncConfigToFirestore() {
  try {
    const configData: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("papimeal_cfg_") || key === "papimeal_google_sheet_url" || key === "papimeal_admin_email")) {
        configData[key] = localStorage.getItem(key) || "";
      }
    }
    if (Object.keys(configData).length > 0) {
      await setDoc(doc(db, "config", "general"), configData);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, "config/general");
  }
}
