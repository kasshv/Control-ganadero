// ==========================================
// CONFIGURACIÓN DE FIREBASE
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyDBfasIdtPgR5auy5ZaqzlKjB3gBrCL6OM",
  authDomain: "control-ganadero-12fbe.firebaseapp.com",
  projectId: "control-ganadero-12fbe",
  storageBucket: "control-ganadero-12fbe.firebasestorage.app",
  messagingSenderId: "788377969097",
  appId: "1:788377969097:web:508bb3ea0411a0981c0818"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ==========================================
// 1. VARIABLES GLOBALES DE DATOS
// ==========================================
let inventario = [];
let reproduccion = [];
let pesajes = [];
let sanidad = [];
let medicamentos = [];
let finanzas = [];
let nombreRancho = 'Rancho San José';

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
// CARGA INICIAL DE DATOS DESDE FIREBASE
// ==========================================
async function cargarDatosNube() {
  try {
    // 1. Rancho
    const docRancho = await db.collection("configuracion").doc("rancho").get();
    if (docRancho.exists && docRancho.data().nombre) {
      nombreRancho = docRancho.data().nombre;
    }

    // 2. Colecciones
    const [snapInv, snapRepro, snapPesajes, snapSanidad, snapMeds, snapFinanzas] = await Promise.all([
      db.collection("inventario").get(),
      db.collection("reproduccion").get(),
      db.collection("pesajes").get(),
      db.collection("sanidad").get(),
      db.collection("medicamentos").get(),
      db.collection("finanzas").get()
    ]);

    inventario = snapInv.docs.map(doc => ({ idDoc: doc.id, ...doc.data() }));
    reproduccion = snapRepro.docs.map(doc => ({ idDoc: doc.id, ...doc.data() }));
    pesajes = snapPesajes.docs.map(doc => ({ idDoc: doc.id, ...doc.data() }));
    sanidad = snapSanidad.docs.map(doc => ({ idDoc: doc.id, ...doc.data() }));
    medicamentos = snapMeds.docs.map(doc => ({ idDoc: doc.id, ...doc.data() }));
    finanzas = snapFinanzas.docs.map(doc => ({ idDoc: doc.id, ...doc.data() }));

    await actualizarEtapasFisiologicas();
    actualizarTodo();
  } catch (error) {
    console.error("Error al cargar desde Firebase:", error);
  }
}

// ==========================================
// 2. FUNCIÓN PARA CAMBIAR NOMBRE DEL RANCHO
// ==========================================
window.cambiarNombreRancho = async function() {
  const nuevo = prompt("Escribe el nombre de tu rancho:", nombreRancho);
  if (nuevo && nuevo.trim() !== "") {
    nombreRancho = nuevo.trim();
    await db.collection("configuracion").doc("rancho").set({ nombre: nombreRancho });
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
async function actualizarEtapasFisiologicas() {
  let cambios = false;
  const hoy = new Date();
  
  for (let animal of inventario) {
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
      if (nuevaCat !== animal.categoria) { 
        animal.categoria = nuevaCat; 
        cambios = true; 
        if (animal.idDoc) {
          await db.collection("inventario").doc(animal.idDoc).update({ categoria: nuevaCat });
        }
      }
    }
  }
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
      <td><div class="acciones-grupo"><button class="btn-historial" onclick="verHistorial('${a.arete}')">Historial</button><button class="btn-editar" onclick="cargarAnimalParaEditar('${a.arete}')">Editar</button><button class="btn-danger" onclick="eliminarAnimal('${a.idDoc}')">Eliminar</button></div></td>
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
    const badge = reg.estado === 'Preñada' ? 'estado-prenada' : (reg.estado === 'Vacía' ? 'estado-vacia' : 'estado-pendiente');
    tablaRepro.innerHTML += `<tr>
      <td><strong>${reg.arete}</strong></td><td>${reg.tipo}</td><td>${reg.semental || '-'}</td>
      <td>${formatearFecha(reg.fechaServicio)}</td><td><span class="badge-estado ${badge}">${reg.estado}</span></td>
      <td>${reg.estado === 'Preñada' ? `<strong>${formatearFecha(reg.fechaProbableParto)}</strong>` : '-'}</td>
      <td><button class="btn-danger" onclick="eliminarRepro('${reg.idDoc}')">Eliminar</button></td>
    </tr>`;
  });
  if (document.getElementById('total-repro')) document.getElementById('total-repro').textContent = reproduccion.length;
}

function renderizarSanidad(lista = sanidad) {
  if (!tablaSanidad) return;
  tablaSanidad.innerHTML = lista.length === 0 ? `<tr><td colspan="7" style="text-align:center; color:#777;">No hay registros sanitarios.</td></tr>` : '';
  [...lista].sort((a,b) => new Date(b.fechaAplicacion) - new Date(a.fechaAplicacion)).forEach(reg => {
    tablaSanidad.innerHTML += `<tr>
      <td><strong>${reg.arete}</strong></td><td>${reg.tipo}</td><td>${reg.producto}</td><td>${reg.dosis || '-'}</td>
      <td>${formatearFecha(reg.fechaAplicacion)}</td><td><strong>${formatearFecha(reg.proximaAplicacion)}</strong></td>
      <td><button class="btn-danger" onclick="eliminarSanidad('${reg.idDoc}')">Eliminar</button></td>
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

  const ids = lista.map(p => p.idDoc);
  calc = calc.filter(p => ids.includes(p.idDoc));

  calc.sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).forEach(reg => {
    const gdpBadge = reg.gdp !== '-' ? `<span class="badge-gdp">${reg.gdp > 0 ? '+' + reg.gdp : reg.gdp}</span>` : '-';
    tablaPesajes.innerHTML += `<tr>
      <td><strong>${reg.arete}</strong></td><td>${formatearFecha(reg.fecha)}</td>
      <td><strong>${reg.peso} kg</strong></td><td>${gdpBadge}</td>
      <td><button class="btn-danger" onclick="eliminarPesaje('${reg.idDoc}')">Eliminar</button></td>
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
    const esIng = mov.tipo === 'Ingreso';
    tablaFinanzas.innerHTML += `<tr>
      <td><span class="${esIng ? 'badge-ingreso' : 'badge-egreso'}">${mov.tipo}</span></td>
      <td>${mov.categoria}</td><td>${mov.concepto || '-'}</td><td>${formatearFecha(mov.fecha)}</td>
      <td><strong>${formatearMoneda(mov.monto)}</strong></td>
      <td><button class="btn-danger" onclick="eliminarFinanza('${mov.idDoc}')">Eliminar</button></td>
    </tr>`;
  });
  if (totalFinanzas) totalFinanzas.textContent = finanzas.length;
}

function renderizarMedicamentos(lista = medicamentos) {
  if (!tablaMedicamentos) return;
  tablaMedicamentos.innerHTML = lista.length === 0 ? `<tr><td colspan="6" style="text-align:center; color:#777;">No hay insumos registrados.</td></tr>` : '';
  
  if (selectInsumoSanidad) {
    selectInsumoSanidad.innerHTML = '<option value="">-- Sin vincular insumo --</option>';
    medicamentos.forEach(m => selectInsumoSanidad.innerHTML += `<option value="${m.idDoc}">${m.nombre} (${m.existencia} ${m.unidad})</option>`);
  }

  lista.forEach(med => {
    tablaMedicamentos.innerHTML += `<tr>
      <td><strong>${med.nombre}</strong></td><td>${med.presentacion}</td>
      <td><strong>${med.existencia} ${med.unidad}</strong></td><td>${formatearFecha(med.caducidad)}</td>
      <td><span class="badge-ok">Activo</span></td>
      <td><button class="btn-danger" onclick="eliminarMedicamento('${med.idDoc}')">Eliminar</button></td>
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
// 8. ENVÍO DE FORMULARIOS Y ACCIONES EN NUBE
// ==========================================
if (formAnimal) {
  formAnimal.addEventListener('submit', async (e) => {
    e.preventDefault();
    const idDocOriginal = document.getElementById('edit-id-doc').value;
    const areteNuevo = document.getElementById('arete').value.trim();
    const fotoFile = document.getElementById('foto').files[0];
    
    let fotoBase64 = fotoFile ? await obtenerBase64(fotoFile) : (idDocOriginal !== "" ? (inventario.find(a => a.idDoc === idDocOriginal)?.foto || '') : '');

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

    if (idDocOriginal === "") {
      if (inventario.some(a => a.arete === areteNuevo)) return alert('❌ Ya existe un animal con este arete.');
      const docRef = await db.collection("inventario").add(animalData);
      inventario.push({ idDoc: docRef.id, ...animalData });
    } else {
      await db.collection("inventario").doc(idDocOriginal).update(animalData);
      const idx = inventario.findIndex(a => a.idDoc === idDocOriginal);
      if (idx !== -1) inventario[idx] = { idDoc: idDocOriginal, ...animalData };
      cancelarEdicion();
    }
    formAnimal.reset();
    await actualizarEtapasFisiologicas();
    actualizarTodo();
    alert('✅ Animal guardado correctamente en la nube.');
  });
}

window.cargarAnimalParaEditar = function(arete) {
  const animal = inventario.find(a => a.arete === arete);
  if (!animal) return;
  document.getElementById('edit-id-doc').value = animal.idDoc;
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
  document.getElementById('edit-id-doc').value = "";
  document.getElementById('titulo-form-animal').textContent = "🐄 Registrar Nuevo Animal (Inventario del Hato)";
  document.getElementById('btn-submit-animal').textContent = "Guardar Animal";
  document.getElementById('btn-cancelar-edicion').style.display = "none";
};

if (formRepro) {
  formRepro.addEventListener('submit', async (e) => {
    e.preventDefault();
    const est = document.getElementById('estado-repro').value;
    const fServ = document.getElementById('fecha-servicio').value;
    const reproData = {
      arete: document.getElementById('arete-repro').value.trim(),
      tipo: document.getElementById('tipo-servicio').value,
      semental: document.getElementById('semental-repro').value.trim(),
      fechaServicio: fServ,
      estado: est,
      fechaProbableParto: est === 'Preñada' ? new Date(new Date(fServ+'T00:00:00').setDate(new Date(fServ+'T00:00:00').getDate() + 283)).toISOString().split('T')[0] : null
    };

    const docRef = await db.collection("reproduccion").add(reproData);
    reproduccion.push({ idDoc: docRef.id, ...reproData });
    formRepro.reset();
    actualizarTodo();
    alert('✅ Evento reproductivo registrado.');
  });
}

if (formSanidad) {
  formSanidad.addEventListener('submit', async (e) => {
    e.preventDefault();
    const insumoIdDoc = selectInsumoSanidad.value;
    if (insumoIdDoc) {
      const idx = medicamentos.findIndex(m => m.idDoc === insumoIdDoc);
      if (idx !== -1) {
        medicamentos[idx].existencia = Math.max(0, medicamentos[idx].existencia - parseFloat(document.getElementById('descontar-cantidad').value || 1));
        await db.collection("medicamentos").doc(insumoIdDoc).update({ existencia: medicamentos[idx].existencia });
      }
    }
    const sanidadData = {
      arete: document.getElementById('arete-sanidad').value.trim(),
      tipo: document.getElementById('tipo-sanidad').value,
      producto: inputProductoSanidad.value.trim(),
      dosis: document.getElementById('dosis-sanidad').value.trim(),
      fechaAplicacion: inputFechaSanidad.value,
      proximaAplicacion: document.getElementById('proxima-sanidad').value
    };

    const docRef = await db.collection("sanidad").add(sanidadData);
    sanidad.push({ idDoc: docRef.id, ...sanidadData });
    formSanidad.reset(); inputFechaSanidad.value = hoyISO;
    actualizarTodo();
    alert('✅ Control sanitario registrado.');
  });
}

if (formPeso) {
  formPeso.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pesoData = {
      arete: document.getElementById('arete-peso').value.trim(),
      fecha: inputFechaPeso.value,
      peso: parseFloat(document.getElementById('peso-animal').value)
    };

    const docRef = await db.collection("pesajes").add(pesoData);
    pesajes.push({ idDoc: docRef.id, ...pesoData });
    formPeso.reset(); inputFechaPeso.value = hoyISO;
    actualizarTodo();
    alert('✅ Peso registrado con éxito.');
  });
}

if (formFinanzas) {
  formFinanzas.addEventListener('submit', async (e) => {
    e.preventDefault();
    const finanzaData = {
      tipo: selectTipoFinanza.value,
      categoria: selectCatFinanza.value,
      monto: parseFloat(document.getElementById('monto-finanza').value),
      fecha: inputFechaFinanza.value,
      concepto: document.getElementById('concepto-finanza').value.trim()
    };

    const docRef = await db.collection("finanzas").add(finanzaData);
    finanzas.push({ idDoc: docRef.id, ...finanzaData });
    formFinanzas.reset(); inputFechaFinanza.value = hoyISO;
    actualizarTodo();
    alert('✅ Movimiento financiero registrado.');
  });
}

if (formMedicamento) {
  formMedicamento.addEventListener('submit', async (e) => {
    e.preventDefault();
    const costo = parseFloat(document.getElementById('precio-medicamento').value) || 0;
    const nom = document.getElementById('nombre-medicamento').value.trim();
    const cant = parseFloat(document.getElementById('existencia-medicamento').value);
    const un = document.getElementById('unidad-medicamento').value.trim();
    
    const medData = {
      nombre: nom,
      presentacion: document.getElementById('presentacion-medicamento').value.trim(),
      existencia: cant,
      unidad: un,
      caducidad: document.getElementById('caducidad-medicamento').value,
      precio: costo,
      fechaEntrada: inputFechaMedEntrada.value
    };

    const docRef = await db.collection("medicamentos").add(medData);
    medicamentos.push({ idDoc: docRef.id, ...medData });

    if (costo > 0) {
      const finanzaData = {
        tipo: 'Egreso',
        categoria: 'Medicamentos',
        monto: costo,
        fecha: inputFechaMedEntrada.value,
        concepto: `Compra de ${nom} (${cant} ${un})`
      };
      const docFinRef = await db.collection("finanzas").add(finanzaData);
      finanzas.push({ idDoc: docFinRef.id, ...finanzaData });
    }

    formMedicamento.reset(); inputFechaMedEntrada.value = hoyISO;
    actualizarTodo();
    alert('✅ Insumo registrado en inventario.');
  });
}

// Eliminaciones en Firestore
window.eliminarAnimal = async (idDoc) => { 
  if (confirm(`¿Eliminar este animal?`)) { 
    await db.collection("inventario").doc(idDoc).delete();
    inventario = inventario.filter(a => a.idDoc !== idDoc); 
    actualizarTodo(); 
  } 
};
window.eliminarRepro = async (idDoc) => { 
  if (confirm('¿Eliminar registro?')) { 
    await db.collection("reproduccion").doc(idDoc).delete();
    reproduccion = reproduccion.filter(r => r.idDoc !== idDoc); 
    actualizarTodo(); 
  } 
};
window.eliminarSanidad = async (idDoc) => { 
  if (confirm('¿Eliminar registro?')) { 
    await db.collection("sanidad").doc(idDoc).delete();
    sanidad = sanidad.filter(s => s.idDoc !== idDoc); 
    actualizarTodo(); 
  } 
};
window.eliminarPesaje = async (idDoc) => { 
  if (confirm('¿Eliminar pesaje?')) { 
    await db.collection("pesajes").doc(idDoc).delete();
    pesajes = pesajes.filter(p => p.idDoc !== idDoc); 
    actualizarTodo(); 
  } 
};
window.eliminarFinanza = async (idDoc) => { 
  if (confirm('¿Eliminar movimiento?')) { 
    await db.collection("finanzas").doc(idDoc).delete();
    finanzas = finanzas.filter(f => f.idDoc !== idDoc); 
    actualizarTodo(); 
  } 
};
window.eliminarMedicamento = async (idDoc) => { 
  if (confirm('¿Eliminar insumo?')) { 
    await db.collection("medicamentos").doc(idDoc).delete();
    medicamentos = medicamentos.filter(m => m.idDoc !== idDoc); 
    actualizarTodo(); 
  } 
};

window.exportarCSV = () => { 
  if (inventario.length === 0) return alert('Inventario vacío.'); 
  let csv = "Arete,Nombre,Sexo,Categoria,Raza\n"; 
  inventario.forEach(a => csv += `${a.arete},${a.nombre||''},${a.sexo},${a.categoria},${a.raza||''}\n`); 
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); 
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); 
  link.download = "Inventario_Rancho.csv"; link.click(); 
};

window.descargarRespaldoJSON = () => { 
  const data = { inventario, reproduccion, pesajes, sanidad, medicamentos, finanzas }; 
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); 
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); 
  link.download = `Respaldo_Ganadero_${hoyISO}.json`; link.click(); 
};

// Inicialización al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  cargarDatosNube();
});
