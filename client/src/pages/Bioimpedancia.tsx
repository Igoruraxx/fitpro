import { useState, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { compressImage } from "@/lib/imageCompressor";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Types ───────────────────────────────────────────────────────────────────
type Exam = {
  id: number;
  date: string;
  weight?: string | null;
  bmi?: string | null;
  bodyFatPct?: string | null;
  fatMass?: string | null;
  leanMass?: string | null;
  muscleMass?: string | null;
  muscleRate?: string | null;
  skeletalMuscleMass?: string | null;
  boneMass?: string | null;
  proteinMass?: string | null;
  proteinPct?: string | null;
  moistureContent?: string | null;
  bodyWaterPct?: string | null;
  subcutaneousFatPct?: string | null;
  visceralFat?: string | null;
  bmr?: string | null;
  metabolicAge?: number | null;
  whr?: string | null;
  idealWeight?: string | null;
  obesityLevel?: string | null;
  bodyType?: string | null;
  imageUrl?: string | null;
  notes?: string | null;
};

type FormData = {
  date: string;
  weight: string;
  bmi: string;
  bodyFatPct: string;
  fatMass: string;
  leanMass: string;
  muscleMass: string;
  muscleRate: string;
  skeletalMuscleMass: string;
  boneMass: string;
  proteinMass: string;
  proteinPct: string;
  moistureContent: string;
  bodyWaterPct: string;
  subcutaneousFatPct: string;
  visceralFat: string;
  bmr: string;
  metabolicAge: string;
  whr: string;
  idealWeight: string;
  obesityLevel: string;
  bodyType: string;
  notes: string;
};

const emptyForm: FormData = {
  date: new Date().toISOString().split("T")[0],
  weight: "", bmi: "", bodyFatPct: "", fatMass: "", leanMass: "",
  muscleMass: "", muscleRate: "", skeletalMuscleMass: "", boneMass: "",
  proteinMass: "", proteinPct: "", moistureContent: "", bodyWaterPct: "",
  subcutaneousFatPct: "", visceralFat: "", bmr: "", metabolicAge: "",
  whr: "", idealWeight: "", obesityLevel: "", bodyType: "", notes: "",
};

// ─── Auto-calculate bodyFatPct from fatMass / weight ─────────────────────────
function calcBodyFatPct(weight: string, fatMass: string): string {
  const w = parseFloat(weight);
  const f = parseFloat(fatMass);
  if (w > 0 && f >= 0) return ((f / w) * 100).toFixed(1);
  return "";
}

// ─── Status badge helper ──────────────────────────────────────────────────────
function visceralStatus(v: number): { label: string; color: string } {
  if (v <= 9) return { label: "Normal", color: "text-green-400" };
  if (v <= 14) return { label: "Alto risco", color: "text-yellow-400" };
  return { label: "Muito alto", color: "text-red-400" };
}
function fatPctStatus(pct: number, isMale = false): { label: string; color: string } {
  const limit = isMale ? [6, 17, 25] : [14, 24, 32];
  if (pct < limit[0]) return { label: "Muito baixo", color: "text-blue-400" };
  if (pct <= limit[1]) return { label: "Excelente", color: "text-green-400" };
  if (pct <= limit[2]) return { label: "Alto", color: "text-yellow-400" };
  return { label: "Muito alto", color: "text-red-400" };
}

// ─── Chart colors ─────────────────────────────────────────────────────────────
const CHART_METRICS = [
  { key: "weight", label: "Peso (kg)", color: "#a78bfa" },
  { key: "bodyFatPct", label: "% Gordura", color: "#f87171" },
  { key: "muscleMass", label: "Massa Muscular (kg)", color: "#34d399" },
  { key: "leanMass", label: "Massa Magra (kg)", color: "#60a5fa" },
  { key: "visceralFat", label: "Gordura Visceral", color: "#fb923c" },
  { key: "bmi", label: "IMC", color: "#e879f9" },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Bioimpedancia() {
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [tab, setTab] = useState<"graficos" | "exames">("graficos");
  const [showModal, setShowModal] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [activeMetrics, setActiveMetrics] = useState<string[]>(["weight", "bodyFatPct", "muscleMass"]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  // Clients list
  const { data: clients = [] } = trpc.clients.list.useQuery();

  // Exams for selected client
  const { data: exams = [], isLoading: examsLoading } = trpc.bioimpedance.list.useQuery(
    { clientId: selectedClientId! },
    { enabled: !!selectedClientId }
  );

  const createMutation = trpc.bioimpedance.create.useMutation({
    onSuccess: () => { utils.bioimpedance.list.invalidate(); closeModal(); },
  });
  const updateMutation = trpc.bioimpedance.update.useMutation({
    onSuccess: () => { utils.bioimpedance.list.invalidate(); closeModal(); },
  });
  const deleteMutation = trpc.bioimpedance.delete.useMutation({
    onSuccess: () => utils.bioimpedance.list.invalidate(),
  });

  // Chart data (sorted ascending)
  const chartData = useMemo(() => {
    return [...exams]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => ({
        date: format(parseISO(e.date), "dd/MM", { locale: ptBR }),
        weight: e.weight ? parseFloat(e.weight) : null,
        bodyFatPct: e.bodyFatPct ? parseFloat(e.bodyFatPct) : null,
        muscleMass: e.muscleMass ? parseFloat(e.muscleMass) : null,
        leanMass: e.leanMass ? parseFloat(e.leanMass) : null,
        visceralFat: e.visceralFat ? parseFloat(e.visceralFat) : null,
        bmi: e.bmi ? parseFloat(e.bmi) : null,
      }));
  }, [exams]);

  function openNew() {
    setEditingExam(null);
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview(null);
    setImageBase64(null);
    setShowModal(true);
  }

  function openEdit(exam: Exam) {
    setEditingExam(exam);
    setForm({
      date: exam.date,
      weight: exam.weight ?? "",
      bmi: exam.bmi ?? "",
      bodyFatPct: exam.bodyFatPct ?? "",
      fatMass: exam.fatMass ?? "",
      leanMass: exam.leanMass ?? "",
      muscleMass: exam.muscleMass ?? "",
      muscleRate: exam.muscleRate ?? "",
      skeletalMuscleMass: exam.skeletalMuscleMass ?? "",
      boneMass: exam.boneMass ?? "",
      proteinMass: exam.proteinMass ?? "",
      proteinPct: exam.proteinPct ?? "",
      moistureContent: exam.moistureContent ?? "",
      bodyWaterPct: exam.bodyWaterPct ?? "",
      subcutaneousFatPct: exam.subcutaneousFatPct ?? "",
      visceralFat: exam.visceralFat ?? "",
      bmr: exam.bmr ?? "",
      metabolicAge: exam.metabolicAge?.toString() ?? "",
      whr: exam.whr ?? "",
      idealWeight: exam.idealWeight ?? "",
      obesityLevel: exam.obesityLevel ?? "",
      bodyType: exam.bodyType ?? "",
      notes: exam.notes ?? "",
    });
    setImagePreview(exam.imageUrl ?? null);
    setImageBase64(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingExam(null);
    setImageFile(null);
    setImagePreview(null);
    setImageBase64(null);
  }

  function setField(key: keyof FormData, value: string) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Auto-calculate bodyFatPct when weight or fatMass changes
      if (key === "weight" || key === "fatMass") {
        const auto = calcBodyFatPct(
          key === "weight" ? value : prev.weight,
          key === "fatMass" ? value : prev.fatMass
        );
        if (auto) next.bodyFatPct = auto;
      }
      return next;
    });
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressing(true);
    try {
      const compressed = await compressImage(file, { maxDimension: 1400, quality: 0.82 });
      setImageFile(compressed.file);
      setImagePreview(compressed.dataUrl);
      setImageBase64(compressed.dataUrl); // base64 data URL
    } finally {
      setCompressing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClientId) return;

    const payload = {
      clientId: selectedClientId,
      date: form.date,
      weight: form.weight || undefined,
      bmi: form.bmi || undefined,
      bodyFatPct: form.bodyFatPct || undefined,
      fatMass: form.fatMass || undefined,
      leanMass: form.leanMass || undefined,
      muscleMass: form.muscleMass || undefined,
      muscleRate: form.muscleRate || undefined,
      skeletalMuscleMass: form.skeletalMuscleMass || undefined,
      boneMass: form.boneMass || undefined,
      proteinMass: form.proteinMass || undefined,
      proteinPct: form.proteinPct || undefined,
      moistureContent: form.moistureContent || undefined,
      bodyWaterPct: form.bodyWaterPct || undefined,
      subcutaneousFatPct: form.subcutaneousFatPct || undefined,
      visceralFat: form.visceralFat || undefined,
      bmr: form.bmr || undefined,
      metabolicAge: form.metabolicAge ? parseInt(form.metabolicAge) : undefined,
      whr: form.whr || undefined,
      idealWeight: form.idealWeight || undefined,
      obesityLevel: form.obesityLevel || undefined,
      bodyType: form.bodyType || undefined,
      notes: form.notes || undefined,
      imageBase64: imageBase64 || undefined,
    };

    if (editingExam) {
      const { clientId, imageBase64: _img, ...updateData } = payload;
      await updateMutation.mutateAsync({ id: editingExam.id, ...updateData });
    } else {
      await createMutation.mutateAsync(payload);
    }
  }

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const latestExam = exams[0];

  function toggleMetric(key: string) {
    setActiveMetrics((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-[#0f0f0f] text-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bioimpedância</h1>
          <p className="text-xs text-white/40 mt-0.5">Exames e resultados</p>
        </div>
        {selectedClientId && (
          <button
            onClick={openNew}
            className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            + Exame
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mx-4 mt-4 bg-white/5 rounded-xl p-1">
        {(["graficos", "exames"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors capitalize ${
              tab === t ? "bg-violet-600 text-white" : "text-white/50 hover:text-white"
            }`}
          >
            {t === "graficos" ? "Gráficos" : "Exames"}
          </button>
        ))}
      </div>

      {/* Client selector */}
      <div className="mx-4 mt-4">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">🔍</span>
          <select
            value={selectedClientId ?? ""}
            onChange={(e) => setSelectedClientId(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-sm text-white appearance-none focus:outline-none focus:border-violet-500"
          >
            <option value="">Selecionar aluno...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 mt-4">
        {!selectedClientId ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/30">
            <span className="text-5xl mb-3">📊</span>
            <p className="text-sm">Selecione um aluno para ver os exames</p>
          </div>
        ) : examsLoading ? (
          <div className="flex items-center justify-center py-20 text-white/40 text-sm">Carregando...</div>
        ) : exams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/30">
            <span className="text-5xl mb-3">🔬</span>
            <p className="text-sm mb-4">Nenhum exame registrado para {selectedClient?.name}</p>
            <button onClick={openNew} className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-5 py-2 rounded-lg">
              + Adicionar primeiro exame
            </button>
          </div>
        ) : tab === "graficos" ? (
          <div className="space-y-5">
            {/* Latest summary cards */}
            {latestExam && (
              <div>
                <p className="text-xs text-white/40 mb-2 uppercase tracking-wider">Último exame — {format(parseISO(latestExam.date), "dd/MM/yyyy")}</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Peso", value: latestExam.weight ? `${latestExam.weight} kg` : "—" },
                    { label: "IMC", value: latestExam.bmi ?? "—" },
                    { label: "% Gordura", value: latestExam.bodyFatPct ? `${latestExam.bodyFatPct}%` : "—", status: latestExam.bodyFatPct ? fatPctStatus(parseFloat(latestExam.bodyFatPct)) : null },
                    { label: "M. Muscular", value: latestExam.muscleMass ? `${latestExam.muscleMass} kg` : "—" },
                    { label: "G. Visceral", value: latestExam.visceralFat ?? "—", status: latestExam.visceralFat ? visceralStatus(parseFloat(latestExam.visceralFat)) : null },
                    { label: "TMB", value: latestExam.bmr ? `${latestExam.bmr} kcal` : "—" },
                  ].map((item) => (
                    <div key={item.label} className="bg-white/5 rounded-xl p-3">
                      <p className="text-[10px] text-white/40 uppercase tracking-wider">{item.label}</p>
                      <p className="text-base font-bold mt-0.5">{item.value}</p>
                      {item.status && <p className={`text-[10px] font-medium mt-0.5 ${item.status.color}`}>{item.status.label}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metric toggles */}
            <div>
              <p className="text-xs text-white/40 mb-2 uppercase tracking-wider">Métricas no gráfico</p>
              <div className="flex flex-wrap gap-2">
                {CHART_METRICS.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => toggleMetric(m.key)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      activeMetrics.includes(m.key)
                        ? "border-transparent text-white"
                        : "border-white/10 text-white/40 hover:text-white"
                    }`}
                    style={activeMetrics.includes(m.key) ? { backgroundColor: m.color + "33", borderColor: m.color, color: m.color } : {}}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart */}
            {chartData.length >= 2 && (
              <div className="bg-white/5 rounded-2xl p-4">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: "rgba(255,255,255,0.7)" }}
                    />
                    {CHART_METRICS.filter((m) => activeMetrics.includes(m.key)).map((m) => (
                      <Line
                        key={m.key}
                        type="monotone"
                        dataKey={m.key}
                        name={m.label}
                        stroke={m.color}
                        strokeWidth={2}
                        dot={{ r: 4, fill: m.color }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {chartData.length < 2 && (
              <div className="bg-white/5 rounded-2xl p-6 text-center text-white/30 text-sm">
                Adicione pelo menos 2 exames para ver o gráfico de evolução
              </div>
            )}
          </div>
        ) : (
          /* Exams list */
          <div className="space-y-3">
            {exams.map((exam) => (
              <div key={exam.id} className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold">{format(parseISO(exam.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                    {exam.obesityLevel && <p className="text-xs text-white/40 mt-0.5">{exam.bodyType} · {exam.obesityLevel}</p>}
                  </div>
                  <div className="flex gap-2">
                    {exam.imageUrl && (
                      <button onClick={() => setViewImage(exam.imageUrl!)} className="text-xs text-violet-400 hover:text-violet-300 px-2 py-1 rounded-lg bg-violet-500/10">
                        Ver laudo
                      </button>
                    )}
                    <button onClick={() => openEdit(exam)} className="text-xs text-white/50 hover:text-white px-2 py-1 rounded-lg bg-white/5">
                      Editar
                    </button>
                    <button
                      onClick={() => { if (confirm("Excluir este exame?")) deleteMutation.mutate({ id: exam.id }); }}
                      className="text-xs text-red-400/70 hover:text-red-400 px-2 py-1 rounded-lg bg-red-500/5"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  {[
                    ["Peso", exam.weight ? `${exam.weight} kg` : null],
                    ["IMC", exam.bmi],
                    ["% Gordura", exam.bodyFatPct ? `${exam.bodyFatPct}%` : null],
                    ["M. Gorda", exam.fatMass ? `${exam.fatMass} kg` : null],
                    ["M. Magra", exam.leanMass ? `${exam.leanMass} kg` : null],
                    ["M. Muscular", exam.muscleMass ? `${exam.muscleMass} kg` : null],
                    ["G. Visceral", exam.visceralFat],
                    ["TMB", exam.bmr ? `${exam.bmr} kcal` : null],
                    ["Idade Met.", exam.metabolicAge?.toString() ?? null],
                  ].filter(([, v]) => v).map(([label, value]) => (
                    <div key={label as string}>
                      <p className="text-[10px] text-white/30 uppercase">{label}</p>
                      <p className="font-medium text-sm">{value}</p>
                    </div>
                  ))}
                </div>
                {exam.notes && <p className="text-xs text-white/40 mt-3 border-t border-white/5 pt-2">{exam.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image viewer modal */}
      {viewImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setViewImage(null)}>
          <img src={viewImage} alt="Laudo" className="max-w-full max-h-full rounded-xl object-contain" />
          <button className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl">✕</button>
        </div>
      )}

      {/* Form modal */}
      {showModal && (
        <div className="fixed inset-0 z-40 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#1a1a2e] rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#1a1a2e] px-5 pt-5 pb-3 border-b border-white/10 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold">{editingExam ? "Editar Exame" : "Novo Exame de Bioimpedância"}</h2>
              <button onClick={closeModal} className="text-white/40 hover:text-white text-xl">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-5">
              {/* Date */}
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider block mb-1">Data do exame *</label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setField("date", e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Upload image */}
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider block mb-1">Imagem do laudo (opcional)</label>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="Laudo" className="w-full max-h-48 object-contain rounded-xl border border-white/10" />
                    <button
                      type="button"
                      onClick={() => { setImagePreview(null); setImageBase64(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center"
                    >✕</button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={compressing}
                    className="w-full border-2 border-dashed border-white/10 rounded-xl py-6 text-white/40 hover:text-white hover:border-violet-500 transition-colors text-sm"
                  >
                    {compressing ? "Comprimindo..." : "📷 Clique para adicionar imagem do laudo"}
                  </button>
                )}
              </div>

              {/* Section: Composição Corporal */}
              <Section title="Composição Corporal">
                <Row>
                  <Field label="Peso (kg)" value={form.weight} onChange={(v) => setField("weight", v)} placeholder="ex: 80.5" />
                  <Field label="IMC (kg/m²)" value={form.bmi} onChange={(v) => setField("bmi", v)} placeholder="ex: 25.4" />
                </Row>
                <Row>
                  <Field
                    label="% Gordura corporal"
                    value={form.bodyFatPct}
                    onChange={(v) => setField("bodyFatPct", v)}
                    placeholder="Calculado automaticamente"
                    hint={form.weight && form.fatMass ? `Auto: ${calcBodyFatPct(form.weight, form.fatMass)}%` : undefined}
                  />
                  <Field label="Massa gorda (kg)" value={form.fatMass} onChange={(v) => setField("fatMass", v)} placeholder="ex: 20.0" />
                </Row>
                <Row>
                  <Field label="Massa livre de gordura (kg)" value={form.leanMass} onChange={(v) => setField("leanMass", v)} placeholder="ex: 60.0" />
                  <Field label="Massa muscular (kg)" value={form.muscleMass} onChange={(v) => setField("muscleMass", v)} placeholder="ex: 55.0" />
                </Row>
                <Row>
                  <Field label="Taxa muscular (%)" value={form.muscleRate} onChange={(v) => setField("muscleRate", v)} placeholder="ex: 68.5" />
                  <Field label="M. Musc. Esquelética (kg)" value={form.skeletalMuscleMass} onChange={(v) => setField("skeletalMuscleMass", v)} placeholder="ex: 35.0" />
                </Row>
                <Row>
                  <Field label="Massa óssea (kg)" value={form.boneMass} onChange={(v) => setField("boneMass", v)} placeholder="ex: 3.5" />
                  <Field label="Massa protéica (kg)" value={form.proteinMass} onChange={(v) => setField("proteinMass", v)} placeholder="ex: 11.0" />
                </Row>
              </Section>

              {/* Section: Hidratação */}
              <Section title="Hidratação e Gordura">
                <Row>
                  <Field label="Proteína (%)" value={form.proteinPct} onChange={(v) => setField("proteinPct", v)} placeholder="ex: 13.7" />
                  <Field label="Teor de umidade (kg)" value={form.moistureContent} onChange={(v) => setField("moistureContent", v)} placeholder="ex: 39.0" />
                </Row>
                <Row>
                  <Field label="Água corporal (%)" value={form.bodyWaterPct} onChange={(v) => setField("bodyWaterPct", v)} placeholder="ex: 50.2" />
                  <Field label="Gordura subcutânea (%)" value={form.subcutaneousFatPct} onChange={(v) => setField("subcutaneousFatPct", v)} placeholder="ex: 22.5" />
                </Row>
                <Row>
                  <Field label="Gordura visceral" value={form.visceralFat} onChange={(v) => setField("visceralFat", v)} placeholder="ex: 10.0"
                    hint={form.visceralFat ? visceralStatus(parseFloat(form.visceralFat)).label : undefined}
                    hintColor={form.visceralFat ? visceralStatus(parseFloat(form.visceralFat)).color : undefined}
                  />
                  <Field label="Peso corporal ideal (kg)" value={form.idealWeight} onChange={(v) => setField("idealWeight", v)} placeholder="ex: 65.0" />
                </Row>
              </Section>

              {/* Section: Metabolismo */}
              <Section title="Metabolismo e Outros">
                <Row>
                  <Field label="TMB (kcal)" value={form.bmr} onChange={(v) => setField("bmr", v)} placeholder="ex: 1521" />
                  <Field label="Idade metabólica" value={form.metabolicAge} onChange={(v) => setField("metabolicAge", v)} placeholder="ex: 33" />
                </Row>
                <Row>
                  <Field label="WHR" value={form.whr} onChange={(v) => setField("whr", v)} placeholder="ex: 0.86" />
                  <Field label="Nível de obesidade" value={form.obesityLevel} onChange={(v) => setField("obesityLevel", v)} placeholder="ex: Pré-obesidade" />
                </Row>
                <Field label="Tipo de corpo" value={form.bodyType} onChange={(v) => setField("bodyType", v)} placeholder="ex: Obesidade" />
              </Section>

              {/* Notes */}
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider block mb-1">Observações</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  rows={3}
                  placeholder="Anotações sobre o exame..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white resize-none focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="flex gap-3 pt-2 pb-4">
                <button type="button" onClick={closeModal} className="flex-1 py-3 rounded-xl border border-white/10 text-sm text-white/60 hover:text-white">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold text-white disabled:opacity-50 transition-colors"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Salvando..." : editingExam ? "Salvar alterações" : "Salvar exame"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-violet-400 uppercase tracking-wider font-semibold mb-3 border-b border-violet-500/20 pb-1">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function Field({
  label, value, onChange, placeholder, hint, hintColor,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  hintColor?: string;
}) {
  return (
    <div>
      <label className="text-[11px] text-white/40 block mb-1">{label}</label>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 placeholder:text-white/20"
      />
      {hint && <p className={`text-[10px] mt-0.5 ${hintColor ?? "text-white/40"}`}>{hint}</p>}
    </div>
  );
}
