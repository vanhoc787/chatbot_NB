import { Toaster } from "react-hot-toast";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login/Login";
import AuthGuard from "./components/AuthGuard/AuthGuard";
import Chatbot_NB from "./components/Chatbot/Chatbot_NB";
import Layout from "./components/Layout/Layout";
import AdminLayout from "./components/AdminLayout/AdminLayout"
import UserManagement from "./pages/UserManagement/UserManagement"
import Import from "./pages/Import/Import"

import './index.css'
import './styles/websocket.css';

function App() {
  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
          <Routes>
              <Route path="/" element={
                  <AuthGuard requireAuth={false}>
                      <Navigate to="/login" replace />
                  </AuthGuard>
              } />

              <Route path="/login" element={
                  <AuthGuard requireAuth={false}>
                      <Login />
                  </AuthGuard>
              } />

              <Route path="/chatbot_NB/:conversationId" element={
                <Layout>
                     <Chatbot_NB />
                </Layout>
              } />

              <Route
                path="/admin"
                element={
                    <AuthGuard>
                        <AdminLayout>
                            <UserManagement />
                        </AdminLayout>
                    </AuthGuard>
                }
            />

            <Route path="/import" element={
              <Layout>
                  <Import />
              </Layout>
      
              } />
          </Routes>
    </>
  )
}

export default App
