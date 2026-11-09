import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': 'http://localhost:3001',
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
    allowedHosts: [
      '4ad3-134-236-19-253.ngrok-free.app',
      'localhost',
      '127.0.0.1'
    ]
  }
})


// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'
// import fs from 'fs' // เพิ่มตรงนี้

// export default defineConfig({
//   plugins: [react()],
//   server: {
//     host: true, // ให้ dev server ฟังทุก interface
//     port: 3000, // หรือพอร์ตที่ใช้
//     // https: {
//     //   key: fs.readFileSync('./192.168.0.181+1-key.pem'),
//     //   cert: fs.readFileSync('./192.168.0.181+1.pem'),
//     // },
//     allowedHosts: [
//       '07b85ee0f8c4.ngrok-free.app', // เพิ่ม URL ของ ngrok
//       'localhost',
//       '127.0.0.1'
//     ]
//   }
// })
