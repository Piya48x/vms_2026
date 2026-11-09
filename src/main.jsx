
import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.jsx'
import PrintSlip from './slip/PrintSlip.jsx'
import './styles.css'
import Report from './slip/Report.jsx'
import Modal from './slip/Modal.jsx'
import './index.css'


const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/print/:id', element: <PrintSlip /> },
  { path: '/Report', element: <Report /> },
  { path: '/Modal', element: <Modal /> },

])

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
