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
  RotateCcw,
  Loader2,
  Filter,
  X,
  LogOut,
  LogIn,
  LayoutDashboard,
  MoreVertical,
  User
} from "lucide-react";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { useNavigate } from "react-router-dom";
import bgImage from '../img/n.jpg'; // ตรวจสอบ path รูปภาพ

// --- Configuration ---
const USERNAME = "1234";
const PASSWORD = "1234";
const ORG = import.meta.env.VITE_ORG_NAME || "TDK INDUSTRIAL";

const PURPOSE_TH = {
  meeting: "ประชุมงาน",
  delivery: "ส่งของ / รับของ",
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
  other: "อื่น ๆ",
};

// --- Helpers ---
const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
  hour12: false,
});

function toLocalDatetimeInput(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const translatePurpose = (purpose, other_purpose) => {
  if (purpose === "other") return other_purpose || "อื่น ๆ";
  return PURPOSE_TH[purpose] || purpose;
};

function formatDateTime(isoString) {
  if (!isoString) return "";
  return dateFormatter.format(new Date(isoString));
}

// --- Main Component ---
export default function Report() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authInput, setAuthInput] = useState({ user: "", pass: "" });
  const [visitors, setVisitors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeFilter, setActiveFilter] = useState("TODAY");
  const [searchName, setSearchName] = useState("");
  const [summary, setSummary] = useState({ today: 0, staying: 0, outToday: 0, all: 0 });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Login Logic
  const handleLogin = (e) => {
    e.preventDefault();
    if (authInput.user === USERNAME && authInput.pass === PASSWORD) {
      setIsAuthenticated(true);
    } else {
      alert("❌ รหัสผ่านไม่ถูกต้อง");
    }
  };

  // Data Loading
  const loadVisitors = useCallback(async (filterType = activeFilter) => {
    setIsLoading(true);
    let q = supabase.from("visitors").select("*").order("id", { ascending: false });

    const now = new Date();
    const tStart = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    const tEnd = new Date(now.setHours(23, 59, 59, 999)).toISOString();

    if (filterType === "TODAY") q = q.gte("checkin_time", tStart).lte("checkin_time", tEnd);
    else if (filterType === "STAYING") q = q.is("checkout_time", null);
    else if (filterType === "CHECKOUT_TODAY") q = q.gte("checkout_time", tStart).lte("checkout_time", tEnd);

    if (searchName) q = q.ilike("full_name", `%${searchName}%`);

    const { data } = await q;
    setVisitors(data || []);
    setIsLoading(false);
  }, [activeFilter, searchName]);

  const loadSummary = async () => {
    const now = new Date();
    const tStart = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    const tEnd = new Date(now.setHours(23, 59, 59, 999)).toISOString();

    const [cIn, cStay, cOut, cAll] = await Promise.all([
      supabase.from("visitors").select("id", { count: "exact", head: true }).gte("checkin_time", tStart).lte("checkin_time", tEnd),
      supabase.from("visitors").select("id", { count: "exact", head: true }).is("checkout_time", null),
      supabase.from("visitors").select("id", { count: "exact", head: true }).gte("checkout_time", tStart).lte("checkout_time", tEnd),
      supabase.from("visitors").select("id", { count: "exact", head: true }),
    ]);

    setSummary({
      today: cIn.count || 0,
      staying: cStay.count || 0,
      outToday: cOut.count || 0,
      all: cAll.count || 0,
    });
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadVisitors();
      loadSummary();
    }
  }, [isAuthenticated, loadVisitors]);

  const handleCheckOut = async (id) => {
    await supabase.from("visitors").update({ checkout_time: new Date().toISOString() }).eq("id", id);
    loadVisitors();
    loadSummary();
  };

  const deleteSelected = async () => {
    if (confirm(`ยืนยันการลบรายการที่เลือก (${selectedIds.length} รายการ)?`)) {
      await supabase.from("visitors").delete().in("id", selectedIds);
      setSelectedIds([]);
      loadVisitors();
      loadSummary();
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `url(${bgImage})`, backgroundSize: 'cover' }}></div>
        <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-12 w-full max-w-md relative z-10 animate-in fade-in zoom-in duration-500">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-xl shadow-indigo-200">
              <LayoutDashboard size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-800">{ORG}</h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-2">Report Dashboard</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Username</label>
              <input type="text" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-semibold" 
                value={authInput.user} onChange={e => setAuthInput({...authInput, user: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Password</label>
              <input type="password" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-semibold" 
                value={authInput.pass} onChange={e => setAuthInput({...authInput, pass: e.target.value})} />
            </div>
            <button type="submit" className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
              <LogIn size={20} /> เข้าสู่ระบบ
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-10">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
              <LayoutDashboard size={22} className="text-white" />
            </div>
            <div className="hidden md:block">
              <h1 className="font-black text-slate-800 leading-tight">{ORG}</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Dashboard Control</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/")} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
              <Home size={22} />
            </button>
            <button onClick={() => setIsAuthenticated(false)} className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-600 rounded-xl font-bold text-sm hover:bg-rose-100 transition-all">
              <LogOut size={18} /> <span className="hidden md:inline">ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[
            { id: "TODAY", label: "Check-in วันนี้", val: summary.today, color: "bg-indigo-600", icon: <Users /> },
            { id: "STAYING", label: "ยังไม่แจ้งออก", val: summary.staying, color: "bg-rose-500", icon: <Clock /> },
            { id: "CHECKOUT_TODAY", label: "ออกแล้ววันนี้", val: summary.outToday, color: "bg-emerald-500", icon: <CheckCircle /> },
            { id: "ALL", label: "รวมทั้งหมด", val: summary.all, color: "bg-slate-800", icon: <Calendar /> },
          ].map((item) => (
            <button 
              key={item.id}
              onClick={() => { setActiveFilter(item.id); loadVisitors(item.id); }}
              className={`p-5 md:p-6 rounded-[2rem] bg-white border-2 transition-all text-left flex flex-col justify-between h-36 md:h-44 shadow-sm hover:shadow-xl ${activeFilter === item.id ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-white'}`}
            >
              <div className={`${item.color} w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center text-white shadow-lg`}>
                {item.icon}
              </div>
              <div>
                <span className="block text-2xl md:text-3xl font-black text-slate-800">{item.val}</span>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="bg-white p-4 md:p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="ค้นหาชื่อผู้ติดต่อ..." 
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition-all font-semibold"
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadVisitors()}
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button onClick={() => loadVisitors()} className="flex-1 md:flex-none px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">ค้นหา</button>
            <button onClick={() => {setSearchName(""); setActiveFilter("TODAY"); loadVisitors("TODAY");}} className="p-3.5 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all"><RotateCcw size={22}/></button>
            {selectedIds.length > 0 && (
              <button onClick={deleteSelected} className="p-3.5 bg-rose-100 text-rose-600 rounded-2xl hover:bg-rose-200 transition-all animate-bounce"><Trash2 size={22}/></button>
            )}
            <button onClick={() => exportToExcel(visitors)} className="p-3.5 bg-emerald-100 text-emerald-600 rounded-2xl hover:bg-emerald-200 transition-all"><Download size={22}/></button>
          </div>
        </div>

        {/* List Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-black text-slate-800 px-2 flex items-center gap-2">
            <Filter size={20} className="text-indigo-600"/>
            {activeFilter === "TODAY" ? "รายการวันนี้" : activeFilter === "STAYING" ? "ยังอยู่ในบริษัท" : "ประวัติทั้งหมด"}
          </h2>

          {/* Desktop Table */}
          <div className="hidden lg:block bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="p-6 w-12 text-center">
                    <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-indigo-600" onChange={(e) => setSelectedIds(e.target.checked ? visitors.map(v => v.id) : [])}/>
                  </th>
                  <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest">ผู้มาติดต่อ / บริษัท</th>
                  <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest">วัตถุประสงค์</th>
                  <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest">เวลาเช็คอิน-เช็คเอาท์</th>
                  <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {visitors.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-6 text-center">
                      <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-indigo-600" checked={selectedIds.includes(v.id)} onChange={() => setSelectedIds(prev => prev.includes(v.id) ? prev.filter(i => i !== v.id) : [...prev, v.id])}/>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                          {v.photo_url ? <img src={v.photo_url} className="w-full h-full object-cover rounded-2xl"/> : <User size={24}/>}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-lg leading-tight">{v.full_name}</p>
                          <p className="text-sm font-bold text-indigo-500 mt-1">{v.company}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-bold text-slate-600">
                        <Building2 size={14}/> {translatePurpose(v.purpose, v.other_purpose)}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-tighter">ติดต่อ: {v.contact_person}</p>
                    </td>
                    <td className="p-6">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {formatDateTime(v.checkin_time)}
                        </div>
                        <div className={`flex items-center gap-2 text-xs font-bold ${v.checkout_time ? 'text-slate-400' : 'text-rose-500'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${v.checkout_time ? 'bg-slate-300' : 'bg-rose-500 animate-pulse'}`}></span>
                          {v.checkout_time ? formatDateTime(v.checkout_time) : "กำลังปฏิบัติงาน..."}
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex justify-center gap-2">
                        {!v.checkout_time && (
                          <button onClick={() => handleCheckOut(v.id)} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all">
                            <CheckCircle size={18}/>
                          </button>
                        )}
                        <button onClick={() => window.open(`/print/${v.id}`, "_blank")} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all">
                          <Printer size={18}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile List Card View */}
          <div className="lg:hidden space-y-4">
            {visitors.map(v => (
              <div key={v.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 overflow-hidden">
                       {v.photo_url ? <img src={v.photo_url} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-slate-300"><User/></div>}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 text-lg">{v.full_name}</h3>
                      <p className="text-xs font-bold text-indigo-500 uppercase">{v.company}</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${v.checkout_time ? 'bg-slate-100 text-slate-400' : 'bg-rose-100 text-rose-500'}`}>
                    {v.checkout_time ? 'OUT' : 'ACTIVE'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">เวลาเข้า</p>
                    <p className="text-xs font-bold text-slate-700">{formatDateTime(v.checkin_time).split(" ")[1]} น.</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">เวลาออก</p>
                    <p className="text-xs font-bold text-slate-700">{v.checkout_time ? formatDateTime(v.checkout_time).split(" ")[1] + ' น.' : '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">วัตถุประสงค์</p>
                    <p className="text-xs font-bold text-slate-700">{translatePurpose(v.purpose, v.other_purpose)}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  {!v.checkout_time && (
                    <button onClick={() => handleCheckOut(v.id)} className="flex-1 py-3 bg-emerald-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-emerald-100">Check-out</button>
                  )}
                  <button onClick={() => window.open(`/print/${v.id}`, "_blank")} className="flex-1 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2">
                    <Printer size={16}/> พิมพ์บัตร
                  </button>
                </div>
              </div>
            ))}
          </div>

          {visitors.length === 0 && !isLoading && (
            <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
               <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search size={32} className="text-slate-200"/>
               </div>
               <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">ไม่พบข้อมูลที่ค้นหา</p>
            </div>
          )}
        </div>
      </main>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[100] bg-white/60 backdrop-blur-sm flex items-center justify-center">
          <Loader2 className="text-indigo-600 animate-spin" size={40} />
        </div>
      )}
    </div>
  );

  async function exportToExcel(data) {
    if (data.length === 0) return alert("ไม่มีข้อมูลสำหรับการส่งออก");
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Visitor Log");
    ws.columns = [
      { header: "ชื่อ-นามสกุล", key: "name", width: 25 },
      { header: "บริษัท", key: "company", width: 25 },
      { header: "เรื่องที่ติดต่อ", key: "purpose", width: 20 },
      { header: "เวลาเช็คอิน", key: "checkin", width: 25 },
      { header: "เวลาเช็คเอาท์", key: "checkout", width: 25 },
    ];
    data.forEach(v => {
      ws.addRow({
        name: v.full_name,
        company: v.company,
        purpose: translatePurpose(v.purpose, v.other_purpose),
        checkin: formatDateTime(v.checkin_time),
        checkout: v.checkout_time ? formatDateTime(v.checkout_time) : "-"
      });
    });
    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Visitor_Report_${new Date().toLocaleDateString()}.xlsx`);
  }
}