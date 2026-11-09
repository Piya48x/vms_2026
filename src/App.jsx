import React, { useEffect, useRef, useState } from "react";
import { visitorsApi } from "./apiClient";

const ORG_NAME = "T.D.K. INDUSTRIAL";
const SITE_NAME = "บริษัท ที.ดี.เค.อินดัสเตรียล จำกัด";


// ข้อมูลแปลภาษา
const translations = {
  th: {
    // Step 1
    step1Title: "ถ่ายรูปบัตร หรือ นามบัตร",
    step1Guide: "กรุณาวางบัตรประชาชน หรือเอกสารสำคัญให้เห็นชัดเจนในกรอบ",
    openCamera: "เปิดกล้องเพื่อถ่ายบัตร",
    cameraStarting: "กำลังเปิดกล้อง...",
    cameraReady: "วางบัตรในกรอบให้ชัดเจน",
    autoCaptureIn: "ถ่ายอัตโนมัติใน",
    autoCaptureHint: "ระบบจะถ่ายอัตโนมัติเมื่อพบบัตรในกรอบและภาพชัดเท่านั้น",
    detectingCard: "กำลังตรวจหาบัตรในกรอบ",
    alignCard: "วางบัตรให้เต็มกรอบและอยู่นิ่ง",
    focusCard: "ขยับกล้องให้ภาพคมชัดขึ้น",
    holdStill: "จับภาพนิ่งไว้",
    cardLocked: "พร้อมถ่าย",
    manualCaptureReady: "ถ่ายเองได้แล้ว",
    cameraFallback: "ถ่ายผ่านกล้องของมือถือ",
    cameraUnsupportedTitle: "กล้องยังเปิดไม่ได้",
    cameraUnsupportedText: "เบราว์เซอร์นี้อาจไม่อนุญาตให้เว็บเข้าถึงกล้องโดยตรง กรุณาใช้ปุ่มถ่ายผ่านกล้องของมือถือ หรือเปิดใน Chrome",
    cameraPermissionError: "กรุณาอนุญาตการใช้งานกล้อง แล้วลองอีกครั้ง",
    openChrome: "เปิดใน Chrome",
    takePhoto: "📸 ถ่ายภาพเอกสาร",
    usePhoto: "ใช้รูปนี้และกรอกข้อมูล ➔",
    retakePhoto: "ถ่ายภาพใหม่อีกครั้ง",
    
    // Step 2
    step2Title: "ข้อมูลผู้มาติดต่อ",
    fullName: "ชื่อ-นามสกุล",
    fullNamePlaceholder: "ระบุชื่อผู้ติดต่อ",
    company: "มาจากบริษัท / หน่วยงาน",
    companyPlaceholder: "ชื่อบริษัทของคุณ",
    phone: "เบอร์โทรศัพท์",
    phonePlaceholder: "08x-xxxxxxx",
    contactPerson: "มาติดต่อใคร / แผนกใด",
    contactPersonPlaceholder: "ชื่อเจ้าหน้าที่ TDK",
    purpose: "วัตถุประสงค์การเข้าพบ",
    purposePlaceholder: "-- กรุณาเลือก --",
    purposeOptions: [
      "ประชุมงาน (Meeting)",
      "ส่งสินค้า / รับสินค้า (Delivery)",
      "ซ่อมบำรุง / ติดตั้ง (Maintenance)",
      "อบรม / สอนงาน (Training)",
      "ตรวจสอบ / Audit",
      "สมัครงาน / สัมภาษณ์ (Interview)",
      "วางบิล / รับเช็ค (Billing)",
      "อื่น ๆ (Other)"
    ],
    otherPurpose: "ระบุวัตถุประสงค์อื่น ๆ",
    otherPurposePlaceholder: "ระบุเหตุผลการเข้าพบ",
    submitButton: "ยืนยันการลงทะเบียน",
    loadingText: "กำลังบันทึก...",
    editPhoto: "แก้ไขรูปภาพ / ย้อนกลับ",
    
    // Step 3
    successTitle: "ลงทะเบียนสำเร็จ!",
    successMessage: "บันทึกข้อมูลเข้าพื้นที่เรียบร้อยแล้ว<br />กรุณารอรับบัตร Visitor จากเจ้าหน้าที่",
    finishButton: "เสร็จสิ้น",
    
    // General
    footerText: "SECURITY MANAGEMENT SYSTEM BY TDK INDUSTRIAL",
    siteBadge: "บริษัท ที.ดี.เค.อินดัสเตรียล จำกัด",
    logoText: "TDK INDUSTRIAL"
  },
  en: {
    // Step 1
    step1Title: "Take Photo of ID Card or Business Card",
    step1Guide: "Please place your ID card or important document clearly within the frame",
    openCamera: "Open Camera",
    cameraStarting: "Opening camera...",
    cameraReady: "Place the card clearly inside the frame",
    autoCaptureIn: "Auto capture in",
    autoCaptureHint: "Auto capture starts only when a clear card is detected inside the frame",
    detectingCard: "Detecting card in frame",
    alignCard: "Fill the frame with the card and hold still",
    focusCard: "Move the camera until the image is sharp",
    holdStill: "Hold still",
    cardLocked: "Ready to capture",
    manualCaptureReady: "Manual capture is available",
    cameraFallback: "Use Phone Camera",
    cameraUnsupportedTitle: "Camera is not available",
    cameraUnsupportedText: "This browser may not allow direct camera access. Use the phone camera button or open this page in Chrome.",
    cameraPermissionError: "Please allow camera access and try again",
    openChrome: "Open in Chrome",
    takePhoto: "📸 Take Photo",
    usePhoto: "Use This Photo & Fill Info ➔",
    retakePhoto: "Retake Photo",
    
    // Step 2
    step2Title: "Visitor Information",
    fullName: "Full Name",
    fullNamePlaceholder: "Enter visitor name",
    company: "Company / Organization",
    companyPlaceholder: "Your company name",
    phone: "Phone Number",
    phonePlaceholder: "08x-xxxxxxx",
    contactPerson: "Contact Person / Department",
    contactPersonPlaceholder: "TDK staff name",
    purpose: "Purpose of Visit",
    purposePlaceholder: "-- Please Select --",
    purposeOptions: [
      "Meeting",
      "Delivery / Receiving Goods",
      "Maintenance / Installation",
      "Training",
      "Inspection / Audit",
      "Job Application / Interview",
      "Billing / Check Receipt",
      "Other"
    ],
    otherPurpose: "Specify Other Purpose",
    otherPurposePlaceholder: "Specify purpose of visit",
    submitButton: "Confirm Registration",
    loadingText: "Saving...",
    editPhoto: "Edit Photo / Back",
    
    // Step 3
    successTitle: "Registration Successful!",
    successMessage: "Your information has been recorded<br />Please wait for your Visitor Card from staff",
    finishButton: "Finish",
    
    // General
    footerText: "SECURITY MANAGEMENT SYSTEM BY TDK INDUSTRIAL",
    siteBadge: "T.D.K. Industrial Co., Ltd.",
    logoText: "TDK INDUSTRIAL"
  },
  ko: {
    // Step 1
    step1Title: "신분증 또는 명함 사진 촬영",
    step1Guide: "신분증이나 중요 문서를 프레임 안에 명확하게 배치해 주세요",
    openCamera: "카메라 열기",
    cameraStarting: "카메라를 여는 중...",
    cameraReady: "카드를 프레임 안에 맞춰 주세요",
    autoCaptureIn: "자동 촬영까지",
    autoCaptureHint: "프레임 안에 선명한 카드가 감지될 때만 자동 촬영됩니다",
    detectingCard: "프레임 안의 카드를 감지 중",
    alignCard: "카드를 프레임에 맞추고 고정해 주세요",
    focusCard: "이미지가 선명해지도록 조정해 주세요",
    holdStill: "잠시 고정해 주세요",
    cardLocked: "촬영 준비 완료",
    manualCaptureReady: "직접 촬영할 수 있습니다",
    cameraFallback: "휴대폰 카메라 사용",
    cameraUnsupportedTitle: "카메라를 열 수 없습니다",
    cameraUnsupportedText: "이 브라우저에서는 카메라 접근이 제한될 수 있습니다. 휴대폰 카메라 버튼을 사용하거나 Chrome에서 열어 주세요.",
    cameraPermissionError: "카메라 접근을 허용한 후 다시 시도해 주세요",
    openChrome: "Chrome에서 열기",
    takePhoto: "📸 사진 촬영",
    usePhoto: "이 사진 사용 및 정보 입력 ➔",
    retakePhoto: "사진 다시 찍기",
    
    // Step 2
    step2Title: "방문자 정보",
    fullName: "성명",
    fullNamePlaceholder: "방문자 이름 입력",
    company: "회사 / 조직",
    companyPlaceholder: "회사명",
    phone: "전화번호",
    phonePlaceholder: "010-xxxx-xxxx",
    contactPerson: "담당자 / 부서",
    contactPersonPlaceholder: "TDK 담당자 이름",
    purpose: "방문 목적",
    purposePlaceholder: "-- 선택해 주세요 --",
    purposeOptions: [
      "회의 (Meeting)",
      "물품 배송 / 수령 (Delivery)",
      "유지보수 / 설치 (Maintenance)",
      "교육 / 훈련 (Training)",
      "검사 / 감사 (Audit)",
      "취업 지원 / 면접 (Interview)",
      "청구서 / 수표 수령 (Billing)",
      "기타 (Other)"
    ],
    otherPurpose: "기타 목적 지정",
    otherPurposePlaceholder: "방문 목적을 지정해 주세요",
    submitButton: "등록 확인",
    loadingText: "저장 중...",
    editPhoto: "사진 편집 / 뒤로",
    
    // Step 3
    successTitle: "등록 성공!",
    successMessage: "정보가 기록되었습니다<br />직원으로부터 방문증을 받아주세요",
    finishButton: "완료",
    
    // General
    footerText: "TDK INDUSTRIAL 보안 관리 시스템",
    siteBadge: "티디케이 인더스트리얼 주식회사",
    logoText: "TDK INDUSTRIAL"
  }
};

const PRIVACY_NOTICE_VERSION =
  import.meta.env.VITE_PRIVACY_NOTICE_VERSION || "2026-10-30";
const PRIVACY_RETENTION_DAYS = Number(
  import.meta.env.VITE_PRIVACY_RETENTION_DAYS || 90
);
const PRIVACY_CONTACT =
  import.meta.env.VITE_PRIVACY_CONTACT ||
  "เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล / ฝ่ายธุรการ ณ จุดรักษาความปลอดภัย";

const isConsentSchemaError = (error) => {
  const errorText = [error?.code, error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    error?.code === "PGRST204" ||
    error?.code === "42703" ||
    errorText.includes("consent_given_at") ||
    errorText.includes("consent_notice_version") ||
    errorText.includes("consent_method")
  );
};

const privacyTranslations = {
  th: {
    eyebrow: "ก่อนเริ่มลงทะเบียนผู้มาติดต่อ",
    title: "แบบยืนยันการรับทราบและให้ความยินยอมด้านข้อมูลส่วนบุคคล",
    subtitle: "กรุณาอ่านประกาศนี้ก่อนเปิดกล้อง ถ่ายภาพเอกสาร หรือกรอกข้อมูล",
    moreLink: "อ่านประกาศความเป็นส่วนตัวเพิ่มเติม",
    quickCamera: "เปิดกล้องเมื่อยินยอมเท่านั้น",
    quickRetention: `เก็บไม่เกิน ${PRIVACY_RETENTION_DAYS} วัน`,
    quickNoMarketing: "ไม่ใช้ข้อมูลเพื่อการตลาด",
    detailsTitle: "รายละเอียดการใช้ข้อมูล",
    requiredBadge: "กรุณายืนยันก่อนดำเนินการ",
    controller: "ผู้ควบคุมข้อมูลส่วนบุคคล",
    controllerValue: "บริษัท ที.ดี.เค.อินดัสเตรียล จำกัด",
    intro:
      "บริษัทเคารพสิทธิความเป็นส่วนตัวของท่าน และจะเก็บ ใช้ หรือเปิดเผยข้อมูลเท่าที่จำเป็นสำหรับการเข้า–ออกพื้นที่และการรักษาความปลอดภัย",
    dataTitle: "ข้อมูลที่เก็บรวบรวม",
    dataText:
      "ชื่อ–นามสกุล บริษัท เบอร์โทรศัพท์ ผู้ติดต่อ วัตถุประสงค์การเข้าพบ วัน–เวลาเข้าออก และภาพเอกสารที่ท่านเลือกถ่าย",
    minimizeTitle: "โปรดปกปิดข้อมูลที่ไม่จำเป็นก่อนถ่ายภาพ",
    minimizeText:
      "เช่น เลขประจำตัวประชาชน วันเกิด ที่อยู่ ศาสนา หมู่เลือด และข้อมูลด้านหลังบัตร บริษัทไม่ประสงค์เก็บข้อมูลเหล่านี้เพื่อการลงทะเบียนทั่วไป",
    purposeTitle: "วัตถุประสงค์และฐานการประมวลผล",
    purposeText:
      "เพื่อยืนยันตัวตน ลงทะเบียนผู้มาติดต่อ ควบคุมการเข้า–ออก ติดต่อประสานงาน ตรวจสอบเหตุด้านความปลอดภัย และปฏิบัติตามกฎหมาย โดยอาศัยความยินยอมสำหรับการถ่ายและจัดเก็บภาพเอกสาร และฐานกฎหมายอื่นที่เกี่ยวข้องสำหรับข้อมูลที่จำเป็นต่อการรักษาความปลอดภัย",
    sharingTitle: "การเปิดเผยข้อมูล",
    sharingText:
      "เปิดเผยเฉพาะแก่เจ้าหน้าที่รักษาความปลอดภัย เจ้าหน้าที่ผู้รับผิดชอบ ผู้ให้บริการระบบที่อยู่ภายใต้ข้อตกลงคุ้มครองข้อมูล และหน่วยงานรัฐเมื่อกฎหมายกำหนด โดยไม่มีวัตถุประสงค์ทางการตลาด",
    retentionTitle: "ระยะเวลาเก็บรักษา",
    retentionText: `ไม่เกิน ${PRIVACY_RETENTION_DAYS} วันหลังสิ้นสุดการเข้าเยี่ยม เว้นแต่จำเป็นต้องเก็บต่อเพื่อปฏิบัติตามกฎหมาย ตรวจสอบเหตุ หรือใช้สิทธิเรียกร้อง เมื่อพ้นความจำเป็นจะลบหรือทำลายตามขั้นตอนที่เหมาะสม`,
    rightsTitle: "สิทธิของท่าน",
    rightsText:
      "ท่านอาจขอเข้าถึง รับสำเนา แก้ไข ลบ จำกัดหรือคัดค้านการประมวลผล ถอนความยินยอม และร้องเรียนต่อสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคลได้ตามที่กฎหมายกำหนด การถอนความยินยอมไม่กระทบการประมวลผลที่ชอบด้วยกฎหมายก่อนถอน",
    contactTitle: "ช่องทางติดต่อและใช้สิทธิ",
    contactText: PRIVACY_CONTACT,
    consequenceTitle: "หากไม่ยินยอม",
    consequenceText:
      "ระบบจะไม่เปิดกล้องและไม่เก็บภาพเอกสาร ท่านยังสามารถติดต่อเจ้าหน้าที่รักษาความปลอดภัยเพื่อสอบถามวิธีลงทะเบียนทางเลือกที่ใช้ข้อมูลเท่าที่จำเป็น",
    noticeVersion: "เวอร์ชันประกาศ",
    confirm:
      "ข้าพเจ้าได้อ่านและรับทราบประกาศความเป็นส่วนตัว และยินยอมให้ถ่ายและจัดเก็บภาพเอกสารตามวัตถุประสงค์ข้างต้น",
    accept: "ยินยอมและดำเนินการต่อ",
    decline: "ไม่ยินยอม",
    declinedTitle: "ระบบไม่ได้เปิดกล้องหรือเก็บข้อมูลของท่าน",
    declinedText:
      "กรุณาติดต่อเจ้าหน้าที่รักษาความปลอดภัยเพื่อขอวิธีลงทะเบียนทางเลือก หรือย้อนกลับเพื่ออ่านและตัดสินใจใหม่",
    back: "ย้อนกลับไปอ่านประกาศ",
    consentRequired: "กรุณาให้ความยินยอมก่อนดำเนินการ",
  },
  en: {
    eyebrow: "Before visitor registration",
    title: "Privacy Notice Acknowledgement and Consent",
    subtitle: "Please read this notice before opening the camera, photographing a document, or entering information.",
    moreLink: "Read the full Privacy Notice",
    quickCamera: "Camera opens only after consent",
    quickRetention: `Kept for up to ${PRIVACY_RETENTION_DAYS} days`,
    quickNoMarketing: "Never used for marketing",
    detailsTitle: "How we use your data",
    requiredBadge: "Confirmation required to continue",
    controller: "Data controller",
    controllerValue: "T.D.K. Industrial Co., Ltd.",
    intro: "We process only the personal data necessary for site access and security.",
    dataTitle: "Data collected",
    dataText: "Name, company, phone number, host, visit purpose, entry/exit times, and the document image you choose to capture.",
    minimizeTitle: "Cover unnecessary data before taking a photo",
    minimizeText: "For example: national ID number, date of birth, address, religion, blood type, and data on the back of the card.",
    purposeTitle: "Purpose and legal basis",
    purposeText: "Identity verification, visitor registration, access control, coordination, security incident review, and legal compliance. Consent applies to capturing and storing the document image; other applicable legal bases may apply to data necessary for security.",
    sharingTitle: "Disclosure",
    sharingText: "Only to authorized security and responsible personnel, contracted service providers, and government authorities when legally required. No marketing use.",
    retentionTitle: "Retention",
    retentionText: `Up to ${PRIVACY_RETENTION_DAYS} days after the visit, unless longer retention is necessary for legal compliance, incident review, or legal claims.`,
    rightsTitle: "Your rights",
    rightsText: "Subject to law, you may request access, a copy, correction, deletion, restriction, objection, withdraw consent, and lodge a complaint with the PDPC. Withdrawal does not affect prior lawful processing.",
    contactTitle: "Contact and rights requests",
    contactText: PRIVACY_CONTACT,
    consequenceTitle: "If you decline",
    consequenceText: "The camera will not open and no document image will be collected. Ask security personnel about an alternative registration method using only necessary data.",
    noticeVersion: "Notice version",
    confirm: "I have read and acknowledge the Privacy Notice and consent to the capture and storage of my document image for the purposes above.",
    accept: "Consent and continue",
    decline: "Decline",
    declinedTitle: "The camera was not opened and no data was collected.",
    declinedText: "Please contact security for an alternative registration method, or return to review this notice again.",
    back: "Back to the notice",
    consentRequired: "Please provide consent before continuing.",
  },
  ko: {
    eyebrow: "방문자 등록 전",
    title: "개인정보 처리 안내 확인 및 동의",
    subtitle: "카메라를 열거나 서류를 촬영하고 정보를 입력하기 전에 안내문을 읽어 주세요.",
    moreLink: "개인정보 처리 안내 자세히 보기",
    quickCamera: "동의 후에만 카메라 실행",
    quickRetention: `최대 ${PRIVACY_RETENTION_DAYS}일 보관`,
    quickNoMarketing: "마케팅에 사용하지 않음",
    detailsTitle: "개인정보 이용 상세",
    requiredBadge: "계속하려면 확인해 주세요",
    controller: "개인정보 처리자",
    controllerValue: "T.D.K. Industrial Co., Ltd.",
    intro: "사업장 출입과 보안에 필요한 최소한의 개인정보만 처리합니다.",
    dataTitle: "수집 정보",
    dataText: "성명, 회사, 전화번호, 담당자, 방문 목적, 출입 시간 및 사용자가 선택해 촬영한 서류 이미지",
    minimizeTitle: "촬영 전 불필요한 정보를 가려 주세요",
    minimizeText: "신분증 번호, 생년월일, 주소, 종교, 혈액형 및 카드 뒷면 정보 등은 가려 주세요.",
    purposeTitle: "목적 및 처리 근거",
    purposeText: "본인 확인, 방문 등록, 출입 통제, 연락, 보안 사고 확인 및 법적 의무 이행을 위해 처리합니다. 서류 이미지 촬영·보관에는 동의를 적용합니다.",
    sharingTitle: "정보 제공",
    sharingText: "권한 있는 보안·담당 직원, 계약상 보호 의무가 있는 시스템 제공자 및 법률상 요구되는 기관에만 제공합니다. 마케팅에는 사용하지 않습니다.",
    retentionTitle: "보관 기간",
    retentionText: `방문 종료 후 최대 ${PRIVACY_RETENTION_DAYS}일 동안 보관하며, 법적 의무·사고 조사·권리 행사에 필요한 경우 예외적으로 연장할 수 있습니다.`,
    rightsTitle: "정보주체의 권리",
    rightsText: "법률이 정한 범위에서 열람, 사본, 정정, 삭제, 처리 제한·반대, 동의 철회 및 PDPC 민원을 요청할 수 있습니다.",
    contactTitle: "문의 및 권리 행사",
    contactText: PRIVACY_CONTACT,
    consequenceTitle: "동의하지 않는 경우",
    consequenceText: "카메라가 열리지 않고 서류 이미지가 수집되지 않습니다. 보안 담당자에게 최소 정보만 사용하는 대체 등록 방법을 문의해 주세요.",
    noticeVersion: "안내문 버전",
    confirm: "개인정보 처리 안내를 읽고 확인했으며, 위 목적에 따른 서류 이미지 촬영 및 보관에 동의합니다.",
    accept: "동의하고 계속",
    decline: "동의하지 않음",
    declinedTitle: "카메라를 열지 않았으며 정보를 수집하지 않았습니다.",
    declinedText: "보안 담당자에게 대체 등록 방법을 문의하거나 안내문으로 돌아가 다시 확인해 주세요.",
    back: "안내문으로 돌아가기",
    consentRequired: "계속하려면 동의해 주세요.",
  },
};

const PURPOSE_STORAGE_RULES = [
  ["meeting", ["meeting", "ประชุม"]],
  ["delivery", ["delivery", "ส่งสินค้า", "รับสินค้า", "ส่งของ", "รับของ"]],
  ["maintenance", ["maintenance", "ซ่อมบำรุง", "ติดตั้ง"]],
  ["training", ["training", "อบรม", "สอนงาน"]],
  ["audit", ["audit", "ตรวจสอบ"]],
  ["interview", ["interview", "สมัครงาน", "สัมภาษณ์"]],
  ["billing", ["billing", "วางบิล", "รับเช็ค"]],
];

function normalizePurposeForStorage(purpose, otherPurpose) {
  const rawPurpose = String(purpose || "").trim();
  const normalized = rawPurpose.toLowerCase();

  if (
    normalized === "other" ||
    normalized.includes("(other)") ||
    rawPurpose.includes("อื่น")
  ) {
    const detail = String(otherPurpose || "").trim();
    return detail ? `อื่น ๆ: ${detail}` : "other";
  }

  const matched = PURPOSE_STORAGE_RULES.find(([, keywords]) =>
    keywords.some((keyword) => normalized.includes(keyword.toLowerCase()))
  );
  return matched?.[0] || rawPurpose;
}

const CARD_ASPECT_RATIO = 1.586;
const CARD_HOLD_MS = 1200;
const CAMERA_VIEW_ASPECT_RATIO = 4 / 3;
const GUIDE_WIDTH_RATIO = 0.84;

const getVisibleSourceRect = (sourceWidth, sourceHeight) => {
  const sourceAspect = sourceWidth / sourceHeight;

  if (sourceAspect > CAMERA_VIEW_ASPECT_RATIO) {
    const width = sourceHeight * CAMERA_VIEW_ASPECT_RATIO;
    return {
      x: (sourceWidth - width) / 2,
      y: 0,
      width,
      height: sourceHeight,
    };
  }

  const height = sourceWidth / CAMERA_VIEW_ASPECT_RATIO;
  return {
    x: 0,
    y: (sourceHeight - height) / 2,
    width: sourceWidth,
    height,
  };
};

const analyzeCardFrame = (source, canvas) => {
  if (!source || !canvas) {
    return { ok: false, reason: "align" };
  }

  if (source.readyState !== undefined && source.readyState < 2) {
    return { ok: false, reason: "align" };
  }

  const sourceWidth = source.videoWidth || source.naturalWidth || source.width;
  const sourceHeight = source.videoHeight || source.naturalHeight || source.height;
  if (!sourceWidth || !sourceHeight) {
    return { ok: false, reason: "align" };
  }

  const visible = getVisibleSourceRect(sourceWidth, sourceHeight);
  const sampleWidth = 320;
  const sampleHeight = Math.round(sampleWidth / CAMERA_VIEW_ASPECT_RATIO);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  canvas.width = sampleWidth;
  canvas.height = sampleHeight;
  ctx.drawImage(
    source,
    visible.x,
    visible.y,
    visible.width,
    visible.height,
    0,
    0,
    sampleWidth,
    sampleHeight
  );

  const { data } = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
  const gray = new Uint8Array(sampleWidth * sampleHeight);
  const gradX = new Uint8Array(sampleWidth * sampleHeight);
  const gradY = new Uint8Array(sampleWidth * sampleHeight);
  let sum = 0;

  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    const value = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    gray[p] = value;
    sum += value;
  }

  const mean = sum / gray.length;
  let varianceSum = 0;
  let innerGradientSum = 0;
  let innerVarianceSum = 0;
  let innerSamples = 0;
  const rectWidth = sampleWidth * GUIDE_WIDTH_RATIO;
  const rectHeight = rectWidth / CARD_ASPECT_RATIO;
  const rectX = (sampleWidth - rectWidth) / 2;
  const rectY = (sampleHeight - rectHeight) / 2;
  const innerLeft = Math.round(rectX + rectWidth * 0.18);
  const innerRight = Math.round(rectX + rectWidth * 0.82);
  const innerTop = Math.round(rectY + rectHeight * 0.2);
  const innerBottom = Math.round(rectY + rectHeight * 0.8);

  for (let y = 1; y < sampleHeight - 1; y += 1) {
    for (let x = 1; x < sampleWidth - 1; x += 1) {
      const idx = y * sampleWidth + x;
      const gx = Math.abs(gray[idx + 1] - gray[idx - 1]);
      const gy = Math.abs(gray[idx + sampleWidth] - gray[idx - sampleWidth]);
      gradX[idx] = Math.min(gx, 255);
      gradY[idx] = Math.min(gy, 255);
      varianceSum += (gray[idx] - mean) ** 2;

      if (x >= innerLeft && x <= innerRight && y >= innerTop && y <= innerBottom) {
        innerSamples += 1;
        innerGradientSum += gx + gy;
        innerVarianceSum += (gray[idx] - mean) ** 2;
      }
    }
  }

  const sampleCount = (sampleWidth - 2) * (sampleHeight - 2);
  const variance = varianceSum / sampleCount;
  const innerSharpness = innerGradientSum / Math.max(innerSamples, 1);
  const innerVariance = innerVarianceSum / Math.max(innerSamples, 1);
  const edgeThreshold = Math.max(34, Math.min(72, Math.sqrt(variance) * 2.4));
  const sideBand = Math.round(sampleWidth * 0.04);
  const rectLeft = Math.round(rectX);
  const rectRight = Math.round(rectX + rectWidth);
  const rectTop = Math.round(rectY);
  const rectBottom = Math.round(rectY + rectHeight);

  const scanVerticalEdge = (edgeX) => {
    let hits = 0;
    let samples = 0;
    const yStart = Math.round(rectY + rectHeight * 0.12);
    const yEnd = Math.round(rectY + rectHeight * 0.88);

    for (let y = yStart; y <= yEnd; y += 2) {
      let maxEdge = 0;
      for (let x = edgeX - sideBand; x <= edgeX + sideBand; x += 1) {
        if (x <= 1 || x >= sampleWidth - 2 || y <= 1 || y >= sampleHeight - 2) continue;
        maxEdge = Math.max(maxEdge, gradX[y * sampleWidth + x]);
      }
      if (maxEdge >= edgeThreshold) hits += 1;
      samples += 1;
    }

    return hits / Math.max(samples, 1);
  };

  const scanHorizontalEdge = (edgeY) => {
    let hits = 0;
    let samples = 0;
    const xStart = Math.round(rectX + rectWidth * 0.1);
    const xEnd = Math.round(rectX + rectWidth * 0.9);

    for (let x = xStart; x <= xEnd; x += 2) {
      let maxEdge = 0;
      for (let y = edgeY - sideBand; y <= edgeY + sideBand; y += 1) {
        if (x <= 1 || x >= sampleWidth - 2 || y <= 1 || y >= sampleHeight - 2) continue;
        maxEdge = Math.max(maxEdge, gradY[y * sampleWidth + x]);
      }
      if (maxEdge >= edgeThreshold) hits += 1;
      samples += 1;
    }

    return hits / Math.max(samples, 1);
  };

  const averageGray = (xStart, xEnd, yStart, yEnd) => {
    const left = Math.max(0, Math.round(Math.min(xStart, xEnd)));
    const right = Math.min(sampleWidth - 1, Math.round(Math.max(xStart, xEnd)));
    const top = Math.max(0, Math.round(Math.min(yStart, yEnd)));
    const bottom = Math.min(sampleHeight - 1, Math.round(Math.max(yStart, yEnd)));
    let total = 0;
    let count = 0;

    for (let y = top; y <= bottom; y += 1) {
      for (let x = left; x <= right; x += 1) {
        total += gray[y * sampleWidth + x];
        count += 1;
      }
    }

    return total / Math.max(count, 1);
  };

  const yBandStart = Math.round(rectY + rectHeight * 0.18);
  const yBandEnd = Math.round(rectY + rectHeight * 0.82);
  const xBandStart = Math.round(rectX + rectWidth * 0.14);
  const xBandEnd = Math.round(rectX + rectWidth * 0.86);
  const contrastBand = Math.max(8, Math.round(sideBand * 0.8));
  const sideContrasts = {
    left: Math.abs(
      averageGray(rectLeft + 3, rectLeft + contrastBand, yBandStart, yBandEnd) -
        averageGray(rectLeft - contrastBand, rectLeft - 3, yBandStart, yBandEnd)
    ),
    right: Math.abs(
      averageGray(rectRight - contrastBand, rectRight - 3, yBandStart, yBandEnd) -
        averageGray(rectRight + 3, rectRight + contrastBand, yBandStart, yBandEnd)
    ),
    top: Math.abs(
      averageGray(xBandStart, xBandEnd, rectTop + 3, rectTop + contrastBand) -
        averageGray(xBandStart, xBandEnd, rectTop - contrastBand, rectTop - 3)
    ),
    bottom: Math.abs(
      averageGray(xBandStart, xBandEnd, rectBottom - contrastBand, rectBottom - 3) -
        averageGray(xBandStart, xBandEnd, rectBottom + 3, rectBottom + contrastBand)
    ),
  };

  const sideScores = {
    left: scanVerticalEdge(rectLeft),
    right: scanVerticalEdge(rectRight),
    top: scanHorizontalEdge(rectTop),
    bottom: scanHorizontalEdge(rectBottom),
  };

  const sidesPresent = Object.values(sideScores).filter((score) => score >= 0.48).length;
  const contrastSides = Object.values(sideContrasts).filter((contrast) => contrast >= 8).length;
  const allSidesStrong = sidesPresent === 4 && contrastSides >= 3 && Math.min(...Object.values(sideContrasts)) >= 5;

  if (mean < 45 || mean > 238) {
    return { ok: false, reason: "align" };
  }

  if (!allSidesStrong) {
    return {
      ok: false,
      reason: "align",
      score: Math.round(Math.min(...Object.values(sideScores)) * 100),
      sideScores,
      sideContrasts,
    };
  }

  if (innerSharpness < 18 || innerVariance < 95) {
    return { ok: false, reason: "focus" };
  }

  return {
    ok: true,
    reason: "ready",
    score: Math.round(Math.min(...Object.values(sideScores)) * 100),
    sideScores,
    sideContrasts,
  };
};

export default function App() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStatus, setCameraStatus] = useState("idle");
  const [cameraError, setCameraError] = useState("");
  const [autoCountdown, setAutoCountdown] = useState(null);
  const [cardStatus, setCardStatus] = useState("idle");
  const [cardMessage, setCardMessage] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [historyList, setHistoryList] = useState([]);
  const [language, setLanguage] = useState("th"); // 'th', 'en', 'ko'
  const t = translations[language];
  const privacy = privacyTranslations[language];
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentDeclined, setConsentDeclined] = useState(false);
  const [consentRecord, setConsentRecord] = useState(null);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const isLineBrowser = /Line\//i.test(userAgent) || /\bLIFF\b/i.test(userAgent);
  const prefersNativeCamera = isLineBrowser || /Android|iPhone|iPad|iPod/i.test(userAgent);

  

  const [form, setForm] = useState({
    full_name: "",
    company: "",
    phone: "",
    contact_person: "",
    purpose: "",
    other_purpose: "",
  });

  const getFlagImage = (lang) => {
  const flags = {
    th: "https://flagcdn.com/w40/th.png",
    en: "https://flagcdn.com/w40/us.png", 
    ko: "https://flagcdn.com/w40/kr.png"
  };
  return flags[lang] || flags['th'];
};

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const autoTimerRef = useRef(null);
  const detectionTimerRef = useRef(null);
  const analysisCanvasRef = useRef(null);
  const cardReadySinceRef = useRef(null);
  const captureLockedRef = useRef(false);
  const lineAutoCameraAttemptedRef = useRef(false);

  const handleLanguageChange = (lang) => {
  setLanguage(lang);
  setIsLangOpen(false);
};

// เพิ่มใน useEffect หลัก
useEffect(() => {
  const handleClickOutside = (event) => {
    if (isLangOpen && !event.target.closest('.lang-dropdown')) {
      setIsLangOpen(false);
    }
  };

  document.addEventListener('click', handleClickOutside);
  return () => document.removeEventListener('click', handleClickOutside);
}, [isLangOpen]);

  // โหลดประวัติจาก LocalStorage เมื่อเปิด App
  useEffect(() => {
    const history = JSON.parse(localStorage.getItem("visitor_history") || "[]");
    setHistoryList(history);
    
    // โหลดภาษาจาก localStorage ถ้ามี
    const savedLang = localStorage.getItem("tdk_language");
    if (savedLang && translations[savedLang]) {
      setLanguage(savedLang);
    }
  }, []);

  // บันทึกภาษาเมื่อเปลี่ยน
  useEffect(() => {
    localStorage.setItem("tdk_language", language);
  }, [language]);

  useEffect(() => {
    if (step !== 1) {
      stopCamera();
    }
    return () => stopCamera();
  }, [step]);

  const handleAcceptConsent = () => {
    if (!consentChecked) return;

    setConsentRecord({
      givenAt: new Date().toISOString(),
      noticeVersion: PRIVACY_NOTICE_VERSION,
      method: "explicit_checkbox",
    });
    setConsentDeclined(false);
    setStep(1);
  };

  const handleDeclineConsent = () => {
    stopCamera();
    setConsentChecked(false);
    setConsentRecord(null);
    setConsentDeclined(true);
  };

  const startCamera = async () => {
    if (!consentRecord) {
      setStep(0);
      alert(privacy.consentRequired);
      return;
    }
    resetCardDetection();
    setPhotoDataUrl("");
    setCameraError("");
    setCameraStatus("starting");
    setCameraActive(true);
    setCardStatus("searching");
    setCardMessage(t.detectingCard);

    try {
      if (!window.isSecureContext && window.location.hostname !== "localhost") {
        throw new Error("INSECURE_CONTEXT");
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("UNSUPPORTED_CAMERA");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;

      const [track] = stream.getVideoTracks();
      if (track?.applyConstraints) {
        track.applyConstraints({ advanced: [{ focusMode: "continuous" }] }).catch(() => {});
      }

      if (!videoRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setCameraStatus("ready");
      startCardDetection();
    } catch (err) {
      console.error("Camera Error:", err);
      const blockedByPermission = err.name === "NotAllowedError" || err.name === "SecurityError";
      setCameraError(blockedByPermission ? t.cameraPermissionError : t.cameraUnsupportedText);
      setCameraStatus("error");
      setCameraActive(false);
      resetCardDetection();
      stopCamera();
    }
  };

  const stopCamera = () => {
    resetCardDetection();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const clearAutoCapture = () => {
    if (autoTimerRef.current) {
      clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    setAutoCountdown(null);
  };

  const clearCardDetectionTimer = () => {
    if (detectionTimerRef.current) {
      clearInterval(detectionTimerRef.current);
      detectionTimerRef.current = null;
    }
  };

  const resetCardDetection = () => {
    clearAutoCapture();
    clearCardDetectionTimer();
    cardReadySinceRef.current = null;
    captureLockedRef.current = false;
    setCardStatus("idle");
    setCardMessage("");
  };

  const openNativeCamera = () => {
    if (!consentRecord) {
      setStep(0);
      alert(privacy.consentRequired);
      return;
    }
    resetCardDetection();
    stopCamera();
    setCameraActive(false);
    setCameraStatus("idle");
    setCameraError("");

    const input = fileInputRef.current;
    if (!input) return;

    // Reset the value so Android can return the same photo twice. A direct
    // click also preserves the user gesture better inside LINE's WebView.
    input.value = "";
    input.click();
  };

  const openInChrome = () => {
    const currentUrl = window.location.href;
    const currentLocation = new URL(currentUrl);
    const scheme = currentLocation.protocol.replace(":", "") || "https";

    if (/Android/i.test(userAgent)) {
      const hash = currentLocation.hash
        ? `%23${currentLocation.hash.slice(1)}`
        : "";
      const chromeTarget = `${currentLocation.host}${currentLocation.pathname}${currentLocation.search}${hash}`;
      const fallbackUrl = encodeURIComponent(currentUrl);
      window.location.href = `intent://${chromeTarget}#Intent;scheme=${scheme};package=com.android.chrome;S.browser_fallback_url=${fallbackUrl};end`;
      return;
    }

    if (/iPhone|iPad|iPod/i.test(userAgent)) {
      window.location.href = currentUrl
        .replace(/^https:\/\//, "googlechromes://")
        .replace(/^http:\/\//, "googlechrome://");
      return;
    }

    window.open(currentUrl, "_blank", "noopener,noreferrer");
  };

  useEffect(() => {
    if (step !== 1 || !isLineBrowser || photoDataUrl) return undefined;

    // LINE can show the native permission prompt from getUserMedia as soon as
    // the scanned page opens. The guard prevents repeated prompts on rerender.
    const timer = window.setTimeout(() => {
      if (lineAutoCameraAttemptedRef.current) return;
      lineAutoCameraAttemptedRef.current = true;
      startCamera();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [step, isLineBrowser]);

  const startAutoCapture = (remainingMs) => {
    clearAutoCapture();
    let seconds = Math.max(1, Math.ceil(remainingMs / 1000));
    setAutoCountdown(seconds);
    autoTimerRef.current = setInterval(() => {
      seconds -= 1;
      if (seconds <= 0) {
        clearAutoCapture();
        return;
      }
      setAutoCountdown(seconds);
    }, 1000);
  };

  const startCardDetection = () => {
    clearCardDetectionTimer();
    analysisCanvasRef.current = analysisCanvasRef.current || document.createElement("canvas");

    detectionTimerRef.current = setInterval(() => {
      const result = analyzeCardFrame(videoRef.current, analysisCanvasRef.current);
      const now = Date.now();

      if (!result.ok) {
        cardReadySinceRef.current = null;
        captureLockedRef.current = false;
        clearAutoCapture();
        setCardStatus(result.reason === "focus" ? "focus" : "searching");
        setCardMessage(result.reason === "focus" ? t.focusCard : t.alignCard);
        return;
      }

      if (!cardReadySinceRef.current) {
        cardReadySinceRef.current = now;
        startAutoCapture(CARD_HOLD_MS);
      }

      const holdMs = now - cardReadySinceRef.current;
      const remainingMs = Math.max(CARD_HOLD_MS - holdMs, 0);
      const ready = holdMs >= CARD_HOLD_MS;

      setCardStatus(ready ? "ready" : "holding");
      setCardMessage(ready ? t.cardLocked : t.holdStill);
      setAutoCountdown(ready ? null : Math.max(1, Math.ceil(remainingMs / 1000)));

      if (ready && !captureLockedRef.current) {
        captureLockedRef.current = true;
        clearAutoCapture();
        window.setTimeout(() => {
          const finalCheck = analyzeCardFrame(videoRef.current, analysisCanvasRef.current);
          if (finalCheck.ok) {
            takeSnapshot();
            return;
          }

          cardReadySinceRef.current = null;
          captureLockedRef.current = false;
          setCardStatus(finalCheck.reason === "focus" ? "focus" : "searching");
          setCardMessage(finalCheck.reason === "focus" ? t.focusCard : t.alignCard);
        }, 180);
      }
    }, 250);
  };

  const takeSnapshot = () => {
    if (!videoRef.current || videoRef.current.readyState < 2) {
      return;
    }

    resetCardDetection();
    const sourceWidth = videoRef.current.videoWidth || 1280;
    const sourceHeight = videoRef.current.videoHeight || 720;
    const scale = Math.min(1, 1280 / sourceWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(sourceWidth * scale);
    canvas.height = Math.round(sourceHeight * scale);
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    setPhotoDataUrl(canvas.toDataURL("image/jpeg", 0.75));
    setCameraActive(false);
    setCameraStatus("idle");
    stopCamera();
  };

  const handleCameraFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, 1280 / image.naturalWidth);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.naturalWidth * scale);
        canvas.height = Math.round(image.naturalHeight * scale);
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resetCardDetection();
        stopCamera();
        setPhotoDataUrl(canvas.toDataURL("image/jpeg", 0.75));
        setCameraActive(false);
        setCameraStatus("idle");
        setCameraError("");
      };
      image.onerror = () => setCameraError("ไม่สามารถอ่านไฟล์รูปนี้ได้");
      image.src = typeof reader.result === "string" ? reader.result : "";
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!consentRecord) {
      setStep(0);
      alert(privacy.consentRequired);
      return;
    }
    setLoading(true);

    try {
      const photoBlob = photoDataUrl
        ? await (await fetch(photoDataUrl)).blob()
        : null;
      await visitorsApi.create(
        {
          full_name: form.full_name,
          company: form.company,
          phone: form.phone,
          contact_person: form.contact_person,
          purpose: normalizePurposeForStorage(
            form.purpose,
            form.other_purpose
          ),
          checkin_time: new Date().toISOString(),
          consent_given_at: consentRecord.givenAt,
          consent_notice_version: consentRecord.noticeVersion,
          consent_method: consentRecord.method,
        },
        photoBlob
      );

      const history = JSON.parse(
        localStorage.getItem("visitor_history") || "[]"
      );
      const newItem = {
        full_name: form.full_name,
        company: form.company,
        phone: form.phone,
      };
      const filtered = history.filter((h) => h.full_name !== form.full_name);
      const updatedHistory = [newItem, ...filtered].slice(0, 50);
      localStorage.setItem("visitor_history", JSON.stringify(updatedHistory));
      setHistoryList(updatedHistory);

      setStep(3);
    } catch (err) {
      console.error("Visitor registration failed", err);

      alert("Error: " + (err?.message || "Unable to save visitor data"));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      full_name: "",
      company: "",
      phone: "",
      contact_person: "",
      purpose: "",
      other_purpose: "",
    });
    setPhotoDataUrl("");
    setCameraActive(false);
    setCameraStatus("idle");
    setCameraError("");
    setConsentChecked(false);
    setConsentDeclined(false);
    setConsentRecord(null);
    resetCardDetection();
    setStep(0);
  };

  const handleEditPhoto = () => {
    setCameraActive(false);
    setCameraStatus("idle");
    setCameraError("");
    resetCardDetection();
    setStep(1);
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    setForm((prev) => ({ ...prev, full_name: name }));

    const found = historyList.find((h) => h.full_name === name);
    if (found) {
      setForm((prev) => ({
        ...prev,
        company: found.company || prev.company,
        phone: found.phone || prev.phone,
      }));
    }
  };

  return (
    <div className="app-shell">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600&display=swap');
        :root { 
          --tdk-blue: #0046AD; 
          --tdk-blue-light: #0046AD; 
          --tdk-bg: #f0f4f8; 
          --text-main: #1a2b49; 
          --card-shadow: 0 20px 40px rgba(0, 70, 173, 0.14);
        }
        body { 
          margin: 0; 
          font-family: 'Kanit', sans-serif; 
          background: var(--tdk-bg); 
          color: var(--text-main); 
          overflow-x: hidden;
        }
        .app-shell { 
          min-height: 100vh; 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          padding: 20px;
          padding-top: 80px; /* เพิ่ม padding-top ให้พอดีกับปุ่มภาษา */
          position: relative;
        }
        
       /* Language Switcher Styles */
.language-switcher {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
}

.lang-dropdown {
  position: relative;
  display: inline-block;
}

.lang-current {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  border: 1px solid rgba(0, 70, 173, 0.25);
  border-radius: 12px;
  padding: 10px 16px;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  min-width: 70px;
  justify-content: center;
}

.lang-current:hover {
  background: #f8fafc;
  border-color: var(--tdk-blue);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 70, 173, 0.18);
}

.lang-arrow {
  display: inline-block;
  transition: transform 0.3s ease;
  margin-left: 5px;
  font-size: 10px;
}

.lang-current:hover .lang-arrow {
  transform: rotate(180deg);
}

.lang-dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  overflow: hidden;
  
  /* เพิ่ม Animation ตรงนี้ */
  animation: slideDown 0.2s ease-out;
  transform-origin: top right;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes dropdownFade {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.lang-option {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  background: white;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  border-bottom: 1px solid #f1f5f9;
  transition: all 0.2s ease;
}

.lang-option:last-child {
  border-bottom: none;
}

.lang-option:hover {
  background-color: #f3f4f6;
  padding-left: 12px; /* ขยับนิดนึงให้ดูมีลูกเล่น */
}

.lang-arrow.open {
  transform: rotate(180deg);
}

.lang-option.active {
  background: #f0f7ff;
  color: var(--tdk-blue);
  font-weight: 500;
}

.lang-option-flag {
  font-size: 20px;
  min-width: 24px;
}

.lang-option-text {
  font-size: 14px;
  font-weight: 500;
}

/* Responsive Styles */
@media (max-width: 640px) {
  .language-switcher {
    top: 15px;
    right: 15px;
  }
  
  .lang-current {
    padding: 8px 14px;
    font-size: 16px;
    min-width: 65px;
  }
  
  .lang-dropdown-menu {
    min-width: 130px;
  }
  
  .lang-option {
    padding: 10px 14px;
  }
  
  .lang-option-text {
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .language-switcher {
    top: 12px;
    right: 12px;
  }
  
  .lang-current {
    padding: 7px 12px;
    font-size: 15px;
    min-width: 60px;
  }
  
  .lang-dropdown-menu {
    min-width: 120px;
  }
  
  .lang-option-flag {
    font-size: 18px;
  }
}

/* ปิด dropdown เมื่อคลิกข้างนอก */
.use-effect-close-dropdown {
  /* เพิ่ม useEffect สำหรับปิด dropdown เมื่อคลิกข้างนอก */
  /* ให้เพิ่มโค้ดใน useEffect หลักของคุณ */
}
        
        .brand-header { 
          text-align: center; 
          margin: 20px 0 30px; 
          max-width: 100%;
          padding: 0 15px;
        }
        .logo-text { 
          font-size: clamp(32px, 6vw, 42px); 
          font-weight: 800; 
          color: var(--tdk-blue); 
          letter-spacing: -1px; 
          line-height: 1.1;
          word-wrap: break-word;
        }
        .site-badge { 
          background: var(--tdk-blue); 
          color: white; 
          padding: 6px 16px; 
          border-radius: 20px; 
          font-size: clamp(12px, 3vw, 14px); 
          display: inline-block; 
          margin-top: 12px;
          max-width: 100%;
          word-wrap: break-word;
        }
        .card { 
          width: 100%; 
          max-width: 500px; 
          background: white; 
          border-radius: 30px; 
          box-shadow: var(--card-shadow); 
          overflow: hidden; 
          transition: 0.3s;
          margin: 0 auto;
        }
        .card-body { 
          padding: clamp(24px, 5vw, 32px); 
        }
        .camera-container { 
          position: relative; 
          background: #000; 
          border-radius: 20px; 
          overflow: hidden; 
          aspect-ratio: 4/3; 
          border: 3px solid #e2e8f0; 
        }
        .camera-container.is-idle {
          background: linear-gradient(135deg, #0f172a, #1f2937);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        video, .snapshot { 
          width: 100%; 
          height: 100%; 
          object-fit: cover; 
        }
        .camera-placeholder {
          color: white;
          text-align: center;
          padding: 28px;
        }
        .camera-placeholder-icon {
          width: 68px;
          height: 68px;
          border-radius: 999px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.22);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          font-size: 30px;
        }
        .camera-placeholder-title {
          font-size: clamp(18px, 4vw, 22px);
          font-weight: 700;
          margin-bottom: 8px;
        }
        .camera-placeholder-text {
          font-size: clamp(13px, 3vw, 14px);
          color: rgba(255,255,255,0.72);
          line-height: 1.6;
          margin: 0;
        }
        .id-card-overlay { 
          position: absolute; 
          inset: 0; 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          justify-content: center; 
          pointer-events: none; 
        }
        .guide-box { 
          width: 84%; 
          aspect-ratio: 1.586 / 1;
          position: relative;
          border: 1px solid rgba(255,255,255,0.42); 
          border-radius: 14px; 
          background: rgba(255,255,255,0.04); 
          box-shadow: 0 0 0 999px rgba(0,0,0,0.34);
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }
        .guide-box.status-holding {
          border-color: #fbbf24;
          background: rgba(251,191,36,0.08);
          box-shadow: 0 0 0 999px rgba(0,0,0,0.34), 0 0 28px rgba(251,191,36,0.45);
        }
        .guide-box.status-ready {
          border-color: #22c55e;
          background: rgba(34,197,94,0.08);
          box-shadow: 0 0 0 999px rgba(0,0,0,0.28), 0 0 30px rgba(34,197,94,0.55);
        }
        .guide-corner {
          position: absolute;
          width: 30px;
          height: 30px;
          border-color: #ffffff;
          border-style: solid;
          transition: border-color 0.2s ease;
        }
        .guide-box.status-holding .guide-corner {
          border-color: #fbbf24;
        }
        .guide-box.status-ready .guide-corner {
          border-color: #22c55e;
        }
        .guide-corner.top-left {
          top: -3px;
          left: -3px;
          border-width: 4px 0 0 4px;
          border-top-left-radius: 14px;
        }
        .guide-corner.top-right {
          top: -3px;
          right: -3px;
          border-width: 4px 4px 0 0;
          border-top-right-radius: 14px;
        }
        .guide-corner.bottom-left {
          bottom: -3px;
          left: -3px;
          border-width: 0 0 4px 4px;
          border-bottom-left-radius: 14px;
        }
        .guide-corner.bottom-right {
          right: -3px;
          bottom: -3px;
          border-width: 0 4px 4px 0;
          border-bottom-right-radius: 14px;
        }
        .camera-status-pill {
          position: absolute;
          left: 50%;
          bottom: 18px;
          transform: translateX(-50%);
          color: white;
          background: rgba(0, 0, 0, 0.62);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 999px;
          padding: 8px 14px;
          font-size: clamp(12px, 3vw, 14px);
          font-weight: 600;
          backdrop-filter: blur(8px);
          white-space: nowrap;
        }
        .camera-status-pill.status-holding {
          background: rgba(146, 64, 14, 0.82);
          border-color: rgba(251,191,36,0.55);
        }
        .camera-status-pill.status-ready {
          background: rgba(22, 101, 52, 0.86);
          border-color: rgba(34,197,94,0.7);
        }
        .camera-help {
          border-radius: 16px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #475569;
          font-size: clamp(13px, 3vw, 14px);
          line-height: 1.55;
          padding: 12px 14px;
          margin: 16px 0 0;
        }
        .camera-error {
          border-color: #fecdd3;
          background: #fff1f2;
          color: #9f1239;
        }
        .camera-actions {
          display: grid;
          gap: 12px;
          margin-top: 24px;
        }
        .btn-secondary {
          background: #eef2ff;
          color: var(--tdk-blue);
        }
        .btn-secondary:hover {
          background: #e0e7ff;
          transform: translateY(-2px);
        }
        .hidden-camera-input {
          position: fixed;
          left: -9999px;
          opacity: 0;
        }
        .input-group { 
          margin-bottom: 20px; 
        }
        label { 
          display: block; 
          font-weight: 500; 
          margin-bottom: 8px; 
          color: #4a5568; 
          font-size: clamp(14px, 3vw, 15px); 
        }
        input, select { 
          width: 100%; 
          padding: 14px 18px; 
          border: 2px solid #edf2f7; 
          border-radius: 15px; 
          font-size: clamp(15px, 3vw, 16px); 
          font-family: inherit; 
          transition: all 0.2s; 
          box-sizing: border-box;
          background: white;
        }
        input:focus, select:focus { 
          border-color: var(--tdk-blue); 
          outline: none; 
          background: #f8fbff; 
        }
        .btn-action { 
          width: 100%; 
          padding: 18px; 
          border-radius: 18px; 
          font-size: clamp(16px, 3.5vw, 18px); 
          font-weight: 600; 
          border: none; 
          cursor: pointer; 
          transition: 0.2s; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          gap: 10px;
          min-height: 60px;
        }
        .btn-tdk { 
          background: var(--tdk-blue); 
          color: white; 
        }
        .btn-tdk:hover { 
          background: var(--tdk-blue-light); 
          transform: translateY(-2px); 
        }
        .btn-tdk:active {
          transform: translateY(0);
        }
        .btn-ghost { 
          background: none; 
          color: #718096; 
          text-decoration: underline; 
          margin-top: 10px; 
          font-size: clamp(13px, 3vw, 14px); 
          padding: 12px;
          min-height: auto;
        }
        .btn-ghost:hover {
          color: var(--tdk-blue);
        }
        .steps { 
          display: flex; 
          justify-content: center; 
          gap: 8px; 
          margin-bottom: 25px; 
        }
        .privacy-header {
          text-align: center;
          margin-bottom: 22px;
          animation: privacyRise .55s cubic-bezier(.2,.8,.2,1) both;
        }
        .privacy-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #0755bc;
          background: #eaf3ff;
          border: 1px solid #cfe3ff;
          border-radius: 999px;
          padding: 7px 12px;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 12px;
        }
        .privacy-eyebrow::before {
          content: "";
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #16a34a;
          box-shadow: 0 0 0 4px rgba(22,163,74,.12);
        }
        .privacy-header h2 {
          margin: 0;
          font-size: clamp(22px, 4.5vw, 30px);
          line-height: 1.25;
          letter-spacing: -.02em;
        }
        .privacy-header p {
          color: #64748b;
          margin: 9px 0 0;
          line-height: 1.55;
        }
        .privacy-card { max-width: 650px; }
        .privacy-intro {
          padding: 17px 18px;
          margin-bottom: 14px;
          color: #334155;
          background: #f8fafc;
          border-left: 3px solid var(--tdk-blue);
          border-radius: 4px 12px 12px 4px;
          line-height: 1.6;
          animation: privacyRise .55s .08s cubic-bezier(.2,.8,.2,1) both;
        }
        .privacy-intro p { margin: 0; }
        .privacy-quick-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 14px;
        }
        .privacy-quick-item {
          min-height: 82px;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 15px 12px;
          text-align: center;
          color: #334155;
          background: #fff;
          border: 1px solid #dfe5ec;
          border-top: 3px solid #cbd5e1;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          line-height: 1.35;
          animation: privacyPop .45s cubic-bezier(.2,.8,.2,1) both;
        }
        .privacy-quick-item:first-child { border-top-color: var(--tdk-blue); }
        .privacy-quick-item:nth-child(1) { animation-delay: .14s; }
        .privacy-quick-item:nth-child(2) { animation-delay: .20s; }
        .privacy-quick-item:nth-child(3) { animation-delay: .26s; }
        .privacy-warning {
          background: #fffaf0;
          border: 1px solid #efd2a2;
          border-radius: 10px;
          padding: 15px 17px;
          margin-bottom: 14px;
          color: #5f4630;
          animation: privacyRise .5s .3s cubic-bezier(.2,.8,.2,1) both;
        }
        .privacy-warning h3 { margin: 0 0 5px; color: #69461f; font-size: 14px; }
        .privacy-warning p { margin: 0; font-size: 13px; line-height: 1.55; }
        .privacy-notice {
          padding: 15px;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          background: #f8fafc;
          color: #334155;
          line-height: 1.65;
          animation: privacyRise .5s .34s cubic-bezier(.2,.8,.2,1) both;
        }
        .privacy-controller {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 0 2px 12px;
          margin-bottom: 10px;
          border-bottom: 1px solid #e2e8f0;
        }
        .privacy-controller-label { color: #64748b; font-size: 12px; }
        .privacy-controller-name { color: #172554; font-weight: 600; }
        .privacy-controller-mark {
          flex: 0 0 auto;
          width: 32px;
          height: 2px;
          background: var(--tdk-blue);
        }
        .privacy-notice-title { margin: 0; color: #172554; font-size: 15px; }
        .privacy-detail {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          margin-top: 8px;
          overflow: hidden;
          transition: border-color .2s, box-shadow .2s;
        }
        .privacy-detail[open] {
          border-color: #bfdbfe;
          box-shadow: 0 4px 16px rgba(0,70,173,.07);
        }
        .privacy-detail summary {
          display: flex;
          align-items: center;
          padding: 12px 13px;
          color: #1e3a5f;
          font-weight: 600;
          cursor: pointer;
          list-style: none;
          user-select: none;
        }
        .privacy-detail summary::-webkit-details-marker { display: none; }
        .privacy-detail summary::after {
          content: "+";
          margin-left: auto;
          color: #64748b;
          font-size: 20px;
          font-weight: 300;
          transition: transform .25s;
        }
        .privacy-detail[open] summary::after { transform: rotate(45deg); }
        .privacy-detail-body {
          padding: 0 14px 14px;
          color: #526174;
          font-size: 13px;
          line-height: 1.65;
          animation: privacyReveal .25s ease-out both;
        }
        .privacy-detail-body p { margin: 0 0 10px; }
        .privacy-detail-body p:last-child { margin-bottom: 0; }
        .privacy-notice-version {
          display: block;
          margin-top: 11px;
          text-align: right;
          color: #94a3b8;
          font-size: 11px;
        }
        .privacy-consent-box {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: white;
          border: 2px solid #dbe4f0;
          border-radius: 16px;
          padding: 16px;
          margin: 16px 0 14px;
          cursor: pointer;
          line-height: 1.55;
          transition: border-color .2s, background .2s, transform .2s, box-shadow .2s;
          animation: privacyRise .5s .4s cubic-bezier(.2,.8,.2,1) both;
        }
        .privacy-consent-box:hover {
          border-color: #93c5fd;
          transform: translateY(-1px);
        }
        .privacy-consent-box.is-checked {
          background: #eff6ff;
          border-color: var(--tdk-blue);
          box-shadow: 0 6px 20px rgba(0,70,173,.10);
        }
        .privacy-consent-box:focus-within { border-color: var(--tdk-blue); }
        .privacy-consent-box input {
          flex: 0 0 auto;
          width: 22px;
          height: 22px;
          margin: 2px 0 0;
          accent-color: var(--tdk-blue);
        }
        .privacy-consent-copy { display: grid; gap: 4px; }
        .privacy-consent-copy small { color: #64748b; font-size: 11px; }
        .privacy-actions {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          animation: privacyRise .5s .46s cubic-bezier(.2,.8,.2,1) both;
        }
        .privacy-actions .btn-action { min-height: 54px; padding: 14px 18px; }
        .privacy-actions .btn-decline { width: auto; min-width: 116px; }
        .privacy-actions .btn-tdk:not(:disabled) {
          background: linear-gradient(135deg, #0046ad, #0878e4);
          box-shadow: 0 10px 24px rgba(0,70,173,.22);
        }
        .btn-action:disabled {
          cursor: not-allowed;
          opacity: .48;
          transform: none;
        }
        .btn-decline {
          background: white;
          color: #334155;
          border: 1.5px solid #94a3b8;
        }
        .privacy-declined {
          text-align: center;
          padding: 32px 8px 12px;
        }
        .privacy-declined-icon {
          display: grid;
          place-items: center;
          width: 68px;
          height: 68px;
          margin: 0 auto 16px;
          border-radius: 50%;
          background: #e2e8f0;
          color: #475569;
          font-size: 32px;
        }
        @keyframes privacyRise {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes privacyPop {
          from { opacity: 0; transform: translateY(10px) scale(.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes privacyReveal {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 520px) {
          .privacy-quick-grid { grid-template-columns: 1fr; gap: 8px; }
          .privacy-quick-item {
            min-height: auto;
            justify-content: flex-start;
            text-align: left;
            padding: 11px 13px;
          }
          .privacy-actions { grid-template-columns: 1fr; }
          .privacy-actions .btn-decline { width: 100%; }
          .privacy-detail-body { padding-left: 14px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .privacy-header, .privacy-intro, .privacy-quick-item,
          .privacy-warning, .privacy-notice, .privacy-consent-box,
          .privacy-actions, .privacy-detail-body { animation: none !important; }
          .privacy-detail summary::after, .privacy-consent-box { transition: none; }
        }
        .step-dot { 
          width: 10px; 
          height: 10px; 
          border-radius: 50%; 
          background: #e2e8f0; 
        }
        .step-dot.active { 
          background: var(--tdk-blue); 
          width: 30px; 
          border-radius: 5px; 
        }
        .success-hero { 
          text-align: center; 
          padding: 20px 0; 
        }
        .check-circle { 
          width: 80px; 
          height: 80px; 
          border-radius: 50%; 
          background: #c6f6d5; 
          color: #2f855a; 
          font-size: 40px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          margin: 0 auto 20px; 
        }
        .fade { 
          animation: fadeIn 0.4s ease-out; 
        }
        @keyframes fadeIn { 
          from { opacity: 0; transform: translateY(10px); } 
          to { opacity: 1; transform: translateY(0); } 
        }

        /* Original PDPA consent layout */
        .privacy-first .privacy-header {
          text-align: center;
          margin-bottom: 20px;
        }
        .privacy-first .privacy-eyebrow {
          display: block;
          padding: 0;
          margin-bottom: 7px;
          color: var(--tdk-blue);
          background: transparent;
          border: 0;
          border-radius: 0;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: .04em;
        }
        .privacy-first .privacy-eyebrow::before { display: none; }
        .privacy-first .privacy-header h2 {
          margin: 0;
          font-size: clamp(20px, 4vw, 26px);
          line-height: 1.35;
        }
        .privacy-first .privacy-header p {
          margin: 8px 0 0;
          color: #64748b;
          line-height: 1.55;
        }
        .privacy-card { max-width: 500px; }
        .privacy-first .privacy-notice {
          max-height: 430px;
          overflow-y: auto;
          padding: 20px;
          border: 1px solid #dbe4f0;
          border-radius: 18px;
          background: #f8fafc;
          color: #334155;
          line-height: 1.65;
          scrollbar-width: thin;
          scrollbar-color: #94a3b8 transparent;
        }
        .privacy-first .privacy-controller {
          display: block;
          padding: 12px 14px;
          margin-bottom: 14px;
          background: white;
          border: 0;
          border-left: 4px solid var(--tdk-blue);
          border-radius: 10px;
        }
        .privacy-first .privacy-controller-label {
          color: #334155;
          font-size: inherit;
          font-weight: 600;
        }
        .privacy-first .privacy-controller-name {
          color: #334155;
          font-weight: 400;
        }
        .privacy-first .privacy-notice > p { margin: 0 0 14px; }
        .privacy-first .privacy-section { margin: 0 0 16px; }
        .privacy-first .privacy-section:last-of-type { margin-bottom: 0; }
        .privacy-first .privacy-section h3 {
          margin: 0 0 4px;
          color: #172554;
          font-size: 15px;
        }
        .privacy-first .privacy-section p { margin: 0; }
        .privacy-first .privacy-warning {
          padding: 12px 14px;
          background: #fff7ed;
          border: 1px solid #fed7aa;
          border-radius: 12px;
        }
        .privacy-first .privacy-consent-box {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin: 18px 0 14px;
          padding: 16px;
          background: white;
          border: 2px solid #dbe4f0;
          border-radius: 16px;
          box-shadow: none;
          cursor: pointer;
          line-height: 1.55;
        }
        .privacy-first .privacy-consent-box:hover { transform: none; }
        .privacy-first .privacy-consent-box.is-checked {
          background: #eff6ff;
          border-color: var(--tdk-blue);
          box-shadow: 0 6px 20px rgba(0,70,173,.10);
        }
        .privacy-first .privacy-consent-copy { display: block; }
        .privacy-first .privacy-consent-copy strong { display: none; }
        .privacy-first .privacy-actions {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }
        .privacy-first .privacy-actions .btn-action {
          width: 100%;
          min-height: 60px;
          border-radius: 18px;
        }
        .privacy-first .privacy-actions .btn-decline {
          width: 100%;
          color: #334155;
          background: white;
          border: 1.5px solid #94a3b8;
        }

        /* Compact consent layout inspired by a familiar corporate form pattern */
        .privacy-mode {
          padding-top: 92px;
          background: #f3f6fa;
        }
        .privacy-mode .brand-header {
          position: fixed;
          inset: 0 0 auto 0;
          z-index: 900;
          width: 100%;
          max-width: none;
          min-height: 64px;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          margin: 0;
          padding: 0 28px;
          background: white;
          border-bottom: 1px solid #e5e7eb;
          box-shadow: 0 1px 4px rgba(15,23,42,.04);
          text-align: left;
        }
        .privacy-mode .brand-header .logo-text {
          font-size: clamp(20px, 3vw, 25px);
          letter-spacing: -.02em;
        }
        .privacy-mode .brand-header .site-badge { display: none; }
        .privacy-mode .language-switcher { top: 10px; right: 22px; }
        .privacy-mode .lang-current {
          min-width: 58px;
          height: 44px;
          padding: 7px 12px;
          border-radius: 999px;
          box-shadow: none;
        }
        .privacy-mode .privacy-card {
          max-width: 720px;
          background: #f4f4f4;
          border-radius: 24px;
          box-shadow: none;
        }
        .privacy-mode .card-body { padding: 28px; }
        .privacy-mode .privacy-header { margin-bottom: 22px; }
        .privacy-mode .privacy-eyebrow { display: none; }
        .privacy-mode .privacy-header h2 {
          max-width: 600px;
          margin: 0 auto;
          color: #101828;
          font-size: clamp(20px, 4vw, 27px);
          line-height: 1.45;
        }
        .privacy-mode .privacy-header p {
          color: #667085;
          font-size: 15px;
        }
        .privacy-mode .privacy-notice {
          height: 330px;
          overflow-y: auto;
          padding: 24px 26px;
          background: #fff;
          border: none;
          border-radius: 20px;
          box-shadow: none;
          scrollbar-width: thin;
          scrollbar-color: #98a2b3 transparent;
        }
        .privacy-mode .privacy-notice::-webkit-scrollbar { width: 6px; }
        .privacy-mode .privacy-notice::-webkit-scrollbar-thumb {
          background: #98a2b3;
          border-radius: 999px;
        }
        .privacy-form-title {
          margin: 0 0 14px;
          color: #101828;
          font-size: 20px;
          line-height: 1.55;
        }
        .privacy-form-intro {
          margin: 0 0 18px;
          color: #667085;
          line-height: 1.75;
        }
        .privacy-form-section {
          margin-top: 18px;
          padding-top: 17px;
          border-top: 1px solid #eaecf0;
        }
        .privacy-form-section h3 {
          margin: 0 0 7px;
          color: #344054;
          font-size: 15px;
        }
        .privacy-form-section p {
          margin: 0;
          color: #667085;
          line-height: 1.7;
        }
        .privacy-more-link {
          display: block;
          width: fit-content;
          margin: 15px auto;
          color: #111827;
          font-size: 14px;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .privacy-mode .privacy-consent-box {
          margin: 0 0 14px;
          padding: 17px 18px;
          background: white;
          border: 1px solid transparent;
          border-radius: 18px;
          box-shadow: none;
        }
        .privacy-mode .privacy-consent-box:hover { transform: none; }
        .privacy-mode .privacy-consent-box.is-checked {
          background: #fff;
          border-color: var(--tdk-blue);
          box-shadow: 0 0 0 3px rgba(0,70,173,.08);
        }
        .privacy-mode .privacy-consent-copy { display: block; }
        .privacy-mode .privacy-consent-copy strong { display: none; }
        .privacy-mode .privacy-actions {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }
        .privacy-mode .privacy-actions .btn-action {
          width: 100%;
          min-height: 50px;
          border-radius: 999px;
          font-size: 16px;
        }
        .privacy-mode .privacy-actions .btn-tdk:not(:disabled) {
          background: var(--tdk-blue);
          box-shadow: none;
        }
        .privacy-mode .privacy-actions .btn-tdk:disabled {
          background: #aeb4bd;
          color: white;
          opacity: 1;
        }
        .privacy-mode .privacy-actions .btn-decline {
          width: 100%;
          border: 1.5px solid #344054;
          color: #101828;
          background: transparent;
        }
        
        /* Responsive Styles */
        @media (max-width: 640px) {
          .app-shell {
            padding: 15px;
            padding-top: 70px;
          }
          .card {
            border-radius: 24px;
          }
          .card-body {
            padding: 24px;
          }
          .language-switcher {
            top: 15px;
            right: 15px;
            padding: 8px;
            border-radius: 16px;
          }
          .lang-btn {
            width: 45px;
            height: 36px;
            font-size: 20px;
            border-radius: 10px;
          }
          .brand-header {
            margin: 10px 0 20px;
          }
          .privacy-mode { padding: 78px 10px 20px; }
          .privacy-mode .brand-header {
            min-height: 58px;
            padding: 0 15px;
          }
          .privacy-mode .language-switcher { top: 8px; right: 12px; }
          .privacy-mode .privacy-card { border-radius: 20px; }
          .privacy-mode .card-body { padding: 18px 14px; }
          .privacy-mode .privacy-notice {
            height: 310px;
            padding: 20px 18px;
            border-radius: 18px;
          }
        }
        
        @media (max-width: 480px) {
          .app-shell {
            padding: 12px;
            padding-top: 65px;
          }
          .card-body {
            padding: 20px;
          }
          .language-switcher {
            top: 10px;
            right: 10px;
          }
          .lang-btn {
            width: 42px;
            height: 34px;
            font-size: 18px;
          }
          input, select {
            padding: 12px 16px;
          }
          .btn-action {
            padding: 16px;
            min-height: 56px;
          }
          .privacy-mode { padding: 72px 8px 18px; }
          .privacy-mode .card-body { padding: 18px 14px; }
          .privacy-mode .language-switcher { top: 7px; right: 10px; }
          .privacy-mode .privacy-header h2 { font-size: 19px; }
          .privacy-mode .privacy-header p { font-size: 14px; }
          .privacy-mode .privacy-notice { height: 290px; }
          .privacy-form-title { font-size: 18px; }
        }
        
        @media (max-width: 360px) {
          .language-switcher {
            flex-direction: column;
            gap: 5px;
          }
          .lang-btn {
            width: 40px;
            height: 32px;
          }
        }
      `}</style>

     {/* Language Switcher - Dropdown with Flag Images */}
<div className="language-switcher fade">
  <div className="lang-dropdown">
    <button 
      className={`lang-current ${isLangOpen ? 'active' : ''}`}
      onClick={() => setIsLangOpen(!isLangOpen)}
      title="เปลี่ยนภาษา / Change Language / 언어 변경"
    >
      <img 
        src={getFlagImage(language)} 
        alt={language}
        className="lang-current-flag"
      />
      {/* ใส่ Class เพื่อหมุนลูกศร */}
      <span className={`lang-arrow ${isLangOpen ? 'rotating' : ''}`}>▼</span>
    </button>
    
    {/* แสดงเมนูพร้อม Animation */}
    {isLangOpen && (
      <div className="lang-dropdown-menu animate-pop-in">
        {[
          { code: 'th', label: 'ไทย' },
          { code: 'en', label: 'English' },
          { code: 'ko', label: '한국어' }
        ].map((lang) => (
          <button 
            key={lang.code}
            className={`lang-option ${language === lang.code ? 'active' : ''}`}
            onClick={() => {
              handleLanguageChange(lang.code);
              setIsLangOpen(false); // ปิดเมนูหลังจากเลือก
            }}
          >
            <img 
              src={getFlagImage(lang.code)} 
              alt={lang.label} 
              className="lang-option-flag" 
            />
            <span className="lang-option-text">{lang.label}</span>
            {language === lang.code && <span className="check-mark">✓</span>}
          </button>
        ))}
      </div>
    )}
  </div>
</div>

      <div className="brand-header fade">
        <div className="logo-text">
          TDK <span style={{ fontWeight: 300 }}>INDUSTRIAL</span>
        </div>
        <div className="site-badge">{t.siteBadge}</div>
      </div>

      <div className={`card ${step === 0 ? "privacy-card" : ""}`}>
        <div className="card-body">
          {step > 0 && (
            <div className="steps" aria-label={`${step} / 3`}>
              <div className={`step-dot ${step === 1 ? "active" : ""}`}></div>
              <div className={`step-dot ${step === 2 ? "active" : ''}`}></div>
              <div className={`step-dot ${step === 3 ? "active" : ''}`}></div>
            </div>
          )}

          {step === 0 && !consentDeclined && (
            <section className="privacy-first fade" aria-labelledby="privacy-title">
              <div className="privacy-header">
                <div className="privacy-eyebrow">{privacy.eyebrow}</div>
                <h2 id="privacy-title">{privacy.title}</h2>
                <p>{privacy.subtitle}</p>
              </div>

              <div className="privacy-notice" tabIndex="0">
                <div className="privacy-controller">
                  <div className="privacy-controller-label">{privacy.controller}</div>
                  <div className="privacy-controller-name">{privacy.controllerValue}</div>
                </div>
                <p>{privacy.intro}</p>

                <div className="privacy-section">
                  <h3>{privacy.dataTitle}</h3>
                  <p>{privacy.dataText}</p>
                </div>
                <div className="privacy-section privacy-warning">
                  <h3>{privacy.minimizeTitle}</h3>
                  <p>{privacy.minimizeText}</p>
                </div>
                <div className="privacy-section">
                  <h3>{privacy.purposeTitle}</h3>
                  <p>{privacy.purposeText}</p>
                </div>
                <div className="privacy-section">
                  <h3>{privacy.sharingTitle}</h3>
                  <p>{privacy.sharingText}</p>
                </div>
                <div className="privacy-section">
                  <h3>{privacy.retentionTitle}</h3>
                  <p>{privacy.retentionText}</p>
                </div>
                <div className="privacy-section">
                  <h3>{privacy.rightsTitle}</h3>
                  <p>{privacy.rightsText}</p>
                </div>
                <div className="privacy-section">
                  <h3>{privacy.contactTitle}</h3>
                  <p>{privacy.contactText}</p>
                </div>
                <div className="privacy-section">
                  <h3>{privacy.consequenceTitle}</h3>
                  <p>{privacy.consequenceText}</p>
                </div>
                <small className="privacy-notice-version">{privacy.noticeVersion}: {PRIVACY_NOTICE_VERSION}</small>
              </div>

              <label className={`privacy-consent-box ${consentChecked ? "is-checked" : ""}`}>
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(event) => setConsentChecked(event.target.checked)}
                />
                <span className="privacy-consent-copy">
                  <strong>{privacy.requiredBadge}</strong>
                  <span>{privacy.confirm}</span>
                </span>
              </label>

              <div className="privacy-actions">
                <button
                  type="button"
                  className="btn-action btn-tdk"
                  disabled={!consentChecked}
                  onClick={handleAcceptConsent}
                >
                  {privacy.accept}
                </button>
                <button
                  type="button"
                  className="btn-action btn-decline"
                  onClick={handleDeclineConsent}
                >
                  {privacy.decline}
                </button>
              </div>
            </section>
          )}

          {step === 0 && consentDeclined && (
            <section className="privacy-declined fade" aria-live="polite">
              <div className="privacy-declined-icon">i</div>
              <h2>{privacy.declinedTitle}</h2>
              <p>{privacy.declinedText}</p>
              <button
                type="button"
                className="btn-action btn-ghost"
                onClick={() => setConsentDeclined(false)}
              >
                {privacy.back}
              </button>
            </section>
          )}

          {step === 1 && (
            <div className="fade">
              <h2 style={{ textAlign: "center", marginTop: 0, fontSize: "clamp(18px, 4vw, 20px)" }}>
                {t.step1Title}
              </h2>
              <br />
              <div className={`camera-container ${!cameraActive && !photoDataUrl ? "is-idle" : ""}`}>
                {photoDataUrl ? (
                  <img src={photoDataUrl} className="snapshot" alt="Captured" />
                ) : cameraActive ? (
                  <>
                    <video ref={videoRef} autoPlay playsInline muted />
                    <div className="id-card-overlay">
                      <div className={`guide-box status-${cardStatus}`}>
                        <span className="guide-corner top-left"></span>
                        <span className="guide-corner top-right"></span>
                        <span className="guide-corner bottom-left"></span>
                        <span className="guide-corner bottom-right"></span>
                      </div>
                    </div>
                    <div className={`camera-status-pill status-${cardStatus}`}>
                      {cardStatus === "ready"
                        ? t.cardLocked
                        : autoCountdown
                          ? `${t.holdStill} ${autoCountdown}`
                        : cameraStatus === "starting"
                          ? t.cameraStarting
                          : cardMessage || t.detectingCard}
                    </div>
                  </>
                ) : (
                  <div className="camera-placeholder">
                    <div className="camera-placeholder-icon">▣</div>
                    <div className="camera-placeholder-title">
                      {prefersNativeCamera ? t.cameraFallback : t.openCamera}
                    </div>
                    <p className="camera-placeholder-text">
                      {prefersNativeCamera ? t.step1Guide : t.autoCaptureHint}
                    </p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                className="hidden-camera-input"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCameraFile}
              />
              <br />
              <p style={{
                textAlign: "center",
                color: "#718096",
                fontSize: "clamp(13px, 3vw, 14px)",
                marginBottom: 20,
                lineHeight: 1.5,
                padding: "0 10px"
              }}>
                {t.step1Guide}
              </p>

              {cameraError && (
                <div className="camera-help camera-error">
                  <strong>{t.cameraUnsupportedTitle}</strong><br />
                  {cameraError}
                </div>
              )}

              <div className="camera-actions">
                {photoDataUrl ? (
                  <>
                    <button
                      className="btn-action btn-tdk"
                      onClick={() => setStep(2)}
                    >
                      {t.usePhoto}
                    </button>
                    <button
                      className="btn-action btn-ghost"
                      onClick={prefersNativeCamera ? openNativeCamera : startCamera}
                    >
                      {t.retakePhoto}
                    </button>
                  </>
                ) : cameraActive ? (
                  <button className="btn-action btn-tdk" onClick={takeSnapshot} disabled={cameraStatus !== "ready"}>
                    {cameraStatus === "ready" ? t.takePhoto : t.cameraStarting}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn-action btn-tdk"
                      onClick={startCamera}
                      disabled={cameraStatus === "starting"}
                    >
                      {cameraStatus === "starting" ? t.cameraStarting : t.openCamera}
                    </button>
                    <button
                      type="button"
                      className="btn-action btn-secondary"
                      onClick={openNativeCamera}
                    >
                      {t.cameraFallback}
                    </button>
                    <button
                      type="button"
                      className="btn-action btn-ghost"
                      onClick={openInChrome}
                    >
                      {t.openChrome}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="fade">
              <h2 style={{ textAlign: "center", marginTop: 0, fontSize: "clamp(18px, 4vw, 20px)" }}>
                {t.step2Title}
              </h2>

              <div className="input-group">
                <label>{t.fullName}</label>
                <input
                  required
                  list="visitor-names"
                  placeholder={t.fullNamePlaceholder}
                  value={form.full_name}
                  onChange={handleNameChange}
                  autoComplete="off"
                />
                <datalist id="visitor-names">
                  {historyList.map((h, i) => (
                    <option key={i} value={h.full_name} />
                  ))}
                </datalist>
              </div>

              <div className="input-group">
                <label>{t.company}</label>
                <input
                  required
                  placeholder={t.companyPlaceholder}
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label>{t.phone}</label>
                <input
                  required
                  type="tel"
                  placeholder={t.phonePlaceholder}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label>{t.contactPerson}</label>
                <input
                  required
                  placeholder={t.contactPersonPlaceholder}
                  value={form.contact_person}
                  onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label>{t.purpose}</label>
                <select
                  required
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  style={{ color: form.purpose === "" ? "#9ca3af" : "#111827" }}
                >
                  <option value="" disabled hidden>
                    {t.purposePlaceholder}
                  </option>
                  {t.purposeOptions.map((option, index) => (
                    <option key={index} value={option} style={{ color: "#111827" }}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              {form.purpose.includes("อื่น") || form.purpose.includes("Other") || form.purpose.includes("기타") ? (
                <div className="input-group fade">
                  <label>{t.otherPurpose}</label>
                  <input
                    required
                    placeholder={t.otherPurposePlaceholder}
                    value={form.other_purpose}
                    onChange={(e) => setForm({ ...form, other_purpose: e.target.value })}
                  />
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="btn-action btn-tdk"
                style={{ marginTop: 10 }}
              >
                {loading ? t.loadingText : t.submitButton}
              </button>
              <button
                type="button"
                className="btn-action btn-ghost"
                onClick={handleEditPhoto}
              >
                {t.editPhoto}
              </button>
            </form>
          )}

          {step === 3 && (
            <div className="success-hero fade">
              <div className="check-circle">✓</div>
              <h2 style={{ color: "var(--tdk-blue)", marginBottom: 10 }}>
                {t.successTitle}
              </h2>
              <p style={{ color: "#718096", lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: t.successMessage }} />
              <button
                className="btn-action btn-tdk"
                style={{ marginTop: 40 }}
                onClick={resetForm}
              >
                {t.finishButton}
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{
        marginTop: 40,
        textAlign: "center",
        opacity: 0.3,
        fontSize: "clamp(10px, 2.5vw, 12px)",
        padding: "0 15px"
      }}>
        {t.footerText}
      </div>
    </div>
  );
}
