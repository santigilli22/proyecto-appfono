# AppFono - Sistema de Facturación y Gestión Fonoaudiológica

Este proyecto es una aplicación web integral desarrollada para la gestión administrativa y clínica de un consultorio fonoaudiológico. Su objetivo principal es automatizar la carga de facturas, gestionar cuentas corrientes de obras sociales y realizar un seguimiento financiero detallado.

## 🚀 Tecnologías Utilizadas (MERN Stack)

El sistema está construido sobre una arquitectura moderna basada en **JavaScript** de punta a punta:

### Frontend
- **React.js (Vite)**: Framework principal para una interfaz de usuario rápida y reactiva.
- **Tailwind CSS**: Para el diseño de componentes estilizados y responsive.
- **Axios**: Manejo de peticiones HTTP.
- **Recharts**: Visualización de datos y estadísticas (gráficos de facturación).
- **jsPDF & AutoTable**: Generación de reportes PDF detallados en el cliente.
- **Lucide React**: Iconografía moderna.

### Backend
- **Node.js & Express**: Servidor REST API robusto.
- **MongoDB & Mongoose**: Base de datos NoSQL para almacenar facturas, pacientes y pagos con esquemas flexibles.
- **PDF2JSON**: Motor de parsing para extracción automática de datos desde facturas PDF (AFIP/ARCA).
- **Multer**: Gestión de carga de archivos.

## ✨ Características Principales

### 1. Motor de Parsing de Facturas (PDF)
El núcleo del sistema incluye un algoritmo capaz de leer facturas PDF (formato AFIP).
- **Extracción Inteligente**: Detecta automáticamente el número de factura, fecha de emisión, **período de servicio** (fundamental para el devengado), entidad (obra social), paciente y montos.
- **Lógica de "Totales"**: Algoritmo refinado para distinguir el total de la factura de otros valores numéricos en la descripción de los ítems.

### 2. Módulo de Facturación y Cuentas Corrientes
- **Vista de Carga (Uploads)**: Permite subir lotes de facturas. El sistema valida duplicados y parsea los datos en tiempo real.
- **Seguimiento de Pagos**: Cada factura tiene un estado (`Pendiente`, `Parcial`, `Pagado`).
- **Pagos Parciales**: Posibilidad de registrar múltiples pagos a una misma factura, recalculando el saldo automáticamente.

### 3. Reportes y Estadísticas
- **Filtrado por Período de Servicio**: Los reportes se basan en cuándo se brindó el servicio, no solo en la fecha de emisión.
- **Gráficos de Evolución**: Comparativa mensual de "Facturado vs. Cobrado".
- **Estado de Cuenta por Entidad**: Tabla resumen que muestra la deuda y antigüedad de saldo por cada Obra Social.
- **Alertas de Antigüedad**: Indicadores visuales (badges) para facturas con más de 30, 60 o 90 días de retraso.
- **Exportación PDF**: Generación de resúmenes de cuenta corriente listos para enviar a las obras sociales.

## 🛠️ Instalación y Despliegue

### Requisitos
- Node.js (v14+)
- MongoDB (Local o Atlas)

### Pasos
1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/tu-usuario/proyecto-appfono.git
   ```

2. **Backend**:
   ```bash
   cd backend
   npm install
   # Configurar .env con MONGO_URI
   npm run dev
   ```

3. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## 📝 Notas de Desarrollo
Este sistema fue diseñado con un enfoque modular, separando claramente la lógica de negocio (Backend controllers) de la presentación. Se puso especial énfasis en la **UX** (Experiencia de Usuario) para hacer que la tarea administrativa sea lo menos tediosa posible, incluyendo validaciones automáticas, autocompletados y feedback visual inmediato.
