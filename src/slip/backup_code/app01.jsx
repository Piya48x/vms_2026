import React, { useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient"; // ตรวจสอบ path ให้ถูกต้อง
import { 
  Camera, ArrowRight, RotateCcw, CheckCircle, Globe, ChevronDown, 
  User, Building2, Phone, Briefcase, FileText 
} from "lucide-react";

// --- Configuration ---
const SITE_NAME = "บริษัท ที.ดี.เค.อินดัสเตรียล จำกัด";
const STORAGE_KEY = "tdk_visitor_form_data"; // Key สำหรับบันทึกข้อมูลชั่วคราว

const TRANSLATIONS = {
  th: {
    site_badge: "บริษัท ที.ดี.เค.อินดัสเตรียล จำกัด",
    title_step1: "ถ่ายรูปบัตร / นามบัตร",
    desc_step1: "กรุณาวางบัตรประชาชน หรือเอกสารให้เห็นชัดเจนในกรอบ",
    btn_take: "ถ่ายภาพ",
    btn_use: "ใช้รูปนี้",
    btn_retake: "ถ่ายใหม่",
    title_step2: "ข้อมูลผู้มาติดต่อ",
    label_name: "ชื่อ-นามสกุล",
    ph_name: "ระบุชื่อ-นามสกุลจริง",
    label_company: "มาจากบริษัท / หน่วยงาน",
    ph_company: "ชื่อบริษัท หรือ บุคคลทั่วไป",
    label_phone: "เบอร์โทรศัพท์",
    label_contact: "ติดต่อใคร / แผนกใด",
    ph_contact: "ระบุชื่อเจ้าหน้าที่ หรือแผนก",
    label_purpose: "วัตถุประสงค์",
    purpose_def: "-- กรุณาเลือก --",
    purpose_other: "ระบุวัตถุประสงค์อื่น ๆ",
    ph_other: "รายละเอียดเพิ่มเติม",
    btn_confirm: "ลงทะเบียนเข้าพบ",
    btn_saving: "กำลังบันทึก...",
    btn_back: "ย้อนกลับ",
    success_title: "ลงทะเบียนสำเร็จ",
    success_desc: "ระบบบันทึกข้อมูลเรียบร้อย กรุณารอเรียกหรือรับบัตร Visitor",
    btn_finish: "กลับหน้าแรก",
    footer: "ระบบรักษาความปลอดภัย TDK INDUSTRIAL"
  },
  en: {
    site_badge: "T.D.K. INDUSTRIAL CO., LTD.",
    title_step1: "Take Photo ID / Card",
    desc_step1: "Place ID card or document clearly inside the frame",
    btn_take: "Snap Photo",
    btn_use: "Use Photo",
    btn_retake: "Retake",
    title_step2: "Visitor Details",
    label_name: "Full Name",
    ph_name: "Enter full name",
    label_company: "Company / Organization",
    ph_company: "Company name",
    label_phone: "Phone Number",
    label_contact: "Contact Person / Dept",
    ph_contact: "Staff Name or Dept.",
    label_purpose: "Purpose of Visit",
    purpose_def: "-- Select Purpose --",
    purpose_other: "Other Purpose",
    ph_other: "Please specify",
    btn_confirm: "Confirm Registration",
    btn_saving: "Saving...",
    btn_back: "Back",
    success_title: "Registration Complete",
    success_desc: "Data saved successfully. Please wait for the staff.",
    btn_finish: "Finish",
    footer: "SECURITY SYSTEM BY TDK INDUSTRIAL"
  },
  ko: {
    site_badge: "티디케이 인더스트리얼 주식회사",
    title_step1: "신분증 / 명함 촬영",
    desc_step1: "신분증이나 서류를 프레임 안에 맞춰주세요",
    btn_take: "사진 촬영",
    btn_use: "이 사진 사용",
    btn_retake: "다시 촬영",
    title_step2: "방문자 정보",
    label_name: "성함",
    ph_name: "성함을 입력하세요",
    label_company: "회사 / 기관",
    ph_company: "회사명을 입력하세요",
    label_phone: "전화번호",
    label_contact: "방문 대상 / 부서",
    ph_contact: "담당자 성함 또는 부서",
    label_purpose: "방문 목적",
    purpose_def: "-- 목적 선택 --",
    purpose_other: "기타 목적",
    ph_other: "상세 내용을 입력하세요",
    btn_confirm: "등록 확인",
    btn_saving: "저장 중...",
    btn_back: "뒤로",
    success_title: "등록 완료",
    success_desc: "정보가 저장되었습니다. 담당자의 안내를 기다려주세요.",
    btn_finish: "완료",
    footer: "TDK INDUSTRIAL 보안 시스템"
  }
};

export default function App() {
  // --- State Management ---
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(true);
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [lang, setLang] = useState("th");
  const [langOpen, setLangOpen] = useState(false);
  
  const t = TRANSLATIONS[lang];

  // Load saved form data from LocalStorage on mount
  const [form, setForm] = useState({
    full_name: "", company: "", phone: "", contact_person: "", purpose: "", other_purpose: ""
  });

  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        setForm(JSON.parse(savedData));
      } catch (e) {
        console.error("Error parsing saved form", e);
      }
    }
  }, []);

  // Save form data to LocalStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }, [form]);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // --- Camera Logic ---
  useEffect(() => {
    if (step === 1 && cameraActive) startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [step, cameraActive]);

  const startCamera = async () => {
    try {
      // Request higher resolution for better quality
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) { console.error("Camera Error:", err); }
  };

  const stopCamera = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    setPhotoDataUrl(canvas.toDataURL("image/jpeg", 0.9));
    setCameraActive(false);
  };

  // --- Form Submission ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.purpose) return;
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
      
      // Clear storage on success
      localStorage.removeItem(STORAGE_KEY);
      setStep(3);
    } catch (err) { alert("Error: " + err.message); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setForm({ full_name: "", company: "", phone: "", contact_person: "", purpose: "", other_purpose: "" });
    setPhotoDataUrl("");
    localStorage.removeItem(STORAGE_KEY);
    setCameraActive(true);
    setStep(1);
  };

  const handleInputChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // --- Render ---
  return (
    <div className="app-shell" onClick={() => setLangOpen(false)}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap');
        
        :root { 
          --primary: #003399; 
          --primary-hover: #002266;
          --accent: #2563eb;
          --bg: #f1f5f9;
          --card-bg: #ffffff;
          --text-main: #1e293b;
          --text-muted: #64748b;
          --border: #e2e8f0;
          --shadow: 0 10px 40px -10px rgba(0,0,0,0.1);
        }
        
        body { margin: 0; font-family: 'Kanit', sans-serif; background: var(--bg); color: var(--text-main); }
        
        /* Layout */
        .app-shell { 
          min-height: 100vh; 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          justify-content: center;
          padding: 20px; 
          box-sizing: border-box; 
          background-image: linear-gradient(to top, #dfe9f3 0%, white 100%);
        }

        .container { 
          width: 100%; 
          max-width: 640px; /* ขยายให้กว้างขึ้น */
          margin: 0 auto;
        }

        /* Branding */
        .brand { text-align: center; margin-bottom: 25px; }
        .logo-text { font-size: 32px; font-weight: 800; color: var(--primary); letter-spacing: -1px; line-height: 1; }
        .site-badge { 
          background: rgba(0, 51, 153, 0.08); color: var(--primary); 
          padding: 6px 16px; border-radius: 50px; font-size: 14px; 
          margin-top: 10px; display: inline-block; font-weight: 500; 
        }

        /* Card */
        .card { 
          background: var(--card-bg); 
          border-radius: 24px; 
          padding: 30px; 
          box-shadow: var(--shadow); 
          border: 1px solid white;
          width: 100%;
          box-sizing: border-box;
        }

        /* Language Switcher */
        .lang-wrapper { 
  position: relative;  /* ไม่ให้ลอยทับคนอื่น */
  display: flex;
  justify-content: flex-end; /* จัดชิดขวา */
  width: 100%;
  margin-bottom: 10px; /* เว้นระยะห่างจากโลโก้ */
  z-index: 50;
}
        .lang-btn { 
          background: white; border: 1px solid var(--border); padding: 8px 16px; 
          border-radius: 50px; display: flex; align-items: center; gap: 8px; 
          cursor: pointer; font-weight: 600; color: var(--primary); 
          box-shadow: 0 2px 5px rgba(0,0,0,0.05); transition: 0.2s;
        }
        .lang-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 8px rgba(0,0,0,0.08); }
        .lang-dropdown { 
  position: absolute; 
  right: 0; 
  top: 45px; 
  background: white; 
  border-radius: 16px; 
  overflow: hidden; 
  min-width: 160px; 
  box-shadow: 0 10px 30px rgba(0,0,0,0.15); 
  border: 1px solid var(--border); 
  z-index: 100; /* เพิ่ม z-index ให้สูงกว่า input */
}
        .lang-opt { 
          width: 100%; padding: 12px 16px; border: none; background: white; 
          text-align: left; cursor: pointer; font-size: 15px; font-family: inherit; 
          transition: background 0.2s;
        }
        .lang-opt:hover { background: #f8fafc; color: var(--primary); }

        /* Steps */
        .steps { display: flex; justify-content: center; gap: 8px; margin-bottom: 30px; }
        .step-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--border); transition: 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .step-dot.active { background: var(--primary); width: 35px; border-radius: 6px; }

        /* Camera & Inputs */
        .camera-container {
          background: #000; border-radius: 20px; overflow: hidden; 
          aspect-ratio: 4/3; position: relative; margin-bottom: 20px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        video, .snapshot { width: 100%; height: 100%; object-fit: cover; }
        .guide-overlay { 
          position: absolute; inset: 20px; border: 2px dashed rgba(255,255,255,0.6); 
          border-radius: 12px; pointer-events: none;
          box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.3); /* Dim outside */
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        
        /* Input Styles */
        .input-group { position: relative; }
        .input-group label { 
          display: block; font-weight: 500; margin-bottom: 8px; 
          color: var(--text-main); font-size: 15px; display: flex; align-items: center; gap: 6px;
        }
        .input-icon { position: absolute; left: 16px; top: 42px; color: var(--text-muted); opacity: 0.7; }
        
        input, select { 
          width: 100%; padding: 14px 14px 14px 48px; 
          border: 2px solid var(--border); border-radius: 14px; 
          font-size: 16px; font-family: inherit; background: #fff;
          transition: all 0.2s; box-sizing: border-box;
          color: #334155;
        }
        input:focus, select:focus { 
          outline: none; border-color: var(--accent); 
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1); 
        }
        
        /* Buttons */
        .btn-action { 
          width: 100%; padding: 18px; border-radius: 16px; 
          font-size: 18px; font-weight: 600; border: none; cursor: pointer; 
          display: flex; align-items: center; justify-content: center; gap: 10px; 
          font-family: inherit; transition: 0.2s transform, 0.2s background;
        }
        .btn-action:active { transform: scale(0.98); }
        .btn-primary { 
          background: var(--primary); color: white; 
          box-shadow: 0 4px 12px rgba(0, 51, 153, 0.2);
        }
        .btn-primary:hover { background: var(--primary-hover); }
        .btn-primary:disabled { background: #94a3b8; cursor: not-allowed; transform: none; box-shadow: none; }
        
        .btn-outline { 
          background: white; color: var(--text-main); border: 2px solid var(--border); 
          margin-top: 12px;
        }
        .btn-outline:hover { background: #f8fafc; border-color: #cbd5e1; }

        /* Typography */
        h2 { text-align: center; margin: 0 0 8px 0; color: var(--text-main); font-size: 22px; }
        p.desc { text-align: center; color: var(--text-muted); font-size: 15px; margin: 0 0 25px 0; line-height: 1.5; }

        /* Success Step */
        .success-box { padding: 40px 20px; text-align: center; }
        .icon-bounce { animation: bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55); }

        /* Animations */
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounceIn { 0% { transform: scale(0); } 70% { transform: scale(1.2); } 100% { transform: scale(1); } }
        .fade-in { animation: fadeIn 0.4s ease-out; }

        /* Desktop Responsiveness */
        @media (min-width: 768px) {
          .container { max-width: 800px; }
          .card { padding: 40px; }
          .form-grid { grid-template-columns: 1fr 1fr; gap: 20px; }
          .form-grid .full-width { grid-column: span 2; }
          .logo-text { font-size: 42px; }
          .btn-action { width: auto; min-width: 200px; margin: 0 auto; }
          .btn-container { display: flex; gap: 15px; justify-content: center; flex-direction: row-reverse; }
          .btn-outline { margin-top: 0; }
        }
      `}</style>

      {/* Language Switcher */}
      <div className="lang-wrapper" onClick={(e) => e.stopPropagation()}>
        <button className="lang-btn" onClick={() => setLangOpen(!langOpen)}>
          <Globe size={18} /> <span>{lang.toUpperCase()}</span> <ChevronDown size={14} />
        </button>
        {langOpen && (
          <div className="lang-dropdown">
            <button className="lang-opt" onClick={() => { setLang("th"); setLangOpen(false); }}>🇹🇭 ภาษาไทย</button>
            <button className="lang-opt" onClick={() => { setLang("en"); setLangOpen(false); }}>🇺🇸 English</button>
            <button className="lang-opt" onClick={() => { setLang("ko"); setLangOpen(false); }}>🇰🇷 한국어</button>
          </div>
        )}
      </div>

      <div className="container">
        <header className="brand fade-in">
          <div className="logo-text">TDK <span style={{fontWeight:300}}>INDUSTRIAL</span></div>
          <div className="site-badge">{t.site_badge}</div>
        </header>

        <main className="card fade-in">
          <div className="steps">
            {[1,2,3].map(s => <div key={s} className={`step-dot ${step === s ? 'active' : ''}`}></div>)}
          </div>

          {step === 1 && (
            <div className="fade-in">
              <h2>{t.title_step1}</h2>
              <p className="desc">{t.desc_step1}</p>
              
              <div className="camera-container">
                {cameraActive ? (
                  <><video ref={videoRef} autoPlay playsInline muted /><div className="guide-overlay"></div></>
                ) : (
                  <img src={photoDataUrl} className="snapshot" alt="Captured" />
                )}
              </div>

              <div className="btn-container" style={{display:'flex', flexDirection:'column', gap:12}}>
                {cameraActive ? (
                  <button className="btn-action btn-primary" onClick={takeSnapshot}>
                    <Camera size={22}/> {t.btn_take}
                  </button>
                ) : (
                  <>
                    <button className="btn-action btn-primary" onClick={() => setStep(2)}>
                      {t.btn_use} <ArrowRight size={22}/>
                    </button>
                    <button className="btn-action btn-outline" onClick={() => setCameraActive(true)}>
                      <RotateCcw size={20}/> {t.btn_retake}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="fade-in">
              <h2>{t.title_step2}</h2>
              <p className="desc" style={{marginBottom: 20}}>กรุณากรอกข้อมูลให้ครบถ้วนเพื่อความปลอดภัย</p>
              
              <div className="form-grid">
                <div className="input-group">
                  <label><User size={16}/> {t.label_name}</label>
                  <User className="input-icon" size={20} />
                  <input required placeholder={t.ph_name} value={form.full_name} onChange={e => handleInputChange('full_name', e.target.value)} />
                </div>
                
                <div className="input-group">
                  <label><Building2 size={16}/> {t.label_company}</label>
                  <Building2 className="input-icon" size={20} />
                  <input required placeholder={t.ph_company} value={form.company} onChange={e => handleInputChange('company', e.target.value)} />
                </div>

                <div className="input-group">
                  <label><Phone size={16}/> {t.label_phone}</label>
                  <Phone className="input-icon" size={20} />
                  <input required type="tel" placeholder="08x-xxxxxxx" value={form.phone} onChange={e => handleInputChange('phone', e.target.value)} />
                </div>

                <div className="input-group">
                  <label><User size={16}/> {t.label_contact}</label>
                  <User className="input-icon" size={20} />
                  <input required placeholder={t.ph_contact} value={form.contact_person} onChange={e => handleInputChange('contact_person', e.target.value)} />
                </div>

                <div className="input-group full-width">
                  <label><Briefcase size={16}/> {t.label_purpose}</label>
                  <Briefcase className="input-icon" size={20} />
                  <select required value={form.purpose} onChange={e => handleInputChange('purpose', e.target.value)}>
                    <option value="" disabled>{t.purpose_def}</option>
                    <option value="ประชุมงาน">ประชุมงาน (Meeting)</option>
                    <option value="ส่งสินค้า/รับสินค้า">ส่งสินค้า / รับสินค้า (Delivery)</option>
                    <option value="ซ่อมบำรุง/ติดตั้ง">ซ่อมบำรุง / ติดตั้ง (Maintenance)</option>
                    <option value="อบรม/สอนงาน">อบรม / สอนงาน (Training)</option>
                    <option value="ตรวจสอบ/Audit">ตรวจสอบ / Audit</option>
                    <option value="สมัครงาน/สัมภาษณ์">สมัครงาน / สัมภาษณ์ (Interview)</option>
                    <option value="วางบิล/รับเช็ค">วางบิล / รับเช็ค (Billing)</option>
                    <option value="อื่น ๆ">อื่น ๆ (Other)</option>
                  </select>
                </div>

                {form.purpose === "อื่น ๆ" && (
                  <div className="input-group full-width fade-in">
                    <label><FileText size={16}/> {t.purpose_other}</label>
                    <FileText className="input-icon" size={20} />
                    <input required placeholder={t.ph_other} value={form.other_purpose} onChange={e => handleInputChange('other_purpose', e.target.value)} />
                  </div>
                )}
              </div>

              <div className="btn-container" style={{marginTop: 30}}>
                <button type="submit" disabled={loading || !form.purpose} className="btn-action btn-primary">
                  {loading ? t.btn_saving : t.btn_confirm} {loading ? "" : <ArrowRight size={22}/>}
                </button>
                <button type="button" className="btn-action btn-outline" onClick={() => {setCameraActive(true); setStep(1);}}>
                  {t.btn_back}
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="success-box fade-in">
              <div style={{color:'#10b981', marginBottom:20}} className="icon-bounce">
                <CheckCircle size={80} style={{margin:'0 auto'}}/>
              </div>
              <h2 style={{color:'var(--primary)', fontSize: '28px', marginBottom:'15px'}}>{t.success_title}</h2>
              <p style={{color:'#64748b', fontSize:'18px', maxWidth: '400px', margin:'0 auto'}}>{t.success_desc}</p>
              
              <div style={{marginTop:40}}>
                <button className="btn-action btn-primary" onClick={resetForm}>{t.btn_finish}</button>
              </div>
            </div>
          )}
        </main>
        
        <footer style={{marginTop:30, textAlign:'center', color:'#94a3b8', fontSize:'13px', fontWeight: 500}}>
          {t.footer}
        </footer>
      </div>
    </div>
  );
}