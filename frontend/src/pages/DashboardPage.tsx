import type { FC } from 'react';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/axiosConfig';

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    console.log("DashboardPage: Efecto ejecutado una sola vez al montar");
  }, []);

  useEffect(() => {
    const fetchDeclarations = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<Declaration[]>('/declarations');
        setDeclarations(response.data);
      } catch (err: any) {
        console.error("Error fetching declarations:", err);
        setError("No se pudieron cargar las declaraciones.");
      } finally {
        setIsLoading(false);
      }
    };

    if (user && user.nombre_completo) {
      fetchDeclarations();
    }
  }, [user]);

  return (
    <div>
      <h1>Panel de Usuario</h1>

      {user && user.nombre_completo && (
        <>
          <p>Bienvenido/a, {user.nombre_completo}!</p>
          <p>Tu correo: {user.correo_electronico}</p>
          <button onClick={logout}>Cerrar Sesión</button>
        </>
      )}

      <hr />

      <h2>Mis Declaraciones de Impuestos</h2>

      {isLoading && (
        <p style={{ textAlign: 'center', color: '#666' }}>
          Cargando declaraciones...
        </p>
      )}

      {error && <p className="error-message">{error}</p>}

      {!isLoading && !error && declarations.length === 0 && (
        <p style={{ textAlign: 'center', color: '#666' }}>
          No tienes declaraciones aún. ¡Crea tu primera declaración!
        </p>
      )}

      {!isLoading && declarations.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            marginTop: '20px',
            border: '1px solid #ddd'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f2f2f2' }}>
                <th style={tableHeaderStyle}>Año Fiscal</th>
                <th style={tableHeaderStyle}>Ingresos</th>
                <th style={tableHeaderStyle}>Estado</th>
                <th style={tableHeaderStyle}>Fecha Creación</th>
              </tr>
            </thead>
            <tbody>
              {declarations.map((decl) => (
                <tr key={decl.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={tableCellStyle}>{decl.ano_fiscal}</td>
                  <td style={tableCellStyle}>
                    ${decl.ingresos_totales.toLocaleString('es-CO', { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </td>
                  <td style={tableCellStyle}>
                    <span style={{
                      backgroundColor: getEstadoBgColor(decl.estado_declaracion),
                      color: getEstadoTextColor(decl.estado_declaracion),
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.875em',
                      fontWeight: '500'
                    }}>
                      {getEstadoLabel(decl.estado_declaracion)}
                    </span>
                  </td>
                  <td style={tableCellStyle}>
                    {new Date(decl.fecha_creacion).toLocaleDateString('es-CO')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Estilos para la tabla
const tableHeaderStyle: React.CSSProperties = {
  padding: '12px',
  textAlign: 'left',
  borderBottom: '2px solid #ddd',
  fontWeight: 'bold'
};

const tableCellStyle: React.CSSProperties = {
  padding: '10px',
  textAlign: 'left'
};

// Funciones auxiliares para colores de estado
const getEstadoBgColor = (estado: string): string => {
  const colorsMap: { [key: string]: string } = {
    'Guardada': '#fff3cd',
    'Enviada': '#cfe2ff',
    'Procesada': '#d1e7dd',
    'Aprobada': '#d1e7dd',
    'Rechazada': '#f8d7da',
    'En Revisión': '#e7f3ff',
    'Pendiente': '#fff3cd'
  };
  return colorsMap[estado] || '#f0f0f0';
};

const getEstadoTextColor = (estado: string): string => {
  const colorsMap: { [key: string]: string } = {
    'Guardada': '#856404',
    'Enviada': '#084298',
    'Procesada': '#0f5132',
    'Aprobada': '#0f5132',
    'Rechazada': '#842029',
    'En Revisión': '#055160',
    'Pendiente': '#856404'
  };
  return colorsMap[estado] || '#333';
};

export default DashboardPage;


