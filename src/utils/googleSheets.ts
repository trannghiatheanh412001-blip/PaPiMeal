import { Order } from "../types";

const GOOGLE_SHEETS_URL_KEY = "papimeal_google_sheet_url";

export function getGoogleSheetsUrl(): string {
  return localStorage.getItem(GOOGLE_SHEETS_URL_KEY) || "";
}

export function saveGoogleSheetsUrl(url: string) {
  localStorage.setItem(GOOGLE_SHEETS_URL_KEY, url.trim());
}

export async function sendToGoogleSheets(actionType: "NEW_ORDER" | "UPDATE_STATUS", order: Order) {
  const url = getGoogleSheetsUrl();
  if (!url) return;

  try {
    const portionsText = order.portions.map((portion, idx) => {
      const itemsStr = portion.map(it => `${it.name} (x${it.qty})`).join(", ");
      return `[Khẩu phần ${idx + 1}]: ${itemsStr}`;
    }).join(" | ");

    const payload = {
      action: actionType,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      orderId: order.id,
      customerName: order.customerName,
      phone: order.phone,
      receiveDate: order.receiveDate,
      receiveTime: order.receiveTime,
      session: order.session,
      deliveryMethod: order.deliveryMethod,
      address: order.address || "",
      notes: order.notes || "",
      status: order.status,
      portionsCount: order.portionsCount,
      totalAmount: order.totalAmount,
      portionsText
    };

    // We use mode: 'no-cors' and text/plain to circumvent browser preflight (CORS) check blockages on GAS
    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain"
      },
      body: JSON.stringify(payload)
    });
    console.log(`[Google Sheets] Sent log for ${order.id} with action ${actionType}`);
  } catch (error) {
    console.error("[Google Sheets] Error sending data:", error);
  }
}

export const APPS_SCRIPT_TEMPLATE = `function doPost(e) {
  try {
    var jsonString = e.postData.contents;
    var data = JSON.parse(jsonString);
    
    // Mở Spreadsheet hiện tại
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Nếu sheet trống hoàn toàn, tạo tiêu đề cột trước
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Thời gian hệ thống", 
        "Hành động", 
        "Mã Đơn Hàng", 
        "Tên Khách Hàng", 
        "Số Điện Thoại", 
        "Ngày Nhận", 
        "Khung Giờ", 
        "Buổi", 
        "Hình Thức Giao", 
        "Địa Chỉ", 
        "Ghi Chú Đơn", 
        "Trạng Thái", 
        "Số Suất", 
        "Tổng Tiền (đ)", 
        "Chi Tiết Các Suất Món Ăn"
      ]);
      
      // Định dạng dòng đầu tiên in đậm để đẹp hơn
      var headerRange = sheet.getRange(1, 1, 1, 15);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#00523b");
      headerRange.setFontColor("#ffffff");
    }
    
    // Ghi dòng dữ liệu mới
    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.action || "NEW_ORDER",
      data.orderId,
      data.customerName,
      data.phone,
      data.receiveDate,
      data.receiveTime,
      data.session,
      data.deliveryMethod,
      data.address || "",
      data.notes || "",
      data.status,
      data.portionsCount,
      data.totalAmount,
      data.portionsText || ""
    ]);
    
    // Tự động căn chỉnh độ rộng cột
    sheet.autoResizeColumns(1, 15);
    
    return ContentService.createTextOutput(JSON.stringify({ "status": "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
