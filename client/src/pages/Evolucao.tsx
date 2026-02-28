import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar
} from "recharts";
import { Plus, Activity, Ruler, TrendingUp, ImageIcon, Trash2, Edit2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface Perimetria {
  cintura?: string; quadril?: string; braco?: string; coxa?: string;
  panturrilha?: string; pescoco?: string; torax?: string; abdomen?: string;
}
interface Dobras {
  tricipital?: string; subescapular?: string; abdominal?: string;
  suprailiaca?: string; coxa?: string; axilarMedia?: string; peitoral?: string;
}

const PERIMETRIA_FIELDS: { key: keyof Perimetria; label: string }[] = [
  { key: "cintura", label: "Cintura" }, { key: "quadril", label: "Quadril" },
  { key: "braco", label: "Braço" }, { key: "coxa", label: "Coxa" },
  { key: "panturrilha", label: "Panturrilha" }, { key: "pescoco", label: "Pescoço" },
  { key: "torax", label: "Tórax" }, { key: "abdomen", label: "Abdômen" },
];
const DOBRAS_FIELDS: { key: keyof Dobras; label: string }[] = [
  { key: "tricipital", label: "Tricipital" }, { key: "subescapular", label: "Subescapular" },
  { key: "abdominal", label: "Abdominal" }, { key: "suprailiaca", label: "Suprailíaca" },
  { key: "coxa", label: "Coxa" }, { key: "axilarMedia", label: "Axilar Média" },
  { key: "peitoral", label: "Peitoral" },
];

function parseJSON<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try { return JSON.parse(str) as T; } catch { return fallback; }
}
function fmtDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
function fmtNum(v: string | null | undefined) {
  if (!v) return "—";
  return parseFloat(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}
function emptyForm() {
  return {
    date: new Date().toISOString().slice(0, 10),
    weight: "", muscleMass: "", musclePct: "", bodyFatPct: "", visceralFat: "",
    perimetria: {} as Perimetria, dobras: {} as Dobras,
    notes: "", imageBase64: "", imagePreview: "",
  };
}

export default function Evolucao() {
  const { user, loading } = useAuth();

  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecionando para login...</p>
        </div>
      </div>
    );
  }

  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showDeleteByDate, setShowDeleteByDate] = useState(false);
  const [deleteBeforeDate, setDeleteBeforeDate] = useState<string>("");
  const [showConfirmDeleteByDate, setShowConfirmDeleteByDate] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: clients = [] } = trpc.clients.list.useQuery();
  const { data: exams = [], refetch } = trpc.bioimpedance.list.useQuery(
    { clientId: selectedClientId! }, { enabled: !!selectedClientId }
  );

  const createMut = trpc.bioimpedance.create.useMutation({
    onSuccess: () => { toast.success("Exame salvo!"); setModalOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.bioimpedance.update.useMutation({
    onSuccess: () => { toast.success("Exame atualizado!"); setModalOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.bioimpedance.delete.useMutation({
    onSuccess: () => { toast.success("Exame removido."); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const chartData = [...exams]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({
      date: fmtDate(e.date),
      "Peso (kg)": e.weight ? parseFloat(e.weight) : undefined,
      "% Gordura": e.bodyFatPct ? parseFloat(e.bodyFatPct) : undefined,
      "% Muscular": e.musclePct ? parseFloat(e.musclePct) : undefined,
      "Visceral": e.visceralFat ? parseFloat(e.visceralFat) : undefined,
    }));

  function openNew() { setEditId(null); setForm(emptyForm()); setModalOpen(true); }
  function openEdit(exam: typeof exams[0]) {
    setEditId(exam.id);
    setForm({
      date: exam.date, weight: exam.weight ?? "", muscleMass: exam.muscleMass ?? "",
      musclePct: exam.musclePct ?? "", bodyFatPct: exam.bodyFatPct ?? "",
      visceralFat: exam.visceralFat ?? "",
      perimetria: parseJSON<Perimetria>(exam.perimetria, {}),
      dobras: parseJSON<Dobras>(exam.dobras, {}),
      notes: exam.notes ?? "", imageBase64: "", imagePreview: exam.imageUrl ?? "",
    });
    setModalOpen(true);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Imagem muito grande (máx. 5MB)"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setForm((f) => ({ ...f, imageBase64: base64, imagePreview: base64 }));
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit() {
    if (!selectedClientId) return;
    const payload = {
      clientId: selectedClientId, date: form.date,
      weight: form.weight || undefined, muscleMass: form.muscleMass || undefined,
      musclePct: form.musclePct || undefined, bodyFatPct: form.bodyFatPct || undefined,
      visceralFat: form.visceralFat || undefined,
      perimetria: Object.keys(form.perimetria).length ? JSON.stringify(form.perimetria) : undefined,
      dobras: Object.keys(form.dobras).length ? JSON.stringify(form.dobras) : undefined,
      notes: form.notes || undefined, imageBase64: form.imageBase64 || undefined,
    };
    if (editId) updateMut.mutate({ id: editId, ...payload });
    else createMut.mutate(payload);
  }

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="mb-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Exames</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Bioimpedância, perimetria e dobras cutâneas</p>
        </div>
        {selectedClientId && (
          <div className="flex gap-2">
            <Button onClick={openNew} size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" /> Novo Exame
            </Button>

          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div>
          <Label className="text-sm font-medium mb-2 block">Selecionar Aluno</Label>
          <Select
            value={selectedClientId ? String(selectedClientId) : "none"}
            onValueChange={(v) => setSelectedClientId(v === "none" ? null : Number(v))}
          >
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue placeholder="Escolha um aluno..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Escolha um aluno...</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedClientId && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteByDate(true)}
            className="w-full"
          >
            <Trash2 className="w-4 h-4 mr-2" /> Apagar Exames por Data
          </Button>
        )}
      </div>

      {!selectedClientId && (
        <div className="text-center py-16 text-muted-foreground">
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Selecione um aluno para ver os exames</p>
        </div>
      )}

      {selectedClientId && (
        <Tabs defaultValue="historico">
          <TabsList className="mb-4">
            <TabsTrigger value="historico">Histórico</TabsTrigger>
            <TabsTrigger value="graficos" disabled={exams.length < 2}>
              Gráficos {exams.length < 2 && <span className="ml-1 text-xs opacity-50">(min. 2)</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="historico" className="space-y-3">
            {exams.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>Nenhum exame cadastrado ainda.</p>
              </div>
            )}
            {[...exams].sort((a, b) => b.date.localeCompare(a.date)).map((exam) => {
              const perim = parseJSON<Perimetria>(exam.perimetria, {});
              const dobr = parseJSON<Dobras>(exam.dobras, {});
              const isExpanded = expandedId === exam.id;
              const hasPerim = Object.values(perim).some(Boolean);
              const hasDobras = Object.values(dobr).some(Boolean);
              return (
                <div key={exam.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{fmtDate(exam.date)}</p>
                        <p className="text-xs text-muted-foreground">
                          {[
                            exam.weight && `${fmtNum(exam.weight)} kg`,
                            exam.bodyFatPct && `${fmtNum(exam.bodyFatPct)}% gord.`,
                            exam.musclePct && `${fmtNum(exam.musclePct)}% musc.`,
                          ].filter(Boolean).join(" · ") || "Dados parciais"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(exam)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => { if (confirm("Remover exame?")) deleteMut.mutate({ id: exam.id }); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => setExpandedId(isExpanded ? null : exam.id)}>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Composição Corporal</p>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {[
                            { label: "Peso Total", value: exam.weight, unit: "kg" },
                            { label: "Massa Muscular", value: exam.muscleMass, unit: "kg" },
                            { label: "% Muscular", value: exam.musclePct, unit: "%" },
                            { label: "% Gordura", value: exam.bodyFatPct, unit: "%" },
                            { label: "Gordura Visceral", value: exam.visceralFat, unit: "" },
                          ].map(({ label, value, unit }) => (
                            <div key={label} className="bg-blue-50 rounded-lg p-2.5 text-center">
                              <p className="text-xs text-muted-foreground leading-tight">{label}</p>
                              <p className="text-base font-bold text-blue-700 mt-0.5">
                                {value ? `${fmtNum(value)}${unit}` : "—"}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                      {hasPerim && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                            <Ruler className="w-3 h-3" /> Perimetria (cm)
                          </p>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {PERIMETRIA_FIELDS.filter((f) => perim[f.key]).map((f) => (
                              <div key={f.key} className="bg-gray-50 rounded-lg p-2 text-center">
                                <p className="text-xs text-muted-foreground">{f.label}</p>
                                <p className="text-sm font-semibold">{perim[f.key]}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {hasDobras && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> Dobras Cutâneas (mm)
                          </p>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {DOBRAS_FIELDS.filter((f) => dobr[f.key]).map((f) => (
                              <div key={f.key} className="bg-gray-50 rounded-lg p-2 text-center">
                                <p className="text-xs text-muted-foreground">{f.label}</p>
                                <p className="text-sm font-semibold">{dobr[f.key]}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {exam.imageUrl && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" /> Laudo
                          </p>
                          <img src={exam.imageUrl} alt="Laudo" className="rounded-lg max-h-64 object-contain border border-border" />
                        </div>
                      )}
                      {exam.notes && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Observações</p>
                          <p className="text-sm text-foreground bg-gray-50 rounded-lg p-3">{exam.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="graficos" className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" /> Peso e % Gordura
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Peso (kg)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                  <Line type="monotone" dataKey="% Gordura" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" /> % Massa Muscular e Gordura Visceral
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="% Muscular" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                  <Line type="monotone" dataKey="Visceral" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {(() => {
              const sorted = [...exams].sort((a, b) => b.date.localeCompare(a.date));
              if (sorted.length < 2) return null;
              const last = parseJSON<Perimetria>(sorted[0].perimetria, {});
              const prev = parseJSON<Perimetria>(sorted[1].perimetria, {});
              const fields = PERIMETRIA_FIELDS.filter((f) => last[f.key] || prev[f.key]);
              if (!fields.length) return null;
              return (
                <div className="space-y-4">
                  <div className="bg-card border border-border rounded-xl p-4">
                    <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                      <Ruler className="w-4 h-4 text-blue-500" /> Perimetria Comparativa (cm)
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {fields.map((f) => {
                        const prevVal = prev[f.key] ? parseFloat(prev[f.key]!) : null;
                        const lastVal = last[f.key] ? parseFloat(last[f.key]!) : null;
                        const diff = (prevVal && lastVal) ? (lastVal - prevVal).toFixed(1) : null;
                        const diffColor = diff && parseFloat(diff) < 0 ? "text-green-600" : diff && parseFloat(diff) > 0 ? "text-red-600" : "text-muted-foreground";
                        return (
                          <div key={f.key} className="bg-muted/50 rounded-lg p-3 space-y-2 min-w-0 overflow-hidden">
                            <p className="text-xs font-semibold text-muted-foreground truncate">{f.label}</p>
                            <div className="flex justify-between items-center gap-2 min-w-0">
                              <div className="text-left min-w-0">
                                <p className="text-xs text-muted-foreground truncate">{fmtDate(sorted[1].date)}</p>
                                <p className="text-sm font-semibold truncate">{fmtNum(prev[f.key])}</p>
                              </div>
                              <div className="text-right min-w-0">
                                <p className="text-xs text-muted-foreground truncate">{fmtDate(sorted[0].date)}</p>
                                <p className="text-sm font-semibold truncate">{fmtNum(last[f.key])}</p>
                              </div>
                            </div>
                            {diff && <p className={`text-xs font-semibold text-center truncate ${diffColor}`}>{parseFloat(diff) > 0 ? "+" : ""}{diff} cm</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4">
                    <h3 className="text-sm font-semibold mb-4">Gráfico Comparativo</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={fields.map((f) => ({
                        name: f.label,
                        [fmtDate(sorted[1].date)]: prev[f.key] ? parseFloat(prev[f.key]!) : undefined,
                        [fmtDate(sorted[0].date)]: last[f.key] ? parseFloat(last[f.key]!) : undefined,
                      }))} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey={fmtDate(sorted[1].date)} fill="#93c5fd" radius={[0, 4, 4, 0]} />
                        <Bar dataKey={fmtDate(sorted[0].date)} fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })()}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Exame" : "Novo Exame"}</DialogTitle>
            <DialogDescription>
              Preencha os campos disponíveis. Todos são opcionais — salve com os dados que tiver.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div>
              <Label className="text-sm font-medium">Data *</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Composição Corporal</p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { key: "weight", label: "Peso Total (kg)" },
                  { key: "muscleMass", label: "Massa Muscular (kg)" },
                  { key: "musclePct", label: "% Massa Muscular" },
                  { key: "bodyFatPct", label: "% Gordura Corporal" },
                  { key: "visceralFat", label: "Gordura Visceral" },
                ] as { key: keyof typeof form; label: string }[]).map(({ key, label }) => (
                  <div key={key}>
                    <Label className="text-xs text-muted-foreground">{label}</Label>
                    <Input type="number" step="0.1" placeholder="—"
                      value={String(form[key] ?? "")}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="mt-1 h-9" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                <Ruler className="w-3 h-3" /> Perimetria (cm)
              </p>
              <div className="grid grid-cols-2 gap-3">
                {PERIMETRIA_FIELDS.map(({ key, label }) => (
                  <div key={key}>
                    <Label className="text-xs text-muted-foreground">{label}</Label>
                    <Input type="number" step="0.1" placeholder="—"
                      value={form.perimetria[key] ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, perimetria: { ...f.perimetria, [key]: e.target.value || undefined } }))}
                      className="mt-1 h-9" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Dobras Cutâneas (mm)
              </p>
              <div className="grid grid-cols-2 gap-3">
                {DOBRAS_FIELDS.map(({ key, label }) => (
                  <div key={key}>
                    <Label className="text-xs text-muted-foreground">{label}</Label>
                    <Input type="number" step="0.1" placeholder="—"
                      value={form.dobras[key] ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, dobras: { ...f.dobras, [key]: e.target.value || undefined } }))}
                      className="mt-1 h-9" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                <ImageIcon className="w-3 h-3" /> Imagem do Laudo
              </p>
              {form.imagePreview && (
                <img src={form.imagePreview} alt="Preview" className="rounded-lg max-h-40 object-contain border border-border mb-2" />
              )}
              <Button variant="outline" size="sm" type="button" onClick={() => fileRef.current?.click()} className="gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" /> {form.imagePreview ? "Trocar imagem" : "Adicionar imagem"}
              </Button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Observações</Label>
              <Textarea placeholder="Anotações sobre o exame..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="mt-1 resize-none" rows={3} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={isPending || !form.date}>
                {isPending ? "Salvando..." : editId ? "Atualizar" : "Salvar Exame"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
