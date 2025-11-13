import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../api/axiosConfig';

const ResetPasswordPage: React.FC = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const email = (location.state as { email: string })?.email;

    const validatePassword = (): boolean => {
        setError('');

        if (!password) {
            setError('La contraseña es requerida');
            return false;
        }

        if (password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres');
            return false;
        }

        if (!/(?=.*[a-z])/.test(password)) {
            setError('La contraseña debe contener al menos una letra minúscula');
            return false;
        }

        if (!/(?=.*[A-Z])/.test(password)) {
            setError('La contraseña debe contener al menos una letra mayúscula');
            return false;
        }

        if (!/(?=.*\d)/.test(password)) {
            setError('La contraseña debe contener al menos un número');
            return false;
        }

        if (!/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(password)) {
            setError('La contraseña debe contener al menos un carácter especial (!@#$%^&*(),.?":{}|<>)');
            return false;
        }

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email) {
            setError('No se pudo obtener el correo. Intenta iniciar de nuevo el proceso.');
            return;
        }

        if (!validatePassword()) {
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const response = await apiClient.patch('/reset-password', {
                mail: email,
                password: password
            });

            if (response.status === 200) {
                alert('Contraseña actualizada exitosamente. Serás redirigido al login.');
                navigate('/login');
            }
        } catch (err: any) {
            console.error('Error al cambiar contraseña:', err);
            
            if (err.response?.status === 422) {
                setError(err.response.data.message || 'La contraseña no cumple con los requisitos');
            } else if (err.response?.status === 404) {
                setError('Usuario no encontrado');
            } else {
                setError('Error al cambiar la contraseña. Inténtalo de nuevo más tarde.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className='form-container'>
            <h2>Restablecer Contraseña</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="password">Nueva Contraseña:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        disabled={isLoading}
                    />
                    <small style={{ display: 'block', color: '#666', fontSize: '0.85em', marginTop: '4px' }}>
                        ℹ️ Mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número, 1 carácter especial
                    </small>
                </div>
                <div>
                    <label htmlFor="confirmPassword">Confirmar Contraseña:</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={isLoading}
                    />
                </div>
                {error && <p className="error-message">{error}</p>}
                <button type="submit" disabled={isLoading}>
                    {isLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
                </button>
            </form>
        </div>
    );
};

export default ResetPasswordPage;
