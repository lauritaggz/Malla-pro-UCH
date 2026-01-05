import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function NotasModal({ curso, onClose, isOpen }) {
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [nuevaEval, setNuevaEval] = useState({
    nombre: "",
    peso: "",
    nota: "",
  });
  const [error, setError] = useState("");

  // Para manejar el panel de sub-notas (controles)
  const [openSubNotas, setOpenSubNotas] = useState([]); // ids de evaluaciones abiertas
  const [subNotaInputs, setSubNotaInputs] = useState({}); // { [evalId]: "valor" }

  // Cargar evaluaciones del curso desde localStorage
  useEffect(() => {
    if (curso) {
      const notasGuardadas = JSON.parse(
        localStorage.getItem("malla-notas") || "{}"
      );
      const evals = notasGuardadas[curso.id] || [];
      setEvaluaciones(evals);
      setOpenSubNotas([]);
      setSubNotaInputs({});
      setError("");
    }
  }, [curso]);

  // Guardar evaluaciones en localStorage
  const guardarEvaluaciones = (evals) => {
    const notasGuardadas = JSON.parse(
      localStorage.getItem("malla-notas") || "{}"
    );
    notasGuardadas[curso.id] = evals;
    localStorage.setItem("malla-notas", JSON.stringify(notasGuardadas));
    setEvaluaciones(evals);
  };

  // ---------- UTILIDADES PARA SUB-NOTAS (CONTROLES) ----------

  const toggleSubNotasPanel = (evalId) => {
    setOpenSubNotas((prev) =>
      prev.includes(evalId)
        ? prev.filter((id) => id !== evalId)
        : [...prev, evalId]
    );
  };

  const handleSubNotaInputChange = (evalId, value) => {
    setSubNotaInputs((prev) => ({ ...prev, [evalId]: value }));
  };

  const actualizarSubNotas = (evalId, nuevasSubNotas) => {
    const evalsActualizadas = evaluaciones.map((e) => {
      if (e.id !== evalId) return e;

      const subNotasNumericas = nuevasSubNotas.filter(
        (s) => typeof s.nota === "number" && !isNaN(s.nota)
      );
      const promedio =
        subNotasNumericas.length > 0
          ? subNotasNumericas.reduce((sum, s) => sum + s.nota, 0) /
            subNotasNumericas.length
          : null;

      // La nota de la evaluación pasa a ser el promedio de sub-notas
      return {
        ...e,
        subNotas: nuevasSubNotas,
        nota: promedio,
      };
    });

    guardarEvaluaciones(evalsActualizadas);
  };

  const agregarSubNota = (evalId) => {
    const valor = subNotaInputs[evalId];
    const nota = parseFloat(valor);

    if (isNaN(nota) || nota < 1.0 || nota > 7.0) return;

    const evalTarget = evaluaciones.find((e) => e.id === evalId);
    const subActuales = evalTarget?.subNotas || [];

    const nuevasSubNotas = [
      ...subActuales,
      { id: Date.now(), nota: parseFloat(nota.toFixed(1)) },
    ];

    actualizarSubNotas(evalId, nuevasSubNotas);
    setSubNotaInputs((prev) => ({ ...prev, [evalId]: "" }));
  };

  const eliminarSubNota = (evalId, subId) => {
    const evalTarget = evaluaciones.find((e) => e.id === evalId);
    if (!evalTarget) return;

    const nuevasSubNotas = (evalTarget.subNotas || []).filter(
      (s) => s.id !== subId
    );
    actualizarSubNotas(evalId, nuevasSubNotas);
  };

  // ---------- CRUD EVALUACIONES ----------

  // Agregar evaluación
  const agregarEvaluacion = () => {
    const peso = parseFloat(nuevaEval.peso);
    const nota = nuevaEval.nota ? parseFloat(nuevaEval.nota) : null;

    if (!nuevaEval.nombre.trim()) {
      setError("El nombre de la evaluación es requerido");
      return;
    }
    if (isNaN(peso) || peso <= 0 || peso > 100) {
      setError("El porcentaje debe ser entre 1 y 100");
      return;
    }

    const pesoTotal = evaluaciones.reduce((sum, e) => sum + e.peso, 0) + peso;
    if (pesoTotal > 100) {
      setError(`El porcentaje total excede 100% (actual: ${pesoTotal}%)`);
      return;
    }

    if (nota !== null && (isNaN(nota) || nota < 1.0 || nota > 7.0)) {
      setError("La nota debe estar entre 1.0 y 7.0");
      return;
    }

    const nuevaEvaluacion = {
      id: Date.now(),
      nombre: nuevaEval.nombre.trim(),
      peso: peso,
      nota: nota,
      subNotas: [], // siempre lo dejamos preparado para sub-notas
    };

    guardarEvaluaciones([...evaluaciones, nuevaEvaluacion]);
    setNuevaEval({ nombre: "", peso: "", nota: "" });
    setError("");
  };

  // Eliminar evaluación
  const eliminarEvaluacion = (id) => {
    guardarEvaluaciones(evaluaciones.filter((e) => e.id !== id));
    setOpenSubNotas((prev) => prev.filter((pid) => pid !== id));
  };

  // Actualizar nota directa (solo si NO tiene sub-notas)
  const actualizarNota = (id, nuevaNota) => {
    const nota = parseFloat(nuevaNota);
    if (isNaN(nota) || nota < 1.0 || nota > 7.0) return;

    const evals = evaluaciones.map((e) => {
      if (e.id !== id) return e;
      // Si tiene subNotas, ignoramos el cambio directo
      if (e.subNotas && e.subNotas.length > 0) return e;
      return { ...e, nota: parseFloat(nota.toFixed(1)) };
    });

    guardarEvaluaciones(evals);
  };

  // ---------- CÁLCULOS GENERALES ----------

  const pesoTotal = evaluaciones.reduce((sum, e) => sum + e.peso, 0);
  const pesoRestante = 100 - pesoTotal;

  const evaluacionesConNota = evaluaciones.filter(
    (e) => e.nota !== null && e.nota !== undefined
  );
  const pesoConNota = evaluacionesConNota.reduce((sum, e) => sum + e.peso, 0);
  const promedioActual =
    pesoConNota > 0
      ? evaluacionesConNota.reduce((sum, e) => sum + e.nota * e.peso, 0) /
        pesoConNota
      : 0;

  // Calcular nota mínima necesaria para aprobar (4.0)
  let notaNecesaria = null;
  let estado = "Pendiente";

  if (pesoTotal === 100) {
    const promedioFinal =
      evaluaciones.reduce((sum, e) => sum + (e.nota || 0) * e.peso, 0) / 100;
    estado = promedioFinal >= 4.0 ? "Aprobado" : "Reprobado";
  } else if (pesoConNota > 0 && pesoRestante > 0) {
    const notaRequerida =
      (4.0 * 100 - promedioActual * pesoConNota) / pesoRestante;
    notaNecesaria = Math.max(1.0, Math.min(7.0, notaRequerida));
  }

  if (!isOpen || !curso) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="w-full max-w-4xl">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-bgPrimary rounded-xl shadow-theme-xl border border-borderColor flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="bg-primary text-white px-6 py-4 flex items-center justify-between rounded-t-xl">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold truncate">
                  {curso.nombre}
                </h2>
                <p className="text-xs sm:text-sm opacity-90">
                  {curso.codigo} • {curso.sct} SCT
                </p>
              </div>
              <button
                onClick={onClose}
                className="ml-4 w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/20 transition-colors flex items-center justify-center text-lg sm:text-xl font-bold shrink-0"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {/* Contenido scrolleable */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              {/* Resumen */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-bgSecondary rounded-lg p-4 border border-borderColor">
                  <p className="text-xs text-textSecondary mb-1">
                    Promedio actual (ponderado)
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {pesoConNota > 0 ? promedioActual.toFixed(2) : "--"}
                  </p>
                </div>
                <div className="bg-bgSecondary rounded-lg p-4 border border-borderColor">
                  <p className="text-xs text-textSecondary mb-1">Estado</p>
                  <p
                    className={`text-lg font-bold ${
                      estado === "Aprobado"
                        ? "text-green-500"
                        : estado === "Reprobado"
                        ? "text-red-500"
                        : "text-yellow-500"
                    }`}
                  >
                    {estado}
                  </p>
                </div>
                <div className="bg-bgSecondary rounded-lg p-4 border border-borderColor">
                  <p className="text-xs text-textSecondary mb-1">
                    Porcentaje cubierto
                  </p>
                  <p className="text-2xl font-bold text-textPrimary">
                    {pesoTotal}%
                  </p>
                </div>
              </div>

              {/* Estimación de nota necesaria */}
              {notaNecesaria !== null && pesoRestante > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6"
                >
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">
                    💡 Estimación para aprobar (4.0)
                  </p>
                  <p className="text-textPrimary text-sm sm:text-base">
                    Necesitas un promedio de{" "}
                    <strong className="text-blue-600 dark:text-blue-400">
                      {notaNecesaria.toFixed(2)}
                    </strong>{" "}
                    en el {pesoRestante}% restante
                    {notaNecesaria > 7.0 && (
                      <span className="text-red-500 ml-2 text-sm">
                        (⚠️ No alcanzable)
                      </span>
                    )}
                  </p>
                </motion.div>
              )}

              {/* Lista de evaluaciones */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-textPrimary">
                  Evaluaciones
                </h3>
                {evaluaciones.length === 0 ? (
                  <p className="text-textSecondary text-center py-8 text-sm">
                    No hay evaluaciones registradas.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {evaluaciones.map((evaluacion) => {
                      const tieneSubNotas =
                        evaluacion.subNotas && evaluacion.subNotas.length > 0;
                      const promedioSub =
                        tieneSubNotas && typeof evaluacion.nota === "number"
                          ? evaluacion.nota.toFixed(2)
                          : null;

                      return (
                        <motion.div
                          key={evaluacion.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="bg-bgSecondary rounded-lg border border-borderColor p-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-textPrimary truncate">
                                {evaluacion.nombre}
                              </p>
                              <p className="text-xs text-textSecondary">
                                {evaluacion.peso}% del curso
                              </p>
                              {tieneSubNotas && (
                                <p className="text-xs text-textSecondary mt-1">
                                  Promedio de controles:{" "}
                                  <span className="font-semibold">
                                    {promedioSub}
                                  </span>
                                </p>
                              )}
                            </div>

                            {/* Nota directa (oculta si tiene sub-notas) */}
                            {!tieneSubNotas && (
                              <input
                                type="number"
                                min="1.0"
                                max="7.0"
                                step="0.1"
                                value={evaluacion.nota ?? ""}
                                onChange={(e) =>
                                  actualizarNota(evaluacion.id, e.target.value)
                                }
                                placeholder="Nota"
                                className="w-24 px-2 py-1 rounded border border-borderColor bg-bgPrimary text-textPrimary text-center text-sm"
                              />
                            )}

                            <div className="flex items-center gap-2 self-start sm:self-auto">
                              <button
                                onClick={() =>
                                  toggleSubNotasPanel(evaluacion.id)
                                }
                                className="text-xs sm:text-sm text-blue-500 hover:bg-blue-500/10 px-2 py-1 rounded transition-colors whitespace-nowrap"
                              >
                                {openSubNotas.includes(evaluacion.id)
                                  ? "Ocultar controles"
                                  : "Controles / sub-notas"}
                              </button>
                              <button
                                onClick={() =>
                                  eliminarEvaluacion(evaluacion.id)
                                }
                                className="text-red-500 hover:bg-red-500/10 px-2 py-1 rounded transition-colors text-sm"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>

                          {/* Panel de sub-notas (controles) */}
                          {openSubNotas.includes(evaluacion.id) && (
                            <div className="mt-3 bg-bgTertiary rounded-lg border border-dashed border-borderColor p-3 space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <input
                                  type="number"
                                  min="1.0"
                                  max="7.0"
                                  step="0.1"
                                  placeholder="Nota de control"
                                  value={subNotaInputs[evaluacion.id] || ""}
                                  onChange={(e) =>
                                    handleSubNotaInputChange(
                                      evaluacion.id,
                                      e.target.value
                                    )
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      agregarSubNota(evaluacion.id);
                                    }
                                  }}
                                  className="px-3 py-2 rounded border border-borderColor bg-bgPrimary text-textPrimary text-sm flex-1"
                                />
                                <button
                                  onClick={() => agregarSubNota(evaluacion.id)}
                                  className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover text-sm font-medium"
                                >
                                  ➕ Agregar control
                                </button>
                              </div>

                              {tieneSubNotas ? (
                                <div className="space-y-2">
                                  <p className="text-xs text-textSecondary">
                                    Controles registrados:
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {evaluacion.subNotas.map((sub) => (
                                      <div
                                        key={sub.id}
                                        className="flex items-center gap-1 bg-bgPrimary border border-borderColor rounded-full px-3 py-1 text-xs"
                                      >
                                        <span>{sub.nota.toFixed(1)}</span>
                                        <button
                                          onClick={() =>
                                            eliminarSubNota(
                                              evaluacion.id,
                                              sub.id
                                            )
                                          }
                                          className="text-red-500 hover:text-red-600"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-textSecondary">
                                  Aún no hay controles agregados para esta
                                  evaluación.
                                </p>
                              )}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Agregar evaluación */}
              <div className="bg-bgTertiary rounded-lg p-4 border border-borderColor">
                <h3 className="text-lg font-semibold mb-3 text-textPrimary">
                  Nueva evaluación
                </h3>
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded p-2 mb-3 text-red-600 text-sm">
                    {error}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <input
                    type="text"
                    placeholder="Nombre (ej: Controles, Examen)"
                    value={nuevaEval.nombre}
                    onChange={(e) =>
                      setNuevaEval({ ...nuevaEval, nombre: e.target.value })
                    }
                    className="px-3 py-2 rounded border border-borderColor bg-bgPrimary text-textPrimary text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Peso %"
                    min="1"
                    max="100"
                    value={nuevaEval.peso}
                    onChange={(e) =>
                      setNuevaEval({ ...nuevaEval, peso: e.target.value })
                    }
                    className="px-3 py-2 rounded border border-borderColor bg-bgPrimary text-textPrimary text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Nota (opcional)"
                    min="1.0"
                    max="7.0"
                    step="0.1"
                    value={nuevaEval.nota}
                    onChange={(e) =>
                      setNuevaEval({ ...nuevaEval, nota: e.target.value })
                    }
                    className="px-3 py-2 rounded border border-borderColor bg-bgPrimary text-textPrimary text-sm"
                  />
                </div>
                <button
                  onClick={agregarEvaluacion}
                  disabled={pesoRestante === 0}
                  className="w-full bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-hover 
                             disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                >
                  ➕ Agregar evaluación
                </button>
                {pesoRestante === 0 && (
                  <p className="text-xs text-textSecondary mt-2 text-center">
                    Ya has asignado el 100% del porcentaje.
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-bgSecondary px-4 sm:px-6 py-3 sm:py-4 border-t border-borderColor flex justify-end rounded-b-xl">
              <button
                onClick={onClose}
                className="px-5 sm:px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm sm:text-base"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
