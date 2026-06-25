const CONFIG_KEYS = {
  APP_NAME: "papimeal_cfg_app_name",
  SLOGAN: "papimeal_cfg_slogan",
  HOME_BANNER_TITLE: "papimeal_cfg_home_banner_title",
  HOME_BANNER_SUBTITLE: "papimeal_cfg_home_banner_subtitle",
  SUCCESS_MESSAGE: "papimeal_cfg_success_message",
  STEP1_TITLE: "papimeal_cfg_step1_title",
  STEP1_SUB: "papimeal_cfg_step1_sub",
  HEADER_LOGO: "papimeal_cfg_header_logo",
  HOME_ROUND_LOGO: "papimeal_cfg_home_round_logo",
  HOME_BANNER_IMAGE: "papimeal_cfg_home_banner_image",
  VP1_ICON: "papimeal_cfg_vp1_icon",
  VP1_TITLE: "papimeal_cfg_vp1_title",
  VP1_DESC: "papimeal_cfg_vp1_desc",
  VP2_ICON: "papimeal_cfg_vp2_icon",
  VP2_TITLE: "papimeal_cfg_vp2_title",
  VP2_DESC: "papimeal_cfg_vp2_desc",
  VP3_ICON: "papimeal_cfg_vp3_icon",
  VP3_TITLE: "papimeal_cfg_vp3_title",
  VP3_DESC: "papimeal_cfg_vp3_desc",
  SHOP_ADDRESS: "papimeal_cfg_shop_address",
  SHOP_PHONE: "papimeal_cfg_shop_phone",
  START_ORDER_BTN: "papimeal_cfg_start_order_btn",
  HOME_BACK_BTN: "papimeal_cfg_home_back_btn",
  STEP2_TITLE: "papimeal_cfg_step2_title",
  STEP2_SUB: "papimeal_cfg_step2_sub",
  CONFIRM_TITLE: "papimeal_cfg_confirm_title",
  CONFIRM_SUB: "papimeal_cfg_confirm_sub"
};

export interface AppTextConfig {
  appName: string;
  slogan: string;
  homeBannerTitle: string;
  homeBannerSubtitle: string;
  successMessage: string;
  step1Title: string;
  step1Sub: string;
  headerLogo: string;
  homeRoundLogo: string;
  homeBannerImage: string;
  valueProp1Icon: string;
  valueProp1Title: string;
  valueProp1Desc: string;
  valueProp2Icon: string;
  valueProp2Title: string;
  valueProp2Desc: string;
  valueProp3Icon: string;
  valueProp3Title: string;
  valueProp3Desc: string;
  shopAddress: string;
  shopPhone: string;
  startOrderBtn: string;
  homeBackBtn: string;
  step2Title: string;
  step2Sub: string;
  confirmTitle: string;
  confirmSub: string;
}

export function loadTextConfig(): AppTextConfig {
  return {
    appName: localStorage.getItem(CONFIG_KEYS.APP_NAME) || "PaPiMeal",
    slogan: localStorage.getItem(CONFIG_KEYS.SLOGAN) || "Cơm Trưa Ngày Mai",
    homeBannerTitle: localStorage.getItem(CONFIG_KEYS.HOME_BANNER_TITLE) || "Giải Pháp Ăn Trưa Thông Minh Cho Bạn",
    homeBannerSubtitle: localStorage.getItem(CONFIG_KEYS.HOME_BANNER_SUBTITLE) || "Đặt cơm tách biệt từng khẩu phần cho nhóm bạn, tự động thống kê đi chợ và nấu ăn.",
    successMessage: localStorage.getItem(CONFIG_KEYS.SUCCESS_MESSAGE) || "Đơn hàng của bạn đã gửi đến nhà bếp thành công! Chúc bạn có một bữa ăn ngon miệng.",
    step1Title: localStorage.getItem(CONFIG_KEYS.STEP1_TITLE) || "Chọn Số Lượng & Hẹn Giờ Giao",
    step1Sub: localStorage.getItem(CONFIG_KEYS.STEP1_SUB) || "Đặt bao nhiêu suất cho nhóm? Bếp sẽ nấu đúng định lượng & chuẩn bị đóng hộp riêng rẽ từng phần cơm cho bạn!",
    headerLogo: localStorage.getItem(CONFIG_KEYS.HEADER_LOGO) || "P",
    homeRoundLogo: localStorage.getItem(CONFIG_KEYS.HOME_ROUND_LOGO) || "🍱",
    homeBannerImage: localStorage.getItem(CONFIG_KEYS.HOME_BANNER_IMAGE) || "🥗",
    valueProp1Icon: localStorage.getItem(CONFIG_KEYS.VP1_ICON) || "👥",
    valueProp1Title: localStorage.getItem(CONFIG_KEYS.VP1_TITLE) || "Đặt Món Theo Từng Khẩu Phần",
    valueProp1Desc: localStorage.getItem(CONFIG_KEYS.VP1_DESC) || "Đặt nhóm tiện lợi, bóc tách hóa đơn rõ ràng theo từng người ăn.",
    valueProp2Icon: localStorage.getItem(CONFIG_KEYS.VP2_ICON) || "⏰",
    valueProp2Title: localStorage.getItem(CONFIG_KEYS.VP2_TITLE) || "Chuẩn Bị Chỉ Chu Chu Đáo",
    valueProp2Desc: localStorage.getItem(CONFIG_KEYS.VP2_DESC) || "Chốt nguyên liệu tươi ngon lúc 14h00 hàng ngày, tuyệt đối vệ sinh.",
    valueProp3Icon: localStorage.getItem(CONFIG_KEYS.VP3_ICON) || "🚀",
    valueProp3Title: localStorage.getItem(CONFIG_KEYS.VP3_TITLE) || "Tra Cứu Trực Quan Realtime",
    valueProp3Desc: localStorage.getItem(CONFIG_KEYS.VP3_DESC) || "Xem tiến trình chế biến món ăn từ bếp của PaPiMeal bất cứ lúc nào.",
    shopAddress: localStorage.getItem(CONFIG_KEYS.SHOP_ADDRESS) || "16B Trần Văn Thành, Phường Chánh Hưng, Quận 8",
    shopPhone: localStorage.getItem(CONFIG_KEYS.SHOP_PHONE) || "0901 464 021",
    startOrderBtn: localStorage.getItem(CONFIG_KEYS.START_ORDER_BTN) || "Đặt Món Ngay",
    homeBackBtn: localStorage.getItem(CONFIG_KEYS.HOME_BACK_BTN) || "Quay lại trang chủ",
    step2Title: localStorage.getItem(CONFIG_KEYS.STEP2_TITLE) || "Chọn Món Theo Phần",
    step2Sub: localStorage.getItem(CONFIG_KEYS.STEP2_SUB) || "Lựa chọn các món ăn ngon miệng riêng biệt cho từng người.",
    confirmTitle: localStorage.getItem(CONFIG_KEYS.CONFIRM_TITLE) || "Xác Nhận & Gửi Đơn Hàng",
    confirmSub: localStorage.getItem(CONFIG_KEYS.CONFIRM_SUB) || "Kiểm tra kỹ thông tin từng phần ăn & địa điểm trước khi gửi đến bếp nhé."
  };
}

export function saveTextConfig(config: AppTextConfig) {
  localStorage.setItem(CONFIG_KEYS.APP_NAME, config.appName.trim());
  localStorage.setItem(CONFIG_KEYS.SLOGAN, config.slogan.trim());
  localStorage.setItem(CONFIG_KEYS.HOME_BANNER_TITLE, config.homeBannerTitle.trim());
  localStorage.setItem(CONFIG_KEYS.HOME_BANNER_SUBTITLE, config.homeBannerSubtitle.trim());
  localStorage.setItem(CONFIG_KEYS.SUCCESS_MESSAGE, config.successMessage.trim());
  localStorage.setItem(CONFIG_KEYS.STEP1_TITLE, config.step1Title.trim());
  localStorage.setItem(CONFIG_KEYS.STEP1_SUB, config.step1Sub.trim());
  localStorage.setItem(CONFIG_KEYS.HEADER_LOGO, config.headerLogo.trim());
  localStorage.setItem(CONFIG_KEYS.HOME_ROUND_LOGO, config.homeRoundLogo.trim());
  localStorage.setItem(CONFIG_KEYS.HOME_BANNER_IMAGE, config.homeBannerImage.trim());
  localStorage.setItem(CONFIG_KEYS.VP1_ICON, config.valueProp1Icon.trim());
  localStorage.setItem(CONFIG_KEYS.VP1_TITLE, config.valueProp1Title.trim());
  localStorage.setItem(CONFIG_KEYS.VP1_DESC, config.valueProp1Desc.trim());
  localStorage.setItem(CONFIG_KEYS.VP2_ICON, config.valueProp2Icon.trim());
  localStorage.setItem(CONFIG_KEYS.VP2_TITLE, config.valueProp2Title.trim());
  localStorage.setItem(CONFIG_KEYS.VP2_DESC, config.valueProp2Desc.trim());
  localStorage.setItem(CONFIG_KEYS.VP3_ICON, config.valueProp3Icon.trim());
  localStorage.setItem(CONFIG_KEYS.VP3_TITLE, config.valueProp3Title.trim());
  localStorage.setItem(CONFIG_KEYS.VP3_DESC, config.valueProp3Desc.trim());
  localStorage.setItem(CONFIG_KEYS.SHOP_ADDRESS, config.shopAddress.trim());
  localStorage.setItem(CONFIG_KEYS.SHOP_PHONE, config.shopPhone.trim());
  localStorage.setItem(CONFIG_KEYS.START_ORDER_BTN, config.startOrderBtn.trim());
  localStorage.setItem(CONFIG_KEYS.HOME_BACK_BTN, config.homeBackBtn.trim());
  localStorage.setItem(CONFIG_KEYS.STEP2_TITLE, config.step2Title.trim());
  localStorage.setItem(CONFIG_KEYS.STEP2_SUB, config.step2Sub.trim());
  localStorage.setItem(CONFIG_KEYS.CONFIRM_TITLE, config.confirmTitle.trim());
  localStorage.setItem(CONFIG_KEYS.CONFIRM_SUB, config.confirmSub.trim());
}
