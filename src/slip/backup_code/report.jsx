import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { useNavigate } from "react-router-dom";

const USERNAME = "1234";
const PASSWORD = "1234";
const ORG = import.meta.env.VITE_ORG_NAME || "Just-iD Visitor";
const SITE = import.meta.env.VITE_SITE_NAME || "Global Securitech";

// 🕓 ฟังก์ชันแปลงเวลาให้เป็นรูปแบบเดียวกันทั่วระบบ
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function formatDateTime(isoString) {
  if (!isoString) return "";
  return dateFormatter.format(new Date(isoString));
}

export default function Report() {
  // ---------------- STATE ----------------
  const [visitors, setVisitors] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  const [searchStart, setSearchStart] = useState("");
  const [searchEnd, setSearchEnd] = useState("");
  const [searchName, setSearchName] = useState("");

  // summary counters
  const [countToday, setCountToday] = useState(0);
  const [countUncheckout, setCountUncheckout] = useState(0);
  const [countRange, setCountRange] = useState(0);
  const [countCheckoutToday, setCountCheckoutToday] = useState(0);

  const printedIdsRef = useRef(new Set());
  const hasPromptedRef = useRef(false);
  const navigate = useNavigate();

  // ---------------- LOGIN ONCE ----------------
  useEffect(() => {
    if (hasPromptedRef.current) return;
    hasPromptedRef.current = true;
    const u = prompt("กรอก Username:");
    const p = prompt("กรอก Password:");
    if (!(u === USERNAME && p === PASSWORD)) {
      alert("❌ Username หรือ Password ไม่ถูกต้อง");
      navigate("/");
    }
  }, [navigate]);

  // ---------------- HELPERS ----------------
  const startOfDay = (d = new Date()) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const endOfDay = (d = new Date()) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  };

  const toISO = (d) => new Date(d).toISOString();

  // ---------------- LOADERS ----------------
  const loadVisitors = async (startDate = "", endDate = "", name = "") => {
    let q = supabase
      .from("visitors")
      .select("*")
      .order("id", { ascending: false });

    if (startDate) {
      const s = startOfDay(new Date(startDate));
      q = q.gte("checkin_time", s.toISOString());
    }
    if (endDate) {
      const e = endOfDay(new Date(endDate));
      q = q.lte("checkin_time", e.toISOString());
    }
    if (name) q = q.ilike("full_name", `%${name}%`);

    const { data, error } = await q;
    if (!error) setVisitors(data || []);
  };

  const loadSummary = async (startDate = "", endDate = "") => {
    // วันนี้
    const tStart = startOfDay();
    const tEnd = endOfDay();

    // 1) วันนี้เช็คอินกี่คน
    {
      const { count } = await supabase
        .from("visitors")
        .select("id", { count: "exact", head: true })
        .gte("checkin_time", tStart.toISOString())
        .lte("checkin_time", tEnd.toISOString());
      setCountToday(count || 0);
    }

    // 2) ยังไม่เช็คเอาท์ (ทั้งหมดตอนนี้)
    {
      const { count } = await supabase
        .from("visitors")
        .select("id", { count: "exact", head: true })
        .is("checkout_time", null);
      setCountUncheckout(count || 0);
    }

    // 3) จำนวนในช่วงวันที่ที่กำลังกรอง (ถ้าไม่เลือกช่วง ให้เท่ากับทั้งหมด)
    {
      let q = supabase
        .from("visitors")
        .select("id", { count: "exact", head: true });
      if (startDate)
        q = q.gte(
          "checkin_time",
          startOfDay(new Date(startDate)).toISOString()
        );
      if (endDate)
        q = q.lte("checkin_time", endOfDay(new Date(endDate)).toISOString());
      const { count } = await q;
      setCountRange(count || 0);
    }

    // 4) เช็คเอาท์แล้ววันนี้
    {
      const { count } = await supabase
        .from("visitors")
        .select("id", { count: "exact", head: true })
        .gte("checkout_time", tStart.toISOString())
        .lte("checkout_time", tEnd.toISOString());
      setCountCheckoutToday(count || 0);
    }
  };

  // init load
  useEffect(() => {
    loadVisitors();
    loadSummary();
  }, []);

  // reload summary when filters change (เพื่อให้ countRange ตามช่วง)
  useEffect(() => {
    loadSummary(searchStart, searchEnd);
  }, [searchStart, searchEnd]);

  // ---------------- REALTIME ----------------
  useEffect(() => {
    const channel = supabase
      .channel("visitors-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "visitors" },
        (payload) => {
          // refresh list ตาม filter ปัจจุบัน
          loadVisitors(searchStart, searchEnd, searchName);
          // refresh summary counters
          loadSummary(searchStart, searchEnd);

          // auto print เมื่อมี insert (ครั้งเดียว)
          if (payload.eventType === "INSERT") {
            const v = payload.new;
            if (v?.id && !printedIdsRef.current.has(v.id)) {
              printedIdsRef.current.add(v.id);
              window.open(`/print/${v.id}`, "_blank");
            }
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [searchStart, searchEnd, searchName]);

  // ---------------- ACTIONS ----------------
  const checkOut = async (id) => {
    await supabase
      .from("visitors")
      .update({ checkout_time: new Date().toISOString() })
      .eq("id", id);
    await loadVisitors(searchStart, searchEnd, searchName);
    await loadSummary(searchStart, searchEnd);
  };

  const deleteVisitor = async (ids) => {
    if (!ids.length) return alert("กรุณาเลือกรายการก่อน");
    if (!confirm("ต้องการลบรายการที่เลือกใช่หรือไม่?")) return;
    await supabase.from("visitors").delete().in("id", ids);
    setSelectedIds([]);
    await loadVisitors(searchStart, searchEnd, searchName);
    await loadSummary(searchStart, searchEnd);
  };

  // แปลไทย purpose
  const translatePurpose = (p, other) => {
    const map = {
      delivery: "ส่งของ",
      meeting: "ประชุม",
      interview: "สัมภาษณ์งาน",
      customer: "ลูกค้า",
      maintenance: "เข้าซ่อม/บริการ",
      service: "เข้าซ่อม/บริการ",
      visit: "เยี่ยมชม",
    };
    if (p === "other") return other || "อื่นๆ";
    return map[p] || p || "";
  };

  // Export Excel (หัวตารางไทย + แปลไทย)
  // ✅ Export Excel Professional Style
  const exportToExcel = async (ids) => {
    const rows = ids.length
      ? visitors.filter((v) => ids.includes(v.id))
      : visitors;
    if (!rows.length) return alert("กรุณาเลือกรายการก่อน");

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Visitors Report");

    // --- Define Columns ---
    ws.columns = [
      { header: "ID", key: "id", width: 12 },
      { header: "ชื่อ", key: "full_name", width: 25 },
      { header: "เพศ", key: "gender", width: 10 },
      { header: "ติดต่อ", key: "contact_person", width: 20 },
      { header: "บริษัท", key: "company", width: 20 },
      { header: "ทะเบียนรถ", key: "vehicle_plate", width: 15 },
      { header: "ประสงค์", key: "purpose", width: 25 },
      { header: "เวลาเข้า", key: "checkin_time", width: 22 },
      { header: "เวลาออก", key: "checkout_time", width: 22 },
      { header: "รูปถ่าย", key: "photo", width: 18 },
    ];

    // --- Header Style ---
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E3A8A" },
    };
    headerRow.height = 24;
    ws.views = [{ state: "frozen", ySplit: 1 }];
    ws.autoFilter = "A1:J1";

    // --- Add Data Rows ---
    const PHOTO_COL = "J";

    for (const v of rows) {
      const row = ws.addRow({
        id: String(v.id).padStart(5, "0"),
        full_name: v.full_name || "",
        gender: v.gender || "",
        contact_person: v.contact_person || "",
        company: v.company || "",
        vehicle_plate: v.vehicle_plate || "",
        purpose: translatePurpose(v.purpose, v.other_purpose),
        checkin_time: formatDateTime(v.checkin_time),
        checkout_time: formatDateTime(v.checkout_time),

        photo: "",
      });
      row.height = 45;

      // แถวคู่สลับสี (อ่านง่าย)
      if (row.number % 2 === 0) {
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        };
      }

      // ใส่เส้นกรอบทุกเซลล์
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

      // --- ใส่รูป ---
      if (v.photo_url) {
        try {
          const res = await fetch(v.photo_url);
          const buf = await res.arrayBuffer();
          const contentType = res.headers.get("content-type") || "";
          const ext = contentType.includes("png") ? "png" : "jpeg";
          const imgId = wb.addImage({ buffer: buf, extension: ext });
          const cellRef = `${PHOTO_COL}${row.number}:${PHOTO_COL}${row.number}`;
          ws.addImage(imgId, cellRef);
        } catch (err) {
          console.warn("ไม่สามารถโหลดรูป", v.photo_url, err);
        }
      }
    }

    // --- ใส่กรอบให้ Header ด้วย ---
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFFFFFFF" } },
        left: { style: "thin", color: { argb: "FFFFFFFF" } },
        bottom: { style: "thin", color: { argb: "FFFFFFFF" } },
        right: { style: "thin", color: { argb: "FFFFFFFF" } },
      };
    });

    // --- Save File ---
    const buf = await wb.xlsx.writeBuffer();
    const filename = `visitors_report_${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`;
    saveAs(new Blob([buf], { type: "application/octet-stream" }), filename);
  };

  // toggle select
  const toggleSelect = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const toggleSelectAll = () =>
    setSelectedIds(
      selectedIds.length === visitors.length ? [] : visitors.map((v) => v.id)
    );

  // quick filters
  const showToday = () => {
    const t = new Date().toISOString().slice(0, 10);
    setSearchStart(t);
    setSearchEnd(t);
    setSearchName("");
    loadVisitors(t, t, "");
    loadSummary(t, t);
  };

  const showAll = () => {
    setSearchStart("");
    setSearchEnd("");
    setSearchName("");
    loadVisitors();
    loadSummary();
  };

  const showUncheckout = async () => {
    const { data, error } = await supabase
      .from("visitors")
      .select("*")
      .is("checkout_time", null)
      .order("checkin_time", { ascending: false });
    if (!error) setVisitors(data || []);
    // summary ยังคงคำนวณตามจริง (ไม่เปลี่ยน)
  };

  // ---------------- RENDER ----------------
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
   {/* NAVBAR: ORG / SITE + actions */}
<nav className="noprint sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
  <div className="container mx-auto px-4">
    <div className="flex items-center justify-between h-14">
      {/* Left: Brand + Org/Site */}
      <div className="flex items-center gap-3">

        <div className="flex flex-col leading-tight">
          <span style={{ fontWeight: 700, fontSize:30 }} className="font-semibold text-gray-900">{ORG}</span>
          <br />
          <br />
          <span style={{ fontWeight: 700, fontSize:30 }} className="text-xs text-gray-500">📍 {SITE}</span>
        </div>
      </div>
<br />
      {/* Right: Quick actions (ถ้าต้องการเพิ่มลิงก์ไปหน้าอื่น กดเพิ่มได้) */}
      <div className="flex items-center gap-2">
        {/* <button
          onClick={() => {
            // ไปหน้า Dashboard ถ้ามี
            // navigate('/dashboard') // ถ้าใช้ router หลายหน้า
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
          style={{ marginRight: 10 }}
        >
          Dashboard
        </button>  */}
        {/* <button
          onClick={() => window.location.reload()}
          className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          รีเฟรช
        </button> */}
      </div>
    </div>
  </div>
</nav>


      <br />

      {/* Summary Cards (Table-like) */}
     {/* STATUS BAR (Compact) */}
<div className="noprint">
  <div className="rounded-xl border border-gray-200 bg-white shadow-sm px-3 py-2">
    <div className="flex flex-wrap items-center gap-2">
      {/* วันนี้เช็คอิน */}
      <span style={{marginRight: 20}} className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5">
        <span className="text-indigo-700">📥</span>
        <span className="text-xs text-indigo-800">
          วันนี้เช็คอิน: <b className="font-semibold">{countToday}</b>
        </span>
      </span>

      {/* ยังอยู่ในพื้นที่ */}
      <span style={{marginRight: 20}} className="inline-flex items-center gap-1.5 rounded-lg border border-pink-200 bg-pink-50 px-3 py-1.5">
        <span className="text-pink-700">🚧</span>
        <span className="text-xs text-pink-800">
          ยังอยู่ในพื้นที่: <b className="font-semibold">{countUncheckout}</b>
        </span>
        {/* live ping */}
        <span className="relative ml-1 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
      </span>

      {/* จำนวนรวมทั้งหมด (หรือช่วงที่กรอง) */}
    

      {/* เช็คเอาท์แล้ววันนี้ */}
      <span style={{marginRight: 20}} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5">
        <span className="text-emerald-700">✅</span>
        <span className="text-xs text-emerald-800">
          เช็คเอาท์แล้ววันนี้: <b className="font-semibold">{countCheckoutToday}</b>
        </span>
      </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5">
        <span className="text-amber-700">🗓️</span>
        <span className="text-xs text-amber-800">
          รวมทั้งหมด: <b className="font-semibold">{countRange}</b>
        </span>
        {/* {(searchStart || searchEnd) && (
          <span className="ml-2 text-[11px] text-amber-700/80">
            {searchStart || '—'} → {searchEnd || '—'}
          </span>
        )} */}
      </span>
    </div>
    
  </div>
  
</div>



<br /><br /><hr />

      <br />

      {/* Search & Action Bar */}
      <div className="noprint rounded-xl bg-white/80 backdrop-blur p-5 shadow-md border border-gray-200">
        <div className="flex flex-wrap items-end gap-4">
          {/* จากวันที่ */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-600 mb-1">
              จากวันที่
            </label>
            <input
              type="date"
              value={searchStart}
              onChange={(e) => setSearchStart(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            />
          </div>

          {/* ถึงวันที่ */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-600 mb-1">
              ถึงวันที่
            </label>
            <input
              type="date"
              value={searchEnd}
              onChange={(e) => setSearchEnd(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            />
          </div>

          {/* ค้นหาชื่อ */}
          <div className="flex flex-col flex-1 min-w-[200px]">
            <label className="text-sm font-medium text-gray-600 mb-1">
              ชื่อผู้มาติดต่อ
            </label>
            <input
              type="text"
              placeholder="🔎 พิมพ์ชื่อเพื่อตรวจสอบ..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            />
          </div>
          <br />

          {/* ปุ่มคำสั่ง */}
          <div className="flex flex-wrap gap-3 mt-2">
            <button
              onClick={() => loadVisitors(searchStart, searchEnd, searchName)}
              className="ml-8 custom-btn bg-blue-500 text-white px-4 py-2 rounded shadow hover:bg-blue-600 active:scale-[.98] transition"
              style={{ marginRight: 10 }}
            >
               ค้นหา
            </button>

            <button
              onClick={showToday}
              className="ml-8 custom-btn bg-blue-500 text-white px-4 py-2 rounded shadow hover:bg-blue-600 active:scale-[.98] transition"
              style={{ marginRight: 10 }}
            >
               เฉพาะวันนี้
            </button>

            <button
              onClick={showAll}
              className="ml-8 custom-btn bg-blue-500 text-white px-4 py-2 rounded shadow hover:bg-blue-600 active:scale-[.98] transition"
              style={{ marginRight: 10 }}
            >
               แสดงทั้งหมด
            </button>

            <button
              onClick={showUncheckout}
              className="ml-8 custom-btn bg-blue-500 text-white px-4 py-2 rounded shadow hover:bg-blue-600 active:scale-[.98] transition"
              style={{ marginRight: 10 }}
            >
               ยังไม่เช็คเอาท์
            </button>

            <button
              onClick={() => exportToExcel(selectedIds)}
              className="ml-8 custom-btn bg-blue-500 text-white px-4 py-2 rounded shadow hover:bg-blue-600 active:scale-[.98] transition"
              style={{ marginRight: 10 }}
            >
               Export Excel
            </button>

            <button
              onClick={() => deleteVisitor(selectedIds)}
              className="ml-8 custom-btn bg-blue-500 text-white px-4 py-2 rounded shadow hover:bg-blue-600 active:scale-[.98] transition"
              style={{ marginRight: 10 }}
            >
               ลบ
            </button>

            <button
              onClick={() => navigate("/")}
              className="ml-8 custom-btn bg-blue-500 text-white px-4 py-2 rounded shadow hover:bg-blue-600 active:scale-[.98] transition"
              style={{ marginRight: 10 }}
            >
               หน้าหลัก
            </button>
          </div>
          <br />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto shadow rounded border noprint">
        <table className="table-auto w-full border-collapse text-sm">
          <thead className="bg-indigo-600 text-white">
            <tr>
              <th className="border px-3 py-2 text-center">
                <input
                  type="checkbox"
                  checked={
                    selectedIds.length === visitors.length &&
                    visitors.length > 0
                  }
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="border px-3 py-2">ID</th>
              <th className="border px-3 py-2">ชื่อ</th>
              <th className="border px-3 py-2">บริษัท</th>
              <th className="border px-3 py-2">ติดต่อ</th>
              <th className="border px-3 py-2">ประสงค์</th>
              <th className="border px-3 py-2">เวลาเข้า</th>
              <th className="border px-3 py-2">เวลาออก</th>
              <th className="border px-3 py-2">สถานะ</th>
              <th className="border px-3 py-2">พิมพ์</th>
              <th className="border px-3 py-2">ลบ</th>
            </tr>
          </thead>
          <tbody>
            {visitors.map((v) => (
              <tr
                key={v.id}
                className={`hover:bg-gray-50 ${
                  selectedIds.includes(v.id) ? "bg-yellow-50" : ""
                }`}
              >
                <td className="border px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(v.id)}
                    onChange={() => toggleSelect(v.id)}
                  />
                </td>
                <td className="border px-3 py-2">{v.id}</td>
                <td className="border px-3 py-2">{v.full_name}</td>
                <td className="border px-3 py-2">{v.company}</td>
                <td className="border px-3 py-2">{v.contact_person}</td>
                <td className="border px-3 py-2">
                  {translatePurpose(v.purpose, v.other_purpose)}
                </td>
                <td className="border px-3 py-2">
                  {formatDateTime(v.checkin_time)}
                </td>
                <td className="border px-3 py-2">
                  {v.checkout_time ? (
                    formatDateTime(v.checkout_time)
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>

                <td className="border px-3 py-2 text-center">
                  {!v.checkout_time ? (
                    <button
                      onClick={() => checkOut(v.id)}
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                    >
                      เช็คเอาท์
                    </button>
                  ) : (
                    <span className="text-green-600 font-bold">✔ ออกแล้ว</span>
                  )}
                </td>
                <td className="border px-3 py-2 text-center">
                  <a
                    href={`/print/${v.id}`}
                    target="_blank"
                    className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
                  >
                    พิมพ์
                  </a>
                </td>
                <td className="border px-3 py-2 text-center">
                  <button
                    onClick={() => deleteVisitor([v.id])}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                  >
                    ลบ
                  </button>
                </td>
              </tr>
            ))}
            {visitors.length === 0 && (
              <tr>
                <td colSpan={11} className="text-center text-gray-500 py-6">
                  — ไม่มีข้อมูล —
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}