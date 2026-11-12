// ==========================================
// 1. CARGA DE DATOS Y ESTADO GLOBAL
// ==========================================
let inventario = JSON.parse(localStorage.getItem('inventario_ganadero')) || [];
let reproduccion = JSON.parse(localStorage.getItem('reproduccion_ganadero')) || [];
let pesajes = JSON.parse(localStorage.getItem('pesajes_ganadero')) || [];
let sanidad = JSON.parse(localStorage.getItem('sanidad_ganadero')) || [];
let medicamentos = JSON.parse(localStorage.getItem('medicamentos_ganadero')) || [];
let finanzas = JSON.parse(localStorage.getItem('finanzas_ganadero')) || [];
let bajas = JSON.parse(localStorage.getItem('bajas_ganadero')) || [];
let nombreRancho = localStorage.getItem('nombre_rancho_ganadero') || 'Rancho San Antonio';

let chartInvInstance = null;
let chartFinInstance = null;

// Fechas default
const hoyISO = new Date().toISOString().split('T')[0];
['fecha-servicio', 'fecha-peso', 'fecha-sanidad', 'fecha-entrada-medicamento', 'fecha-finanza', 'fecha-baja'].forEach(id => {
  if (document.getElementById(id)) document.getElementById(id).value = hoyISO;
});

// ==========================================
// 2. UTILIDADES
// ==========================================
window.cambiarNombreRancho = function() {
  const nuevo = prompt("Escribe el nombre de tu rancho:", nombreRancho);
  if (nuevo && nuevo.trim() !== "") {
    nombreRancho = nuevo.trim();
    localStorage.setItem('nombre_rancho_ganadero', nombreRancho);
    document.getElementById('subtitulo-rancho').textContent = nombreRancho;
  }
};

function formatearFecha(f) { return f ? f.split('-').reverse().join('/') : '-'; }
function formatearMoneda(monto) { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto || 0); }
function calcularEdad(fechaNacStr) {
  if (!fechaNacStr) return '-';
  const fNac = new Date(fechaNacStr + 'T00:00:00'), hoy = new Date();
  let a = hoy.getFullYear() - fNac.getFullYear(), m = hoy.getMonth() - fNac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < fNac.getDate())) { a--; m += 12; }
  if (a > 0) return `${a}a ${m}m`; if (m > 0) return `${m} meses`;
  return `${Math.floor((hoy - fNac) / 86400000)} días`;
}
function obtenerBase64(file) {
  return new Promise((resolve) => {
    if (!file) { resolve(''); return; }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
  });
}

// ==========================================
// 3. NAVEGACIÓN Y REPORTES
// ==========================================
window.cambiarVista = function(vista) {
  const vistas = ['principal', 'inventario', 'estados', 'reproduccion', 'sanidad', 'pesajes', 'medicamentos', 'finanzas', 'bajas'];
  vistas.forEach(v => {
    const el = document.getElementById(`vista-${v}`);
    if (el) el.style.display = (v === vista) ? 'block' : 'none';
  });
  document.querySelectorAll('.btn-navegacion').forEach(b => b.classList.remove('active'));
  const btnActive = document.getElementById(`nav-${vista}`);
  if(btnActive) btnActive.classList.add('active');

  if (vista === 'inventario') {
    document.querySelectorAll('.btn-filtro').forEach(b => b.classList.remove('activo'));
    document.querySelector('.btn-filtro').classList.add('activo');
    renderizarInventario();
  }
  if (vista === 'estados') renderizarHatoPorEstados();
  if (vista === 'reproduccion') renderizarReproduccion();
  if (vista === 'sanidad') renderizarSanidad();
  if (vista === 'pesajes') renderizarPesajes();
  if (vista === 'medicamentos') renderizarMedicamentos();
  if (vista === 'finanzas') renderizarFinanzas();
  if (vista === 'bajas') renderizarBajas();

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

function renderizarReportesEnOperaciones() {
  const nacimientos = inventario.filter(a => (a.procedencia && a.procedencia.toLowerCase().includes('naci')) || (a.madre && a.madre.trim() !== '')).length;
  if(document.getElementById('val-nacimientos')) document.getElementById('val-nacimientos').textContent = nacimientos;

  const ventasCabezas = bajas.filter(b => b.motivo === 'Venta').length + finanzas.filter(f => f.categoria === 'Venta de animales').length;
  if(document.getElementById('val-ventas')) document.getElementById('val-ventas').textContent = ventasCabezas;

  let totalGdp = 0, countGdp = 0;
  let porArete = {};
  [...pesajes].sort((a,b) => new Date(a.fecha) - new Date(b.fecha)).forEach(reg => {
    if(porArete[reg.arete]){
      let dias = Math.ceil(Math.abs(new Date(reg.fecha) - new Date(porArete[reg.arete].fecha)) / 86400000);
      if(dias > 0){
        let gdpVal = (reg.peso - porArete[reg.arete].peso) / dias;
        totalGdp += gdpVal; countGdp++;
      }
    }
    porArete[reg.arete] = reg;
  });
  const promedioGdp = countGdp > 0 ? (totalGdp / countGdp).toFixed(2) : '0.00';
  if(document.getElementById('val-gdp')) document.getElementById('val-gdp').textContent = promedioGdp;

  const hembrasTotal = inventario.filter(a => a.sexo === 'Hembra').length;
  const prenadas = reproduccion.filter(r => r.estado === 'Preñada').length;
  const tasaPrenez = hembrasTotal > 0 ? Math.round((prenadas / hembrasTotal) * 100) : 0;
  if(document.getElementById('val-prenez')) document.getElementById('val-prenez').textContent = tasaPrenez + '%';

  if (chartInvInstance) chartInvInstance.destroy();
  if (chartFinInstance) chartFinInstance.destroy();

  const ctxInv = document.getElementById('chartInventario');
  const ctxFin = document.getElementById('chartFinanzas');
  
  if (ctxInv) {
    if (inventario.length > 0) {
      const counts = {}; inventario.forEach(a => counts[a.categoria] = (counts[a.categoria]||0)+1);
      chartInvInstance = new Chart(ctxInv, {
        type: 'doughnut',
        data: { labels: Object.keys(counts), datasets: [{ data: Object.values(counts), backgroundColor: ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'] }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
      });
    } else {
      chartInvInstance = new Chart(ctxInv, { type: 'doughnut', data: { labels: ['Sin datos'], datasets: [{ data: [1], backgroundColor: ['#e2e8f0'] }] }, options: { responsive: true, maintainAspectRatio: false } });
    }
  }

  if (ctxFin) {
    let ing = 0, eg = 0; finanzas.forEach(f => { if(f.tipo==='Ingreso') ing+=f.monto; else eg+=f.monto; });
    chartFinInstance = new Chart(ctxFin, {
      type: 'bar',
      data: { labels: ['Ingresos vs Egresos'], datasets: [{ label: 'Ingresos', data: [ing], backgroundColor: '#10b981' }, { label: 'Gastos', data: [eg], backgroundColor: '#ef4444' }] },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, plugins: { legend: { position: 'bottom' } } }
    });
  }
}

// ==========================================
// 4. FUNCIONES AUTOMÁTICAS Y DE BAJA
// ==========================================
function actualizarDatosGlobales() {
  document.getElementById('subtitulo-rancho').textContent = nombreRancho;
  const hoy = new Date();
  inventario.forEach(a => {
    if (a.fechaNacimiento) {
      const ms = (hoy - new Date(a.fechaNacimiento + 'T00:00:00')) / (1000*60*60*24*30.416);
      let cat = a.categoria;
      if (a.sexo === 'Macho') {
        if (ms >=7 && ms<12 && cat==='Becerro') cat='Becerro destete';
        else if (ms>=12 && ms<18 && ['Becerro','Becerro destete'].includes(cat)) cat='Torete';
        else if (ms>=18 && ms<24 && ['Becerro','Becerro destete','Torete'].includes(cat)) cat='Toro joven';
        else if (ms>=24 && !['Toro adulto','Semental / Toro','Toro de engorda'].includes(cat)) cat='Toro adulto';
      } else {
        if (ms >=7 && ms<12 && cat==='Becerra') cat='Becerra destete';
        else if (ms>=12 && ms<24 && ['Becerra','Becerra destete'].includes(cat)) cat='Novillona';
        else if (ms>=24 && !['Vaca en producción','Vaca seca / Vientre','Vaquilla'].includes(cat)) cat='Vaquilla';
      }
      a.categoria = cat;
    }
  });
  localStorage.setItem('inventario_ganadero', JSON.stringify(inventario));
  
  const dataMadres = document.getElementById('lista-madres');
  if(dataMadres) { dataMadres.innerHTML=''; inventario.filter(a=>a.sexo==='Hembra').forEach(h=> dataMadres.innerHTML+=`<option value="${h.arete}">${h.nombre||''}</option>`); }
  const selInsumos = document.getElementById('select-insumo-sanidad');
  if(selInsumos) { selInsumos.innerHTML='<option value="">-- Sin vincular --</option>'; medicamentos.forEach((m,i)=> selInsumos.innerHTML+=`<option value="${i}">${m.nombre} (${m.existencia} ${m.unidad})</option>`); }

  verificarAlertasTotales();
  renderizarReportesEnOperaciones();
  if(document.getElementById('vista-inventario').style.display==='block') renderizarInventario();
}

// Lógica de Modales de Baja
window.abrirModalBaja = function(arete) {
  document.getElementById('baja-arete-input').value = arete;
  document.getElementById('modal-baja-arete').textContent = '#' + arete;
  document.getElementById('modal-baja').style.display = 'block';
};
window.cerrarModalBaja = function() { document.getElementById('modal-baja').style.display = 'none'; };

window.cambiarMotivoBaja = function() {
  const motivo = document.getElementById('motivo-baja').value;
  document.getElementById('contenedor-precio-venta').style.display = motivo === 'Venta' ? 'block' : 'none';
  document.getElementById('contenedor-causa-muerte').style.display = motivo === 'Muerte' ? 'block' : 'none';
};

window.procesarBajaAnimal = function(e) {
  e.preventDefault();
  const arete = document.getElementById('baja-arete-input').value;
  const motivo = document.getElementById('motivo-baja').value;
  const fecha = document.getElementById('fecha-baja').value;
  const animal = inventario.find(a => a.arete === arete);
  if(!animal) return;

  let detalle = '';
  if(motivo === 'Venta') {
    const precio = parseFloat(document.getElementById('precio-venta').value) || 0;
    detalle = `Venta: ${formatearMoneda(precio)}`;
    // Agregar ingreso automático a finanzas
    finanzas.push({ id: Date.now(), tipo: 'Ingreso', categoria: 'Venta de animales', monto: precio, fecha: fecha, concepto: `Venta de animal arete #${arete}` });
    localStorage.setItem('finanzas_ganadero', JSON.stringify(finanzas));
  } else {
    const causa = document.getElementById('causa-muerte').value.trim() || 'No especificada';
    detalle = `Causa: ${causa}`;
  }

  // Registrar en Bajas
  bajas.push({ arete: animal.arete, nombre: animal.nombre || '-', categoria: animal.categoria, motivo: motivo, detalle: detalle, fecha: fecha });
  localStorage.setItem('bajas_ganadero', JSON.stringify(bajas));

  // Remover de Inventario
  inventario = inventario.filter(a => a.arete !== arete);
  localStorage.setItem('inventario_ganadero', JSON.stringify(inventario));

  cerrarModalBaja();
  actualizarDatosGlobales();
  renderizarInventario();
  alert('✅ Animal dado de baja correctamente.');
};

// ==========================================
// 5. EDICIÓN DE MÓDULOS
// ==========================================
window.cargarAnimalParaEditar = function(arete) {
  const an = inventario.find(a => a.arete === arete); if (!an) return;
  document.getElementById('edit-arete-original').value = an.arete;
  document.getElementById('arete').value = an.arete; document.getElementById('id-interno').value = an.idInterno||''; document.getElementById('nombre').value = an.nombre||'';
  document.getElementById('sexo').value = an.sexo; document.getElementById('categoria').value = an.categoria; document.getElementById('raza').value = an.raza||'';
  document.getElementById('fecha-nacimiento').value = an.fechaNacimiento||''; document.getElementById('madre').value = an.madre||'';
  document.getElementById('propietario').value = an.propietario||'Lupe Mendez'; document.getElementById('procedencia').value = an.procedencia||'';
  document.getElementById('titulo-form-animal').textContent = `✏️ Editando Animal: #${an.arete}`; document.getElementById('btn-submit-animal').textContent = 'Actualizar'; document.getElementById('btn-cancelar-animal').style.display = 'block';
  cambiarVista('principal'); window.scrollTo(0, document.getElementById('form-animal').offsetTop);
};
window.cancelarEdicionAnimal = function() { document.getElementById('form-animal').reset(); document.getElementById('edit-arete-original').value = ""; document.getElementById('titulo-form-animal').textContent = "🐄 Registrar / Editar Animal"; document.getElementById('btn-submit-animal').textContent = "Guardar Animal"; document.getElementById('btn-cancelar-animal').style.display = "none"; };

window.cargarReproParaEditar = function(id) {
  const reg = reproduccion.find(r => r.id == id); if(!reg) return;
  document.getElementById('edit-id-repro').value = reg.id;
  document.getElementById('arete-repro').value = reg.arete; document.getElementById('tipo-servicio').value = reg.tipo; document.getElementById('semental-repro').value = reg.semental||'';
  document.getElementById('fecha-servicio').value = reg.fechaServicio; document.getElementById('fecha-palpacion').value = reg.fechaPalpacion||''; document.getElementById('detalles-palpacion').value = reg.detallesPalpacion||''; document.getElementById('estado-repro').value = reg.estado;
  document.getElementById('titulo-form-repro').textContent = `✏️ Editando Registro Reproductivo`; document.getElementById('btn-submit-repro').textContent = 'Actualizar'; document.getElementById('btn-cancelar-repro').style.display = 'block';
  cambiarVista('principal'); window.scrollTo(0, document.getElementById('form-reproduccion').offsetTop);
};
window.cancelarEdicionRepro = function() { document.getElementById('form-reproduccion').reset(); document.getElementById('edit-id-repro').value = ""; document.getElementById('titulo-form-repro').textContent = "❤️ Gestión Reproductiva y Palpación"; document.getElementById('btn-submit-repro').textContent = "Guardar Registro"; document.getElementById('btn-cancelar-repro').style.display = "none"; };

window.cargarSanidadParaEditar = function(id) {
  const reg = sanidad.find(s => s.id == id); if(!reg) return;
  document.getElementById('edit-id-sanidad').value = reg.id;
  document.getElementById('arete-sanidad').value = reg.arete; document.getElementById('tipo-sanidad').value = reg.tipo; document.getElementById('producto-sanidad').value = reg.producto;
  document.getElementById('dosis-sanidad').value = reg.dosis||''; document.getElementById('fecha-sanidad').value = reg.fechaAplicacion; document.getElementById('proxima-sanidad').value = reg.proximaAplicacion||'';
  document.getElementById('titulo-form-sanidad').textContent = `✏️ Editando Evento Sanitario`; document.getElementById('btn-submit-sanidad').textContent = 'Actualizar'; document.getElementById('btn-cancelar-sanidad').style.display = 'block';
  cambiarVista('principal'); window.scrollTo(0, document.getElementById('form-sanidad').offsetTop);
};
window.cancelarEdicionSanidad = function() { document.getElementById('form-sanidad').reset(); document.getElementById('edit-id-sanidad').value = ""; document.getElementById('titulo-form-sanidad').textContent = "💉 Control Sanitario"; document.getElementById('btn-submit-sanidad').textContent = "Guardar Evento"; document.getElementById('btn-cancelar-sanidad').style.display = "none"; };

window.cargarPesoParaEditar = function(id) {
  const reg = pesajes.find(p => p.id == id); if(!reg) return;
  document.getElementById('edit-id-peso').value = reg.id;
  document.getElementById('arete-peso').value = reg.arete; document.getElementById('fecha-peso').value = reg.fecha; document.getElementById('peso-animal').value = reg.peso;
  document.getElementById('titulo-form-peso').textContent = `✏️ Editando Pesaje`; document.getElementById('btn-submit-peso').textContent = 'Actualizar'; document.getElementById('btn-cancelar-peso').style.display = 'block';
  cambiarVista('principal'); window.scrollTo(0, document.getElementById('form-peso').offsetTop);
};
window.cancelarEdicionPeso = function() { document.getElementById('form-peso').reset(); document.getElementById('edit-id-peso').value = ""; document.getElementById('titulo-form-peso').textContent = "⚖️ Control de Pesajes"; document.getElementById('btn-submit-peso').textContent = "Registrar Peso"; document.getElementById('btn-cancelar-peso').style.display = "none"; };

window.cargarMedParaEditar = function(id) {
  const reg = medicamentos.find(m => m.id == id); if(!reg) return;
  document.getElementById('edit-id-med').value = reg.id;
  document.getElementById('nombre-medicamento').value = reg.nombre; document.getElementById('presentacion-medicamento').value = reg.presentacion; document.getElementById('existencia-medicamento').value = reg.existencia;
  document.getElementById('unidad-medicamento').value = reg.unidad; document.getElementById('caducidad-medicamento').value = reg.caducidad; document.getElementById('precio-medicamento').value = reg.precio; document.getElementById('fecha-entrada-medicamento').value = reg.fechaEntrada;
  document.getElementById('titulo-form-med').textContent = `✏️ Editando Insumo`; document.getElementById('btn-submit-med').textContent = 'Actualizar'; document.getElementById('btn-cancelar-med').style.display = 'block';
  cambiarVista('principal'); window.scrollTo(0, document.getElementById('form-medicamento').offsetTop);
};
window.cancelarEdicionMed = function() { document.getElementById('form-medicamento').reset(); document.getElementById('edit-id-med').value = ""; document.getElementById('titulo-form-med').textContent = "📦 Insumos y Medicamentos"; document.getElementById('btn-submit-med').textContent = "Guardar Insumo"; document.getElementById('btn-cancelar-med').style.display = "none"; };

window.cargarFinanzaParaEditar = function(id) {
  const reg = finanzas.find(f => f.id == id); if(!reg) return;
  document.getElementById('edit-id-finanza').value = reg.id;
  document.getElementById('tipo-finanza').value = reg.tipo; document.getElementById('categoria-finanza').value = reg.categoria; document.getElementById('monto-finanza').value = reg.monto;
  document.getElementById('fecha-finanza').value = reg.fecha; document.getElementById('concepto-finanza').value = reg.concepto||'';
  document.getElementById('titulo-form-finanza').textContent = `✏️ Editando Movimiento`; document.getElementById('btn-submit-finanza').textContent = 'Actualizar'; document.getElementById('btn-cancelar-finanza').style.display = 'block';
  cambiarVista('principal'); window.scrollTo(0, document.getElementById('form-finanzas').offsetTop);
};
window.cancelarEdicionFinanza = function() { document.getElementById('form-finanzas').reset(); document.getElementById('edit-id-finanza').value = ""; document.getElementById('titulo-form-finanza').textContent = "💰 Movimientos Económicos"; document.getElementById('btn-submit-finanza').textContent = "Registrar Movimiento"; document.getElementById('btn-cancelar-finanza').style.display = "none"; };

// ==========================================
// 6. ALERTAS Y RENDERIZADO DE TABLAS
// ==========================================
function verificarAlertasTotales() {
  const lista = document.getElementById('lista-alertas'); const cont = document.getElementById('contenedor-alertas');
  if (!lista || !cont) return; lista.innerHTML = '';
  const hoy = new Date(); hoy.setHours(0,0,0,0); const alertas = [];

  inventario.forEach(a => {
    if (a.fechaNacimiento) {
      const m = (hoy - new Date(a.fechaNacimiento + 'T00:00:00')) / (1000 * 60 * 60 * 24 * 30.416);
      if (m >= 7 && m < 8) alertas.push(`<li>🌾 <strong>Aviso de Destete:</strong> Animal #${a.arete} tiene ${m.toFixed(1)} meses. <button onclick="this.parentElement.remove(); verificarContenedorAlertas();" style="background:none; border:none; color:#92400e; cursor:pointer; font-weight:bold; margin-left:8px;">❌</button></li>`);
    }
  });
  reproduccion.forEach(reg => {
    if (reg.estado === 'Preñada' && reg.fechaProbableParto) {
      const d = Math.ceil((new Date(reg.fechaProbableParto + 'T00:00:00') - hoy) / 86400000);
      if (d >= 0 && d <= 15) alertas.push(`<li>🍼 <strong>Parto Próximo:</strong> Vaca #${reg.arete} parirá en <strong>${d} días</strong>. <button onclick="this.parentElement.remove(); verificarContenedorAlertas();" style="background:none; border:none; color:#92400e; cursor:pointer; font-weight:bold; margin-left:8px;">❌</button></li>`);
    }
  });
  medicamentos.forEach(med => {
    if (med.existencia <= 2) alertas.push(`<li>📦 <strong>Stock Bajo:</strong> Quedan ${med.existencia} ${med.unidad} de ${med.nombre}. <button onclick="this.parentElement.remove(); verificarContenedorAlertas();" style="background:none; border:none; color:#92400e; cursor:pointer; font-weight:bold; margin-left:8px;">❌</button></li>`);
  });

  if (alertas.length > 0) { lista.innerHTML = alertas.join(''); cont.style.display = 'block'; } 
  else { cont.style.display = 'none'; }
}
window.verificarContenedorAlertas = function() { const lista = document.getElementById('lista-alertas'); if (lista && lista.children.length === 0) document.getElementById('contenedor-alertas').style.display = 'none'; };
window.limpiarTodasAlertas = function() { document.getElementById('contenedor-alertas').style.display = 'none'; };

window.filtrarInventarioPropietario = function(prop, botonRef) {
  document.querySelectorAll('.btn-filtro').forEach(b => b.classList.remove('activo')); botonRef.classList.add('activo');
  renderizarInventario(prop === 'Todos' ? inventario : inventario.filter(a => a.propietario === prop));
};

function renderizarInventario(lista = inventario) {
  const tb = document.getElementById('tabla-inventario'); if(!tb) return;
  tb.innerHTML = lista.length === 0 ? `<tr><td colspan="9" style="text-align:center;">Sin registros.</td></tr>` : '';
  lista.forEach(a => {
    tb.innerHTML += `<tr><td>${a.foto ? `<img src="${a.foto}" class="img-miniatura">`:`<div class="sin-foto">Sin foto</div>`}</td><td><strong>${a.arete}</strong></td><td>${a.nombre||'-'}</td><td><span class="badge-sexo ${a.sexo==='Hembra'?'sexo-hembra':'sexo-macho'}">${a.sexo}</span></td><td>${a.categoria}</td><td><strong>${a.propietario}</strong></td><td>${calcularEdad(a.fechaNacimiento)}</td><td>${a.madre||'-'}</td><td><div class="acciones-grupo"><button class="btn-historial" onclick="verHistorial('${a.arete}')">Ficha</button><button class="btn-editar" onclick="cargarAnimalParaEditar('${a.arete}')">Editar</button><button class="btn-danger" onclick="abrirModalBaja('${a.arete}')">Baja</button></div></td></tr>`;
  });
  if(document.getElementById('total-cabezas')) document.getElementById('total-cabezas').textContent = lista.length;
}

function renderizarHatoPorEstados() {
  const cont = document.getElementById('contenedor-grupos-fisiologicos'); if (!cont) return;
  if (inventario.length === 0) { cont.innerHTML = `<div style="text-align:center;">No hay animales.</div>`; return; }
  const catBase = ['Becerro', 'Becerra', 'Becerro destete', 'Becerra destete', 'Torete', 'Novillona', 'Toro joven', 'Vaquilla', 'Toro adulto', 'Vaca en producción', 'Vaca seca / Vientre'];
  const todas = [...new Set([...catBase, ...inventario.map(a => a.categoria)])]; cont.innerHTML = '';
  todas.forEach(cat => {
    const grupo = inventario.filter(a => a.categoria === cat); if(grupo.length===0) return;
    let filas = ''; grupo.forEach(a => filas += `<tr><td>${a.foto ? `<img src="${a.foto}" class="img-miniatura">`:`<div class="sin-foto">Sin foto</div>`}</td><td><strong>${a.arete}</strong></td><td>${a.nombre||'-'}</td><td><span class="badge-sexo ${a.sexo==='Hembra'?'sexo-hembra':'sexo-macho'}">${a.sexo}</span></td><td>${calcularEdad(a.fechaNacimiento)}</td><td><button class="btn-historial" onclick="verHistorial('${a.arete}')">Ficha</button></td></tr>`);
    cont.innerHTML += `<div class="card" style="margin-bottom:15px; border-left:4px solid var(--info);"><h3 style="display:flex; justify-content:space-between;"><span>${cat}</span><span style="background:var(--bg-color); padding:4px 10px; border-radius:12px; font-size:13px; border:1px solid var(--border-color);">${grupo.length} Cabezas</span></h3><div class="tabla-contenedor"><table><thead><tr><th>Foto</th><th>Arete</th><th>Nombre</th><th>Sexo</th><th>Edad</th><th>Ficha</th></tr></thead><tbody>${filas}</tbody></table></div></div>`;
  });
}

function renderizarReproduccion(lista = reproduccion) {
  const tb = document.getElementById('tabla-reproduccion'); if(!tb) return;
  tb.innerHTML = lista.length === 0 ? `<tr><td colspan="8" style="text-align:center;">Sin registros.</td></tr>` : '';
  [...lista].sort((a,b) => new Date(b.fechaServicio) - new Date(a.fechaServicio)).forEach(reg => {
    const badge = reg.estado === 'Preñada' ? 'estado-prenada' : (reg.estado === 'Vacía' ? 'estado-vacia' : 'estado-pendiente');
    tb.innerHTML += `<tr><td><strong>${reg.arete}</strong></td><td>${reg.tipo}<br><small>${formatearFecha(reg.fechaServicio)}</small></td><td>${reg.semental||'-'}</td><td>${formatearFecha(reg.fechaPalpacion)}</td><td>${reg.detallesPalpacion||'-'}</td><td><span class="badge-estado ${badge}">${reg.estado}</span></td><td>${reg.estado==='Preñada'?`<strong>${formatearFecha(reg.fechaProbableParto)}</strong>`:''}</td><td><div class="acciones-grupo"><button class="btn-editar" onclick="cargarReproParaEditar(${reg.id})">Editar</button><button class="btn-danger" onclick="eliminarRegistro('repro',${reg.id})">❌</button></div></td></tr>`;
  });
}

function renderizarSanidad(lista = sanidad) {
  const tb = document.getElementById('tabla-sanidad'); if(!tb) return;
  tb.innerHTML = lista.length === 0 ? `<tr><td colspan="7" style="text-align:center;">Sin registros.</td></tr>` : '';
  [...lista].sort((a,b) => new Date(b.fechaAplicacion) - new Date(a.fechaAplicacion)).forEach(reg => {
    tb.innerHTML += `<tr><td><strong>${reg.arete}</strong></td><td>${reg.tipo}</td><td>${reg.producto}</td><td>${reg.dosis||'-'}</td><td>${formatearFecha(reg.fechaAplicacion)}</td><td><strong>${formatearFecha(reg.proximaAplicacion)}</strong></td><td><div class="acciones-grupo"><button class="btn-editar" onclick="cargarSanidadParaEditar(${reg.id})">Editar</button><button class="btn-danger" onclick="eliminarRegistro('sanidad',${reg.id})">❌</button></div></td></tr>`;
  });
}

function renderizarPesajes(lista = pesajes) {
  const tb = document.getElementById('tabla-pesajes'); if(!tb) return;
  tb.innerHTML = lista.length === 0 ? `<tr><td colspan="5" style="text-align:center;">Sin registros.</td></tr>` : '';
  let calc = []; let porArete = {};
  [...pesajes].sort((a, b) => new Date(a.fecha) - new Date(b.fecha)).forEach(reg => {
    let gdp = '-';
    if(porArete[reg.arete]){ let dias = Math.ceil(Math.abs(new Date(reg.fecha)-new Date(porArete[reg.arete].fecha))/86400000); if(dias>0) gdp=((reg.peso-porArete[reg.arete].peso)/dias).toFixed(3); }
    porArete[reg.arete] = reg; calc.push({...reg, gdp});
  });
  calc.sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).forEach(reg => {
    const gdpB = reg.gdp !== '-' ? `<span class="badge-gdp">${reg.gdp>0?'+'+reg.gdp:reg.gdp}</span>` : '-';
    tb.innerHTML += `<tr><td><strong>${reg.arete}</strong></td><td>${formatearFecha(reg.fecha)}</td><td><strong>${reg.peso} kg</strong></td><td>${gdpB}</td><td><div class="acciones-grupo"><button class="btn-editar" onclick="cargarPesoParaEditar(${reg.id})">Editar</button><button class="btn-danger" onclick="eliminarRegistro('peso',${reg.id})">❌</button></div></td></tr>`;
  });
}

function renderizarMedicamentos(lista = medicamentos) {
  const tb = document.getElementById('tabla-medicamentos'); if(!tb) return;
  tb.innerHTML = lista.length === 0 ? `<tr><td colspan="6" style="text-align:center;">Sin registros.</td></tr>` : '';
  lista.forEach(m => {
    tb.innerHTML += `<tr><td><strong>${m.nombre}</strong></td><td>${m.presentacion}</td><td><strong>${m.existencia} ${m.unidad}</strong></td><td>${formatearFecha(m.caducidad)}</td><td>${formatearFecha(m.fechaEntrada)}</td><td><div class="acciones-grupo"><button class="btn-editar" onclick="cargarMedParaEditar(${m.id})">Editar</button><button class="btn-danger" onclick="eliminarRegistro('med',${m.id})">❌</button></div></td></tr>`;
  });
}

function renderizarFinanzas(lista = finanzas) {
  const tb = document.getElementById('tabla-finanzas'); if(!tb) return;
  tb.innerHTML = lista.length === 0 ? `<tr><td colspan="6" style="text-align:center;">Sin registros.</td></tr>` : '';
  let ing = 0, eg = 0; finanzas.forEach(f => { if(f.tipo==='Ingreso') ing+=f.monto; else eg+=f.monto; });
  if(document.getElementById('resumen-ingresos')) document.getElementById('resumen-ingresos').textContent = formatearMoneda(ing);
  if(document.getElementById('resumen-egresos')) document.getElementById('resumen-egresos').textContent = formatearMoneda(eg);
  if(document.getElementById('resumen-utilidad')) document.getElementById('resumen-utilidad').textContent = formatearMoneda(ing-eg);

  [...lista].sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).forEach(mov => {
    tb.innerHTML += `<tr><td><span class="${mov.tipo==='Ingreso'?'badge-ingreso':'badge-egreso'}">${mov.tipo}</span></td><td>${mov.categoria}</td><td><strong>${formatearMoneda(mov.monto)}</strong></td><td>${formatearFecha(mov.fecha)}</td><td>${mov.concepto||'-'}</td><td><div class="acciones-grupo"><button class="btn-editar" onclick="cargarFinanzaParaEditar(${mov.id})">Editar</button><button class="btn-danger" onclick="eliminarRegistro('fin',${mov.id})">❌</button></div></td></tr>`;
  });
}

function renderizarBajas() {
  const tb = document.getElementById('tabla-bajas'); if(!tb) return;
  tb.innerHTML = bajas.length === 0 ? `<tr><td colspan="6" style="text-align:center;">Sin registros de baja.</td></tr>` : '';
  [...bajas].reverse().forEach(b => {
    const badgeMotivo = b.motivo === 'Venta' ? 'baja-venta' : 'baja-muerte';
    tb.innerHTML += `<tr><td><strong>${b.arete}</strong></td><td>${b.nombre}</td><td>${b.categoria}</td><td><span class="badge-baja ${badgeMotivo}">${b.motivo}</span></td><td>${b.detalle}</td><td>${formatearFecha(b.fecha)}</td></tr>`;
  });
}

// Ventana Modal Ficha Animal
window.verHistorial = function(arete) {
  const animal = inventario.find(a => a.arete === arete); if (!animal) return;
  document.getElementById('modal-titulo-animal').innerHTML = `🐄 Expediente de: <strong>#${animal.arete}</strong> ${animal.nombre ? ' (' + animal.nombre + ')' : ''}`;
  const celdaFoto = animal.foto ? `<img src="${animal.foto}" style="width:110px; height:110px; object-fit:cover; border-radius:8px; border:2px solid #ccc;">` : `<div style="width:110px; height:110px; background:#eee; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#999;">Sin Foto</div>`;
  document.getElementById('modal-info-basica').innerHTML = `<div style="display:flex; gap:20px; align-items:center;">${celdaFoto}<div style="font-size: 14px;"><p style="margin:4px 0;"><strong>Sexo:</strong> ${animal.sexo}</p><p style="margin:4px 0;"><strong>Categoría:</strong> ${animal.categoria}</p><p style="margin:4px 0;"><strong>Propietario:</strong> ${animal.propietario || '-'}</p><p style="margin:4px 0;"><strong>Edad:</strong> ${calcularEdad(animal.fechaNacimiento)}</p></div></div>`;
  const crias = inventario.filter(a => a.madre === arete); const tbodyCrias = document.getElementById('modal-tabla-crias');
  tbodyCrias.innerHTML = crias.length === 0 ? `<tr><td colspan="5" style="text-align:center; color:#777;">Sin crías.</td></tr>` : '';
  crias.forEach(c => tbodyCrias.innerHTML += `<tr><td><strong>${c.arete}</strong></td><td>${c.nombre || '-'}</td><td>${c.sexo}</td><td>${formatearFecha(c.fechaNacimiento)}</td><td>${calcularEdad(c.fechaNacimiento)}</td></tr>`);
  const repros = reproduccion.filter(r => r.arete === arete); const tbodyRepro = document.getElementById('modal-tabla-repro');
  tbodyRepro.innerHTML = repros.length === 0 ? `<tr><td colspan="5" style="text-align:center; color:#777;">Sin historial.</td></tr>` : '';
  repros.forEach(r => tbodyRepro.innerHTML += `<tr><td>${formatearFecha(r.fechaServicio)}<br><small>${r.tipo}</small></td><td>${formatearFecha(r.fechaPalpacion)}</td><td>${r.detallesPalpacion || '-'}</td><td><span class="badge-estado ${r.estado === 'Preñada' ? 'estado-prenada' : (r.estado==='Vacía' ? 'estado-vacia':'estado-pendiente')}">${r.estado}</span></td><td>${r.estado === 'Preñada' ? formatearFecha(r.fechaProbableParto) : '-'}</td></tr>`);
  document.getElementById('modal-historial').style.display = 'block';
};
window.cerrarModal = function() { document.getElementById('modal-historial').style.display = 'none'; };

// ==========================================
// 7. EVENTOS DE ENVÍO DE FORMULARIOS
// ==========================================
document.getElementById('form-animal').addEventListener('submit', async (e) => {
  e.preventDefault(); const orig = document.getElementById('edit-arete-original').value;
  const nuevo = document.getElementById('arete').value.trim(); const fot = document.getElementById('foto').files[0];
  let b64 = fot ? await obtenerBase64(fot) : (orig ? inventario.find(a=>a.arete===orig)?.foto||'' : '');
  const data = { arete:nuevo, idInterno:document.getElementById('id-interno').value.trim(), nombre:document.getElementById('nombre').value.trim(), sexo:document.getElementById('sexo').value, categoria:document.getElementById('categoria').value, raza:document.getElementById('raza').value.trim(), fechaNacimiento:document.getElementById('fecha-nacimiento').value, madre:document.getElementById('madre').value.trim(), propietario:document.getElementById('propietario').value, procedencia:document.getElementById('procedencia').value.trim(), foto:b64 };
  if(orig === "") { if(inventario.some(a=>a.arete===nuevo)) return alert('Ya existe este arete.'); inventario.push(data); }
  else { const i = inventario.findIndex(a=>a.arete===orig); if(i!==-1) inventario[i] = data; cancelarEdicionAnimal(); }
  actualizarDatosGlobales(); document.getElementById('form-animal').reset(); alert('✅ Guardado');
});

document.getElementById('form-reproduccion').addEventListener('submit', e => {
  e.preventDefault(); const editId = document.getElementById('edit-id-repro').value;
  const fServ = document.getElementById('fecha-servicio').value; const est = document.getElementById('estado-repro').value;
  const data = { id: editId ? parseInt(editId) : Date.now(), arete:document.getElementById('arete-repro').value.trim(), tipo:document.getElementById('tipo-servicio').value, semental:document.getElementById('semental-repro').value.trim(), fechaServicio:fServ, fechaPalpacion:document.getElementById('fecha-palpacion').value, detallesPalpacion:document.getElementById('detalles-palpacion').value.trim(), estado:est, fechaProbableParto: est==='Preñada'?new Date(new Date(fServ+'T00:00:00').setDate(new Date(fServ+'T00:00:00').getDate()+283)).toISOString().split('T')[0]:null };
  if(editId) { const i = reproduccion.findIndex(r=>r.id==editId); if(i!==-1) reproduccion[i] = data; cancelarEdicionRepro(); } else reproduccion.push(data);
  localStorage.setItem('reproduccion_ganadero', JSON.stringify(reproduccion)); document.getElementById('form-reproduccion').reset(); actualizarDatosGlobales(); alert('✅ Guardado');
});

document.getElementById('form-sanidad').addEventListener('submit', e => {
  e.preventDefault(); const editId = document.getElementById('edit-id-sanidad').value;
  if(!editId) { const idxMed = document.getElementById('select-insumo-sanidad').value; if(idxMed!==""){ const md=medicamentos[idxMed]; if(md){ md.existencia=Math.max(0, md.existencia-parseFloat(document.getElementById('descontar-cantidad').value||1)); localStorage.setItem('medicamentos_ganadero', JSON.stringify(medicamentos)); } } }
  const data = { id: editId ? parseInt(editId) : Date.now(), arete:document.getElementById('arete-sanidad').value.trim(), tipo:document.getElementById('tipo-sanidad').value, producto:document.getElementById('producto-sanidad').value.trim(), dosis:document.getElementById('dosis-sanidad').value.trim(), fechaAplicacion:document.getElementById('fecha-sanidad').value, proximaAplicacion:document.getElementById('proxima-sanidad').value };
  if(editId) { const i = sanidad.findIndex(s=>s.id==editId); if(i!==-1) sanidad[i] = data; cancelarEdicionSanidad(); } else sanidad.push(data);
  localStorage.setItem('sanidad_ganadero', JSON.stringify(sanidad)); document.getElementById('form-sanidad').reset(); actualizarDatosGlobales(); alert('✅ Guardado');
});

document.getElementById('form-peso').addEventListener('submit', e => {
  e.preventDefault(); const editId = document.getElementById('edit-id-peso').value;
  const data = { id: editId ? parseInt(editId) : Date.now(), arete:document.getElementById('arete-peso').value.trim(), fecha:document.getElementById('fecha-peso').value, peso:parseFloat(document.getElementById('peso-animal').value) };
  if(editId) { const i = pesajes.findIndex(p=>p.id==editId); if(i!==-1) pesajes[i] = data; cancelarEdicionPeso(); } else pesajes.push(data);
  localStorage.setItem('pesajes_ganadero', JSON.stringify(pesajes)); document.getElementById('form-peso').reset(); actualizarDatosGlobales(); alert('✅ Guardado');
});

document.getElementById('form-medicamento').addEventListener('submit', e => {
  e.preventDefault(); const editId = document.getElementById('edit-id-med').value;
  const data = { id: editId ? parseInt(editId) : Date.now(), nombre:document.getElementById('nombre-medicamento').value.trim(), presentacion:document.getElementById('presentacion-medicamento').value.trim(), existencia:parseFloat(document.getElementById('existencia-medicamento').value), unidad:document.getElementById('unidad-medicamento').value.trim(), caducidad:document.getElementById('caducidad-medicamento').value, precio:parseFloat(document.getElementById('precio-medicamento').value)||0, fechaEntrada:document.getElementById('fecha-entrada-medicamento').value };
  if(editId) { const i = medicamentos.findIndex(m=>m.id==editId); if(i!==-1) medicamentos[i] = data; cancelarEdicionMed(); } else medicamentos.push(data);
  localStorage.setItem('medicamentos_ganadero', JSON.stringify(medicamentos)); document.getElementById('form-medicamento').reset(); actualizarDatosGlobales(); alert('✅ Guardado');
});

document.getElementById('form-finanzas').addEventListener('submit', e => {
  e.preventDefault(); const editId = document.getElementById('edit-id-finanza').value;
  const data = { id: editId ? parseInt(editId) : Date.now(), tipo:document.getElementById('tipo-finanza').value, categoria:document.getElementById('categoria-finanza').value, monto:parseFloat(document.getElementById('monto-finanza').value), fecha:document.getElementById('fecha-finanza').value, concepto:document.getElementById('concepto-finanza').value.trim() };
  if(editId) { const i = finanzas.findIndex(f=>f.id==editId); if(i!==-1) finanzas[i] = data; cancelarEdicionFinanza(); } else finanzas.push(data);
  localStorage.setItem('finanzas_ganadero', JSON.stringify(finanzas)); document.getElementById('form-finanzas').reset(); actualizarDatosGlobales(); alert('✅ Guardado');
});

// ==========================================
// 8. ELIMINACIONES Y RESPALDOS
// ==========================================
window.eliminarRegistro = function(tipo, val) {
  if(!confirm('¿Eliminar registro?')) return;
  if(tipo==='repro') { reproduccion = reproduccion.filter(r=>r.id!=val); localStorage.setItem('reproduccion_ganadero', JSON.stringify(reproduccion)); renderizarReproduccion(); }
  if(tipo==='sanidad') { sanidad = sanidad.filter(s=>s.id!=val); localStorage.setItem('sanidad_ganadero', JSON.stringify(sanidad)); renderizarSanidad(); }
  if(tipo==='peso') { pesajes = pesajes.filter(p=>p.id!=val); localStorage.setItem('pesajes_ganadero', JSON.stringify(pesajes)); renderizarPesajes(); }
  if(tipo==='med') { medicamentos = medicamentos.filter(m=>m.id!=val); localStorage.setItem('medicamentos_ganadero', JSON.stringify(medicamentos)); renderizarMedicamentos(); }
  if(tipo==='fin') { finanzas = finanzas.filter(f=>f.id!=val); localStorage.setItem('finanzas_ganadero', JSON.stringify(finanzas)); renderizarFinanzas(); }
  actualizarDatosGlobales();
};

['buscar-arete','buscar-repro','buscar-sanidad','buscar-peso'].forEach(id => {
  const el = document.getElementById(id);
  if(el) el.addEventListener('input', e => {
    const t = e.target.value.toLowerCase().trim();
    if(id==='buscar-arete'){ const ac = document.querySelector('.btn-filtro.activo').textContent; let f = inventario.filter(a=>a.arete.toLowerCase().includes(t)||(a.nombre&&a.nombre.toLowerCase().includes(t))); if(ac!=='Todos') f=f.filter(a=>a.propietario===ac); renderizarInventario(f); }
    if(id==='buscar-repro') renderizarReproduccion(reproduccion.filter(r=>r.arete.toLowerCase().includes(t)));
    if(id==='buscar-sanidad') renderizarSanidad(sanidad.filter(s=>s.arete.toLowerCase().includes(t)));
    if(id==='buscar-peso') renderizarPesajes(pesajes.filter(p=>p.arete.toLowerCase().includes(t)));
  });
});

window.exportarCSV = () => { let c="Arete,Nombre,Sexo,Categoria,Propietario\n"; inventario.forEach(a=>c+=`${a.arete},${a.nombre||''},${a.sexo},${a.categoria},${a.propietario||''}\n`); const l=document.createElement("a"); l.href=URL.createObjectURL(new Blob([c], {type:'text/csv;charset=utf-8;'})); l.download="Inventario.csv"; l.click(); };
window.descargarRespaldoJSON = () => { const l=document.createElement("a"); l.href=URL.createObjectURL(new Blob([JSON.stringify({inventario,reproduccion,pesajes,sanidad,medicamentos,finanzas,bajas},null,2)],{type:'application/json'})); l.download=`Respaldo_${hoyISO}.json`; l.click(); };
window.restaurarRespaldoJSON = () => {
  const file = document.getElementById('file-restaurar').files[0]; if(!file) return alert('Selecciona archivo.');
  const r = new FileReader(); r.onload=e=>{ try{ const d=JSON.parse(e.target.result); if(d.inventario){inventario=d.inventario;localStorage.setItem('inventario_ganadero',JSON.stringify(inventario));} if(d.reproduccion){reproduccion=d.reproduccion;localStorage.setItem('reproduccion_ganadero',JSON.stringify(reproduccion));} if(d.pesajes){pesajes=d.pesajes;localStorage.setItem('pesajes_ganadero',JSON.stringify(pesajes));} if(d.sanidad){sanidad=d.sanidad;localStorage.setItem('sanidad_ganadero',JSON.stringify(sanidad));} if(d.medicamentos){medicamentos=d.medicamentos;localStorage.setItem('medicamentos_ganadero',JSON.stringify(medicamentos));} if(d.finanzas){finanzas=d.finanzas;localStorage.setItem('finanzas_ganadero',JSON.stringify(finanzas));} if(d.bajas){bajas=d.bajas;localStorage.setItem('bajas_ganadero',JSON.stringify(bajas));} alert('✅ Restaurado'); actualizarDatosGlobales(); document.getElementById('file-restaurar').value=""; }catch(err){alert('❌ Error: '+err.message);} }; r.readAsText(file);
};

document.addEventListener('DOMContentLoaded', actualizarDatosGlobales);
