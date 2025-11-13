import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axiosConfig';

const RegisterPage: React.FC = () => {
    const [formData, setFormData] = useState({
        tipo_documento: '',
        numero_documento: '',
        nombre_completo: '',
        correo_electronico: '',
        password: '',
        confirmPassword: '',
    });
    const navigate = useNavigate();

    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const documentTypes = ['Cedula', 'Tarjeta de identidad', 'Pasaporte', 'Cedula de extranjería'];

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};

        // 1. Validar que no estén vacíos (Usando las claves de formData)
        Object.keys(formData).forEach((key) => {
            if (!formData[key as keyof typeof formData]) {
                newErrors[key] = 'Este campo es obligatorio.';
            }
        });
        
        // Si hay errores de campo obligatorio, detenemos la validación de reglas complejas
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return false;
        }

        // --- Reglas de Validación Específicas (Usando las claves de formData) ---

        // 2. Validate full name (nombre_completo)
        if (formData.nombre_completo.length <= 3) {
            newErrors.nombre_completo = 'El nombre debe tener más de 3 caracteres.';
        } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(formData.nombre_completo)) {
            newErrors.nombre_completo = 'El nombre solo debe contener letras (incluye acentos y Ñ).';
        }

        // 3. Validate email (correo_electronico) - Se usa la clave correcta
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo_electronico)) {
            newErrors.correo_electronico = 'El correo electrónico debe tener un formato válido.';
        }

        // 4. Validación de email ya registrado (se mantiene el 'false' de momento)
        if(false){
            newErrors.correo_electronico = 'El correo electrónico ya está registrado.';
        }

        // 5. Validate document number (numero_documento)
        if (!/^\d+$/.test(formData.numero_documento)) {
            newErrors.numero_documento = 'El número de documento solo debe contener números.';
        }

        // 6. Validate password (password)
        if (formData.password.length < 8) {
            newErrors.password = 'La contraseña debe tener al menos 8 caracteres.';
        } else if (
            !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)
        ) {
            newErrors.password =
                'La contraseña debe contener al menos una letra mayúscula, una letra minúscula y un número.';
        }

        // 7. Validate confirm password (confirmPassword)
        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'La confirmación de contraseña debe coincidir con la contraseña.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            try {
                // Se envía el objeto sin el campo confirmPassword
                const { confirmPassword, ...dataToSend } = formData;
                await apiClient.post('/register', dataToSend);
                console.log('Registro exitoso:', dataToSend);
                navigate('/login');
            } catch (error: any) {
                // Manejo de errores de la API (Flask/Backend)
                if (error.response && error.response.status === 422) {
                    // Errores de validación del backend
                    setErrors(error.response.data.errors || {});
                } else if (error.response && error.response.data.message) {
                    // Otros errores de la API
                    setErrors({ general: error.response.data.message });
                } else {
                    setErrors({ general: 'Error al conectar con el servidor.' });
                }
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    return (
        <div className='form-container'>
            <h2>Registro</h2>
            <form onSubmit={handleSubmit}>
                {errors.general && <p className="error-message">{errors.general}</p>}
                <div>
                    <label>Tipo de documento</label>
                    <select name="tipo_documento" value={formData.tipo_documento} onChange={handleChange}>
                        <option value="">Seleccione</option>
                        {documentTypes.map((type) => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>
                    {/* Clave corregida: tipo_documento */}
                    {errors.tipo_documento && <p className="error-message">{errors.tipo_documento}</p>}
                </div>

                <div>
                    <label>Número de documento</label>
                    <input
                        type="text"
                        name="numero_documento"
                        value={formData.numero_documento}
                        onChange={handleChange}
                    />
                    {/* Clave corregida: numero_documento */}
                    {errors.numero_documento && <p className="error-message">{errors.numero_documento}</p>}
                </div>

                <div>
                    <label>Nombre completo</label>
                    <input
                        type="text"
                        name="nombre_completo"
                        value={formData.nombre_completo}
                        onChange={handleChange}
                    />
                    {/* Clave corregida: nombre_completo */}
                    {errors.nombre_completo && <p className="error-message">{errors.nombre_completo}</p>}
                </div>

                <div>
                    <label>Correo electrónico</label>
                    <input
                        type="text"
                        name="correo_electronico"
                        value={formData.correo_electronico}
                        onChange={handleChange}
                    />
                    {/* Clave corregida: correo_electronico */}
                    {errors.correo_electronico && <p className="error-message">{errors.correo_electronico}</p>}
                </div>

                <div>
                    <label>Contraseña</label>
                    <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                    />
                    {errors.password && <p className="error-message">{errors.password}</p>}
                </div>

                <div>
                    <label>Confirmar contraseña</label>
                    <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                    />
                    {errors.confirmPassword && <p className="error-message">{errors.confirmPassword}</p>}
                </div>

                <button type="submit">Registrarme</button>
            </form>
        </div>
    );
};

export default RegisterPage;
