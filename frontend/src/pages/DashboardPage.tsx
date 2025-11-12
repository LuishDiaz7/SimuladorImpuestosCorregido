import type { FC } from 'react';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/axiosConfig';

// Definir interfaz para los datos de la declaración recibidos
interface Declaration {
    id: number;
    ano_fiscal: number;
    ingresos_totales: number;
    estado_declaracion: string;
    fecha_creacion: string;
}

const DashboardPage: FC = () => {
  const { user, logout } = useAuth();
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [isLoading, setIsLoading] = useState(false); // FIX BUG-014: Estado de carga
  const [error, setError] = useState<string | null>(null);

  // FIX BUG-013: Función para mapear estados de BD a texto amigable
  const getEstadoLabel = (estado: string): string => {
    const estadosMap: { [key: string]: string } = {
      'Guardada': 'Borrador',
      'Enviada': 'Enviada',
      'Procesada': 'Procesada',
      'Aprobada': 'Aprobada',
      'Rechazada': 'Rechazada',
      'En Revisión': 'En revisión',
      'Pendiente': 'Pendiente'
    };
    return estadosMap[estado] || estado;
  };

  // BUG-006: useEffect con array de dependencias vacío
  useEffect(() => {
    console.log("DashboardPage: Efecto ejecutado una sola vez al montar");
    // Cualquier inicialización que deba ejecutarse solo una vez
  }, []); // Array vacío = ejecuta solo al montar

  // BUG-010: Eliminar llamada innecesaria a /api/session
  // Los datos del usuario ya están en el contexto de autenticación
  // No es necesario hacer otra petición

  // useEffect para buscar declaraciones
  useEffect(() => {
    const fetchDeclarations = async () => {
      setIsLoading(true); // BUG-014: Activar indicador de carga
      setError(null);
      try {
        const response = await apiClient.get<Declaration[]>('/declarations');
        setDeclarations(response.data);
      } catch (err: any) {
        console.error("Error fetching declarations:", err);
        setError("No se pudieron cargar las declaraciones.");
      } finally {
        setIsLoading(false); // BUG-014: Desactivar indicador de carga
      }
    };

    // BUG-007: Validar que user esté completamente cargado
    if (user && user.nombre_completo) {
      fetchDeclarations();
    }
  }, [user]); // Dependencia correcta

  return (
    <div>
      <h1>Panel de Usuario</h1>

      {/* BUG-007: Validación completa antes de mostrar datos del usuario */}
      {user && user.nombre_completo && (
        <>
          <p>Bienvenido/a, {user.nombre_completo}!</p>
          <p>Tu correo: {user.correo_electronico}</p>
          <button onClick={logout}>Cerrar Sesión</button>
        </>
      )}

      <hr />

      <h2>Mis Declaraciones de Impuestos</h2>

      {/* BUG-14: Indicador de carga */}
      {isLoading && (
        <p style={{ textAlign: 'center', color: '#666' }}>
          Cargando declaraciones...
        </p>
      )}

      {/* Mostrar error si existe */}
      {error && <p className="error-message">{error}</p>}

      {/* BUG-014: Mensaje cuando la lista está vacía */}
      {!isLoading && !error && declarations.length === 0 && (
        <p style={{ textAlign: 'center', color: '#666' }}>
          No tienes declaraciones aún. ¡Crea tu primera declaración!
        </p>
      )}

      {/* Mostrar tabla solo cuando hay declaraciones */}
      {!isLoading && declarations.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Año Fiscal</th>
              <th>Ingresos</th>
              <th>Estado</th>
              <th>Fecha Creación</th>
            </tr>
          </thead>
          <tbody>
            {declarations.map((decl) => (
              <tr key={decl.id}>
                <td>{decl.ano_fiscal}</td>
                <td>${decl.ingresos_totales.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                {/* FIX BUG-013: Usar función de mapeo para estado amigable */}
                <td>{getEstadoLabel(decl.estado_declaracion)}</td>
                <td>{new Date(decl.fecha_creacion).toLocaleDateString('es-CO')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default DashboardPage;

