/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  weight: number;
  unit: string;
  cost: number;
  fee: number;
  price: number;
  oldPrice: number;
  image: string;
  status: "Đang bán" | "Ẩn món" | "Ngừng bán";
  note: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface PortionItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  categoryName?: string;
}

export interface Order {
  id: string; // e.g., PPM0626-4021
  createdAt: string; // YYYY-MM-DD
  createdTime: string; // HH:mm:ss
  customerName: string;
  phone: string;
  receiveDate: string; // YYYY-MM-DD
  receiveTime: string; // HH:mm
  session: "Sáng" | "Trưa" | "Chiều";
  deliveryMethod: "Ghé lấy" | "Giao hàng";
  address: string;
  notes: string;
  status: "Chờ xử lý" | "Đang chế biến" | "Bếp đã chuẩn bị xong" | "Chờ nhận hàng/giao hàng" | "Đang giao" | "Hoàn tất" | "Đã Hủy";
  portionsCount: number;
  portions: PortionItem[][]; // array of portions, each portion contains selected items
  totalAmount: number;
}

export interface StatusLog {
  id: string;
  orderId: string;
  oldStatus: string;
  newStatus: string;
  updatedBy: string;
  timestamp: string;
}

export interface Account {
  phone: string;
  password: string;
  role: "ADMIN" | "KITCHEN" | "PACKER" | "SHIPPER";
  name: string;
}

