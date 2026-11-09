import React, { useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import { Globe, ChevronDown, Camera, RotateCcw, CheckCircle } from "lucide-react";

const SITE_NAME = "บริษัท ที.ดี.เค.อินดัสเตรียล จำกัด";
const BG_URL = "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80";

export default function App() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(true);
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [lang, setLang] = useState("th");

  const [form, setForm] = useState({
    full_name: "",
    company: "",
    phone: "",
    contact_person: "",
    purpose: "", 
    other_purpose: ""
  });

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const content = {
    th: {
      title: "ข้อมูลผู้มาติดต่อ",
      camTitle: "ถ่ายรูปบัตร / นามบัตร",
      camSub: "กรุณาวางบัตรประชาชนให้ชัดเจนในกรอบ",
      btnCam: "ถ่ายภาพเอกสาร",
      btnNext: "ใช้รูปนี้และกรอกข้อมูล",
      btnRetake: "ถ่ายภาพใหม่",
      labelName: "ชื่อ-นามสกุล",
      labelCompany: "บริษัท / หน่วยงาน",
      labelPhone: "เบอร์โทรศัพท์",
      labelContact: "มาติดต่อใคร / แผนกใด",
      labelPurpose: "วัตถุประสงค์",
      optDefault: "-- เลือกจุดประสงค์ --",
      btnSubmit: "ยืนยันการลงทะเบียน",
      btnBack: "แก้ไขรูปภาพ / ย้อนกลับ",
      success: "ลงทะเบียนสำเร็จ!",
      successSub: "กรุณารอรับบัตร Visitor จากเจ้าหน้าที่"
    },
    en: {
      title: "Visitor Information",
      camTitle: "Capture ID Card",
      camSub: "Place ID card clearly within the frame",
      btnCam: "Take Photo",
      btnNext: "Use this photo",
      btnRetake: "Retake",
      labelName: "Full Name",
      labelCompany: "Company",
      labelPhone: "Phone Number",
      labelContact: "Contact Person",
      labelPurpose: "Purpose",
      optDefault: "-- Select Purpose --",
      btnSubmit: "Confirm Registration",
      btnBack: "Edit Photo / Back",
      success: "Registration Success!",
      successSub: "Please wait for your Visitor Badge"
    },
    kr: {
      title: "방문자 정보",
      camTitle: "신분증 촬영",
      camSub: "신분증을 가이드안에 맞춰주세요",
      btnCam: "사진 촬영",
      btnNext: "이 사진 사용",
      btnRetake: "다시 촬영",
      labelName: "성함",
      labelCompany: "회사명",
      labelPhone: "전화번호",
      labelContact: "담당자",
      labelPurpose: "방문 목적",
      optDefault: "-- 목적 선택 --",
      btnSubmit: "등록 확인",
      btnBack: "사진 수정 / 뒤로",
      success: "등록 성공!",
      successSub: "담당자의 안내를 기다려주세요"
    }
  };

  const t = content[lang];

  useEffect(() => {
    if (step === 1 && cameraActive) startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [step, cameraActive]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) { console.error(err); }
  };

  const stopCamera = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
  };

  const takeSnapshot = () => {
    const canvas = document.createElement("canvas");
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    setPhotoDataUrl(canvas.toDataURL("image/jpeg", 0.8));
    setCameraActive(false);
  };

  const handleEditPhoto = () => {
    setCameraActive(true);
    setStep(1);
  };

  const selectLang = (newLang) => {
    setLang(newLang);
    setShowLangMenu(false); // ปิดเมนูทันทีเมื่อเลือกเสร็จ
  };

  const resetForm = () => {
    setForm({ full_name: "", company: "", phone: "", contact_person: "", purpose: "", other_purpose: "" });
    setPhotoDataUrl("");
    setCameraActive(true);
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.from("visitors").insert([{
          full_name: form.full_name,
          company: form.company,
          phone: form.phone,
          contact_person: form.contact_person,
          purpose: form.purpose === "อื่น ๆ" ? `อื่น ๆ: ${form.other_purpose}` : form.purpose,
          checkin_time: new Date().toISOString()
      }]).select().single();
      
      if (error) throw error;
      if (photoDataUrl) {
        const blob = await (await fetch(photoDataUrl)).blob();
        const fileName = `visitor_${data.id}_${Date.now()}.jpg`;
        await supabase.storage.from("photos").upload(fileName, blob);
        const { data: pUrl } = supabase.storage.from("photos").getPublicUrl(fileName);
        await supabase.from("visitors").update({ photo_url: pUrl.publicUrl }).eq("id", data.id);
      }
      setStep(3);
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="app-shell" onClick={() => setShowLangMenu(false)}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap');
        :root { --tdk-blue: #003399; --tdk-blue-light: #0055ff; }
        
        body { margin: 0; font-family: 'Kanit', sans-serif; background: #0f172a; overflow-x: hidden; }
        
        .app-shell { 
          min-height: 100vh; display: flex; flex-direction: column; align-items: center; 
          background: url('${BG_URL}') center/cover fixed no-repeat;
          position: relative; padding: 15px; box-sizing: border-box;
        }
        .app-shell::before { content: ""; position: absolute; inset: 0; background: rgba(0, 0, 0, 0.7); z-index: 1; }

        /* Language Selector - Fixed Position */
        .lang-wrapper { position: absolute; top: 15px; right: 15px; z-index: 1000; }
        .lang-btn { 
          background: rgba(255,255,255,0.95); border: none; padding: 8px 14px; border-radius: 50px; 
          display: flex; align-items: center; gap: 6px; cursor: pointer; font-weight: 700;
          box-shadow: 0 4px 15px rgba(0,0,0,0.3); font-size: 14px; color: var(--tdk-blue);
        }
        .lang-dropdown { 
          position: absolute; right: 0; top: 45px; background: white; border-radius: 15px; 
          min-width: 140px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.4);
          animation: fadeIn 0.2s ease-out;
        }
        .lang-opt { 
          width: 100%; padding: 12px 16px; border: none; background: none; 
          text-align: left; cursor: pointer; font-family: inherit; font-size: 14px; border-bottom: 1px solid #f1f5f9;
        }
        .lang-opt:last-child { border: none; }
        .lang-opt:hover { background: #f0f7ff; }

        .container { position: relative; z-index: 10; width: 100%; max-width: 480px; margin-top: 50px; }
        
        .brand { text-align: center; margin-bottom: 25px; }
        .logo-text { font-size: 36px; font-weight: 800; color: white; letter-spacing: -1px; }
        .site-badge { background: var(--tdk-blue); color: white; padding: 5px 15px; border-radius: 50px; font-size: 12px; font-weight: 500; margin-top: 8px; display: inline-block; border: 1px solid rgba(255,255,255,0.2); }

        .card { 
          background: white; border-radius: 25px; padding: 25px; 
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); box-sizing: border-box; 
        }

        .steps { display: flex; justify-content: center; gap: 8px; margin-bottom: 20px; }
        .step-dot { width: 8px; height: 8px; border-radius: 50%; background: #e2e8f0; transition: 0.3s; }
        .step-dot.active { background: var(--tdk-blue); width: 25px; border-radius: 4px; }

        .camera-box { 
          background: #000; border-radius: 18px; overflow: hidden; aspect-ratio: 4/3; 
          position: relative; border: 2px solid #f1f5f9; box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        video, .snapshot { width: 100%; height: 100%; object-fit: cover; }
        .guide-box { 
          position: absolute; top: 15%; left: 10%; width: 80%; height: 70%; 
          border: 2px dashed rgba(255,255,255,0.6); border-radius: 12px; pointer-events: none; 
        }

        .input-group { margin-bottom: 15px; text-align: left; }
        label { display: block; font-weight: 600; margin-bottom: 5px; color: #475569; font-size: 13px; }
        input, select { 
          width: 100%; padding: 12px 15px; border: 2px solid #f1f5f9; border-radius: 12px; 
          font-size: 16px; font-family: inherit; box-sizing: border-box; background: #f8fafc;
        }
        input:focus, select:focus { outline: none; border-color: var(--tdk-blue); background: #fff; }

        .btn-action { 
          width: 100%; padding: 14px; border-radius: 14px; font-size: 17px; font-weight: 700; 
          border: none; cursor: pointer; transition: 0.2s; display: flex; align-items: center; 
          justify-content: center; gap: 8px; font-family: inherit;
        }
        .btn-tdk { background: var(--tdk-blue); color: white; margin-top: 10px; }
        .btn-tdk:active { transform: scale(0.98); }
        .btn-tdk:disabled { background: #cbd5e1; cursor: not-allowed; }
        .btn-ghost { background: none; color: #64748b; font-size: 14px; margin-top: 8px; text-decoration: underline; }

        .success-hero { text-align: center; padding: 10px 0; }
        .check-icon { color: #22c55e; margin-bottom: 15px; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

        /* Mobile Specific Fixes */
        @media (max-width: 400px) {
          .card { padding: 20px 15px; }
          .logo-text { font-size: 30px; }
          .btn-action { font-size: 15px; padding: 12px; }
          input, select { font-size: 14px; padding: 10px; }
        }
      `}</style>

      {/* Language Toggle - Icon stays same place */}
      <div className="lang-wrapper">
        <button className="lang-btn" onClick={(e) => { e.stopPropagation(); setShowLangMenu(!showLangMenu); }}>
          <Globe size={18} />
          <span>{lang.toUpperCase()}</span>
          <ChevronDown size={14} opacity={0.5} />
        </button>
        {showLangMenu && (
          <div className="lang-dropdown">
            <button className="lang-opt" onClick={() => selectLang("th")}>🇹🇭 ไทย (TH)</button>
            <button className="lang-opt" onClick={() => selectLang("en")}>🇺🇸 English (EN)</button>
            <button className="lang-opt" onClick={() => selectLang("kr")}>🇰🇷 한국어 (KR)</button>
          </div>
        )}
      </div>

      <div className="container">
        <header className="brand">
          <div className="logo-text">TDK <span style={{fontWeight:300, opacity:0.7}}>INDUSTRIAL</span></div>
          <div className="site-badge">{SITE_NAME}</div>
        </header>

        <main className="card">
          <div className="steps">
            {[1,2,3].map(s => <div key={s} className={`step-dot ${step === s ? 'active' : ''}`}></div>)}
          </div>

          {step === 1 && (
            <div className="fade">
              <h2 style={{textAlign:'center', marginTop:0, fontSize:'18px', color:'#1e293b'}}>{t.camTitle}</h2>
              <p style={{textAlign:'center', color:'#64748b', fontSize:'13px', marginBottom:15}}>{t.camSub}</p>
              
              <div className="camera-box">
                {cameraActive ? (
                  <>
                    <video ref={videoRef} autoPlay playsInline muted />
                    <div className="guide-box"></div>
                  </>
                ) : (
                  <img src={photoDataUrl} className="snapshot" alt="Captured" />
                )}
              </div>

              <div style={{marginTop: 20}}>
                {cameraActive ? (
                  <button className="btn-action btn-tdk" onClick={takeSnapshot}>
                    <Camera size={20}/> {t.btnCam}
                  </button>
                ) : (
                  <>
                    <button className="btn-action btn-tdk" onClick={() => setStep(2)}>
                      {t.btnNext} <ArrowRight size={18} style={{marginLeft:5}}/>
                    </button>
                    <button className="btn-action btn-ghost" onClick={() => setCameraActive(true)}>
                      <RotateCcw size={14} style={{marginRight:5}}/> {t.btnRetake}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="fade">
              <h2 style={{textAlign:'center', marginTop:0, fontSize:'18px', color:'#1e293b'}}>{t.title}</h2>
              
              <div className="input-group">
                <label>{t.labelName}</label>
                <input required value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} />
              </div>

              <div className="input-group">
                <label>{t.labelCompany}</label>
                <input required value={form.company} onChange={e => setForm({...form, company: e.target.value})} />
              </div>

              <div className="input-group">
                <label>{t.labelPhone}</label>
                <input required type="tel" placeholder="08x-xxxxxxx" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              </div>

              <div className="input-group">
                <label>{t.labelContact}</label>
                <input required value={form.contact_person} onChange={e => setForm({...form, contact_person: e.target.value})} />
              </div>

              <div className="input-group">
                <label>{t.labelPurpose}</label>
                <select required value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})}>
                  <option value="" disabled>{t.optDefault}</option>
                  <option value="ประชุมงาน">ประชุมงาน (Meeting)</option>
                  <option value="ส่งสินค้า/รับสินค้า">ส่งสินค้า/รับสินค้า (Delivery)</option>
                  <option value="ซ่อมบำรุง/ติดตั้ง">ซ่อมบำรุง/ติดตั้ง (Maintenance)</option>
                  <option value="สมัครงาน/สัมภาษณ์">สมัครงาน/สัมภาษณ์ (Interview)</option>
                  <option value="อื่น ๆ">อื่น ๆ (Other)</option>
                </select>
              </div>

              {form.purpose === "อื่น ๆ" && (
                <div className="input-group fade">
                  <label>ระบุเพิ่มเติม / Please specify</label>
                  <input required value={form.other_purpose} onChange={e => setForm({...form, other_purpose: e.target.value})} />
                </div>
              )}

              <button type="submit" disabled={loading || !form.purpose} className="btn-action btn-tdk">
                {loading ? "Saving..." : t.btnSubmit}
              </button>
              <button type="button" className="btn-action btn-ghost" onClick={handleEditPhoto}>{t.btnBack}</button>
            </form>
          )}

          {step === 3 && (
            <div className="success-hero fade">
              <CheckCircle size={60} className="check-icon" />
              <h2 style={{color: 'var(--tdk-blue)', margin: '0 0 10px'}}>{t.success}</h2>
              <p style={{color: '#64748b', fontSize: '15px'}}>{t.successSub}</p>
              <button className="btn-action btn-tdk" style={{marginTop: 30}} onClick={resetForm}>
                Done / 완료 / เสร็จสิ้น
              </button>
            </div>
          )}
        </main>
        
        <footer style={{marginTop:25, textAlign:'center', color:'white', opacity:0.5, fontSize:'10px', letterSpacing:'1px'}}>
          SECURITY SYSTEM BY TDK INDUSTRIAL
        </footer>
      </div>
    </div>
  );
}

// Helper component for Arrow icon since I replaced lucide-react names for consistency
function ArrowRight({ size, style }) {
  return (
    <svg style={style} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"></line>
      <polyline points="12 5 19 12 12 19"></polyline>
    </svg>
  );
}