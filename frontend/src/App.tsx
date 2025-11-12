import type { FC, MouseEvent, FocusEvent } from 'react';
import React, { useState } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AdminUsersPage from './pages/AdminUsersPage';
import NewDeclarationPage from './pages/NewDeclarationPage';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import ForgotPassword from './pages/ForgotPasswordPage';
import ResetPassword from './pages/ResetPasswordPage';
import RegisterPage from './pages/RegisterPage';
import UpdateUserPage from './pages/UpdateUserPage';

function App() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // BUG-008: Estado para manejar el proceso de logout
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleMouseOver = (e: MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = 'var(--color-secondary-dark)';
  };

  const handleMouseOut = (e: MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = 'var(--color-secondary)';
  };

  const handleFocus = (e: FocusEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = 'var(--color-secondary-dark)';
  };

  const handleBlur = (e: FocusEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = 'var(--color-secondary)';
  };

  // BUG-008: Función mejorada de logout con redirección garantizada
  const handleLogout = async () => {
    if (isLoggingOut) return; // Prevenir múltiples clics
    
    setIsLoggingOut(true);
    
    try {
      // Llamar a logout del contexto
      await logout();
      
      // Forzar navegación a login después de logout
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error durante logout:', error);
      // Incluso si hay error, navegar a login
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <nav style={{
        backgroundColor: 'var(--color-bg-alt)',
        padding: '0.8rem 1.5rem',
        marginBottom: '1.5rem',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <Link to="/">Inicio</Link>
        {!user && <Link to="/login">Login</Link>}
        {!user && <Link to="/register">Registro</Link>}
        {user && !user.es_admin && <Link to="/dashboard">Mi Panel</Link>}
        {user && !user.es_admin && <Link to="/nueva-declaracion">Nueva Declaración</Link>}
        {user?.es_admin && <Link to="/admin/users">Admin Usuarios</Link>}
        {user && (
          <button
            type="button"
            onClick={handleLogout} // Usar nueva función de logout
            disabled={isLoggingOut} // Deshabilitar durante logout
            style={{
              marginLeft: 'auto',
              backgroundColor: 'var(--color-secondary)',
              padding: '0.4em 0.8em',
              cursor: isLoggingOut ? 'wait' : 'pointer',
              opacity: isLoggingOut ? 0.7 : 1
            }}
            onMouseOver={handleMouseOver}
            onFocus={handleFocus}
            onMouseOut={handleMouseOut}
            onBlur={handleBlur}
          >
            {isLoggingOut ? 'Cerrando...' : 'Cerrar Sesión'}
          </button>
        )}
      </nav>

      <div className="container">
        <h1>Simulador de Impuestos (React Frontend)</h1>
        <Routes>
          <Route path="/" element={<div>Página de Inicio Pública</div>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPassword/>} />
          <Route path="/reset-password" element={<ResetPassword/>} />
          <Route path="/register" element={<RegisterPage/>} />

          {/* Rutas protegidas */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/nueva-declaracion" element={<NewDeclarationPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/update-user" element={<UpdateUserPage />} />
          </Route>

          <Route path="*" element={<div>404 - Página no encontrada</div>} />
        </Routes>
      </div>
    </>
  );
}

export default App;
