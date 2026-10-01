// ==========================================
// 1. CARGA DE DATOS LOCALES Y NOMBRE DE RANCHO
// ==========================================
let inventario = JSON.parse(localStorage.getItem('inventario_ganadero')) || [];
let reproduccion = JSON.parse(localStorage.getItem('reproduccion_ganadero')) || [];
let pesajes = JSON.parse(localStorage.getItem('pesajes_ganadero')) || [];
let sanidad = JSON.parse(localStorage.getItem('sanidad_ganadero')) || [];
let medicamentos = JSON.parse(localStorage.getItem('medicamentos_ganadero')) || [];
let finanzas = JSON.parse(localStorage.getItem('finanzas_ganadero')) || [];
let nombreRancho = localStorage.getItem('nombre_rancho_ganadero') || 'Rancho San José';

let chartInventarioInstance = null;

// Formularios
const formAnimal = document.getElementById('form-animal');
const formRepro = document.getElementById('form-reproduccion');
const formSanidad = document.getElementById('form-sanidad');
const formPeso = document.getElementById('form-peso');
const formMedicamento = document.getElementById('form-medicamento');
const formFinanzas = document.getElementById('form-finanzas');

// Tablas
const tablaInventario = document.getElementById('tabla-inventario');
const tablaRepro = document.getElementById('tabla-reproduccion');
const tablaSanidad = document.getElementById('tabla-sanidad');
const tablaPesajes = document.getElementById('tabla-pesajes');
const tablaMedicamentos = document.getElementById('tabla-medicamentos');
const tablaFinanzas = document.getElementById('tabla-finanzas');

const totalCabezas = document.getElementById('total-cabezas');
const totalSanidad = document.getElementById('total-sanidad');
const totalPesajesHistorial = document.getElementById('total-pesajes-historial');
const totalFinanzas = document.getElementById('total-finanzas');

const resumenIngresos = document.getElementById('resumen-ingresos');
const resumenEgresos = document.getElementById('resumen-egresos');
const resumenUtilidad = document.getElementById('resumen-utilidad');

// Buscadores
const inputBuscar = document.getElementById('buscar-arete');
const inputBuscarRepro = document.getElementById('buscar-repro');
const inputBuscarSanidad = document.getElementById('buscar-sanidad');
const inputBuscarPeso = document.getElementById('buscar-peso');
const inputBuscarFinanzas = document.getElementById('buscar-finanzas');
const inputBuscarMeds = document.getElementById('buscar-meds');

const inputFechaPeso = document.getElementById('fecha-peso');
const inputFechaSanidad = document.getElementById('fecha-sanidad');
const inputFechaMedEntrada = document.getElementById('fecha-entrada-medicamento');
const inputFechaFinanza = document.getElementById('fecha-finanza');
const selectTipoFinanza = document.getElementById('tipo-finanza');
const selectCatFinanza = document.getElementById('categoria-finanza');
const selectInsumoSanidad = document.getElementById('select-insumo-sanidad');
const inputProductoSanidad = document.getElementById('producto-sanidad');
const datalistMadres = document.getElementById('lista-madres'); 

// Fechas predeterminadas
const hoyISO = new Date().toISOString().split('T')[0];
if (document.getElementById('fecha-servicio')) document.getElementById('fecha-servicio').value = hoyISO;
if (inputFechaPeso) inputFechaPeso.value = hoyISO;
if (inputFechaSanidad) inputFechaSanidad.value = hoyISO;
if (inputFechaMedEntrada) inputFechaMedEntrada.value = hoyISO;
if (inputFechaFinanza) inputFechaFinanza.value = hoyISO;

// Categorías de finanzas
const catIngreso = ['Venta de animales', 'Venta de becerros', 'Venta de leche', 'Otros ingresos'];
const catEgreso = ['Medicamentos', 'Alimento', 'Mano de obra', 'Mantenimiento', 'Combustible', 'Otros egresos'];

if (selectTipoFinanza) {
  selectTipoFinanza.addEventListener('change', () => {
    selectCatFinanza.innerHTML = '';
    const lista = selectTipoFinanza.value === 'Ingreso' ? catIngreso : catEgreso;
    lista.forEach(c => selectCatFinanza.innerHTML += `<option value="${c}">${c}</option>`);
  });
  selectTipoFinanza.dispatchEvent(new Event('change'));
}

// ==========================================
// 2. FUNCIÓN PARA CAMBIAR NOMBRE DEL RANCHO
// ==========================================
window.cambiarNombreRancho = function() {
  const nuevo = prompt("Escribe el nombre de tu rancho:", nombreRancho);
  if (nuevo && nuevo.trim() !== "") {
    nombreRancho = nuevo.trim();
    localStorage.setItem('nombre_rancho_ganadero', nombreRancho);
    document.getElementById('subtitulo-rancho').textContent = nombreRancho;
  }
};

// ==========================================
// 3. SISTEMA DE VISTAS (PESTAÑAS)
// ==========================================
window.cambiarVista = function(vista) {
  const vistas = ['principal', 'inventario', 'estados', 'reproduccion', 'sanidad', 'pesajes', 'finanzas', 'medicamentos'];
  vistas.forEach(v => {
    const el = document.getElementById(`vista-${v}`);
    if (el) el.style.display = (v === vista) ? 'block' : 'none';
  });

  if (vista === 'inventario') renderizarInventario();
  if (vista === 'estados') renderizarHatoPorEstados();
  if (vista === 'reproduccion') renderizarReproduccion();
  if (vista === 'sanidad') renderizarSanidad();
  if (vista === 'pesajes') renderizarPesajes();
  if (vista === 'finanzas') renderizarFinanzas();
  if (vista === 'medicamentos') renderizarMedicamentos();

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ==========================================
// 4. AUTOMATIZACIÓN DE ETAPAS FISIOLÓGICAS
// ==========================================
function actualizarEtapasFisiologicas() {
  let cambios = false;
  const hoy = new Date();
  inventario.forEach(animal => {
    if (animal.fechaNacimiento) {
      const edadMeses = (hoy - new Date(animal.fechaNacimiento + 'T00:00:00')) / (1000 * 60 * 60 * 24 * 30.416); 
      let nuevaCat = animal.categoria;
      if (animal.sexo === 'Macho') {
        if (edadMeses >= 7 && edadMeses < 12 && nuevaCat === 'Becerro') nuevaCat = 'Becerro destete';
        else if (edadMeses >= 12 && edadMeses < 18 && ['Becerro', 'Becerro destete'].includes(nuevaCat)) nuevaCat = 'Torete';
        else if (edadMeses >= 18 && edadMeses < 24 && ['Becerro', 'Becerro destete', 'Torete'].includes(nuevaCat)) nuevaCat = 'Toro joven';
        else if (edadMeses >= 24 && !['Toro adulto', 'Semental / Toro', 'Toro de engorda'].includes(nuevaCat)) nuevaCat = 'Toro adulto';
      } else if (animal.sexo === 'Hembra') {
        if (edadMeses >= 7 && edadMeses < 12 && nuevaCat === 'Becerra') nuevaCat = 'Becerra destete';
        else if (edadMeses >= 12 && edadMeses < 24 && ['Becerra', 'Becerra destete'].includes(nuevaCat)) nuevaCat = 'Novillona';
        else if (edadMeses >= 24 && !['Vaca en producción', 'Vaca seca / Vientre', 'Vaquilla'].includes(nuevaCat)) nuevaCat = 'Vaquilla';
      }
      if (nuevaCat !== animal.categoria) { animal.categoria = nuevaCat; cambios = true; }
    }
  });
  if (cambios) localStorage.setItem('inventario_ganadero', JSON.stringify(inventario));
}

// ==========================================
// 5. UTILIDADES Y MODAL
// ==========================================
function formatearFecha(f) {
  if (!f) return '-';
  const p = f.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : f;
}
function formatearMoneda(monto) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto || 0);
}
function calcularEdad(fechaNacStr) {
  if (!fechaNacStr) return '-';
  const fechaNac = new Date(fechaNacStr + 'T00:00:00');
  const hoy = new Date();
  let anos = hoy.getFullYear() - fechaNac.getFullYear();
  let meses = hoy.getMonth() - fechaNac.getMonth();
  if (meses < 0 || (meses === 0 && hoy.getDate() < fechaNac.getDate())) { anos--; meses += 12; }
  if (anos > 0) return `${anos} a ${meses} m`;
  if (meses > 0) return `${meses} meses`;
  return `${Math.floor((hoy - fechaNac) / (1000 * 60 * 60 * 24))} días`;
}
function obtenerBase64(file) {
  return new Promise((resolve) => {
    if (!file) { resolve(''); return; }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
  });
}
function actualizarListaMadres() {
  if (!datalistMadres) return;
  datalistMadres.innerHTML = '';
  inventario.filter(a => a.sexo === 'Hembra').forEach(h => {
    datalistMadres.innerHTML += `<option value="${h.arete}">${h.nombre || 'Sin nombre'} (${h.categoria})</option>`;
  });
}

// Modal Expediente Vaca
window.verHistorial = function(arete) {
  const animal = inventario.find(a => a.arete === arete);
  if (!animal) return;
  document.getElementById('modal-titulo-animal').innerHTML = `🐄 Expediente de: <strong>#${animal.arete}</strong> ${animal.nombre ? ' (' + animal.nombre + ')' : ''}`;
  const celdaFoto = animal.foto ? `<img src="${animal.foto}" style="width:110px; height:110px; object-fit:cover; border-radius:8px; border:2px solid #ccc;">` : `<div style="width:110px; height:110px; background:#eee; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#999;">Sin Foto</div>`;
  document.getElementById('modal-info-basica').innerHTML = `<div style="display:flex; gap:20px; align-items:center;">${celdaFoto}<div style="font-size: 14px;"><p style="margin:4px 0;"><strong>Sexo:</strong> ${animal.sexo}</p><p style="margin:4px 0;"><strong>Categoría:</strong> ${animal.categoria}</p><p style="margin:4px 0;"><strong>Raza:</strong> ${animal.raza || '-'}</p><p style="margin:4px 0;"><strong>Edad:</strong> ${calcularEdad(animal.fechaNacimiento)}</p></div></div>`;

  const crias = inventario.filter(a => a.madre === arete);
  const tbodyCrias = document.getElementById('modal-tabla-crias');
  tbodyCrias.innerHTML = crias.length === 0 ? `<tr><td colspan="5" style="text-align:center; color:#777;">Sin crías registradas.</td></tr>` : '';
  crias.forEach(c => tbodyCrias.innerHTML += `<tr><td><strong>${c.arete}</strong></td><td>${c.nombre || '-'}</td><td>${c.sexo}</td><td>${formatearFecha(c.fechaNacimiento)}</td><td>${calcularEdad(c.fechaNacimiento)}</td></tr>`);

  const repros = reproduccion.filter(r => r.arete === arete);
  const tbodyRepro = document.getElementById('modal-tabla-repro');
  tbodyRepro.innerHTML = repros.length === 0 ? `<tr><td colspan="5" style="text-align:center; color:#777;">Sin registros reproductivos.</td></tr>` : '';
  repros.forEach(r => tbodyRepro.innerHTML += `<tr><td>${formatearFecha(r.fechaServicio)}</td><td>${r.tipo}</td><td>${r.semental || '-'}</td><td><span class="badge-estado ${r.estado === 'Preñada' ? 'estado-prenada' : 'estado-vacia'}">${r.estado}</span></td><td>${r.estado === 'Preñada' ? formatearFecha(r.fechaProbableParto) : '-'}</td></tr>`);

  document.getElementById('modal-historial').style.display = 'block';
};
window.cerrarModal = function() { document.getElementById('modal-historial').style.display = 'none'; };

// ==========================================
// 6. RENDERIZADO DE TABLAS Y ALERTAS
// ==========================================
function verificarAlertasTotales() {
  const lista = document.getElementById('lista-alertas');
  const cont = document.getElementById('contenedor-alertas');
  if (!lista || !cont) return;
  lista.innerHTML = '';
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const alertas = [];

  inventario.forEach(a => {
    if (a.fechaNacimiento) {
      const m = (hoy - new Date(a.fechaNacimiento + 'T00:00:00')) / (1000 * 60 * 60 * 24 * 30.416);
      if (m >= 7 && m < 8) alertas.push(`<li>🌾 <strong>Aviso de Destete:</strong> Animal #${a.arete} tiene ${m.toFixed(1)} meses.</li>`);
    }
  });
  reproduccion.forEach(reg => {
    if (reg.estado === 'Preñada' && reg.fechaProbableParto) {
      const d = Math.ceil((new Date(reg.fechaProbableParto + 'T00:00:00') - hoy) / 86400000);
      if (d >= 0 && d <= 15) alertas.push(`<li>🍼 <strong>Parto Próximo:</strong> Vaca #${reg.arete} parirá en <strong>${d} días</strong>.</li>`);
    }
  });
  sanidad.forEach(reg => {
    if (reg.proximaAplicacion) {
      const d = Math.ceil((new Date(reg.proximaAplicacion + 'T00:00:00') - hoy) / 86400000);
      if (d <= 15) alertas.push(`<li>💉 <strong>${reg.tipo}:</strong> Animal #${reg.arete} - ${reg.producto} ${d < 0 ? '[Vencida]' : '[En ' + d + ' días]'}</li>`);
    }
  });
  medicamentos.forEach(med => {
    if (med.existencia <= 2) alertas.push(`<li>📦 <strong>Stock Bajo:</strong> Quedan ${med.existencia} ${med.unidad} de ${med.nombre}</li>`);
  });

  if (alertas.length > 0) { lista.innerHTML = alertas.join(''); cont.style.display = 'block'; } 
  else { cont.style.display = 'none'; }
}

function renderizarInventario(lista = inventario) {
  if (!tablaInventario) return;
  tablaInventario.innerHTML = lista.length === 0 ? `<tr><td colspan="10" style="text-align:center; color:#777;">No hay animales registrados.</td></tr>` : '';
  lista.forEach(a => {
    tablaInventario.innerHTML += `<tr>
      <td>${a.foto ? `<img src="${a.foto}" class="img-miniatura">` : `<div class="sin-foto">Sin foto</div>`}</td>
      <td><strong>${a.arete}</strong></td><td>${a.idInterno || '-'}</td><td>${a.nombre || '-'}</td>
      <td><span class="badge-sexo ${a.sexo === 'Hembra' ? 'sexo-hembra' : 'sexo-macho'}">${a.sexo}</span></td>
      <td>${a.categoria}</td><td>${a.raza || '-'}</td><td>${calcularEdad(a.fechaNacimiento)}</td><td><strong>${a.madre || '-'}</strong></td>
      <td><div class="acciones-grupo"><button class="btn-historial" onclick="verHistorial('${a.arete}')">Historial</button><button class="btn-editar" onclick="cargarAnimalParaEditar('${a.arete}')">Editar</button><button class="btn-danger" onclick="eliminarAnimal('${a.arete}')">Eliminar</button></div></td>
    </tr>`;
  });
  if (totalCabezas) totalCabezas.textContent = inventario.length;
}

function renderizarHatoPorEstados() {
  const contenedor = document.getElementById('contenedor-grupos-fisiologicos');
  if (!contenedor) return;
  if (inventario.length === 0) { contenedor.innerHTML = `<div style="text-align:center; color:#777; padding:20px;"><h3>No hay animales.</h3></div>`; return; }
  
  const catBase = ['Becerro', 'Becerra', 'Becerro destete', 'Becerra destete', 'Torete', 'Novillona', 'Toro joven', 'Vaquilla', 'Toro adulto', 'Vaca en producción', 'Vaca seca / Vientre'];
  const todas = [...new Set([...catBase, ...inventario.map(a => a.categoria)])];
  contenedor.innerHTML = '';

  todas.forEach(cat => {
    const grupo = inventario.filter(a => a.categoria === cat);
    if (grupo.length === 0) return;
    let filas = '';
    grupo.forEach(a => {
      filas += `<tr>
        <td>${a.foto ? `<img src="${a.foto}" class="img-miniatura">` : `<div class="sin-foto">Sin foto</div>`}</td>
        <td><strong>${a.arete}</strong></td><td>${a.idInterno || '-'}</td><td>${a.nombre || '-'}</td>
        <td><span class="badge-sexo ${a.sexo === 'Hembra' ? 'sexo-hembra' : 'sexo-macho'}">${a.sexo}</span></td>
        <td>${a.raza || '-'}</td><td>${calcularEdad(a.fechaNacimiento)}</td>
        <td><button class="btn-historial" onclick="verHistorial('${a.arete}')">Historial</button></td>
      </tr>`;
    });
    contenedor.innerHTML += `<div style="background:#fafafa; padding:15px; border-radius:8px; margin-bottom:20px; border-left:6px solid #2980b9; border:1px solid #e0e0e0;">
      <h3 style="margin-top:0; display:flex; justify-content:space-between;"><span>🏷️ ${cat}</span><span style="background:#2980b9; color:white; padding:3px 10px; border-radius:12px; font-size:14px;">${grupo.length} Cabezas</span></h3>
      <div class="tabla-contenedor"><table><thead><tr><th>Foto</th><th>Arete</th><th>ID Int.</th><th>Nombre</th><th>Sexo</th><th>Raza</th><th>Edad</th><th>Expediente</th></tr></thead><tbody>${filas}</tbody></table></div>
    </div>`;
  });
}

function renderizarReproduccion(lista = reproduccion) {
  if (!tablaRepro) return;
  tablaRepro.innerHTML = lista.length === 0 ? `<tr><td colspan="7" style="text-align:center; color:#777;">No hay registros reproductivos.</td></tr>` : '';
  [...lista].sort((a,b) => new Date(b.fechaServicio) - new Date(a.fechaServicio)).forEach(reg => {
    const idx = reproduccion.findIndex(r => r.id === reg.id);
    const badge = reg.estado === 'Preñada' ? 'estado-prenada' : (reg.estado === 'Vacía' ? 'estado-vacia' : 'estado-pendiente');
    tablaRepro.innerHTML += `<tr>
      <td><strong>${reg.arete}</strong></td><td>${reg.tipo}</td><td>${reg.semental || '-'}</td>
      <td>${formatearFecha(reg.fechaServicio)}</td><td><span class="badge-estado ${badge}">${reg.estado}</span></td>
      <td>${reg.estado === 'Preñada' ? `<strong>${formatearFecha(reg.fechaProbableParto)}</strong>` : '-'}</td>
      <td><button class="btn-danger" onclick="eliminarRepro(${idx})">Eliminar</button></td>
    </tr>`;
  });
  if (document.getElementById('total-repro')) document.getElementById('total-repro').textContent = reproduccion.length;
}

function renderizarSanidad(lista = sanidad) {
  if (!tablaSanidad) return;
  tablaSanidad.innerHTML = lista.length === 0 ? `<tr><td colspan="7" style="text-align:center; color:#777;">No hay registros sanitarios.</td></tr>` : '';
  [...lista].sort((a,b) => new Date(b.fechaAplicacion) - new Date(a.fechaAplicacion)).forEach(reg => {
    const idx = sanidad.findIndex(s => s.id === reg.id);
    tablaSanidad.innerHTML += `<tr>
      <td><strong>${reg.arete}</strong></td><td>${reg.tipo}</td><td>${reg.producto}</td><td>${reg.dosis || '-'}</td>
      <td>${formatearFecha(reg.fechaAplicacion)}</td><td><strong>${formatearFecha(reg.proximaAplicacion)}</strong></td>
      <td><button class="btn-danger" onclick="eliminarSanidad(${idx})">Eliminar</button></td>
    </tr>`;
  });
  if (totalSanidad) totalSanidad.textContent = sanidad.length;
}

function renderizarPesajes(lista = pesajes) {
  if (!tablaPesajes) return;
  tablaPesajes.innerHTML = lista.length === 0 ? `<tr><td colspan="5" style="text-align:center; color:#777;">No hay pesajes registrados.</td></tr>` : '';
  
  let calc = []; let porArete = {};
  [...pesajes].sort((a, b) => new Date(a.fecha) - new Date(b.fecha)).forEach(reg => {
    let gdp = '-';
    if (porArete[reg.arete]) {
      let ant = porArete[reg.arete];
      let dias = Math.ceil(Math.abs(new Date(reg.fecha) - new Date(ant.fecha)) / (1000 * 60 * 60 * 24));
      if (dias > 0) gdp = ((reg.peso - ant.peso) / dias).toFixed(3);
    }
    porArete[reg.arete] = reg;
    calc.push({...reg, gdp});
  });

  const ids = lista.map(p => p.id);
  calc = calc.filter(p => ids.includes(p.id));

  calc.sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).forEach(reg => {
    const idx = pesajes.findIndex(p => p.id === reg.id);
    const gdpBadge = reg.gdp !== '-' ? `<span class="badge-gdp">${reg.gdp > 0 ? '+' + reg.gdp : reg.gdp}</span>` : '-';
    tablaPesajes.innerHTML += `<tr>
      <td><strong>${reg.arete}</strong></td><td>${formatearFecha(reg.fecha)}</td>
      <td><strong>${reg.peso} kg</strong></td><td>${gdpBadge}</td>
      <td><button class="btn-danger" onclick="eliminarPesaje(${idx})">Eliminar</button></td>
    </tr>`;
  });
  if (totalPesajesHistorial) totalPesajesHistorial.textContent = pesajes.length;
}

function renderizarFinanzas(lista = finanzas) {
  if (!tablaFinanzas) return;
  tablaFinanzas.innerHTML = lista.length === 0 ? `<tr><td colspan="6" style="text-align:center; color:#777;">No hay movimientos económicos.</td></tr>` : '';
  let totIng = 0, totEg = 0;

  finanzas.forEach(m => { if (m.tipo === 'Ingreso') totIng += m.monto; else totEg += m.monto; });
  if (resumenIngresos) resumenIngresos.textContent = formatearMoneda(totIng);
  if (resumenEgresos) resumenEgresos.textContent = formatearMoneda(totEg);
  if (resumenUtilidad) resumenUtilidad.textContent = formatearMoneda(totIng - totEg);

  [...lista].sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).forEach(mov => {
    const idx = finanzas.findIndex(f => f.id === mov.id);
    const esIng = mov.tipo === 'Ingreso';
    tablaFinanzas.innerHTML += `<tr>
      <td><span class="${esIng ? 'badge-ingreso' : 'badge-egreso'}">${mov.tipo}</span></td>
      <td>${mov.categoria}</td><td>${mov.concepto || '-'}</td><td>${formatearFecha(mov.fecha)}</td>
      <td><strong>${formatearMoneda(mov.monto)}</strong></td>
      <td><button class="btn-danger" onclick="eliminarFinanza(${idx})">Eliminar</button></td>
    </tr>`;
  });
  if (totalFinanzas) totalFinanzas.textContent = finanzas.length;
}

function renderizarMedicamentos(lista = medicamentos) {
  if (!tablaMedicamentos) return;
  tablaMedicamentos.innerHTML = lista.length === 0 ? `<tr><td colspan="6" style="text-align:center; color:#777;">No hay insumos registrados.</td></tr>` : '';
  
  if (selectInsumoSanidad) {
    selectInsumoSanidad.innerHTML = '<option value="">-- Sin vincular insumo --</option>';
    medicamentos.forEach(m => selectInsumoSanidad.innerHTML += `<option value="${m.id}">${m.nombre} (${m.existencia} ${m.unidad})</option>`);
  }

  lista.forEach(med => {
    const idx = medicamentos.findIndex(m => m.id === med.id);
    tablaMedicamentos.innerHTML += `<tr>
      <td><strong>${med.nombre}</strong></td><td>${med.presentacion}</td>
      <td><strong>${med.existencia} ${med.unidad}</strong></td><td>${formatearFecha(med.caducidad)}</td>
      <td><span class="badge-ok">Activo</span></td>
      <td><button class="btn-danger" onclick="eliminarMedicamento(${idx})">Eliminar</button></td>
    </tr>`;
  });
}

function renderizarReportes() {
  let nac = 0; inventario.forEach(a => { if (a.procedencia && a.procedencia.toLowerCase().includes('nacid')) nac++; });
  if (document.getElementById('kpi-nacimientos')) document.getElementById('kpi-nacimientos').textContent = nac;

  let vent = 0; finanzas.forEach(f => { if (f.categoria.includes('Venta')) vent++; });
  if (document.getElementById('kpi-ventas')) document.getElementById('kpi-ventas').textContent = vent;

  if (chartInventarioInstance) chartInventarioInstance.destroy();
  const ctxInv = document.getElementById('graficaInventario');
  if (ctxInv) {
    const counts = {}; inventario.forEach(a => counts[a.categoria] = (counts[a.categoria]||0)+1);
    chartInventarioInstance = new Chart(ctxInv.getContext('2d'), {
      type: 'pie', data: { labels: Object.keys(counts), datasets: [{ data: Object.values(counts), backgroundColor: ['#2ecc71','#3498db','#9b59b6','#e67e22','#e74c3c'] }] }
    });
  }
}

function actualizarTodo() {
  document.getElementById('subtitulo-rancho').textContent = nombreRancho;
  actualizarListaMadres();
  renderizarInventario();
  renderizarHatoPorEstados();
  renderizarReproduccion();
  renderizarSanidad();
  renderizarPesajes();
  renderizarFinanzas();
  renderizarMedicamentos();
  verificarAlertasTotales();
  renderizarReportes();
}

// ==========================================
// 7. EVENTOS DE BUSCADORES EN VIVO
// ==========================================
if (inputBuscar) inputBuscar.addEventListener('input', (e) => {
  const term = e.target.value.toLowerCase().trim();
  renderizarInventario(inventario.filter(a => a.arete.toLowerCase().includes(term) || (a.nombre && a.nombre.toLowerCase().includes(term)) || (a.raza && a.raza.toLowerCase().includes(term))));
});
if (inputBuscarRepro) inputBuscarRepro.addEventListener('input', (e) => {
  const term = e.target.value.toLowerCase().trim();
  renderizarReproduccion(reproduccion.filter(r => r.arete.toLowerCase().includes(term) || (r.semental && r.semental.toLowerCase().includes(term))));
});
if (inputBuscarSanidad) inputBuscarSanidad.addEventListener('input', (e) => {
  const term = e.target.value.toLowerCase().trim();
  renderizarSanidad(sanidad.filter(s => s.arete.toLowerCase().includes(term) || s.producto.toLowerCase().includes(term)));
});
if (inputBuscarPeso) inputBuscarPeso.addEventListener('input', (e) => {
  const term = e.target.value.toLowerCase().trim();
  renderizarPesajes(pesajes.filter(p => p.arete.toLowerCase().includes(term)));
});
if (inputBuscarFinanzas) inputBuscarFinanzas.addEventListener('input', (e) => {
  const term = e.target.value.toLowerCase().trim();
  renderizarFinanzas(finanzas.filter(f => f.categoria.toLowerCase().includes(term) || (f.concepto && f.concepto.toLowerCase().includes(term)) || f.tipo.toLowerCase().includes(term)));
});
if (inputBuscarMeds) inputBuscarMeds.addEventListener('input', (e) => {
  const term = e.target.value.toLowerCase().trim();
  renderizarMedicamentos(medicamentos.filter(m => m.nombre.toLowerCase().includes(term) || m.presentacion.toLowerCase().includes(term)));
});

// ==========================================
// 8. ENVÍO DE FORMULARIOS Y ACCIONES
// ==========================================
if (formAnimal) {
  formAnimal.addEventListener('submit', async (e) => {
    e.preventDefault();
    const areteOrig = document.getElementById('edit-arete-original').value;
    const areteNuevo = document.getElementById('arete').value.trim();
    const fotoFile = document.getElementById('foto').files[0];
    let fotoBase64 = fotoFile ? await obtenerBase64(fotoFile) : (areteOrig !== "" ? (inventario.find(a => a.arete === areteOrig)?.foto || '') : '');

    const animalData = {
      arete: areteNuevo,
      idInterno: document.getElementById('id-interno').value.trim(),
      nombre: document.getElementById('nombre').value.trim(),
      sexo: document.getElementById('sexo').value,
      categoria: document.getElementById('categoria').value,
      raza: document.getElementById('raza').value.trim(),
      fechaNacimiento: document.getElementById('fecha-nacimiento').value,
      madre: document.getElementById('madre').value.trim(),
      propietario: document.getElementById('propietario').value.trim(),
      procedencia: document.getElementById('procedencia').value.trim(),
      foto: fotoBase64
    };

    if (areteOrig === "") {
      if (inventario.some(a => a.arete === areteNuevo)) return alert('❌ Ya existe un animal con este arete.');
      inventario.push(animalData);
    } else {
      const idx = inventario.findIndex(a => a.arete === areteOrig);
      if (idx !== -1) inventario[idx] = animalData;
      cancelarEdicion();
    }
    localStorage.setItem('inventario_ganadero', JSON.stringify(inventario));
    formAnimal.reset();
    actualizarEtapasFisiologicas();
    actualizarTodo();
    alert('✅ Animal guardado correctamente.');
  });
}

window.cargarAnimalParaEditar = function(arete) {
  const animal = inventario.find(a => a.arete === arete);
  if (!animal) return;
  document.getElementById('edit-arete-original').value = animal.arete;
  document.getElementById('arete').value = animal.arete;
  document.getElementById('id-interno').value = animal.idInterno || '';
  document.getElementById('nombre').value = animal.nombre || '';
  document.getElementById('sexo').value = animal.sexo;
  document.getElementById('categoria').value = animal.categoria;
  document.getElementById('raza').value = animal.raza || '';
  document.getElementById('fecha-nacimiento').value = animal.fechaNacimiento || '';
  document.getElementById('madre').value = animal.madre || '';
  document.getElementById('propietario').value = animal.propietario || '';
  document.getElementById('procedencia').value = animal.procedencia || '';
  document.getElementById('titulo-form-animal').textContent = `✏️ Editando Animal: #${animal.arete}`;
  document.getElementById('btn-submit-animal').textContent = 'Actualizar Animal';
  document.getElementById('btn-cancelar-edicion').style.display = 'block';
  cambiarVista('principal');
};

window.cancelarEdicion = function() {
  formAnimal.reset();
  document.getElementById('edit-arete-original').value = "";
  document.getElementById('titulo-form-animal').textContent = "🐄 Registrar Nuevo Animal (Inventario del Hato)";
  document.getElementById('btn-submit-animal').textContent = "Guardar Animal";
  document.getElementById('btn-cancelar-edicion').style.display = "none";
};

if (formRepro) {
  formRepro.addEventListener('submit', (e) => {
    e.preventDefault();
    const est = document.getElementById('estado-repro').value;
    const fServ = document.getElementById('fecha-servicio').value;
    reproduccion.push({ id: Date.now(), arete: document.getElementById('arete-repro').value.trim(), tipo: document.getElementById('tipo-servicio').value, semental: document.getElementById('semental-repro').value.trim(), fechaServicio: fServ, estado: est, fechaProbableParto: est === 'Preñada' ? new Date(new Date(fServ+'T00:00:00').setDate(new Date(fServ+'T00:00:00').getDate() + 283)).toISOString().split('T')[0] : null });
    localStorage.setItem('reproduccion_ganadero', JSON.stringify(reproduccion));
    formRepro.reset();
    actualizarTodo();
    alert('✅ Evento reproductivo registrado.');
  });
}

if (formSanidad) {
  formSanidad.addEventListener('submit', (e) => {
    e.preventDefault();
    const insumoId = parseInt(selectInsumoSanidad.value);
    if (insumoId) {
      const idx = medicamentos.findIndex(m => m.id === insumoId);
      if (idx !== -1) {
        medicamentos[idx].existencia = Math.max(0, medicamentos[idx].existencia - parseFloat(document.getElementById('descontar-cantidad').value || 1));
        localStorage.setItem('medicamentos_ganadero', JSON.stringify(medicamentos));
      }
    }
    sanidad.push({ id: Date.now(), arete: document.getElementById('arete-sanidad').value.trim(), tipo: document.getElementById('tipo-sanidad').value, producto: inputProductoSanidad.value.trim(), dosis: document.getElementById('dosis-sanidad').value.trim(), fechaAplicacion: inputFechaSanidad.value, proximaAplicacion: document.getElementById('proxima-sanidad').value });
    localStorage.setItem('sanidad_ganadero', JSON.stringify(sanidad));
    formSanidad.reset(); inputFechaSanidad.value = hoyISO;
    actualizarTodo();
    alert('✅ Control sanitario registrado.');
  });
}

if (formPeso) {
  formPeso.addEventListener('submit', (e) => {
    e.preventDefault();
    pesajes.push({ id: Date.now(), arete: document.getElementById('arete-peso').value.trim(), fecha: inputFechaPeso.value, peso: parseFloat(document.getElementById('peso-animal').value) });
    localStorage.setItem('pesajes_ganadero', JSON.stringify(pesajes));
    formPeso.reset(); inputFechaPeso.value = hoyISO;
    actualizarTodo();
    alert('✅ Peso registrado con éxito.');
  });
}

if (formFinanzas) {
  formFinanzas.addEventListener('submit', (e) => {
    e.preventDefault();
    finanzas.push({ id: Date.now(), tipo: selectTipoFinanza.value, categoria: selectCatFinanza.value, monto: parseFloat(document.getElementById('monto-finanza').value), fecha: inputFechaFinanza.value, concepto: document.getElementById('concepto-finanza').value.trim() });
    localStorage.setItem('finanzas_ganadero', JSON.stringify(finanzas));
    formFinanzas.reset(); inputFechaFinanza.value = hoyISO;
    actualizarTodo();
    alert('✅ Movimiento financiero registrado.');
  });
}

if (formMedicamento) {
  formMedicamento.addEventListener('submit', (e) => {
    e.preventDefault();
    const costo = parseFloat(document.getElementById('precio-medicamento').value) || 0;
    const nom = document.getElementById('nombre-medicamento').value.trim();
    const cant = parseFloat(document.getElementById('existencia-medicamento').value);
    const un = document.getElementById('unidad-medicamento').value.trim();
    medicamentos.push({ id: Date.now(), nombre: nom, presentacion: document.getElementById('presentacion-medicamento').value.trim(), existencia: cant, unidad: un, caducidad: document.getElementById('caducidad-medicamento').value, precio: costo, fechaEntrada: inputFechaMedEntrada.value });
    localStorage.setItem('medicamentos_ganadero', JSON.stringify(medicamentos));
    if (costo > 0) {
      finanzas.push({ id: Date.now() + 1, tipo: 'Egreso', categoria: 'Medicamentos', monto: costo, fecha: inputFechaMedEntrada.value, concepto: `Compra de ${nom} (${cant} ${un})` });
      localStorage.setItem('finanzas_ganadero', JSON.stringify(finanzas));
    }
    formMedicamento.reset(); inputFechaMedEntrada.value = hoyISO;
    actualizarTodo();
    alert('✅ Insumo registrado en inventario.');
  });
}

// Eliminaciones
window.eliminarAnimal = (arete) => { if (confirm(`¿Eliminar animal ${arete}?`)) { inventario = inventario.filter(a => a.arete !== arete); localStorage.setItem('inventario_ganadero', JSON.stringify(inventario)); actualizarTodo(); } };
window.eliminarRepro = (i) => { if (confirm('¿Eliminar registro?')) { reproduccion.splice(i,1); localStorage.setItem('reproduccion_ganadero', JSON.stringify(reproduccion)); actualizarTodo(); } };
window.eliminarSanidad = (i) => { if (confirm('¿Eliminar registro?')) { sanidad.splice(i,1); localStorage.setItem('sanidad_ganadero', JSON.stringify(sanidad)); actualizarTodo(); } };
window.eliminarPesaje = (i) => { if (confirm('¿Eliminar pesaje?')) { pesajes.splice(i,1); localStorage.setItem('pesajes_ganadero', JSON.stringify(pesajes)); actualizarTodo(); } };
window.eliminarFinanza = (i) => { if (confirm('¿Eliminar movimiento?')) { finanzas.splice(i,1); localStorage.setItem('finanzas_ganadero', JSON.stringify(finanzas)); actualizarTodo(); } };
window.eliminarMedicamento = (i) => { if (confirm('¿Eliminar insumo?')) { medicamentos.splice(i,1); localStorage.setItem('medicamentos_ganadero', JSON.stringify(medicamentos)); actualizarTodo(); } };

window.exportarCSV = () => { if (inventario.length === 0) return alert('Inventario vacío.'); let csv = "Arete,Nombre,Sexo,Categoria,Raza\n"; inventario.forEach(a => csv += `${a.arete},${a.nombre||''},${a.sexo},${a.categoria},${a.raza||''}\n`); const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "Inventario_Rancho.csv"; link.click(); };
window.descargarRespaldoJSON = () => { const data = { inventario, reproduccion, pesajes, sanidad, medicamentos, finanzas }; const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `Respaldo_Ganadero_${hoyISO}.json`; link.click(); };
window.restaurarRespaldoJSON = () => { const file = document.getElementById('file-restaurar').files[0]; if (!file) return alert('Selecciona un archivo JSON.'); const reader = new FileReader(); reader.onload = (e) => { try { const data = JSON.parse(e.target.result); if (data.inventario) localStorage.setItem('inventario_ganadero', JSON.stringify(data.inventario)); if (data.reproduccion) localStorage.setItem('reproduccion_ganadero', JSON.stringify(data.reproduccion)); if (data.pesajes) localStorage.setItem('pesajes_ganadero', JSON.stringify(data.pesajes)); if (data.sanidad) localStorage.setItem('sanidad_ganadero', JSON.stringify(data.sanidad)); if (data.medicamentos) localStorage.setItem('medicamentos_ganadero', JSON.stringify(data.medicamentos)); if (data.finanzas) localStorage.setItem('finanzas_ganadero', JSON.stringify(data.finanzas)); alert('✅ Datos restaurados con éxito.'); location.reload(); } catch (err) { alert('❌ Archivo inválido.'); } }; reader.readAsText(file); };

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  actualizarEtapasFisiologicas();
  actualizarTodo();
});