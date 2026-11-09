import React, { useState } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

export default function ReportAccess({
  stage,
  email,
  password,
  pin,
  userEmail,
  error,
  busy,
  onEmailChange,
  onPasswordChange,
  onPinChange,
  onLogin,
  onVerifyPin,
  onLogout,
  onBack,
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(0,70,173,0.20),_transparent_36%),linear-gradient(135deg,#eef4ff_0%,#f8fbff_48%,#e7effc_100%)] px-5 py-10 text-[#1a2b49]">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center justify-center">
        <section className="w-full overflow-hidden rounded-[32px] border border-white/80 bg-white/95 shadow-[0_28px_80px_rgba(0,51,153,0.18)] backdrop-blur">
          <div className="bg-gradient-to-br from-[#003399] to-[#0058c9] px-7 py-8 text-white">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <ShieldCheck size={31} />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-100">
              Visitor Management System
            </p>
            <h1 className="mt-2 text-2xl font-black">เข้าสู่หน้ารายงาน</h1>
            <p className="mt-2 text-sm leading-6 text-blue-100">
              ระบบป้องกัน 2 ชั้นด้วยบัญชีผู้ดูแลและรหัส PIN
            </p>
          </div>

          <div className="p-7 sm:p-8">
            {stage === "checking" && (
              <div className="flex min-h-48 flex-col items-center justify-center gap-4 text-center">
                <Loader2 className="animate-spin text-[#0046AD]" size={38} />
                <div>
                  <p className="font-bold">กำลังตรวจสอบการเข้าสู่ระบบ</p>
                  <p className="mt-1 text-sm text-slate-500">กรุณารอสักครู่...</p>
                </div>
              </div>
            )}

            {stage === "login" && (
              <form onSubmit={onLogin} className="space-y-5">
                <div>
                  <h2 className="text-xl font-black">Supabase Authentication</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    ใช้อีเมลและรหัสผ่านที่สร้างใน Authentication → Users
                  </p>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-600">อีเมลผู้ดูแล</span>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                    <input
                      type="email"
                      autoComplete="username"
                      required
                      value={email}
                      onChange={(event) => onEmailChange(event.target.value)}
                      className="w-full rounded-2xl border-2 border-[#d8e4f7] bg-[#f7faff] py-3.5 pl-12 pr-4 outline-none transition focus:border-[#0046AD] focus:bg-white focus:ring-4 focus:ring-blue-100"
                      placeholder="admin@example.com"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-600">รหัสผ่าน</span>
                  <div className="relative">
                    <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(event) => onPasswordChange(event.target.value)}
                      className="w-full rounded-2xl border-2 border-[#d8e4f7] bg-[#f7faff] py-3.5 pl-12 pr-12 outline-none transition focus:border-[#0046AD] focus:bg-white focus:ring-4 focus:ring-blue-100"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50"
                      aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                    >
                      {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                    </button>
                  </div>
                </label>

                {error && (
                  <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0046AD] px-5 font-bold text-white shadow-lg shadow-blue-900/15 transition hover:bg-[#00378a] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy && <Loader2 className="animate-spin" size={19} />}
                  เข้าสู่ระบบ
                </button>
              </form>
            )}

            {stage === "pin" && (
              <form onSubmit={onVerifyPin} className="space-y-5">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-[#0046AD]">
                    <LockKeyhole size={31} />
                  </div>
                  <h2 className="text-xl font-black">ยืนยัน PIN ผู้ดูแล</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    ล็อกอินแล้วในชื่อ <span className="font-bold text-slate-700">{userEmail}</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-400">ต้องยืนยันใหม่ทุกครั้งที่เปิดหรือรีเฟรชหน้านี้</p>
                </div>

                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  autoFocus
                  required
                  value={pin}
                  onChange={(event) => onPinChange(event.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-2xl border-2 border-[#d8e4f7] bg-[#f7faff] px-4 py-4 text-center text-2xl font-black tracking-[0.55em] outline-none transition focus:border-[#0046AD] focus:bg-white focus:ring-4 focus:ring-blue-100"
                  placeholder="••••"
                  aria-label="Admin PIN"
                />

                {error && (
                  <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0046AD] px-5 font-bold text-white shadow-lg shadow-blue-900/15 transition hover:bg-[#00378a] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy && <Loader2 className="animate-spin" size={19} />}
                  เปิดหน้ารายงาน
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  disabled={busy}
                  className="w-full text-sm font-bold text-slate-500 hover:text-[#0046AD] disabled:opacity-60"
                >
                  เปลี่ยนบัญชีผู้ใช้
                </button>
              </form>
            )}

            {stage !== "checking" && (
              <button
                type="button"
                onClick={onBack}
                className="mt-6 flex w-full items-center justify-center gap-2 border-t border-slate-100 pt-5 text-sm font-semibold text-slate-500 hover:text-[#0046AD]"
              >
                <ArrowLeft size={17} /> กลับหน้าลงทะเบียนผู้มาติดต่อ
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
