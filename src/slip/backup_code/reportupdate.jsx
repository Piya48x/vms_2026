import { Search, Calendar, Users, Clock, CheckCircle, Printer, Trash2, Download, Home, Edit, Save, X, Building2, UserCircle, RotateCcw, Loader2, Filter } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { useNavigate } from "react-router-dom";

// --- Constants ---
const USERNAME = "1234";
const PASSWORD = "1234";
const ORG = import.meta.env.VITE_ORG_NAME || "JUST-ID VISITOR";

// --- Helpers ---
const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const translatePurpose = (purpose, other_purpose) => {
  const mapping = {
    "meeting": "ติดต่อประสานงาน / ประชุม",
    "delivery": "ส่งของ / รับของ",
    "maintenance": "ซ่อมบำรุง / ติดตั้ง",
    "visit": "เยี่ยมชมหน่วยงาน",
    "other": other_purpose || "อื่นๆ"
  };
  return mapping[purpose] || purpose;
};

function formatDateTime(isoString) {
  if (!isoString) return "";
  return dateFormatter.format(new Date(isoString));
}

function formatForInput(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

function calculateDuration(checkinTime, checkoutTime) {
  if (!checkinTime) return "—";
  const start = new Date(checkinTime);
  const end = checkoutTime ? new Date(checkoutTime) : new Date();
  const diffMs = end - start;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins} นาที`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours} ชม. ${mins} นาที`;
}

export default function Report() {
  const [visitors, setVisitors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchStart, setSearchStart] = useState("");
  const [searchEnd, setSearchEnd] = useState("");
  const [searchName, setSearchName] = useState("");
  const [activeFilter, setActiveFilter] = useState("TODAY");

  const [summary, setSummary] = useState({ today: 0, staying: 0, outToday: 0, all: 0 });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const navigate = useNavigate();
  const hasPromptedRef = useRef(false);

  useEffect(() => {
    if (hasPromptedRef.current) return;
    hasPromptedRef.current = true;
    const u = prompt("กรอก Username:");
    const p = prompt("กรอก Password:");
    if (!(u === USERNAME && p === PASSWORD)) {
      alert("❌ ข้อมูลไม่ถูกต้อง");
      navigate("/");
    }
  }, [navigate]);

  const loadVisitors = async (filterType = activeFilter) => {
    setIsLoading(true);
    let q = supabase.from("visitors").select("*").order("id", { ascending: false });
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    const todayEnd = new Date(now.setHours(23, 59, 59, 999)).toISOString();

    if (filterType === "TODAY") {
      q = q.gte("checkin_time", todayStart).lte("checkin_time", todayEnd);
    } else if (filterType === "STAYING") {
      q = q.is("checkout_time", null);
    } else if (filterType === "CHECKOUT_TODAY") {
      q = q.gte("checkout_time", todayStart).lte("checkout_time", todayEnd);
    } else if (filterType === "CUSTOM") {
      if (searchStart) q = q.gte("checkin_time", `${searchStart}T00:00:00`);
      if (searchEnd) q = q.lte("checkin_time", `${searchEnd}T23:59:59`);
      if (searchName) q = q.ilike("full_name", `%${searchName}%`);
    }

    const { data, error } = await q;
    if (!error) {
      setVisitors(data || []);
      setSelectedIds([]); 
    }
    // หน่วงเวลาเล็กน้อยเพื่อให้ Animation ดูสมูท
    setTimeout(() => setIsLoading(false), 400);
  };

  const loadSummary = async () => {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    const todayEnd = new Date(now.setHours(23, 59, 59, 999)).toISOString();
    
    const { count: cToday } = await supabase.from("visitors").select("id", { count: "exact", head: true }).gte("checkin_time", todayStart).lte("checkin_time", todayEnd);
    const { count: cUncheck } = await supabase.from("visitors").select("id", { count: "exact", head: true }).is("checkout_time", null);
    const { count: cOutToday } = await supabase.from("visitors").select("id", { count: "exact", head: true }).gte("checkout_time", todayStart).lte("checkout_time", todayEnd);
    const { count: cAll } = await supabase.from("visitors").select("id", { count: "exact", head: true });

    setSummary({ today: cToday || 0, staying: cUncheck || 0, outToday: cOutToday || 0, all: cAll || 0 });
  };

  useEffect(() => {
    loadVisitors("TODAY");
    loadSummary();
  }, []);

  // --- Actions ---
  const handleCheckOut = async (id) => {
    await supabase.from("visitors").update({ checkout_time: new Date().toISOString() }).eq("id", id);
    loadVisitors(); loadSummary();
  };

  const saveEdit = async () => {
    const { error } = await supabase.from("visitors").update({
      full_name: editForm.full_name,
      company: editForm.company,
      checkin_time: editForm.checkin_time || null,
      checkout_time: editForm.checkout_time || null
    }).eq("id", editingId);

    if (!error) {
      setEditingId(null);
      loadVisitors();
      loadSummary();
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`⚠️ ยืนยันการลบข้อมูลที่เลือกทั้งหมด ${selectedIds.length} รายการ?`)) {
      const { error } = await supabase.from("visitors").delete().in("id", selectedIds);
      if (!error) {
        setSelectedIds([]);
        loadVisitors();
        loadSummary();
      }
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === visitors.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(visitors.map(v => v.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
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
    { header: "ระยะเวลา", key: "duration", width: 20 }, // คอลัมน์ที่เพิ่มใหม่
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
      checkout_time: v.checkout_time ? formatDateTime(v.checkout_time) : "ยังไม่ออก",
      duration: calculateDuration(v.checkin_time, v.checkout_time), // เรียกใช้ helper เดิม
      photo: "",
    });
    
    row.height = 60; // เพิ่มความสูงเพื่อให้เห็นรูปชัดขึ้น

    // จัดรูปแบบแถวสลับสี
    if (row.number % 2 === 0) {
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    }

    // จัดวางตำแหน่งและเส้นขอบ
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFCBD5E1" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } },
      };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    });

    // --- ใส่รูป (กรณีใช้ URL จาก Supabase Storage หรือ Image URL) ---
    const imageSource = v.visitor_image || v.photo_url; // รองรับทั้ง base64 และ url
    if (imageSource) {
      try {
        let buf;
        let ext = "png";

        if (imageSource.startsWith('data:image')) {
          // ถ้าเป็น Base64
          buf = Buffer.from(imageSource.split(',')[1], 'base64');
        } else {
          // ถ้าเป็น URL
          const res = await fetch(imageSource);
          buf = await res.arrayBuffer();
        }

        const imgId = wb.addImage({ buffer: buf, extension: ext });
        ws.addImage(imgId, {
          tl: { col: 9, row: row.number - 1 },
          ext: { width: 80, height: 75 },
          editAs: 'oneCell'
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
  
  const stayingCount = rows.filter(r => !r.checkout_time).length;
  const outCount = rows.length - stayingCount;

  ws.getRow(lastRowNumber + 2).getCell(1).value = `ออกแล้ว: ${outCount} | ยังไม่กลับ: ${stayingCount}`;

  // --- Save File ---
  const buf = await wb.xlsx.writeBuffer();
  const dateStr = new Date().toISOString().split('T')[0];
  saveAs(new Blob([buf]), `Visitor_Report_${ORG}_${dateStr}.xlsx`);
};


  // --- Helper UI สำหรับบอกสถานะการค้นหา ---
  const getFilterStatusText = () => {
    if (activeFilter === "TODAY") return "รายการผู้ติดต่อวันนี้";
    if (activeFilter === "STAYING") return "รายการที่ยังไม่ Check-out";
    if (activeFilter === "CHECKOUT_TODAY") return "รายการที่ออกวันนี้";
    if (activeFilter === "ALL") return "ข้อมูลทั้งหมดในระบบ";
    if (activeFilter === "CUSTOM") {
      let text = "ค้นหาแบบกำหนดเอง";
      if (searchName) text += `: "${searchName}"`;
      if (searchStart || searchEnd) text += ` (${searchStart || '...'} ถึง ${searchEnd || '...'})`;
      return text;
    }
    return "";
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 pb-20 relative">
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[100] bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center transition-all animate-in fade-in duration-300">
            <div className="bg-white p-8 rounded-[2rem] shadow-2xl flex flex-col items-center gap-4">
                <Loader2 size={48} className="text-indigo-600 animate-spin" />
                <p className="font-black text-slate-600 tracking-tight text-lg">กำลังโหลดข้อมูล...</p>
            </div>
        </div>
      )}

      <nav className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50 px-6 lg:px-10 py-5 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-5">
          <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-xl shadow-indigo-200">
            <Users size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-black text-xl lg:text-2xl text-slate-800 tracking-tight leading-none">{ORG}</h1>
            <p className="text-[10px] lg:text-[11px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-1">Report Dashboard</p>
          </div>
        </div>
        <div className="flex gap-2 lg:gap-3">
          {selectedIds.length > 0 && (
            <button onClick={deleteSelected} className="flex items-center gap-2 px-4 lg:px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-rose-100 active:scale-95 animate-in slide-in-from-right-4">
              <Trash2 size={18} /> <span className="hidden lg:inline">ลบที่เลือก</span> ({selectedIds.length})
            </button>
          )}
          <button 
            onClick={exportToExcel} 
            disabled={selectedIds.length === 0}
            className={`flex items-center gap-2 px-4 lg:px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg active:scale-95 ${selectedIds.length > 0 ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-100' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
          >
            <Download size={18} /> <span className="hidden lg:inline">Export Excel</span> ({selectedIds.length})
          </button>
          <button onClick={() => navigate("/")} className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition-all active:scale-90"><Home size={22} /></button>
        </div>
      </nav>

      <div className="max-w-[1600px] mx-auto p-6 lg:p-10 space-y-8">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { id: "TODAY", label: "Check-in วันนี้", val: summary.today, icon: <Users />, color: "border-indigo-500 text-indigo-600", bg: "bg-indigo-50" },
            { id: "STAYING", label: "ยังอยู่ในพื้นที่", val: summary.staying, icon: <Clock />, color: "border-rose-500 text-rose-600", bg: "bg-rose-50", ping: true },
            { id: "CHECKOUT_TODAY", label: "Check-out วันนี้", val: summary.outToday, icon: <CheckCircle />, color: "border-emerald-500 text-emerald-600", bg: "bg-emerald-50" },
            { id: "ALL", label: "ทั้งหมดในระบบ", val: summary.all, icon: <Calendar />, color: "border-slate-500 text-slate-600", bg: "bg-slate-50" }
          ].map((item) => (
            <button key={item.id} onClick={() => {setActiveFilter(item.id); loadVisitors(item.id);}} 
                    className={`bg-white p-6 lg:p-8 rounded-[2.5rem] shadow-sm border-2 flex items-center justify-between transition-all hover:shadow-xl hover:-translate-y-1 text-left ${activeFilter === item.id ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-transparent'}`}>
              <div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                <p className="text-4xl lg:text-5xl font-black tracking-tighter text-slate-800">{item.val.toLocaleString()}</p>
              </div>
              <div className={`p-4 lg:p-5 rounded-[1.5rem] ${item.bg} ${item.color} relative`}>
                {item.icon}
                {item.ping && item.val > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full animate-ping border-4 border-white"></span>}
              </div>
            </button>
          ))}
        </div>

        {/* Filter Section */}
        <div className="bg-white p-6 lg:p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col lg:flex-row gap-6 items-end">
          <div className="relative flex-1 w-full">
            <label className="text-[11px] font-black text-slate-400 px-2 mb-2 block uppercase tracking-wider">ค้นหารายชื่อ / บริษัท</label>
            <div className="relative">
                <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
                <input type="text" placeholder="ระบุชื่อหรือบริษัทที่ต้องการค้นหา..." value={searchName} onChange={e => setSearchName(e.target.value)} 
                    className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white focus:ring-4 focus:ring-indigo-50/50 rounded-[1.5rem] outline-none transition-all text-base font-semibold" />
            </div>
          </div>
          <div className="flex gap-4 w-full lg:w-auto">
            <div className="flex flex-col gap-2 flex-1 lg:flex-none">
              <label className="text-[11px] font-black text-slate-400 px-2 uppercase tracking-wider">ตั้งแต่วันที่</label>
              <input type="date" value={searchStart} onChange={e => setSearchStart(e.target.value)} className="bg-slate-50 px-5 py-4 rounded-2xl text-sm font-bold border-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex flex-col gap-2 flex-1 lg:flex-none">
              <label className="text-[11px] font-black text-slate-400 px-2 uppercase tracking-wider">ถึงวันที่</label>
              <input type="date" value={searchEnd} onChange={e => setSearchEnd(e.target.value)} className="bg-slate-50 px-5 py-4 rounded-2xl text-sm font-bold border-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="flex gap-2 w-full lg:w-auto">
            <button onClick={() => { setActiveFilter("CUSTOM"); loadVisitors("CUSTOM"); }} className="flex-1 lg:flex-none px-10 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-sm hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 active:scale-95">
                ค้นหาข้อมูล
            </button>
            <button onClick={() => {setSearchName(""); setSearchStart(""); setSearchEnd(""); loadVisitors("TODAY"); setActiveFilter("TODAY");}} className="p-4 bg-slate-100 text-slate-500 rounded-2xl hover:bg-rose-50 hover:text-rose-500 transition-all" title="รีเซ็ต"><RotateCcw size={22}/></button>
          </div>
        </div>

        {/* Current Filter Indicator & Result Count */}
        <div className="flex flex-col sm:flex-row justify-between items-center px-6 gap-4">
            <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 px-5 py-2.5 rounded-2xl animate-in fade-in slide-in-from-left-4">
                <Filter size={16} className="text-indigo-600" />
                <span className="text-sm font-black text-indigo-700">{getFilterStatusText()}</span>
            </div>
            <div className="text-slate-500 font-bold text-sm bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-slate-100">
                พบทั้งหมด <span className="text-indigo-600 text-lg font-black mx-1">{visitors.length}</span> รายการ
            </div>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden transition-all">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="p-7 text-center w-20">
                    <input type="checkbox" className="w-5 h-5 cursor-pointer accent-indigo-600 rounded-lg" checked={visitors.length > 0 && selectedIds.length === visitors.length} onChange={toggleSelectAll} />
                  </th>
                  <th className="p-7 text-[12px] font-black text-slate-400 uppercase tracking-widest">ข้อมูลผู้ติดต่อ</th>
                  <th className="p-7 text-[12px] font-black text-slate-400 uppercase tracking-widest">บริษัท & วัตถุประสงค์</th>
                  <th className="p-7 text-[12px] font-black text-slate-400 uppercase tracking-widest">สถานะเวลา (24H)</th>
                  <th className="p-7 text-[12px] font-black text-slate-400 uppercase tracking-widest text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {visitors.map((v) => (
                  <tr key={v.id} className={`group hover:bg-slate-50/50 transition-all ${selectedIds.includes(v.id) ? 'bg-indigo-50/40' : ''}`}>
                    <td className="p-7 text-center">
                      <input type="checkbox" className="w-5 h-5 cursor-pointer accent-indigo-600 rounded-lg" checked={selectedIds.includes(v.id)} onChange={() => toggleSelect(v.id)} />
                    </td>
                    <td className="p-7">
                      {editingId === v.id ? (
                        <input className="border-2 border-indigo-100 rounded-2xl p-4 w-full text-base font-semibold focus:ring-4 focus:ring-indigo-50 outline-none" value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} />
                      ) : (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-3">
                             <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-black text-slate-400">#{v.id}</span>
                             <div className="font-black text-slate-800 text-lg lg:text-xl tracking-tight leading-tight">{v.full_name}</div>
                          </div>
                          <div className="flex items-center gap-2 text-indigo-500 font-bold text-[11px] uppercase bg-indigo-50 w-fit px-3 py-1 rounded-full border border-indigo-100">
                            <UserCircle size={14} /> ติดต่อ: {v.contact_person || "ไม่ระบุ"}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="p-7">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-slate-700 font-extrabold text-base">
                          <Building2 size={18} className="text-slate-300" />
                          {editingId === v.id ? (
                            <input className="border-2 border-indigo-100 rounded-xl p-2 text-sm w-full outline-none" value={editForm.company} onChange={e => setEditForm({...editForm, company: e.target.value})} />
                          ) : ( v.company || "ทั่วไป" )}
                        </div>
                        <div className="inline-flex px-4 py-1.5 bg-white border-2 border-slate-100 text-slate-500 rounded-[1rem] text-[10px] font-black uppercase tracking-wide">
                          {translatePurpose(v.purpose, v.other_purpose)}
                        </div>
                      </div>
                    </td>
                    <td className="p-7">
                      {editingId === v.id ? (
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-col gap-1">
                             <span className="text-[10px] font-bold text-emerald-600 ml-1">Check-in</span>
                             <input type="datetime-local" step="1" className="bg-emerald-50 p-3 rounded-xl text-xs font-black border-none" value={editForm.checkin_time} onChange={e => setEditForm({...editForm, checkin_time: e.target.value})} />
                          </div>
                          <div className="flex flex-col gap-1">
                             <span className="text-[10px] font-bold text-rose-600 ml-1">Check-out</span>
                             <input type="datetime-local" step="1" className="bg-rose-50 p-3 rounded-xl text-xs font-black border-none" value={editForm.checkout_time} onChange={e => setEditForm({...editForm, checkout_time: e.target.value})} />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 font-mono">
                          <div className="flex items-center gap-4 text-slate-400">
                            <span className="w-14 text-center font-black text-[10px] bg-slate-100 rounded-lg py-1">เข้า</span>
                            <span className="font-bold text-slate-700 text-sm">{formatDateTime(v.checkin_time)}</span>
                          </div>
                          <div className={`flex items-center gap-4 ${v.checkout_time ? 'text-emerald-600' : 'text-rose-500'}`}>
                            <span className={`w-14 text-center font-black text-[10px] rounded-lg py-1 ${v.checkout_time ? 'bg-emerald-100' : 'bg-rose-100 animate-pulse'}`}>ออก</span>
                            <span className="font-bold text-sm">{v.checkout_time ? formatDateTime(v.checkout_time) : "STAYING IN"}</span>
                          </div>
                          <div className="mt-1 text-[11px] font-black text-slate-400 flex items-center gap-2 pl-1 bg-slate-50 w-fit pr-3 py-1 rounded-lg border border-slate-100">
                             <Clock size={12} className="text-slate-300"/> {calculateDuration(v.checkin_time, v.checkout_time)}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="p-7">
                      <div className="flex justify-center items-center gap-3">
                        {editingId === v.id ? (
                          <>
                            <button onClick={saveEdit} className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg active:scale-90 hover:bg-indigo-700 transition-colors"><Save size={20} /></button>
                            <button onClick={() => setEditingId(null)} className="p-4 bg-slate-200 text-slate-600 rounded-2xl active:scale-90 hover:bg-slate-300 transition-colors"><X size={20} /></button>
                          </>
                        ) : (
                          <>
                            {!v.checkout_time && (
                              <button onClick={() => handleCheckOut(v.id)} className="p-3.5 bg-emerald-500 text-white rounded-2xl shadow-lg active:scale-90 hover:bg-emerald-600 transition-colors" title="Check-out">
                                <CheckCircle size={20} />
                              </button>
                            )}
                            <button onClick={() => { setEditingId(v.id); setEditForm({ ...v, checkin_time: formatForInput(v.checkin_time), checkout_time: v.checkout_time ? formatForInput(v.checkout_time) : "" }); }} className="p-3.5 bg-white border-2 border-slate-100 text-indigo-600 rounded-2xl hover:bg-indigo-50 transition-colors" title="แก้ไข">
                              <Edit size={20} />
                            </button>
                            <button onClick={() => window.open(`/print/${v.id}`, "_blank")} className="p-3.5 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl hover:bg-slate-50 transition-colors" title="พิมพ์">
                              <Printer size={20} />
                            </button>
                            <button onClick={async () => { if(confirm("ลบข้อมูลคิวนี้?")) { await supabase.from("visitors").delete().eq("id", v.id); loadVisitors(); loadSummary(); } }} className="p-3.5 bg-white border-2 border-slate-100 text-rose-500 rounded-2xl hover:bg-rose-50 transition-colors" title="ลบ">
                              <Trash2 size={20} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!isLoading && visitors.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-32 text-center">
                        <div className="flex flex-col items-center gap-4 opacity-40">
                            <Search size={64} className="text-slate-300" />
                            <p className="text-slate-400 font-black italic text-xl">— ไม่พบรายการข้อมูลที่ตรงตามเงื่อนไข —</p>
                            <button onClick={() => {setActiveFilter("TODAY"); loadVisitors("TODAY");}} className="mt-4 text-indigo-600 font-bold underline underline-offset-4">ล้างการค้นหา</button>
                        </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}