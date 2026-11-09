// src/components/AutoPrintListener.js
import { useEffect } from "react";
import { visitorsApi } from "./apiClient";

export default function AutoPrintListener() {
  useEffect(() => {
    const unsubscribe = visitorsApi.subscribe((payload) => {
          if (payload.eventType !== "INSERT") return;
          console.log("✅ New visitor added:", payload.new);

          const id = payload.new.id;

          // วิธี 1: เด้งหน้าต่างใหม่ (ง่ายสุด แต่มี popup)
          // window.open(`/print/${id}`, "_blank");

          // วิธี 2: ใช้ iframe ซ่อน แล้วพิมพ์อัตโนมัติ
          const iframe = document.createElement("iframe");
          iframe.style.display = "none";
          iframe.src = `/print/${id}`;
          document.body.appendChild(iframe);
          iframe.onload = () => {
            iframe.contentWindow.print();
          };
        });

    return () => {
      unsubscribe();
    };
  }, []);

  return null; // ไม่มี UI
}
