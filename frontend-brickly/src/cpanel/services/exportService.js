import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ==============================
// EXCEL
// ==============================

const addSheet = (wb, name, headers, rows) => {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, name);
};

const exportAdminToExcel = (adminData, exclusiveCount, totalLeadsCount, agenciasLeads, agenciasClics) => {
  const wb = XLSX.utils.book_new();

  // Hoja 1: KPIs
  addSheet(wb, 'KPIs', ['Métrica', 'Valor'], [
    ['Agencias registradas', adminData?.totalAgencies ?? 0],
    ['Agentes registrados', adminData?.totalAgents ?? 0],
    ['Propiedades publicadas', adminData?.totalPropertiesPublished ?? 0],
    ['Vistas totales', adminData?.totalVisits ?? 0],
    ['Clics WhatsApp', adminData?.totalClicksWs ?? 0],
    ['Visualizaciones de perfiles', adminData?.totalClicks ?? 0],
    ['Leads totales', totalLeadsCount],
    ['Agencias destacadas', adminData?.totalAgenciesFeatured ?? 0],
    ['Agentes destacados', adminData?.totalAgentsFeatured ?? 0],
    ['Propiedades destacadas', adminData?.totalPropertiesFeatured ?? 0],
    ['Propiedades exclusivas', exclusiveCount],
    ['Agentes verificados GPI', adminData?.totalAgentsVerified ?? 0],
  ]);

  // Hoja 2: Propiedades por tipo
  if (adminData?.propertiesByType?.length) {
    addSheet(wb, 'Por tipo', ['Tipo', 'Cantidad'],
      adminData.propertiesByType.map(t => [t.type, t.total]));
  }

  // Hoja 3: Propiedades por operación
  if (adminData?.propertiesByOperation?.length) {
    addSheet(wb, 'Por operación', ['Operación', 'Cantidad'],
      adminData.propertiesByOperation.map(o => [o.operation, o.total]));
  }

  // Hoja 4: Propiedades por departamento
  if (adminData?.propertiesByDepartment?.length) {
    addSheet(wb, 'Por departamento', ['Departamento', 'Cantidad'],
      adminData.propertiesByDepartment.map(d => [d.department, d.total]));
  }

  // Hoja 5: Top agentes
  if (adminData?.topAgents) {
    const agents = Object.values(adminData.topAgents);
    addSheet(wb, 'Top agentes', ['#', 'Nombre', 'Props asignadas', 'Vistas perfil', 'Clics WA', 'Calificación'],
      agents.map((a, i) => [i + 1, a.name, a.propertiesAssign ?? 0, a.clickCounter ?? 0, a.clickCounterWs ?? 0, a.ratingAverage?.toFixed(1) ?? '0.0']));
  }

  // Hoja 6: Leads por agencia
  if (agenciasLeads?.best?.length) {
    addSheet(wb, 'Top leads agencias', ['#', 'Agencia', 'Leads'],
      agenciasLeads.best.map(a => [a.position, a.name, a.amountLeads]));
  }

  // Hoja 7: Clics WA por agencia
  if (agenciasClics?.best?.length) {
    addSheet(wb, 'Top clics WA agencias', ['#', 'Agencia', 'Clics'],
      agenciasClics.best.map(a => [a.position, a.name, a.amountClicks]));
  }

  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
};

const exportAgencyToExcel = (metricas, leadsData, agentLeads) => {
  const wb = XLSX.utils.book_new();
  const agentProfileViews = Object.values(metricas?.topAgents || {}).reduce((t, a) => t + (a.clickCounter || 0), 0);
  const whatsAppClicks = metricas?.totalClicksWs ?? metricas?.totalClicks ?? 0;

  addSheet(wb, 'KPIs', ['Métrica', 'Valor'], [
    ['Propiedades', metricas?.totalProperties ?? 0],
    ['Vistas perfil agencia', metricas?.totalClicks ?? 0],
    ['Vistas propiedades', metricas?.totalVisits ?? 0],
    ['Vistas perfiles agentes', agentProfileViews],
    ['Leads totales', leadsData?.totalLeads ?? 0],
    ['Total likes', metricas?.totalFavorites ?? 0],
    ['Clics WhatsApp', whatsAppClicks],
  ]);

  if (metricas?.propertiesByType?.length) {
    addSheet(wb, 'Por tipo', ['Tipo', 'Cantidad'],
      metricas.propertiesByType.map(t => [t.type, t.total]));
  }

  if (metricas?.propertiesByOperation?.length) {
    addSheet(wb, 'Por operación', ['Operación', 'Cantidad'],
      metricas.propertiesByOperation.map(o => [o.operation, o.total]));
  }

  if (metricas?.propertiesByDepartment?.length) {
    addSheet(wb, 'Por departamento', ['Departamento', 'Cantidad'],
      metricas.propertiesByDepartment.map(d => [d.department, d.total]));
  }

  if (metricas?.topAgents) {
    const agents = Object.values(metricas.topAgents).filter(a => (a.propertiesAssign ?? 0) > 0);
    addSheet(wb, 'Rendimiento agentes', ['Nombre', 'Propiedades', 'Vistas', 'Clics WA', 'Leads', 'Calificación'],
      agents.map(a => [
        a.name,
        a.propertiesAssign ?? 0,
        a.clickCounter ?? 0,
        a.clickCounterWs ?? 0,
        agentLeads[a.id]?.totalLeads ?? 0,
        a.ratingAverage?.toFixed(1) ?? '0.0',
      ]));
  }

  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
};

const exportAgentToExcel = (metricas, leadsData, ratingBreakdown) => {
  const wb = XLSX.utils.book_new();

  addSheet(wb, 'KPIs', ['Métrica', 'Valor'], [
    ['Propiedades activas', metricas?.assignedProperties ?? 0],
    ['Vistas totales', metricas?.totalClicks ?? 0],
    ['Clics WhatsApp', metricas?.totalClicksWs ?? 0],
    ['Leads generados', leadsData?.totalLeads ?? 0],
    ['Calificación promedio', metricas?.rating?.average?.toFixed(1) ?? '0.0'],
    ['Total reseñas', metricas?.rating?.total ?? 0],
  ]);

  if (metricas?.propertiesByType?.length) {
    addSheet(wb, 'Por tipo', ['Tipo', 'Cantidad'],
      metricas.propertiesByType.map(t => [t.type, t.total]));
  }

  if (metricas?.propertiesByOperation?.length) {
    addSheet(wb, 'Por operación', ['Operación', 'Cantidad'],
      metricas.propertiesByOperation.map(o => [o.operation, o.total]));
  }

  if (ratingBreakdown) {
    addSheet(wb, 'Calificaciones', ['Estrellas', 'Cantidad', 'Porcentaje'],
      ratingBreakdown.breakdown.map(r => [r.estrellas, r.count, `${r.pct}%`]));
  }

  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
};

// ==============================
// PDF
// ==============================

const addPdfTable = (doc, title, headers, rows, startY) => {
  let y = startY;
  doc.setFontSize(12);
  doc.text(title, 14, y);
  y += 6;
  autoTable(doc, {
    startY: y,
    head: [headers],
    body: rows,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [0, 122, 255], textColor: 255, fontStyle: 'bold' },
  });
  return doc.lastAutoTable.finalY + 8;
};

const exportAdminToPDF = (adminData, exclusiveCount, totalLeadsCount, agenciasLeads, agenciasClics) => {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('Métricas Administrador', 14, 20);
  doc.setFontSize(9);
  doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, 14, 27);

  let y = 34;

  // KPIs
  const kpiHeaders = ['Métrica', 'Valor'];
  const kpiRows = [
    ['Agencias registradas', String(adminData?.totalAgencies ?? 0)],
    ['Agentes registrados', String(adminData?.totalAgents ?? 0)],
    ['Propiedades publicadas', String(adminData?.totalPropertiesPublished ?? 0)],
    ['Vistas totales', String(adminData?.totalVisits ?? 0)],
    ['Clics WhatsApp', String(adminData?.totalClicksWs ?? 0)],
    ['Visualizaciones de perfiles', String(adminData?.totalClicks ?? 0)],
    ['Leads totales', String(totalLeadsCount)],
    ['Agencias destacadas', String(adminData?.totalAgenciesFeatured ?? 0)],
    ['Agentes destacados', String(adminData?.totalAgentsFeatured ?? 0)],
    ['Propiedades destacadas', String(adminData?.totalPropertiesFeatured ?? 0)],
    ['Propiedades exclusivas', String(exclusiveCount)],
    ['Agentes verificados GPI', String(adminData?.totalAgentsVerified ?? 0)],
  ];
  y = addPdfTable(doc, 'KPIs', kpiHeaders, kpiRows, y);

  if (adminData?.propertiesByType?.length) {
    y = addPdfTable(doc, 'Propiedades por tipo', ['Tipo', 'Cantidad'],
      adminData.propertiesByType.map(t => [t.type, String(t.total)]), y);
  }

  if (adminData?.propertiesByOperation?.length) {
    y = addPdfTable(doc, 'Propiedades por operación', ['Operación', 'Cantidad'],
      adminData.propertiesByOperation.map(o => [o.operation, String(o.total)]), y);
  }

  if (adminData?.propertiesByDepartment?.length) {
    y = addPdfTable(doc, 'Propiedades por departamento', ['Departamento', 'Cantidad'],
      adminData.propertiesByDepartment.map(d => [d.department, String(d.total)]), y);
  }

  if (adminData?.topAgents) {
    const agents = Object.values(adminData.topAgents);
    y = addPdfTable(doc, 'Top agentes', ['#', 'Nombre', 'Props', 'Vistas', 'Clics WA', 'Calif.'],
      agents.map((a, i) => [String(i + 1), a.name, String(a.propertiesAssign ?? 0), String(a.clickCounter ?? 0), String(a.clickCounterWs ?? 0), a.ratingAverage?.toFixed(1) ?? '0.0']), y);
  }

  if (agenciasLeads?.best?.length) {
    y = addPdfTable(doc, 'Top agencias por leads', ['#', 'Agencia', 'Leads'],
      agenciasLeads.best.map(a => [String(a.position), a.name, String(a.amountLeads)]), y);
  }

  if (agenciasClics?.best?.length) {
    y = addPdfTable(doc, 'Top agencias por clics WA', ['#', 'Agencia', 'Clics'],
      agenciasClics.best.map(a => [String(a.position), a.name, String(a.amountClicks)]), y);
  }

  return doc;
};

const exportAgencyToPDF = (metricas, leadsData, agentLeads) => {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('Métricas Agencia', 14, 20);
  doc.setFontSize(9);
  doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, 14, 27);

  const agentProfileViews = Object.values(metricas?.topAgents || {}).reduce((t, a) => t + (a.clickCounter || 0), 0);
  const whatsAppClicks = metricas?.totalClicksWs ?? metricas?.totalClicks ?? 0;
  let y = 34;

  y = addPdfTable(doc, 'KPIs', ['Métrica', 'Valor'], [
    ['Propiedades', String(metricas?.totalProperties ?? 0)],
    ['Vistas perfil agencia', String(metricas?.totalClicks ?? 0)],
    ['Vistas propiedades', String(metricas?.totalVisits ?? 0)],
    ['Vistas perfiles agentes', String(agentProfileViews)],
    ['Leads totales', String(leadsData?.totalLeads ?? 0)],
    ['Total likes', String(metricas?.totalFavorites ?? 0)],
    ['Clics WhatsApp', String(whatsAppClicks)],
  ], y);

  if (metricas?.propertiesByType?.length) {
    y = addPdfTable(doc, 'Por tipo', ['Tipo', 'Cantidad'],
      metricas.propertiesByType.map(t => [t.type, String(t.total)]), y);
  }

  if (metricas?.propertiesByOperation?.length) {
    y = addPdfTable(doc, 'Por operación', ['Operación', 'Cantidad'],
      metricas.propertiesByOperation.map(o => [o.operation, String(o.total)]), y);
  }

  if (metricas?.propertiesByDepartment?.length) {
    y = addPdfTable(doc, 'Por departamento', ['Departamento', 'Cantidad'],
      metricas.propertiesByDepartment.map(d => [d.department, String(d.total)]), y);
  }

  if (metricas?.topAgents) {
    const agents = Object.values(metricas.topAgents).filter(a => (a.propertiesAssign ?? 0) > 0);
    y = addPdfTable(doc, 'Rendimiento agentes', ['Nombre', 'Props', 'Vistas', 'Clics WA', 'Leads', 'Calif.'],
      agents.map(a => [a.name, String(a.propertiesAssign ?? 0), String(a.clickCounter ?? 0), String(a.clickCounterWs ?? 0), String(agentLeads[a.id]?.totalLeads ?? 0), a.ratingAverage?.toFixed(1) ?? '0.0']), y);
  }

  return doc;
};

const exportAgentToPDF = (metricas, leadsData, ratingBreakdown) => {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('Métricas Agente', 14, 20);
  doc.setFontSize(9);
  doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, 14, 27);

  let y = 34;

  y = addPdfTable(doc, 'KPIs', ['Métrica', 'Valor'], [
    ['Propiedades activas', String(metricas?.assignedProperties ?? 0)],
    ['Vistas totales', String(metricas?.totalClicks ?? 0)],
    ['Clics WhatsApp', String(metricas?.totalClicksWs ?? 0)],
    ['Leads generados', String(leadsData?.totalLeads ?? 0)],
    ['Calificación promedio', metricas?.rating?.average?.toFixed(1) ?? '0.0'],
    ['Total reseñas', String(metricas?.rating?.total ?? 0)],
  ], y);

  if (metricas?.propertiesByType?.length) {
    y = addPdfTable(doc, 'Por tipo', ['Tipo', 'Cantidad'],
      metricas.propertiesByType.map(t => [t.type, String(t.total)]), y);
  }

  if (metricas?.propertiesByOperation?.length) {
    y = addPdfTable(doc, 'Por operación', ['Operación', 'Cantidad'],
      metricas.propertiesByOperation.map(o => [o.operation, String(o.total)]), y);
  }

  if (ratingBreakdown) {
    y = addPdfTable(doc, 'Desglose calificaciones', ['Estrellas', 'Cantidad', '%'],
      ratingBreakdown.breakdown.map(r => [String(r.estrellas), String(r.count), `${r.pct}%`]), y);
  }

  return doc;
};

// ==============================
// EXPORTADORES PÚBLICOS
// ==============================

export const exportAdminToExcelFile = (adminData, exclusiveCount, totalLeadsCount, agenciasLeads, agenciasClics) => {
  const data = exportAdminToExcel(adminData, exclusiveCount, totalLeadsCount, agenciasLeads, agenciasClics);
  const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, `metricas_admin_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

export const exportAgencyToExcelFile = (metricas, leadsData, agentLeads) => {
  const data = exportAgencyToExcel(metricas, leadsData, agentLeads);
  const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, `metricas_agencia_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

export const exportAgentToExcelFile = (metricas, leadsData, ratingBreakdown) => {
  const data = exportAgentToExcel(metricas, leadsData, ratingBreakdown);
  const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, `metricas_agente_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

export const exportAdminToPDFFile = (adminData, exclusiveCount, totalLeadsCount, agenciasLeads, agenciasClics) => {
  const doc = exportAdminToPDF(adminData, exclusiveCount, totalLeadsCount, agenciasLeads, agenciasClics);
  doc.save(`metricas_admin_${new Date().toISOString().slice(0, 10)}.pdf`);
};

export const exportAgencyToPDFFile = (metricas, leadsData, agentLeads) => {
  const doc = exportAgencyToPDF(metricas, leadsData, agentLeads);
  doc.save(`metricas_agencia_${new Date().toISOString().slice(0, 10)}.pdf`);
};

export const exportAgentToPDFFile = (metricas, leadsData, ratingBreakdown) => {
  const doc = exportAgentToPDF(metricas, leadsData, ratingBreakdown);
  doc.save(`metricas_agente_${new Date().toISOString().slice(0, 10)}.pdf`);
};
