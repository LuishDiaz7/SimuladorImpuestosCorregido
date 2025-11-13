import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';

interface User {
  id: number;
  nombre_completo: string;
  correo_electronico: string;
  es_admin: boolean;
}

const LoginPage: React.FC = () => {
  const [correoElectronico, setCorreoElectronico] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    
    setIsLoading(true);

    try {
      const response = await apiClient.post<{ message: string; user: User }>('/login', {
        correo_electronico: correoElectronico,
        password: password,
      });

      console.log('Login exitoso:', response.data.message);
      console.log('Usuario:', response.data.user);

      login(response.data.user);

      if (response.data.user.es_admin) {
        navigate('/admin/users');
      } else {
        navigate('/dashboard');
      }

    } catch (err: any) {
      console.error('Error en login:', err);
      
      // BUG-002: Mensajes de error específicos
      if (!err.response) {
        // Error de red o servidor no disponible
        setError('Error de conexión con el servidor. Por favor, verifica tu conexión e intenta nuevamente.');
      } else if (err.response.status === 401 || err.response.status === 400) {
        // Credenciales inválidas
        setError('Credenciales inválidas. Por favor, verifica tu correo y contraseña.');
      } else if (err.response.status >= 500) {
        // Error del servidor
        setError('Error interno del servidor. Por favor, intenta más tarde.');
      } else {
        // Otros errores
        const apiErrorMessage = err.response?.data?.message || 'Error al iniciar sesión. Por favor, intenta nuevamente.';
        setError(apiErrorMessage);
      }
    } finally {
      
      setIsLoading(false);
    }
  };

  // BUG-001: Limpiar error cuando el usuario comienza a escribir
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCorreoElectronico(e.target.value);
    if (error) setError(null);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (error) setError(null);
  };

  return (
    <div className="form-container">
      <h2 style={{ textAlign: 'center' }}>Iniciar Sesión</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="correo">Correo Electrónico:</label>
          <input
            type="email"
            id="correo"
            value={correoElectronico}
            onChange={handleEmailChange}
            required
            disabled={isLoading}
            autoFocus // BUG-003: Autofocus en campo de email
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Contraseña:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={handlePasswordChange}
            required
            disabled={isLoading}
          />
        </div>

        {error && <p className="error-message">{error}</p>}

        {/* */}
        <button type="submit" disabled={isLoading} style={{width: '100%'}}>
          {isLoading ? 'Iniciando...' : 'Iniciar Sesión'}
        </button>
      </form>
      <div className='link'>
        <Link to="/forgot-password">¿Olvidaste tu contraseña?</Link>
      </div>
    </div>
  );
};

export default LoginPage;
