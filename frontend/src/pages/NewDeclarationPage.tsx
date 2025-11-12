import type { FC, ChangeEvent, FormEvent } from 'react';
import React, { useState } from 'react';
import apiClient from '../api/axiosConfig';
import { useNavigate } from 'react-router-dom';
import type { AxiosError } from 'axios';

// Interfaz para el formulario
interface DeclarationFormData {
    ano_fiscal: number | string;
    ingresos_totales: number | string;
    deducciones_aplicadas?: number | string;
    estado_civil: string;
    dependientes?: number | string;
    otros_ingresos_deducciones?: string;
}

// Interfaz para la estructura de error esperada de la API
interface ApiErrorResponse {
    message: string;
    errors?: Record<string, string>;
}

// BUG-013: Valores iniciales en constante reutilizable
const INITIAL_FORM_DATA: DeclarationFormData = {
    ano_fiscal: new Date().getFullYear() - 1,
    ingresos_totales: '',
    deducciones_aplicadas: '',
    estado_civil: 'Soltero/a',
    dependientes: '',
    otros_ingresos_deducciones: ''
};

const NewDeclarationPage: FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState<DeclarationFormData>(INITIAL_FORM_DATA);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        // Limpiar errores cuando el usuario escribe
        if (fieldErrors[name]) {
            setFieldErrors(prev => ({ ...prev, [name]: '' }));
        }
        if (error) setError(null);
        if (successMessage) setSuccessMessage(null);
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setFieldErrors({});
        setSuccessMessage(null);

        const parsedAnoFiscal = Number.parseInt(String(formData.ano_fiscal), 10);
        const dataToSend = {
            ...formData,
            ano_fiscal: !Number.isNaN(parsedAnoFiscal) ? parsedAnoFiscal : null,
            ingresos_totales: Number.parseFloat(String(formData.ingresos_totales)) || null,
            deducciones_aplicadas: formData.deducciones_aplicadas 
                ? Number.parseFloat(String(formData.deducciones_aplicadas)) 
                : 0.0,
            dependientes: formData.dependientes 
                ? Number.parseInt(String(formData.dependientes), 10) 
                : null,
        };

        try {
            const response = await apiClient.post('/declarations', dataToSend);
            console.log('Declaración creada:', response.data);
            
            // BUG-012: Mostrar mensaje de éxito
            setSuccessMessage('¡Declaración creada exitosamente!');

            // BUG-012: Resetear formulario después del éxito
            setFormData({ ...INITIAL_FORM_DATA });

            // Scroll al inicio para ver el mensaje de éxito
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Opcional: Redirigir después de 2 segundos
            setTimeout(() => {
                navigate('/dashboard');
            }, 2000);

        } catch (err) {
            const error = err as AxiosError<ApiErrorResponse>;
            console.error("Error al crear declaración:", error);
            
            if (error.response?.status === 422 && error.response.data?.errors) {
                setError('Por favor corrige los errores en el formulario.');
                setFieldErrors(error.response.data.errors);
            } else {
                setError(error.response?.data?.message || 'Error al crear la declaración.');
            }
            
            // Scroll al inicio para ver el error
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="form-container">
            <h2>Crear Nueva Declaración de Impuestos</h2>
            
            {/*  Mensaje de éxito */}
            {successMessage && (
                <div style={{
                    backgroundColor: '#d4edda',
                    color: '#155724',
                    padding: '12px',
                    borderRadius: '4px',
                    marginBottom: '20px',
                    border: '1px solid #c3e6cb'
                }}>
                    {successMessage}
                </div>
            )}
            
            <form onSubmit={handleSubmit}>
                {error && <p className="error-message">{error}</p>}

                <div className="form-group">
                    <label htmlFor="ano_fiscal">Año Fiscal:</label>
                    <input
                        type="number"
                        id="ano_fiscal"
                        name="ano_fiscal"
                        value={formData.ano_fiscal}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                        min="2000"
                        max="2100"
                    />
                    {fieldErrors.ano_fiscal && (
                        <span className="error-message">{fieldErrors.ano_fiscal}</span>
                    )}
                </div>

                <div className="form-group">
                    <label htmlFor="ingresos_totales">Ingresos Totales Anuales:</label>
                    <input
                        type="number"
                        step="0.01"
                        id="ingresos_totales"
                        name="ingresos_totales"
                        value={formData.ingresos_totales}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                        placeholder="Ej: 50000.00"
                        min="0"
                    />
                    {fieldErrors.ingresos_totales && (
                        <span className="error-message">{fieldErrors.ingresos_totales}</span>
                    )}
                </div>

                <div className="form-group">
                    <label htmlFor="estado_civil">Estado Civil:</label>
                    <select
                        id="estado_civil"
                        name="estado_civil"
                        value={formData.estado_civil}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                    >
                        <option value="Soltero/a">Soltero/a</option>
                        <option value="Casado/a">Casado/a</option>
                        <option value="Divorciado/a">Divorciado/a</option>
                        <option value="Viudo/a">Viudo/a</option>
                    </select>
                    {fieldErrors.estado_civil && (
                        <span className="error-message">{fieldErrors.estado_civil}</span>
                    )}
                </div>

                <div className="form-group">
                    <label htmlFor="deducciones_aplicadas">Deducciones Aplicadas:</label>
                    <input
                        type="number"
                        step="0.01"
                        id="deducciones_aplicadas"
                        name="deducciones_aplicadas"
                        value={formData.deducciones_aplicadas}
                        onChange={handleChange}
                        disabled={isLoading}
                        placeholder="Opcional, Ej: 5000.00"
                        min="0"
                    />
                    {fieldErrors.deducciones_aplicadas && (
                        <span className="error-message">{fieldErrors.deducciones_aplicadas}</span>
                    )}
                </div>

                <div className="form-group">
                    <label htmlFor="dependientes">Número de Dependientes:</label>
                    <input
                        type="number"
                        id="dependientes"
                        name="dependientes"
                        value={formData.dependientes}
                        onChange={handleChange}
                        disabled={isLoading}
                        placeholder="Opcional, Ej: 2"
                        min="0"
                        max="99"
                    />
                    {fieldErrors.dependientes && (
                        <span className="error-message">{fieldErrors.dependientes}</span>
                    )}
                </div>

                <div className="form-group">
                    <label htmlFor="otros_ingresos_deducciones">
                        Otros Ingresos / Deducciones (Notas):
                    </label>
                    <textarea
                        id="otros_ingresos_deducciones"
                        name="otros_ingresos_deducciones"
                        value={formData.otros_ingresos_deducciones}
                        onChange={handleChange}
                        disabled={isLoading}
                        rows={3}
                        placeholder="Opcional"
                        maxLength={1000}
                    />
                    <small style={{ color: '#666', fontSize: '0.85em' }}>
                        {formData.otros_ingresos_deducciones?.length || 0}/1000 caracteres
                    </small>
                </div>

                <button type="submit" disabled={isLoading} style={{ width: '100%' }}>
                    {isLoading ? 'Creando...' : 'Crear Declaración'}
                </button>
            </form>
        </div>
    );
};

export default NewDeclarationPage;
