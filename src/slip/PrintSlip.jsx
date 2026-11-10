import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { visitorsApi } from "../apiClient";

const ORG = import.meta.env.VITE_ORG_NAME || "T.D.K. INDUSTRIA";
const SITE =
  import.meta.env.VITE_SITE_NAME || "บริษัท ที.ดี.เค.อินดัสเตรียล จำกัด";
const LOGO_URL = import.meta.env.VITE_LOGO_URL || "/logo/f.png";

/* 🔧 ปรับค่านี้ถ้ากระดาษยังเอียง */
const PRINT_OFFSET_MM = -5; // -5 ถึง -7 สำหรับ 80mm

export default function PrintSlip({ id: propId, inModal = false }) {
  const { id: routeId } = useParams();
  const id = propId || routeId;

  const [v, setV] = useState(null);
  const printedRef = useRef(false);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const data = await visitorsApi.get(id);
        setV(data);

        if (!inModal) {
          // หน่วงเวลาให้ layout + รูป โหลดครบก่อน
          setTimeout(() => {
            if (!printedRef.current) {
              window.print();
              printedRef.current = true;

              // ใช้ร่วมกับ --kiosk-printing
              setTimeout(() => {
                window.close();
              }, 500);
            }
          }, 800);
        }
      } catch (error) {
        console.error("Unable to load print data", error);
      }
    };

    fetchData();
  }, [id, inModal]);

  const translatePurpose = (purpose, otherPurpose) => {
    const dict = {
      meeting: "ประชุมงาน",
      delivery: "ส่งของ / รับของ",
      maintenance: "ซ่อมบำรุง",
      training: "อบรม / สอนงาน",
      audit: "ตรวจสอบ / Audit",
      visit: "เยี่ยมชม",
      interview: "สมัครงาน / สัมภาษณ์",
      billing: "วางบิล / รับเช็ค",
      other: otherPurpose || "อื่น ๆ",
    };
    return dict[purpose] || purpose;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Intl.DateTimeFormat("th-TH", {
      timeZone: "Asia/Bangkok",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).format(new Date(dateString));
  };

  if (!v) {
    return <div style={{ padding: 40 }}>กำลังจัดเตรียมสลิป...</div>;
  }

  return (
    <div
      className="receipt"
      style={{
        width: "80mm", // ✅ ตรงกับกระดาษจริง
        margin: "0 auto",
        padding: "4mm 4mm 6mm 4mm",
        fontFamily: "Arial, sans-serif",
        color: "#111827",
        fontSize: 13,
        lineHeight: 1.6,
      }}
    >
      {/* 🎯 Print Style Fix */}
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }

          body {
            margin: 0;
            padding: 0;
          }

          .receipt {
            margin-left: ${PRINT_OFFSET_MM}mm;
          }
        }
      `}</style>

      {/* LOGO */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
        <img src={LOGO_URL} alt="logo" style={{ width: 90, height: "auto" }} />
      </div>

      {/* HEADER */}
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 16, fontWeight: "bold" }}>{ORG}</div>
        <div style={{ fontSize: 13 }}>{SITE}</div>
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "10px 0" }} />

      {/* CONTENT */}
      <div style={{ marginBottom: 10 }}>
        <div><b>ID:</b> {String(v.id).padStart(10, "0")}</div>
        <div><b>ชื่อ:</b> {v.full_name}</div>

        {v.gender && <div><b>เพศ:</b> {v.gender}</div>}
        {v.contact_person && <div><b>ติดต่อ:</b> {v.contact_person}</div>}
        {v.company && <div><b>บริษัท:</b> {v.company}</div>}
        {v.vehicle_plate && <div><b>ทะเบียนรถ:</b> {v.vehicle_plate}</div>}

        {v.purpose && (
          <div>
            <b>ประสงค์:</b>{" "}
            {translatePurpose(v.purpose, v.other_purpose)}
          </div>
        )}

        <div><b>เวลาเข้า:</b> {formatDate(v.checkin_time)}</div>

        <br />

        <div>
          <b>เวลาออก:</b>{" "}
          {v.checkout_time ? formatDate(v.checkout_time) : "................................"}
        </div>

        <br />

        <div><b style={{ fontSize: 11 }}>Card Number:</b> ............................</div>
        <br />
        <div><b>รปภ:</b> ........................................</div>
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "25px 0" }} />

      {/* QR */}
      {v.qr_data && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
          <img src={v.qr_data} alt="qr" style={{ width: 110, height: 110 }} />
        </div>
      )}

      {/* SIGN */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 12 }}>
        <div
          style={{
            width: 120,
            height: 55,
            border: "1px solid #000",
            borderRadius: 4,
            marginBottom: 4,
          }}
        />
        <div style={{ fontSize: 12 }}>(ลงชื่อผู้ได้รับการติดต่อ)</div>
      </div>

      {/* FOOTER */}
      <div style={{ fontSize: 12, textAlign: "center" }}>
        (ตั๋วนี้ต้องนำไปแสดงเมื่อเสร็จธุระ)
        <br />
        โปรดปฏิบัติตามนโยบายความปลอดภัยของบริษัท
      </div>
    </div>
  );
}
