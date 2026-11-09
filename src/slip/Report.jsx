import {
  Search,
  Calendar,
  Users,
  Clock,
  CheckCircle,
  Printer,
  Trash2,
  Download,
  Home,
  Edit,
  Building2,
  UserCircle,
  RotateCcw,
  Loader2,
  Briefcase,
  ChevronRight,
  X,
  Camera,
  Maximize2,
  Activity,
  AlertTriangle,
  BarChart3,
  ClipboardList,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Sun,
  Moon,
  TrendingUp,
  UserCheck,
  Eye
} from "lucide-react";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { adminApi, dataMode, visitorsApi } from "../apiClient";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { useNavigate } from "react-router-dom";
import bgImage from "../img/g.jpg";

const ORG = import.meta.env.VITE_ORG_NAME || "TDK INDUSTRIAL";
const THAI_TIME_ZONE = "Asia/Bangkok";
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) =>
  String(hour).padStart(2, "0")
);
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, minute) =>
  String(minute).padStart(2, "0")
);

let reportAuthenticationPromise;

function ensureReportAuthentication() {
  if (!reportAuthenticationPromise) {
    reportAuthenticationPromise = (async () => {
      try {
        await adminApi.me();
      } catch {
        const username = prompt(dataMode === "supabase" ? "Admin email:" : "Username:");
        const password = prompt("Password:");
        if (!username || !password) throw new Error("cancelled");
        await adminApi.login(username, password);
      }
    })().catch((error) => {
      reportAuthenticationPromise = undefined;
      throw error;
    });
  }

  return reportAuthenticationPromise;
}

// --- Helpers ---
const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  timeZone: THAI_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const thailandInputFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: THAI_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function toThailandDateTimeParts(isoString) {
  if (!isoString) return { date: "", hour: "00", minute: "00" };

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return { date: "", hour: "00", minute: "00" };
  }

  const parts = Object.fromEntries(
    thailandInputFormatter
      .formatToParts(date)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value])
  );

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: parts.hour,
    minute: parts.minute,
  };
}

function thailandDateTimeToIso(date, hour, minute) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return null;
  if (!/^(?:[01]\d|2[0-3])$/.test(hour || "")) return null;
  if (!/^[0-5]\d$/.test(minute || "")) return null;

  const value = new Date(`${date}T${hour}:${minute}:00+07:00`);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

const PURPOSE_TH = {
  meeting: "ประชุมงาน",
  delivery: "ส่งของ / รับของ", // 👈 ขาดตัวนี้
  maintenance: "ซ่อมบำรุง / ติดตั้ง",
  it_support: "แก้ไขปัญหา IT",
  system_install: "ติดตั้งระบบ / โปรแกรม",
  training: "อบรม / สอนงาน",
  audit: "ตรวจสอบ / Audit",
  inspection: "ตรวจงาน / ตรวจรับ",
  sales: "นำเสนอขาย / เสนอราคา",
  purchase: "ติดต่อจัดซื้อ",
  hr: "ติดต่อฝ่ายบุคคล",
  management: "ติดต่อผู้บริหาร",
  visit: "เข้าเยี่ยมชมบริษัท",
  emergency: "กรณีฉุกเฉิน",
  interview: "สมัครงาน / สัมภาษณ์",
  billing: "วางบิล / รับเช็ค",
  other: "อื่น ๆ",
};

const PURPOSES = [
  { value: "meeting", label: "ประชุมงาน" },
  { value: "delivery", label: "ส่งของ / รับของ" },
  { value: "maintenance", label: "ซ่อมบำรุง / ติดตั้ง" },
  { value: "it_support", label: "แก้ไขปัญหา IT" },
  { value: "system_install", label: "ติดตั้งระบบ / โปรแกรม" },
  { value: "training", label: "อบรม / สอนงาน" },
  { value: "audit", label: "ตรวจสอบ / Audit" },
  { value: "inspection", label: "ตรวจงาน / ตรวจรับ" },
  { value: "sales", label: "นำเสนอขาย / เสนอราคา" },
  { value: "purchase", label: "ติดต่อจัดซื้อ" },
  { value: "hr", label: "ติดต่อฝ่ายบุคคล" },
  { value: "management", label: "ติดต่อผู้บริหาร" },
  { value: "visit", label: "เข้าเยี่ยมชมบริษัท" },
  { value: "emergency", label: "กรณีฉุกเฉิน" },
  { value: "interview", label: "สมัครงาน / สัมภาษณ์" },
  { value: "billing", label: "วางบิล / รับเช็ค" },
  { value: "other", label: "อื่น ๆ" },
];

const PURPOSE_ALIASES = {
  meeting: ["meeting", "ประชุม"],
  delivery: ["delivery", "ส่งสินค้า", "รับสินค้า", "ส่งของ", "รับของ"],
  maintenance: ["maintenance", "ซ่อมบำรุง", "ติดตั้ง"],
  it_support: ["it support", "ปัญหา it"],
  system_install: ["system install", "ติดตั้งระบบ", "โปรแกรม"],
  training: ["training", "อบรม", "สอนงาน"],
  audit: ["audit", "ตรวจสอบ"],
  inspection: ["inspection", "ตรวจงาน", "ตรวจรับ"],
  sales: ["sales", "นำเสนอขาย", "เสนอราคา"],
  purchase: ["purchase", "จัดซื้อ"],
  hr: ["human resource", "ฝ่ายบุคคล"],
  management: ["management", "ผู้บริหาร"],
  visit: ["visit", "เยี่ยมชม"],
  emergency: ["emergency", "ฉุกเฉิน"],
  interview: ["interview", "สมัครงาน", "สัมภาษณ์"],
  billing: ["billing", "วางบิล", "รับเช็ค"],
};

function parsePurpose(purpose, otherPurpose = "") {
  const rawPurpose = String(purpose || "").trim();
  const rawOtherPurpose = String(otherPurpose || "").trim();
  const normalized = rawPurpose.toLowerCase();

  if (!rawPurpose) return { key: "", other: rawOtherPurpose };
  if (PURPOSE_TH[rawPurpose]) {
    return {
      key: rawPurpose,
      other: rawPurpose === "other" ? rawOtherPurpose : "",
    };
  }

  if (
    normalized === "other" ||
    normalized.includes("(other)") ||
    rawPurpose.startsWith("อื่น")
  ) {
    const detailFromPurpose = rawPurpose.includes(":")
      ? rawPurpose.split(":").slice(1).join(":").trim()
      : "";
    return { key: "other", other: rawOtherPurpose || detailFromPurpose };
  }

  const exactThai = Object.entries(PURPOSE_TH).find(
    ([, thaiLabel]) => thaiLabel === rawPurpose
  );
  if (exactThai) return { key: exactThai[0], other: "" };

  const alias = Object.entries(PURPOSE_ALIASES).find(([, keywords]) =>
    keywords.some((keyword) => normalized.includes(keyword.toLowerCase()))
  );
  if (alias) return { key: alias[0], other: "" };

  return { key: "other", other: rawOtherPurpose || rawPurpose };
}

function buildStoredPurpose(purpose, otherPurpose) {
  if (purpose !== "other") return purpose;
  const detail = String(otherPurpose || "").trim();
  return detail ? `อื่น ๆ: ${detail}` : "other";
}

const translatePurpose = (purpose, other_purpose) => {
  const parsed = parsePurpose(purpose, other_purpose);
  if (parsed.key === "other") return parsed.other || "อื่น ๆ";
  return PURPOSE_TH[parsed.key] || purpose;
};

function formatDateTime(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? "" : dateFormatter.format(date);
}

function calculateDuration(checkin, checkout) {
  if (!checkin) return "—";
  const start = new Date(checkin);
  const end = checkout ? new Date(checkout) : new Date();
  const diffMins = Math.floor((end - start) / 60000);
  if (diffMins < 60) return `${diffMins} นาที`;
  return `${Math.floor(diffMins / 60)} ชม. ${diffMins % 60} นาที`;
}

function calculateDurationMinutes(checkin, checkout) {
  if (!checkin) return 0;
  const start = new Date(checkin);
  const end = checkout ? new Date(checkout) : new Date();
  return Math.max(0, Math.floor((end - start) / 60000));
}

function getVisitorPhoto(visitor) {
  return visitor?.visitor_image || visitor?.photo_url || "";
}

export default function Report() {
  const [visitors, setVisitors] = useState([]);
  const [checkoutQueue, setCheckoutQueue] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchStart, setSearchStart] = useState("");
  const [searchEnd, setSearchEnd] = useState("");
  const [searchName, setSearchName] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [activeFilter, setActiveFilter] = useState("TODAY");
  const [summary, setSummary] = useState({
    today: 0,
    staying: 0,
    outToday: 0,
    all: 0,
  });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(
    () => localStorage.getItem("report-theme") === "dark"
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const toggleTheme = () => {
    setIsDarkMode((current) => {
      const next = !current;
      localStorage.setItem("report-theme", next ? "dark" : "light");
      return next;
    });
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed((current) => !current);
  };

  const getFilterStatusText = () => {
    switch (activeFilter) {
      case "TODAY":
        return "รายการประจำวันนี้";
      case "STAYING":
        return "ผู้ที่ยังอยู่ในพื้นที่";
      case "CHECKOUT_TODAY":
        return "รายการเช็คเอาท์วันนี้";
      case "CUSTOM":
        return "ผลการค้นหาแบบกำหนดเอง";
      default:
        return "รายการทั้งหมด";
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === visitors.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(visitors.map((v) => v.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const navigate = useNavigate();
  const printedIdsRef = useRef(new Set());

  // --- Core Loading Logic ---
  const loadVisitors = useCallback(
    async (filterType = activeFilter) => {
      setIsLoading(true);
      try {
        const data = await visitorsApi.list({
          filter: filterType,
          start: filterType === "CUSTOM" && searchStart ? `${searchStart}T00:00:00+07:00` : undefined,
          end: filterType === "CUSTOM" && searchEnd ? `${searchEnd}T23:59:59+07:00` : undefined,
          search: filterType === "CUSTOM" ? searchName.replaceAll(",", " ").trim() : undefined,
          orderBy: "id",
          order: "desc",
        });
        setVisitors(data || []);
      } catch (error) {
        console.error("Unable to load visitors", error);
      }
      setTimeout(() => setIsLoading(false), 200);
    },
    [activeFilter, searchStart, searchEnd, searchName]
  );

  const loadCheckoutQueue = useCallback(async () => {
    try {
      const data = await visitorsApi.list({
        staying: true,
        orderBy: "checkin_time",
        order: "asc",
        limit: 6,
      });
      setCheckoutQueue(data || []);
    } catch (error) {
      console.error("Unable to load checkout queue", error);
    }
  }, []);

  const handleViewImage = (imgSrc) => {
    MySwal.fire({
      imageUrl: imgSrc,
      imageAlt: 'Company Logo',
      showConfirmButton: false,
      showCloseButton: true,
      background: isDarkMode ? '#1e293b' : '#fff',
      customClass: {
        image: 'rounded-3xl shadow-2xl'
      }
    });
  };
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result;

        // โลโก้ตัวอย่างยังแสดงเฉพาะในเบราว์เซอร์ หากต้องการบันทึกถาวรให้เพิ่ม settings API

        Toast.fire({
          icon: 'success',
          title: 'อัปเดตรูปภาพเรียบร้อยแล้ว'
        });
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const loadSummary = async () => {
    try {
      setSummary(await visitorsApi.summary());
    } catch (error) {
      console.error("Unable to load summary", error);
    }
  };

  useEffect(() => {
    let active = true;
    const authenticate = async () => {
      try {
        await ensureReportAuthentication();
      } catch {
        if (active) {
          alert("❌ ไม่อนุญาตให้เข้าถึง");
          navigate("/");
        }
        return;
      }

      if (!active) return;
      setIsAuthenticated(true);
      setIsLoading(true);

      try {
        const [initialVisitors, initialSummary, initialQueue] = await Promise.all([
          visitorsApi.list({ filter: "TODAY", orderBy: "id", order: "desc" }),
          visitorsApi.summary(),
          visitorsApi.list({
            staying: true,
            orderBy: "checkin_time",
            order: "asc",
            limit: 6,
          }),
        ]);

        if (!active) return;
        setVisitors(initialVisitors || []);
        setSummary(initialSummary);
        setCheckoutQueue(initialQueue || []);
      } catch (error) {
        console.error("Unable to load the report", error);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    authenticate();
    return () => { active = false; };
  }, [navigate]);

  // ค้นหาส่วนนี้ในไฟล์ Report.jsx
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const unsubscribe = visitorsApi.subscribe((payload) => {
          loadSummary();
          loadVisitors(activeFilter);
          loadCheckoutQueue();

          // --- ส่วนที่ต้องมั่นใจว่ามี เพื่อให้หน้าสลิปเด้งขึ้นมาอัตโนมัติ ---
          // ใน Report.jsx
          if (payload.eventType === "INSERT") {
            const newId = payload.new.id;
            if (!printedIdsRef.current.has(newId)) {
              printedIdsRef.current.add(newId);
              window.open(`/print/${newId}`, "_blank"); // ต้องอนุญาต Pop-up ในเบราว์เซอร์ด้วย
            }
          }
        });
    return unsubscribe;
  }, [isAuthenticated, activeFilter, loadVisitors, loadCheckoutQueue]);

  useEffect(() => {
    if (isSidebarCollapsed) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsSidebarCollapsed(true);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const keyword = searchName.replaceAll(",", " ").trim();

    if (keyword.length < 2) {
      setSearchSuggestions([]);
      setIsLoadingSuggestions(false);
      return undefined;
    }

    let isCancelled = false;
    setIsLoadingSuggestions(true);

    const timer = setTimeout(async () => {
      let data = [];
      let error = null;
      try {
        data = await visitorsApi.suggestions(keyword, 12);
      } catch (caught) {
        error = caught;
      }

      if (isCancelled) return;

      if (error) {
        setSearchSuggestions([]);
      } else {
        const uniqueSuggestions = (data || []).filter(
          (item, index, items) =>
            index ===
            items.findIndex(
              (candidate) =>
                candidate.full_name === item.full_name &&
                candidate.company === item.company &&
                candidate.contact_person === item.contact_person &&
                candidate.phone === item.phone
            )
        );
        setSearchSuggestions(uniqueSuggestions.slice(0, 8));
      }

      setIsLoadingSuggestions(false);
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [searchName]);

  const handleCheckOut = async (id) => {
    await visitorsApi.update(id, { checkout_time: new Date().toISOString() });
    loadSummary();
    loadVisitors(activeFilter);
    loadCheckoutQueue();
  };

  const deleteSelected = async () => {
    if (confirm(`ลบรายการที่เลือก ${selectedIds.length} รายการ?`)) {
      await visitorsApi.removeMany(selectedIds);
      setSelectedIds([]);
      loadSummary();
      loadVisitors(activeFilter);
      loadCheckoutQueue();
    }
  };

  const saveEdit = async () => {
    setEditError("");

    const fullName = String(editForm.full_name || "").trim();
    const checkinTime = thailandDateTimeToIso(
      editForm.checkin_date,
      editForm.checkin_hour,
      editForm.checkin_minute
    );
    const checkoutTime = editForm.has_checkout
      ? thailandDateTimeToIso(
        editForm.checkout_date,
        editForm.checkout_hour,
        editForm.checkout_minute
      )
      : null;

    if (!fullName) {
      setEditError("กรุณากรอกชื่อ-นามสกุล");
      return;
    }
    if (!checkinTime) {
      setEditError("กรุณาระบุวันที่และเวลาเข้าให้ถูกต้อง");
      return;
    }
    if (editForm.has_checkout && !checkoutTime) {
      setEditError("กรุณาระบุวันที่และเวลาออกให้ถูกต้อง");
      return;
    }
    if (checkoutTime && new Date(checkoutTime) < new Date(checkinTime)) {
      setEditError("เวลาออกต้องไม่น้อยกว่าเวลาเข้า");
      return;
    }
    if (editForm.purpose === "other" && !String(editForm.other_purpose || "").trim()) {
      setEditError("กรุณาระบุวัตถุประสงค์อื่น ๆ");
      return;
    }

    setIsSavingEdit(true);
    try {
      const data = await visitorsApi.update(editingId, {
          full_name: fullName,
          company: String(editForm.company || "").trim(),
          phone: String(editForm.phone || "").trim(),
          contact_person: String(editForm.contact_person || "").trim(),
          purpose: buildStoredPurpose(
            editForm.purpose,
            editForm.other_purpose
          ),
          checkin_time: checkinTime,
          checkout_time: checkoutTime,
        });

      setVisitors((current) =>
        current.map((visitor) => (visitor.id === editingId ? data : visitor))
      );
      setEditingId(null);
      await Promise.all([
        loadSummary(),
        loadVisitors(activeFilter),
        loadCheckoutQueue(),
      ]);
    } catch (error) {
      setEditError(`บันทึกไม่สำเร็จ: ${error.message || "กรุณาลองใหม่"}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const exportToExcel = async (ids) => {
    const rows = ids.length
      ? visitors.filter((v) => ids.includes(v.id))
      : visitors;

    if (!rows.length) return alert("กรุณาเลือกรายการก่อน");

    const wb = new ExcelJS.Workbook();

    const ws = wb.addWorksheet("Visitors Report");

    // --- Define Columns (เพิ่ม Duration และ ปรับหัวข้อ) ---

    ws.columns = [
      { header: "ID", key: "id", width: 10 },

      { header: "ชื่อ-นามสกุล", key: "full_name", width: 25 },

      { header: "บริษัท/หน่วยงาน", key: "company", width: 25 },

      { header: "บุคคลที่มาติดต่อ", key: "contact_person", width: 20 },

      { header: "วัตถุประสงค์", key: "purpose", width: 25 },

      { header: "ทะเบียนรถ", key: "vehicle_plate", width: 15 },

      { header: "เวลาเข้า", key: "checkin_time", width: 22 },

      { header: "เวลาออก", key: "checkout_time", width: 22 },

      { header: "ระยะเวลาที่พักอยู่", key: "duration", width: 20 }, // คอลัมน์ที่เพิ่มใหม่

      { header: "รูปถ่าย", key: "photo", width: 18 },
    ];

    // --- Header Style ---

    const headerRow = ws.getRow(1);

    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };

    headerRow.alignment = { vertical: "middle", horizontal: "center" };

    headerRow.fill = {
      type: "pattern",

      pattern: "solid",

      fgColor: { argb: "FF1E3A8A" }, // สีกรมท่า
    };

    headerRow.height = 30;

    ws.views = [{ state: "frozen", ySplit: 1 }]; // ตรึงหัวตาราง

    ws.autoFilter = `A1:I1`; // เพิ่มปุ่ม Filter (ไม่รวมคอลัมน์รูป)

    // --- Add Data Rows ---

    const PHOTO_COL = "J";

    for (const v of rows) {
      const row = ws.addRow({
        id: String(v.id).padStart(5, "0"),

        full_name: v.full_name || "",

        company: v.company || "ทั่วไป",

        contact_person: v.contact_person || "-",

        purpose: translatePurpose(v.purpose, v.other_purpose),

        vehicle_plate: v.vehicle_plate || "-",

        checkin_time: formatDateTime(v.checkin_time),

        checkout_time: v.checkout_time
          ? formatDateTime(v.checkout_time)
          : "ยังไม่ออก",

        duration: calculateDuration(v.checkin_time, v.checkout_time), // เรียกใช้ helper เดิม

        photo: "",
      });

      row.height = 60; // เพิ่มความสูงเพื่อให้เห็นรูปชัดขึ้น

      // จัดรูปแบบแถวสลับสี

      if (row.number % 2 === 0) {
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF1F5F9" },
        };
      }

      // จัดวางตำแหน่งและเส้นขอบ

      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFCBD5E1" } },

          left: { style: "thin", color: { argb: "FFCBD5E1" } },

          bottom: { style: "thin", color: { argb: "FFCBD5E1" } },

          right: { style: "thin", color: { argb: "FFCBD5E1" } },
        };

        cell.alignment = {
          vertical: "middle",
          horizontal: "center",
          wrapText: true,
        };
      });

      // --- ใส่รูปจาก Local API หรือ Image URL ---

      const imageSource = v.visitor_image || v.photo_url; // รองรับทั้ง base64 และ url

      if (imageSource) {
        try {
          let buf;

          let ext = "png";

          if (imageSource.startsWith("data:image")) {
            // ถ้าเป็น Base64

            buf = Buffer.from(imageSource.split(",")[1], "base64");
          } else {
            // ถ้าเป็น URL

            const res = await fetch(imageSource);

            buf = await res.arrayBuffer();
          }

          const imgId = wb.addImage({ buffer: buf, extension: ext });

          ws.addImage(imgId, {
            tl: { col: 9, row: row.number - 1 },

            ext: { width: 80, height: 75 },

            editAs: "oneCell",
          });
        } catch (err) {
          console.warn("Image Load Error:", err);
        }
      }
    }

    // --- เพิ่มส่วนสรุปข้อมูลท้ายตาราง (Summary Section) ---

    const lastRowNumber = ws.lastRow.number + 2;

    const summaryRow = ws.getRow(lastRowNumber);

    summaryRow.getCell(1).value = "สรุปรายงาน";

    summaryRow.getCell(1).font = { bold: true, size: 14 };

    const statsRow = ws.getRow(lastRowNumber + 1);

    statsRow.getCell(1).value = `จำนวนผู้ติดต่อทั้งหมด: ${rows.length} รายการ`;

    statsRow.getCell(1).font = { bold: true };

    const stayingCount = rows.filter((r) => !r.checkout_time).length;

    const outCount = rows.length - stayingCount;

    ws
      .getRow(lastRowNumber + 2)
      .getCell(1).value = `ออกแล้ว: ${outCount} | ยังไม่กลับ: ${stayingCount}`;

    // --- Save File ---

    const buf = await wb.xlsx.writeBuffer();

    const dateStr = new Date().toISOString().split("T")[0];

    saveAs(new Blob([buf]), `Visitor_Report_${ORG}_${dateStr}.xlsx`);
  };

  const openEdit = (v) => {
    const purpose = parsePurpose(v.purpose, v.other_purpose);
    const checkin = toThailandDateTimeParts(v.checkin_time);
    const checkout = toThailandDateTimeParts(v.checkout_time);

    setEditError("");
    setEditingId(v.id);
    setEditForm({
      ...v,
      purpose: purpose.key,
      other_purpose: purpose.other,
      checkin_date: checkin.date,
      checkin_hour: checkin.hour,
      checkin_minute: checkin.minute,
      has_checkout: Boolean(v.checkout_time),
      checkout_date: checkout.date,
      checkout_hour: checkout.hour,
      checkout_minute: checkout.minute,
    });
  };

  const setEditCheckoutEnabled = (enabled) => {
    const now = toThailandDateTimeParts(new Date().toISOString());
    setEditForm((current) => ({
      ...current,
      has_checkout: enabled,
      checkout_date: enabled ? current.checkout_date || now.date : "",
      checkout_hour: enabled ? current.checkout_hour || now.hour : "00",
      checkout_minute: enabled ? current.checkout_minute || now.minute : "00",
    }));
  };

  const completedVisitors = visitors.filter((v) => v.checkout_time);
  const priorityCheckoutList = [...checkoutQueue]
    .sort(
      (a, b) =>
        calculateDurationMinutes(b.checkin_time) -
        calculateDurationMinutes(a.checkin_time)
    )
    .slice(0, 6);
  const checkoutRate =
    summary.today > 0
      ? Math.min(100, Math.round((summary.outToday / summary.today) * 100))
      : 0;
  const activeRate =
    summary.today > 0
      ? Math.min(100, Math.round((summary.staying / summary.today) * 100))
      : 0;
  const purposeCounts = visitors.reduce((acc, visitor) => {
    const label = translatePurpose(visitor.purpose, visitor.other_purpose) || "ไม่ระบุ";
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
  const purposeBreakdown = Object.entries(purposeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxPurposeCount = Math.max(...purposeBreakdown.map(([, count]) => count), 1);
  const hourlyBuckets = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: visitors.filter((v) => new Date(v.checkin_time).getHours() === hour)
      .length,
  }));
  const maxHourlyCount = Math.max(...hourlyBuckets.map((item) => item.count), 1);
  const visibleHourlyBuckets = hourlyBuckets.filter(
    (item) => item.count > 0 || [8, 10, 12, 14, 16, 18].includes(item.hour)
  );
  const summaryCards = [
    {
      id: "TODAY",
      label: "ผู้มาติดต่อวันนี้",
      value: summary.today,
      hint: "Check-in ทั้งหมด",
      icon: Users,
      accent: "text-[#0046AD] bg-[#eef4ff] border-[#cbdcff]",
    },
    {
      id: "STAYING",
      label: "ยังอยู่ในพื้นที่",
      value: summary.staying,
      hint: "ต้องติดตามเช็คเอ้าท์",
      icon: ShieldCheck,
      accent: "text-rose-600 bg-rose-50 border-rose-100",
      live: summary.staying > 0,
    },
    {
      id: "CHECKOUT_TODAY",
      label: "เช็คเอ้าท์วันนี้",
      value: summary.outToday,
      hint: `${checkoutRate}% ของวันนี้`,
      icon: LogOut,
      accent: "text-emerald-600 bg-emerald-50 border-emerald-100",
    },
    {
      id: "ALL",
      label: "ข้อมูลทั้งหมด",
      value: summary.all,
      hint: "สะสมในระบบ",
      icon: ClipboardList,
      accent: "text-[#0046AD] bg-[#eef4ff] border-[#cbdcff]",
    },
  ];
  const quickFilters = [
    { id: "TODAY", label: "วันนี้", icon: Calendar },
    { id: "STAYING", label: "ยังอยู่", icon: Activity },
    { id: "CHECKOUT_TODAY", label: "ออกวันนี้", icon: CheckCircle },
    { id: "ALL", label: "ทั้งหมด", icon: ClipboardList },
  ];

  return (
    <div
      className={`report-shell relative min-h-screen pb-20 text-[#1a2b49] ${isDarkMode ? "report-dark bg-[#13243a]" : "bg-[#f0f4f8]"
        }`}
      style={{
        backgroundImage: isDarkMode
          ? "radial-gradient(circle at 8% 0%, rgba(38, 91, 174, 0.30), transparent 32%), radial-gradient(circle at 92% 10%, rgba(0, 51, 153, 0.22), transparent 30%)"
          : "radial-gradient(circle at 8% 0%, rgba(0, 51, 153, 0.08), transparent 28%), radial-gradient(circle at 92% 10%, rgba(0, 78, 204, 0.07), transparent 25%)",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai+Looped:wght@400;500;600;700&display=swap');
        .report-shell,
        .report-shell button,
        .report-shell input,
        .report-shell select {
          font-family: 'Noto Sans Thai Looped', sans-serif;
        }
        .report-shell {
          transition: background-color 180ms ease, color 180ms ease;
        }
        .report-shell [class~="bg-[#003399]"],
        .report-shell [class~="bg-blue-500"],
        .report-shell [class~="bg-blue-600"] {
          background-color: #0046AD !important;
        }
        .report-shell [class~="text-[#003399]"],
        .report-shell [class~="text-blue-600"],
        .report-shell [class~="text-sky-600"] {
          color: #0046AD !important;
        }
        .report-shell [class~="border-[#003399]"],
        .report-shell [class~="border-[#002a80]"] {
          border-color: #0046AD !important;
        }
        .report-shell [class~="accent-[#003399]"] {
          accent-color: #0046AD !important;
        }
        .report-shell [class~="hover:bg-[#004ecc]"]:hover,
        .report-shell [class~="hover:bg-blue-700"]:hover,
        .report-shell [class~="hover:bg-sky-50"]:hover {
          background-color: #0046AD !important;
          filter: brightness(0.94);
        }
        .report-shell [class~="hover:border-[#003399]"]:hover,
        .report-shell [class~="focus:border-[#003399]"]:focus {
          border-color: #0046AD !important;
        }
      `}</style>
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#f0f4f8]/80 backdrop-blur-sm transition-all animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-4 rounded-[28px] border border-blue-100 bg-white p-8 shadow-[0_20px_50px_rgba(0,51,153,0.16)]">
            <Loader2 size={48} className="animate-spin text-[#003399]" />
            <p className="text-lg font-semibold tracking-tight text-[#1a2b49]">
              กำลังโหลดข้อมูล...
            </p>
          </div>
        </div>
      )}

      {/* Navigation Bar */}
      {false && (<nav className="bg-white/10 dark:bg-slate-900/40 backdrop-blur-xl border-b border-white/20 dark:border-white/10 sticky top-0 z-50 px-6 lg:px-10 py-5 flex justify-between items-center shadow-lg transition-colors duration-300">

        {/* ฝั่งซ้าย: Logo & Title */}
        <div className="flex items-center gap-5">
          <div className="relative group">
            <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-xl shadow-indigo-500/20 border-2 border-white/30 transition-transform group-hover:scale-105">
              <img
                src={bgImage}
                alt="Company Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-indigo-500/20 blur-lg -z-10 group-hover:bg-indigo-500/40 transition-all"></div>
          </div>
          <div>
            <h1 className="font-black text-xl lg:text-2xl text-slate-900 dark:text-white tracking-tight leading-none">
              {ORG}
            </h1>
            <p className="text-[10px] lg:text-[11px] text-slate-800 dark:text-slate-300 font-bold uppercase tracking-[0.3em] mt-1">
              Report Dashboard
            </p>
          </div>
        </div>

        {/* ฝั่งขวา: Buttons Action */}
        <div className="flex gap-2 lg:gap-3 items-center">

          {/* 1. ปุ่มลบ (แสดงเมื่อมีการเลือก) */}
          {selectedIds.length > 0 && (
            <button
              onClick={deleteSelected}
              className="flex items-center gap-2 px-4 lg:px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-rose-100 active:scale-95 animate-in slide-in-from-right-4"
            >
              <Trash2 size={18} />
              <span className="hidden lg:inline">ลบที่เลือก</span> ({selectedIds.length})
            </button>
          )}

          {/* 2. ปุ่ม Export */}
          <button
            onClick={() => exportToExcel(selectedIds)}
            disabled={selectedIds.length === 0}
            className={`flex items-center gap-2 px-4 lg:px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg active:scale-95 ${selectedIds.length > 0
                ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-100/50"
                : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-white/10"
              }`}
          >
            <Download size={18} />
            <span className="hidden lg:inline">Export Excel</span> ({selectedIds.length})
          </button>

          {/* --- 3. ปุ่มเปลี่ยนธีม (แทรกตรงนี้) --- */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-3 rounded-2xl transition-all active:scale-90 shadow-md flex items-center justify-center ${isDarkMode
                ? "bg-slate-800 text-yellow-400 hover:bg-slate-700 border border-white/10"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
              }`}
            title={isDarkMode ? "Light Mode" : "Dark Mode"}
          >
            {isDarkMode ? <Sun size={22} /> : <Moon size={22} />}
          </button>

          {/* 4. ปุ่ม Home */}
          <button
            onClick={() => navigate("/")}
            className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl transition-all active:scale-90 border border-white/10 shadow-md"
          >
            <Home size={22} />
          </button>

        </div>
      </nav>)}

      <div
        className="mx-auto flex max-w-[1600px] flex-col items-start gap-4 p-3 sm:p-4 lg:p-6"
      >
        {!isSidebarCollapsed && (
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(true)}
            className="fixed inset-0 z-[70] cursor-default bg-[#071a3b]/45 backdrop-blur-[2px]"
            aria-label="ปิด Sidebar"
          />
        )}
        <aside
          className={`fixed inset-y-0 left-0 z-[80] w-[280px] max-w-[88vw] overflow-y-auto border-r border-blue-100 bg-white p-5 shadow-[18px_0_45px_rgba(0,30,80,0.20)] transition-transform duration-200 ${isSidebarCollapsed ? "pointer-events-none -translate-x-full" : "translate-x-0"
            }`}
        >
          <button
            type="button"
            onClick={toggleSidebar}
            className="absolute right-4 top-5 z-10 hidden h-9 w-9 items-center justify-center rounded-xl border-2 border-blue-100 bg-[#f7faff] text-[#003399] transition hover:border-[#003399] lg:flex"
            title="ปิด Sidebar"
            aria-label="ปิด Sidebar"
            aria-expanded={!isSidebarCollapsed}
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3 border-b border-blue-100 pb-4 lg:pr-10">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[#003399] text-base font-bold text-white shadow-[0_8px_18px_rgba(0,51,153,0.22)]">
              TDK
            </div>
            <div className={`min-w-0 flex-1 ${isSidebarCollapsed ? "lg:hidden" : ""}`}>
              <h1 className="truncate text-xl font-medium leading-tight tracking-tight text-[#003399]">
                <span className="font-bold">TDK</span> INDUSTRIAL
              </h1>
              <p className="mt-0.5 text-xs font-medium leading-snug text-[#5f7394]">
                บริษัท ที.ดี.เค.อินดัสเตรียล จำกัด
              </p>
            </div>
            <button
              type="button"
              onClick={toggleSidebar}
              className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-blue-100 bg-[#f7faff] text-[#003399] lg:hidden"
              title="ปิด Sidebar"
              aria-label="ปิด Sidebar"
              aria-expanded={!isSidebarCollapsed}
            >
              <X size={19} />
            </button>
          </div>

          <div>
            <div className="mt-4 hidden items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#6d87ad] lg:flex">
              <BarChart3 size={14} />
              {!isSidebarCollapsed && <span>เมนูรายงาน</span>}
            </div>
            <nav className="mt-3 grid grid-cols-3 gap-2 lg:grid-cols-1" aria-label="เมนูรายงาน">
              <a
                href="#daily-summary"
                onClick={() => setIsSidebarCollapsed(true)}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#003399] px-3 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(0,51,153,0.16)] ${isSidebarCollapsed ? "lg:px-0" : "lg:justify-start"
                  }`}
                title="สรุปวันนี้"
              >
                <Calendar size={18} />
                <span className={isSidebarCollapsed ? "lg:hidden" : ""}>สรุปวันนี้</span>
              </a>
              <a
                href="#visitor-list"
                onClick={() => setIsSidebarCollapsed(true)}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#eef4ff] px-3 text-sm font-semibold text-[#003399] transition hover:bg-[#dfeaff] ${isSidebarCollapsed ? "lg:px-0" : "lg:justify-start"
                  }`}
                title="รายชื่อผู้ติดต่อ"
              >
                <Users size={18} />
                <span className={isSidebarCollapsed ? "lg:hidden" : ""}>รายชื่อผู้ติดต่อ</span>
              </a>
              <a
                href="#analytics"
                onClick={() => setIsSidebarCollapsed(true)}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#eef4ff] px-3 text-sm font-semibold text-[#003399] transition hover:bg-[#dfeaff] ${isSidebarCollapsed ? "lg:px-0" : "lg:justify-start"
                  }`}
                title="ภาพรวมสถิติ"
              >
                <BarChart3 size={18} />
                <span className={isSidebarCollapsed ? "lg:hidden" : ""}>ภาพรวมสถิติ</span>
              </a>
            </nav>

            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-blue-100 pt-4 lg:grid-cols-1">
              <button
                type="button"
                onClick={() => {
                  loadSummary();
                  loadVisitors(activeFilter);
                  loadCheckoutQueue();
                }}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-[#d8e4f7] bg-[#f7faff] px-3 text-sm font-semibold text-[#003399] transition hover:border-[#003399] hover:bg-white ${isSidebarCollapsed ? "lg:px-0" : "lg:justify-start"
                  }`}
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw size={18} />
                <span className={isSidebarCollapsed ? "lg:hidden" : ""}>รีเฟรชข้อมูล</span>
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-[#d8e4f7] bg-[#f7faff] px-3 text-sm font-semibold text-[#003399] transition hover:border-[#003399] hover:bg-white ${isSidebarCollapsed ? "lg:px-0" : "lg:justify-start"
                  }`}
                title={isDarkMode ? "เปลี่ยนเป็นธีมสว่าง" : "เปลี่ยนเป็นธีมมืด"}
                aria-pressed={isDarkMode}
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                <span className={isSidebarCollapsed ? "lg:hidden" : ""}>
                  {isDarkMode ? "ธีมสว่าง" : "ธีมมืด"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => navigate("/")}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-[#d8e4f7] bg-white px-3 text-sm font-semibold text-[#315184] transition hover:border-[#003399] hover:bg-[#f7faff] ${isSidebarCollapsed ? "lg:px-0" : "lg:justify-start"
                  }`}
                title="หน้าลงทะเบียน"
              >
                <Home size={18} />
                <span className={isSidebarCollapsed ? "lg:hidden" : ""}>หน้าลงทะเบียน</span>
              </button>
            </div>
          </div>
        </aside>

        <main className="flex w-full min-w-0 flex-1 flex-col gap-4">
          <section className="order-0 space-y-3 rounded-[20px] border border-blue-100 bg-white p-3 shadow-[0_8px_22px_rgba(0,51,153,0.06)]">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="flex min-w-0 items-center gap-3 xl:mr-auto">
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(false)}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#003399] px-4 text-sm font-semibold text-white transition hover:bg-[#004ecc]"
                  aria-label="เปิด Sidebar"
                  aria-expanded={!isSidebarCollapsed}
                >
                  ☰
                </button>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#003399] sm:text-base">
                    รายงานผู้มาติดต่อ
                  </p>
                  <p className="truncate text-xs text-[#5f7394]">
                    {getFilterStatusText(activeFilter)} · {visitors.length} รายการ
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {quickFilters.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveFilter(item.id);
                        loadVisitors(item.id);
                      }}
                      className={`inline-flex min-h-10 items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-semibold transition-colors ${activeFilter === item.id
                          ? "border-[#003399] bg-[#003399] text-white shadow-[0_6px_14px_rgba(0,51,153,0.18)]"
                          : "border-[#d8e4f7] bg-[#f7faff] text-[#315184] hover:border-[#003399] hover:bg-white"
                        }`}
                    >
                      <Icon size={16} /> {item.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex shrink-0 gap-2 overflow-x-auto pb-1 xl:pb-0">
                <button
                  onClick={() => exportToExcel(selectedIds)}
                  disabled={selectedIds.length === 0}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors ${selectedIds.length > 0
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "cursor-not-allowed bg-[#edf1f7] text-[#8d9bb0]"
                    }`}
                >
                  <Download size={16} /> Export ({selectedIds.length})
                </button>
                {selectedIds.length > 0 && (
                  <button
                    onClick={deleteSelected}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-rose-600 px-3 text-sm font-semibold text-white hover:bg-rose-700"
                  >
                    <Trash2 size={16} /> ลบ
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border-2 border-[#003399] bg-white px-3 text-sm font-semibold text-[#003399] transition hover:bg-[#eef4ff]"
                >
                  <UserCheck size={16} /> ลงทะเบียนผู้ติดต่อ
                </button>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[#d8e4f7] bg-[#f7faff] text-[#003399] transition hover:border-[#003399]"
                  title={isDarkMode ? "เปลี่ยนเป็นธีมสว่าง" : "เปลี่ยนเป็นธีมมืด"}
                  aria-label={isDarkMode ? "เปลี่ยนเป็นธีมสว่าง" : "เปลี่ยนเป็นธีมมืด"}
                  aria-pressed={isDarkMode}
                >
                  {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 items-stretch gap-2 lg:grid-cols-[minmax(280px,1fr)_165px_165px_minmax(160px,auto)]">
              <div className="relative h-11">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5071a5]" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ บริษัท ผู้ติดต่อ หรือเบอร์โทร"
                  value={searchName}
                  onChange={(e) => {
                    setSearchName(e.target.value);
                    setShowSearchSuggestions(true);
                  }}
                  onFocus={() => setShowSearchSuggestions(true)}
                  onBlur={() => setShowSearchSuggestions(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setShowSearchSuggestions(false);
                      setActiveFilter("CUSTOM");
                      loadVisitors("CUSTOM");
                    }
                    if (e.key === "Escape") setShowSearchSuggestions(false);
                  }}
                  role="combobox"
                  aria-label="ค้นหาผู้มาติดต่อ"
                  aria-autocomplete="list"
                  aria-expanded={showSearchSuggestions && searchName.trim().length >= 2}
                  className="h-11 w-full rounded-xl border-2 border-[#d8e4f7] bg-[#f7faff] pl-11 pr-4 text-sm text-[#1a2b49] outline-none transition placeholder:text-[#8494ad] focus:border-[#003399] focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
                {showSearchSuggestions && searchName.trim().length >= 2 && (
                  <div
                    className="absolute left-0 right-0 top-[calc(100%+6px)] z-[60] max-h-80 overflow-y-auto rounded-2xl border border-blue-100 bg-white p-2 shadow-[0_18px_45px_rgba(0,51,153,0.18)]"
                    role="listbox"
                  >
                    {isLoadingSuggestions ? (
                      <div className="flex items-center justify-center gap-2 px-4 py-5 text-sm font-medium text-[#5f7394]">
                        <Loader2 size={17} className="animate-spin text-[#003399]" />
                        กำลังค้นหา...
                      </div>
                    ) : searchSuggestions.length > 0 ? (
                      searchSuggestions.map((suggestion) => {
                        const suggestionValue =
                          suggestion.full_name ||
                          suggestion.company ||
                          suggestion.contact_person ||
                          suggestion.phone ||
                          "";

                        return (
                          <button
                            key={suggestion.id}
                            type="button"
                            role="option"
                            aria-selected="false"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              setSearchName(suggestionValue);
                              setShowSearchSuggestions(false);
                            }}
                            className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-[#eef4ff]"
                          >
                            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eef4ff] text-[#003399]">
                              <UserCircle size={18} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-[#1a2b49]">
                                {suggestion.full_name || "ไม่ระบุชื่อ"}
                              </span>
                              <span className="block truncate text-xs text-[#5f7394]">
                                {[suggestion.company, suggestion.contact_person, suggestion.phone]
                                  .filter(Boolean)
                                  .join(" · ") || "ไม่มีรายละเอียดเพิ่มเติม"}
                              </span>
                            </span>
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-4 py-5 text-center text-sm font-medium text-[#5f7394]">
                        ไม่พบข้อมูลที่ใกล้เคียง
                      </div>
                    )}
                  </div>
                )}
              </div>
              <label className="m-0 block h-11">
                <span className="sr-only">ตั้งแต่วันที่</span>
                <input
                  type="date"
                  value={searchStart}
                  onChange={(e) => setSearchStart(e.target.value)}
                  className="block h-full w-full rounded-xl border-2 border-[#d8e4f7] bg-[#f7faff] px-3 text-sm font-medium text-[#1a2b49] outline-none focus:border-[#003399] focus:bg-white"
                />
              </label>
              <label className="m-0 block h-11">
                <span className="sr-only">ถึงวันที่</span>
                <input
                  type="date"
                  value={searchEnd}
                  onChange={(e) => setSearchEnd(e.target.value)}
                  className="block h-full w-full rounded-xl border-2 border-[#d8e4f7] bg-[#f7faff] px-3 text-sm font-medium text-[#1a2b49] outline-none focus:border-[#003399] focus:bg-white"
                />
              </label>
              <div className="flex h-11 flex-nowrap items-stretch gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSearchSuggestions(false);
                    setActiveFilter("CUSTOM");
                    loadVisitors("CUSTOM");
                  }}
                  className="inline-flex h-full min-w-[104px] flex-1 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#003399] px-4 text-sm font-semibold text-white hover:bg-[#004ecc]"
                >
                  <Search size={16} /> ค้นหา
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSearchSuggestions(false);
                    setSearchName("");
                    setSearchStart("");
                    setSearchEnd("");
                    loadVisitors("TODAY");
                    setActiveFilter("TODAY");
                  }}
                  className="inline-flex h-full w-11 shrink-0 items-center justify-center rounded-xl border-2 border-[#d8e4f7] bg-white text-[#315184] hover:border-[#003399] hover:bg-[#f7faff]"
                  title="รีเซ็ต"
                  aria-label="รีเซ็ตการค้นหา"
                >
                  <RotateCcw size={17} />
                </button>
              </div>
            </div>
          </section>
          {/* Stats Grid */}
          <div id="daily-summary" className="order-1 grid scroll-mt-6 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveFilter(item.id);
                    loadVisitors(item.id);
                  }}
                  className={`min-h-[124px] rounded-[20px] border-2 bg-white p-4 text-left shadow-[0_8px_24px_rgba(0,51,153,0.07)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(0,51,153,0.12)] ${activeFilter === item.id
                      ? "border-[#003399] ring-4 ring-blue-100"
                      : "border-white hover:border-[#bfd2f2]"
                    }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold uppercase tracking-wide text-[#315184]">
                          {item.label}
                        </p>
                        {item.live && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-rose-600">
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
                              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500"></span>
                            </span>
                            Live
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-4xl font-bold leading-none tracking-tight text-[#003399]">
                        {item.value.toLocaleString()}
                      </p>
                      <p className="mt-1 text-sm font-medium text-[#5f7394]">
                        {item.hint}
                      </p>
                    </div>
                    <div className={`relative rounded-lg border p-2.5 ${item.accent}`}>
                      {item.live && (
                        <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-rose-500"></span>
                        </span>
                      )}
                      <Icon size={22} className={item.live ? "animate-pulse" : ""} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Operational Overview */}
          <div id="analytics" className="order-5 grid scroll-mt-6 grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.95fr]">
            <section className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-[0_14px_38px_rgba(0,51,153,0.08)] sm:p-7">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#45638f]">
                    <BarChart3 size={16} />
                    Overview
                  </div>
                  <h2 className="mt-2 text-2xl font-bold text-[#003399] sm:text-3xl">
                    ภาพรวมการเข้าออกวันนี้
                  </h2>
                  <p className="mt-1 text-base font-normal text-[#5f7394]">
                    แสดงสถานะที่ รปภ. ต้องติดตามแบบเรียลไทม์
                  </p>
                </div>
                <button
                  onClick={() => {
                    loadSummary();
                    loadVisitors(activeFilter);
                  }}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-[#d8e4f7] bg-[#f7faff] px-5 text-base font-semibold text-[#003399] hover:border-[#003399] hover:bg-white"
                >
                  <RefreshCw size={16} />
                  รีเฟรช
                </button>
              </div>

              <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-blue-100 bg-[#f7faff] p-4">
                  <div className="flex items-center justify-between text-sm font-bold text-slate-600">
                    <span>ยังอยู่ในพื้นที่</span>
                    <span>{activeRate}%</span>
                  </div>
                  <div className="mt-3 h-3 rounded-full bg-white border border-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-rose-500"
                      style={{ width: `${activeRate}%` }}
                    />
                  </div>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-[#f7faff] p-4">
                  <div className="flex items-center justify-between text-sm font-bold text-slate-600">
                    <span>เช็คเอ้าท์แล้ว</span>
                    <span>{checkoutRate}%</span>
                  </div>
                  <div className="mt-3 h-3 rounded-full bg-white border border-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${checkoutRate}%` }}
                    />
                  </div>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-[#f7faff] p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                    <TrendingUp size={16} className="text-blue-600" />
                    ชุดข้อมูลที่แสดง
                  </div>
                  <p className="mt-2 text-3xl font-bold text-[#003399]">
                    {visitors.length.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_0.9fr] gap-6">
                <div className="rounded-2xl border border-blue-100 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black text-slate-700">
                      Check-in ตามช่วงเวลา
                    </p>
                    <p className="text-xs font-bold text-slate-400">
                      {getFilterStatusText()}
                    </p>
                  </div>
                  <div className="mt-5 flex h-36 items-end gap-2">
                    {visibleHourlyBuckets.map((item) => (
                      <div key={item.hour} className="flex flex-1 flex-col items-center gap-2">
                        <div className="w-full h-28 flex items-end">
                          <div
                            className={`w-full rounded-t-md ${item.count > 0 ? "bg-blue-500" : "bg-slate-200"
                              }`}
                            style={{
                              height: `${Math.max(8, (item.count / maxHourlyCount) * 100)}%`,
                            }}
                            title={`${String(item.hour).padStart(2, "0")}:00 - ${item.count} คน`}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">
                          {String(item.hour).padStart(2, "0")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-100 p-4">
                  <p className="text-sm font-black text-slate-700">
                    วัตถุประสงค์ยอดนิยม
                  </p>
                  <div className="mt-4 space-y-3">
                    {purposeBreakdown.length ? (
                      purposeBreakdown.map(([label, count]) => (
                        <div key={label}>
                          <div className="flex justify-between gap-3 text-sm font-bold">
                            <span className="truncate text-slate-700">{label}</span>
                            <span className="text-slate-500">{count}</span>
                          </div>
                          <div className="mt-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-amber-500"
                              style={{ width: `${(count / maxPurposeCount) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm font-semibold text-slate-400">
                        ยังไม่มีข้อมูลสำหรับกราฟนี้
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <aside className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-[0_14px_38px_rgba(0,51,153,0.08)] sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-wide">
                    <AlertTriangle size={16} />
                    Action Queue
                  </div>
                  <h2 className="mt-2 text-2xl font-bold text-[#003399] sm:text-3xl">
                    รอเช็คเอ้าท์
                  </h2>
                  <p className="mt-1 text-base font-normal text-[#5f7394]">
                    รายการที่อยู่นานสุดขึ้นก่อน
                  </p>
                </div>
                <span className="rounded-lg bg-rose-50 px-3 py-2 text-lg font-black text-rose-600">
                  {summary.staying}
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {priorityCheckoutList.length ? (
                  priorityCheckoutList.map((v) => (
                    <div
                      key={v.id}
                      className="rounded-2xl border border-blue-100 p-4 transition-colors hover:border-rose-200 hover:bg-rose-50/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-base font-black text-slate-900">
                            {v.full_name || "ไม่ระบุชื่อ"}
                          </p>
                          <p className="truncate text-sm font-semibold text-slate-500">
                            {v.company || "ทั่วไป"} · {v.contact_person || "ไม่ระบุผู้ติดต่อ"}
                          </p>
                          <p className="mt-2 inline-flex items-center gap-2 rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                            <Clock size={13} />
                            {calculateDuration(v.checkin_time)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleCheckOut(v.id)}
                          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-base font-semibold text-white hover:bg-emerald-700"
                        >
                          <CheckCircle size={16} />
                          ออก
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
                    <UserCheck className="mx-auto text-emerald-500" size={36} />
                    <p className="mt-3 text-sm font-bold text-slate-500">
                      ไม่มีรายการค้างเช็คเอ้าท์
                    </p>
                  </div>
                )}
              </div>

              {activeFilter === "CHECKOUT_TODAY" && (
                <div className="mt-6 border-t border-slate-200 pt-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-black text-emerald-700">
                        <CheckCircle size={16} />
                        เช็คเอ้าท์แล้ววันนี้
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        รายชื่อจากตัวกรองเช็คเอ้าท์วันนี้
                      </p>
                    </div>
                    <span className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700">
                      {completedVisitors.length}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {completedVisitors.length ? (
                      completedVisitors.slice(0, 6).map((v) => (
                        <div
                          key={`completed-${v.id}`}
                          className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-base font-black text-slate-900">
                                {v.full_name || "ไม่ระบุชื่อ"}
                              </p>
                              <p className="truncate text-sm font-semibold text-slate-500">
                                {v.company || "ทั่วไป"} · {v.contact_person || "ไม่ระบุผู้ติดต่อ"}
                              </p>
                            </div>
                            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-2 text-xs font-black text-white">
                              <CheckCircle size={14} />
                              ออกแล้ว
                            </span>
                          </div>
                          <p className="mt-3 inline-flex items-center gap-2 rounded-md bg-white px-2 py-1 text-xs font-bold text-emerald-700">
                            <Clock size={13} />
                            {formatDateTime(v.checkout_time)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm font-bold text-slate-400">
                        ยังไม่มีผู้เช็คเอ้าท์วันนี้
                      </div>
                    )}
                  </div>
                </div>
              )}
            </aside>
          </div>

          {/* Main Table Content */}
          <div id="visitor-list" className="order-4 scroll-mt-6 overflow-hidden rounded-[28px] border border-blue-100 bg-white shadow-[0_14px_38px_rgba(0,51,153,0.09)] transition-all">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#002a80] bg-[#003399]">
                    <th className="w-16 px-5 py-3 text-center">
                      <input
                        type="checkbox"
                        className="h-5 w-5 cursor-pointer rounded-lg accent-[#8fb5ff]"
                        checked={
                          visitors.length > 0 &&
                          selectedIds.length === visitors.length
                        }
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="px-5 py-3.5 text-sm font-semibold uppercase tracking-wider text-white">
                      ข้อมูลผู้ติดต่อ
                    </th>
                    <th className="px-5 py-3.5 text-sm font-semibold uppercase tracking-wider text-white">
                      บริษัท & วัตถุประสงค์
                    </th>
                    <th className="px-5 py-3.5 text-sm font-semibold uppercase tracking-wider text-white">
                      สถานะเวลา (24H)
                    </th>
                    <th className="px-5 py-3.5 text-right text-sm font-semibold uppercase tracking-wider text-white">
                      จัดการ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-50">
                  {visitors.map((v) => (
                    <tr
                      key={v.id}
                      className={`group transition-all hover:bg-[#f7faff] ${selectedIds.includes(v.id) ? "bg-[#eef4ff]" : ""
                        }`}
                    >
                      <td className="px-5 py-4 text-center">
                        <input
                          type="checkbox"
                          className="h-5 w-5 cursor-pointer rounded-lg accent-[#003399]"
                          checked={selectedIds.includes(v.id)}
                          onChange={() => toggleSelect(v.id)}
                        />
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-3">
                            <span className="rounded bg-[#eef4ff] px-2 py-0.5 text-xs font-semibold text-[#5071a5]">
                              #{v.id}
                            </span>
                            {/* ค้นหาบรรทัด {v.full_name} แล้วแก้เป็นแบบนี้ */}
                            <div className="flex items-center gap-2 text-lg font-semibold leading-tight tracking-tight text-[#1a2b49]">
                              {v.full_name}
                              {!v.checkout_time && (
                                <span className="flex h-3 w-3 relative">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex w-fit items-center gap-2 rounded-full border border-blue-100 bg-[#eef4ff] px-3 py-1 text-sm font-medium text-[#003399]">
                            <UserCircle size={14} /> ติดต่อ:{" "}
                            {v.contact_person || "ไม่ระบุ"}
                          </div>
                          {v.phone && (
                            <div className="pl-1 text-sm font-medium text-[#5f7394]">
                              โทร: {v.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 text-base font-semibold text-[#1a2b49]">
                            <Building2 size={18} className="text-[#6d87ad]" />
                            {v.company || "ทั่วไป"}
                          </div>
                          <div className="inline-flex rounded-lg border border-blue-100 bg-white px-3 py-1.5 text-sm font-medium text-[#5f7394]">
                            {translatePurpose(v.purpose, v.other_purpose)}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-4 text-slate-400">
                            <span className="w-16 rounded-lg bg-[#eef4ff] py-1 text-center text-xs font-semibold text-[#315184]">
                              เข้า
                            </span>
                            <span className="text-sm font-medium text-[#1a2b49]">
                              {formatDateTime(v.checkin_time)}
                            </span>
                          </div>
                          <div
                            className={`flex items-center gap-4 ${v.checkout_time
                                ? "text-emerald-600"
                                : "text-rose-500"
                              }`}
                          >
                            <span
                              className={`w-16 rounded-lg py-1 text-center text-xs font-semibold ${v.checkout_time
                                  ? "bg-emerald-100"
                                  : "bg-rose-100 animate-pulse"
                                }`}
                            >
                              ออก
                            </span>
                            <span className="font-bold text-sm">
                              {v.checkout_time
                                ? formatDateTime(v.checkout_time)
                                : "ยังไม่ออก"}
                            </span>
                          </div>
                          <div className="mt-1 flex w-fit items-center gap-2 rounded-lg border border-blue-100 bg-[#f7faff] py-1 pl-2 pr-3 text-sm font-medium text-[#5f7394]">
                            <Clock size={14} className="text-[#6d87ad]" />{" "}
                            {calculateDuration(v.checkin_time, v.checkout_time)}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end items-center gap-2">
                          {!v.checkout_time && (
                            <button
                              onClick={() => handleCheckOut(v.id)}
                              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-base font-semibold text-white transition-colors hover:bg-emerald-700"
                              title="เช็คเอ้าท์"
                            >
                              <CheckCircle size={17} />
                              เช็คเอ้าท์
                            </button>
                          )}
                          <button
                            onClick={() =>
                              setPhotoPreview({
                                src: getVisitorPhoto(v),
                                name: v.full_name || "ผู้มาติดต่อ",
                                id: v.id,
                              })
                            }
                            disabled={!getVisitorPhoto(v)}
                            className={`min-h-11 min-w-11 rounded-xl border p-2.5 transition-colors ${getVisitorPhoto(v)
                                ? "bg-white border-slate-200 text-sky-600 hover:bg-sky-50 hover:border-sky-200"
                                : "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
                              }`}
                            title={getVisitorPhoto(v) ? "ดูรูปบัตร" : "ไม่มีรูปบัตร"}
                            aria-label={getVisitorPhoto(v) ? `ดูรูปบัตรของ ${v.full_name || "ผู้มาติดต่อ"}` : "ไม่มีรูปบัตร"}
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => openEdit(v)}
                            className="min-h-11 min-w-11 rounded-xl border border-blue-100 bg-white p-2.5 text-[#003399] transition-colors hover:border-[#003399] hover:bg-[#eef4ff]"
                            title="แก้ไข"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() =>
                              window.open(`/print/${v.id}`, "_blank")
                            }
                            className="min-h-11 min-w-11 rounded-xl border border-blue-100 bg-white p-2.5 text-[#315184] transition-colors hover:border-[#003399] hover:bg-[#eef4ff]"
                            title="พิมพ์สลิป"
                          >
                            <Printer size={18} />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm("ลบข้อมูลคิวนี้?")) {
                                await visitorsApi.remove(v.id);
                                loadVisitors();
                                loadSummary();
                                loadCheckoutQueue();
                              }
                            }}
                            className="min-h-11 min-w-11 rounded-xl border border-rose-100 bg-white p-2.5 text-rose-500 transition-colors hover:border-rose-300 hover:bg-rose-50"
                            title="ลบ"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {/* ส่วนแสดงผลกรณีไม่มีข้อมูล */}
                  {!isLoading && visitors.length === 0 && (
                    <tr>
                      <td colSpan="6" className="p-20 text-center">
                        <div className="flex flex-col items-center gap-4 opacity-40">
                          <Search size={64} className="text-slate-300" />
                          <p className="text-slate-400 font-black italic text-lg">
                            — ไม่พบรายการข้อมูลที่ตรงตามเงื่อนไข —
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
      {photoPreview && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[#071a3b]/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`รูปบัตรของ ${photoPreview.name}`}
          onClick={() => setPhotoPreview(null)}
        >
          <div
            className="w-full max-w-4xl overflow-hidden rounded-[28px] bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-blue-100 px-6 py-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[#003399]">
                  <Maximize2 size={15} />
                  รูปบัตรผู้มาติดต่อ
                </div>
                <p className="mt-1 truncate text-xl font-semibold text-[#1a2b49]">
                  {photoPreview.name} <span className="text-slate-400">#{photoPreview.id}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPhotoPreview(null)}
                className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                title="ปิด"
                aria-label="ปิดรูปบัตร"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex max-h-[80vh] items-center justify-center bg-[#eef4ff] p-4 sm:p-6">
              <img
                src={photoPreview.src}
                alt={`รูปบัตรของ ${photoPreview.name}`}
                className="max-h-[70vh] max-w-full rounded-xl object-contain shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
      {editingId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#071a3b]/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-[30px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-blue-100 p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-[#003399]">
                แก้ไขข้อมูล #{editingId}
              </h2>
              <button
                onClick={() => setEditingId(null)}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <X />
              </button>
            </div>
            <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-1">
                  ชื่อ-นามสกุล
                </label>
                <input
                  type="text"
                  className="w-full rounded-2xl border-2 border-[#d8e4f7] bg-[#f7faff] p-4 text-base outline-none focus:border-[#003399] focus:bg-white focus:ring-4 focus:ring-blue-100"
                  value={editForm.full_name || ""}
                  onChange={(e) =>
                    setEditForm((current) => ({
                      ...current,
                      full_name: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-1">
                  บริษัท
                </label>
                <input
                  type="text"
                  className="w-full rounded-2xl border-2 border-[#d8e4f7] bg-[#f7faff] p-4 text-base outline-none focus:border-[#003399] focus:bg-white focus:ring-4 focus:ring-blue-100"
                  value={editForm.company || ""}
                  onChange={(e) =>
                    setEditForm((current) => ({
                      ...current,
                      company: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-1">
                  เบอร์โทรศัพท์
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  className="w-full rounded-2xl border-2 border-[#d8e4f7] bg-[#f7faff] p-4 text-base outline-none focus:border-[#003399] focus:bg-white focus:ring-4 focus:ring-blue-100"
                  value={editForm.phone || ""}
                  onChange={(e) =>
                    setEditForm((current) => ({
                      ...current,
                      phone: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-1">
                  บุคคลที่มาติดต่อ
                </label>
                <input
                  type="text"
                  className="w-full rounded-2xl border-2 border-[#d8e4f7] bg-[#f7faff] p-4 text-base outline-none focus:border-[#003399] focus:bg-white focus:ring-4 focus:ring-blue-100"
                  value={editForm.contact_person || ""}
                  onChange={(e) =>
                    setEditForm((current) => ({
                      ...current,
                      contact_person: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-500 mb-2">
                    วัตถุประสงค์ในการติดต่อ
                  </label>
                  <select
                    className="w-full rounded-2xl border-2 border-[#d8e4f7] bg-[#f7faff] p-4 text-base outline-none focus:border-[#003399] focus:bg-white focus:ring-4 focus:ring-blue-100"
                    value={editForm.purpose || ""}
                    onChange={(e) =>
                      setEditForm((current) => ({
                        ...current,
                        purpose: e.target.value,
                        other_purpose:
                          e.target.value === "other"
                            ? current.other_purpose
                            : "",
                      }))
                    }
                  >
                    <option value="">เลือกวัตถุประสงค์</option>
                    {PURPOSES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* แสดงช่องนี้เฉพาะเมื่อเลือก "อื่น ๆ" หรือค่าที่ไม่ตรงกับใน List มาตรฐาน */}
                {editForm.purpose === "other" && (
                  <div className="animate-in slide-in-from-top-2">
                    <label className="block text-sm font-bold text-slate-500 mb-2">
                      ระบุวัตถุประสงค์อื่น ๆ
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-2xl border-2 border-[#d8e4f7] bg-[#f7faff] p-4 text-base outline-none focus:border-[#003399] focus:bg-white focus:ring-4 focus:ring-blue-100"
                      value={editForm.other_purpose || ""}
                      onChange={(e) =>
                        setEditForm((current) => ({
                          ...current,
                          other_purpose: e.target.value,
                        }))
                      }
                    />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border-2 border-[#d8e4f7] bg-[#f7faff] p-4">
                  <label className="mb-3 block text-sm font-bold text-slate-600">
                    วันที่และเวลาเข้า
                  </label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
                    <input
                      type="date"
                      lang="th-TH"
                      className="min-w-0 rounded-xl border border-[#cbdcff] bg-white px-3 py-3 text-base outline-none focus:border-[#003399] focus:ring-4 focus:ring-blue-100"
                      value={editForm.checkin_date || ""}
                      onChange={(e) =>
                        setEditForm((current) => ({
                          ...current,
                          checkin_date: e.target.value,
                        }))
                      }
                    />
                    <div className="flex items-center gap-2">
                      <select
                        aria-label="ชั่วโมงเข้าแบบ 24 ชั่วโมง"
                        className="rounded-xl border border-[#cbdcff] bg-white px-3 py-3 text-base font-semibold outline-none focus:border-[#003399] focus:ring-4 focus:ring-blue-100"
                        value={editForm.checkin_hour || "00"}
                        onChange={(e) =>
                          setEditForm((current) => ({
                            ...current,
                            checkin_hour: e.target.value,
                          }))
                        }
                      >
                        {HOUR_OPTIONS.map((hour) => (
                          <option key={hour} value={hour}>{hour}</option>
                        ))}
                      </select>
                      <span className="text-lg font-bold text-slate-500">:</span>
                      <select
                        aria-label="นาทีเข้า"
                        className="rounded-xl border border-[#cbdcff] bg-white px-3 py-3 text-base font-semibold outline-none focus:border-[#003399] focus:ring-4 focus:ring-blue-100"
                        value={editForm.checkin_minute || "00"}
                        onChange={(e) =>
                          setEditForm((current) => ({
                            ...current,
                            checkin_minute: e.target.value,
                          }))
                        }
                      >
                        {MINUTE_OPTIONS.map((minute) => (
                          <option key={minute} value={minute}>{minute}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p className="mt-2 text-xs font-medium text-[#5071a5]">
                    เวลาไทย 24 ชั่วโมง (UTC+7)
                  </p>
                </div>
                <div className="rounded-2xl border-2 border-[#d8e4f7] bg-[#f7faff] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-slate-600">
                      วันที่และเวลาออก
                    </span>
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#0046AD]">
                      <input
                        type="checkbox"
                        className="h-5 w-5 accent-[#0046AD]"
                        checked={Boolean(editForm.has_checkout)}
                        onChange={(e) => setEditCheckoutEnabled(e.target.checked)}
                      />
                      เช็คเอาท์แล้ว
                    </label>
                  </div>
                  {editForm.has_checkout ? (
                    <>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
                        <input
                          type="date"
                          lang="th-TH"
                          className="min-w-0 rounded-xl border border-[#cbdcff] bg-white px-3 py-3 text-base outline-none focus:border-[#003399] focus:ring-4 focus:ring-blue-100"
                          value={editForm.checkout_date || ""}
                          onChange={(e) =>
                            setEditForm((current) => ({
                              ...current,
                              checkout_date: e.target.value,
                            }))
                          }
                        />
                        <div className="flex items-center gap-2">
                          <select
                            aria-label="ชั่วโมงออกแบบ 24 ชั่วโมง"
                            className="rounded-xl border border-[#cbdcff] bg-white px-3 py-3 text-base font-semibold outline-none focus:border-[#003399] focus:ring-4 focus:ring-blue-100"
                            value={editForm.checkout_hour || "00"}
                            onChange={(e) =>
                              setEditForm((current) => ({
                                ...current,
                                checkout_hour: e.target.value,
                              }))
                            }
                          >
                            {HOUR_OPTIONS.map((hour) => (
                              <option key={hour} value={hour}>{hour}</option>
                            ))}
                          </select>
                          <span className="text-lg font-bold text-slate-500">:</span>
                          <select
                            aria-label="นาทีออก"
                            className="rounded-xl border border-[#cbdcff] bg-white px-3 py-3 text-base font-semibold outline-none focus:border-[#003399] focus:ring-4 focus:ring-blue-100"
                            value={editForm.checkout_minute || "00"}
                            onChange={(e) =>
                              setEditForm((current) => ({
                                ...current,
                                checkout_minute: e.target.value,
                              }))
                            }
                          >
                            {MINUTE_OPTIONS.map((minute) => (
                              <option key={minute} value={minute}>{minute}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <p className="mt-2 text-xs font-medium text-[#5071a5]">
                        เวลาไทย 24 ชั่วโมง (UTC+7)
                      </p>
                    </>
                  ) : (
                    <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
                      ผู้ติดต่อยังอยู่ในพื้นที่
                    </div>
                  )}
                </div>
              </div>
              {editError && (
                <div
                  role="alert"
                  className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
                >
                  {editError}
                </div>
              )}
            </div>
            <div className="flex gap-3 bg-[#f7faff] p-6 sm:p-8">
              <button
                onClick={() => setEditingId(null)}
                disabled={isSavingEdit}
                className="flex-1 py-4 font-bold text-slate-500"
              >
                ยกเลิก
              </button>
              <button
                onClick={saveEdit}
                disabled={isSavingEdit}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#003399] py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-[#004ecc] disabled:cursor-wait disabled:opacity-70"
              >
                {isSavingEdit && <Loader2 size={18} className="animate-spin" />}
                {isSavingEdit ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
