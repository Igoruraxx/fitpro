import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Plus, Ruler, Trash2, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function Evolucao() {
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [showModal, setShowModal] = useState(false);

  // Form
  const [formDate, setFormDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formWeight, setFormWeight] = useState("");
  const [formHeight, setFormHeight] = useState("");
  const [formBodyFat, setFormBodyFat] = useState("");
  const [formChest, setFormChest] = useState("");
  const [formWaist, setFormWaist] = useState("");
  const [formHips, setFormHips] = useState("");
  const [formLeftArm, setFormLeftArm] = useState("");
  const [formRightArm, setFormRightArm] = useState("");
  const [formLeftThigh, setFormLeftThigh] = useState("");
  const [formRightThigh, setFormRightThigh] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const { data: clients = [] } = trpc.clients.list.useQuery();
  const clientId = selectedClientId ? parseInt(selectedClientId) : 0;

  const { data: measurements = [], refetch } = trpc.evolution.measurements.list.useQuery(
    { clientId },
    { enabled: clientId > 0 }
  );

  const createMutation = trpc.evolution.measurements.create.useMutation({
    onSuccess: () => { toast.success("Medidas registradas!"); refetch(); setShowModal(false); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.evolution.measurements.delete.useMutation({
    onSuccess: () => { toast.success("Registro excluído!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const chartData = useMemo(() => {
    return [...measurements].reverse().map((m: any) => ({
      date: format(new Date(m.date), "dd/MM"),
      peso: m.weight ? parseFloat(m.weight) : null,
      gordura: m.bodyFat ? parseFloat(m.bodyFat) : null,
    }));
  }, [measurements]);

  const openNew = () => {
    setFormDate(format(new Date(), "yyyy-MM-dd"));
    setFormWeight(""); setFormHeight(""); setFormBodyFat("");
    setFormChest(""); setFormWaist(""); setFormHips("");
    setFormLeftArm(""); setFormRightArm("");
    setFormLeftThigh(""); setFormRightThigh(""); setFormNotes("");
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!clientId) { toast.error("Selecione um cliente"); return; }
    createMutation.mutate({
      clientId,
      date: formDate,
      weight: formWeight || undefined,
      height: formHeight || undefined,
      bodyFat: formBodyFat || undefined,
      chest: formChest || undefined,
      waist: formWaist || undefined,
      hips: formHips || undefined,
      leftArm: formLeftArm || undefined,
      rightArm: formRightArm || undefined,
      leftThigh: formLeftThigh || undefined,
      rightThigh: formRightThigh || undefined,
      notes: formNotes || undefined,
    });
  };

  const latestM = measurements[0];
  const prevM = measurements[1];
  const getDiff = (field: string) => {
    if (!latestM || !prevM) return null;
    const curr = parseFloat((latestM as any)[field]);
    const prev = parseFloat((prevM as any)[field]);
    if (isNaN(curr) || isNaN(prev)) return null;
    const diff = curr - prev;
    return diff;
  };

  return (
    <div className="space-y-4 p-4 md:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Evolução</h2>
          <p className="text-sm text-muted-foreground">Acompanhe o progresso dos seus clientes</p>
        </div>
        <Button onClick={openNew} disabled={!clientId}>
          <Plus className="h-4 w-4 mr-2" /> Nova Avaliação
        </Button>
      </div>

      {/* Client selector */}
      <div>
        <Label className="text-sm font-medium">Selecione o cliente</Label>
        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Escolha um cliente" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((c: any) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!clientId ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">Selecione um cliente</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">Escolha um cliente para ver sua evolução.</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          {latestM && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Peso", value: (latestM as any).weight, unit: "kg", field: "weight" },
                { label: "% Gordura", value: (latestM as any).bodyFat, unit: "%", field: "bodyFat" },
                { label: "Cintura", value: (latestM as any).waist, unit: "cm", field: "waist" },
              ].map(({ label, value, unit, field }) => {
                const diff = getDiff(field);
                return (
                  <div key={field} className="rounded-xl border border-border bg-card p-3 text-center">
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className="text-xl font-bold text-foreground">{value ? `${value}${unit}` : "-"}</div>
                    {diff !== null && (
                      <div className={`text-xs font-medium ${diff < 0 ? "text-green-400" : diff > 0 ? "text-red-400" : "text-muted-foreground"}`}>
                        {diff > 0 ? "+" : ""}{diff.toFixed(1)}{unit}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Chart */}
          {chartData.length > 1 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Evolução do Peso
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#888" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#888" }} />
                  <Tooltip
                    contentStyle={{ background: "#1a1f3a", border: "1px solid #333", borderRadius: 8 }}
                    labelStyle={{ color: "#888" }}
                  />
                  <Line type="monotone" dataKey="peso" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4, fill: "#3B82F6" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Measurements list */}
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <Ruler className="h-4 w-4 text-primary" /> Histórico de Medidas
            </h3>
            {measurements.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-4 text-center">Nenhuma avaliação registrada</p>
            ) : (
              measurements.map((m: any) => (
                <div key={m.id} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{format(new Date(m.date), "dd/MM/yyyy")}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate({ id: m.id })}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs">
                    {m.weight && <div><span className="text-muted-foreground">Peso:</span> <strong>{m.weight}kg</strong></div>}
                    {m.bodyFat && <div><span className="text-muted-foreground">BF:</span> <strong>{m.bodyFat}%</strong></div>}
                    {m.chest && <div><span className="text-muted-foreground">Peito:</span> <strong>{m.chest}cm</strong></div>}
                    {m.waist && <div><span className="text-muted-foreground">Cintura:</span> <strong>{m.waist}cm</strong></div>}
                    {m.hips && <div><span className="text-muted-foreground">Quadril:</span> <strong>{m.hips}cm</strong></div>}
                    {m.leftArm && <div><span className="text-muted-foreground">Braço E:</span> <strong>{m.leftArm}cm</strong></div>}
                    {m.rightArm && <div><span className="text-muted-foreground">Braço D:</span> <strong>{m.rightArm}cm</strong></div>}
                    {m.leftThigh && <div><span className="text-muted-foreground">Coxa E:</span> <strong>{m.leftThigh}cm</strong></div>}
                    {m.rightThigh && <div><span className="text-muted-foreground">Coxa D:</span> <strong>{m.rightThigh}cm</strong></div>}
                  </div>
                  {m.notes && <p className="text-xs text-muted-foreground mt-2">{m.notes}</p>}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Avaliação</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Data</Label>
              <Input className="mt-1" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Peso (kg)</Label><Input className="mt-1" type="number" step="0.1" value={formWeight} onChange={(e) => setFormWeight(e.target.value)} /></div>
              <div><Label>Altura (cm)</Label><Input className="mt-1" type="number" step="0.1" value={formHeight} onChange={(e) => setFormHeight(e.target.value)} /></div>
            </div>
            <div>
              <Label>% Gordura Corporal</Label>
              <Input className="mt-1" type="number" step="0.1" value={formBodyFat} onChange={(e) => setFormBodyFat(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Peito (cm)</Label><Input className="mt-1" type="number" step="0.1" value={formChest} onChange={(e) => setFormChest(e.target.value)} /></div>
              <div><Label>Cintura (cm)</Label><Input className="mt-1" type="number" step="0.1" value={formWaist} onChange={(e) => setFormWaist(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Quadril (cm)</Label><Input className="mt-1" type="number" step="0.1" value={formHips} onChange={(e) => setFormHips(e.target.value)} /></div>
              <div><Label>Braço Esq (cm)</Label><Input className="mt-1" type="number" step="0.1" value={formLeftArm} onChange={(e) => setFormLeftArm(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Braço Dir (cm)</Label><Input className="mt-1" type="number" step="0.1" value={formRightArm} onChange={(e) => setFormRightArm(e.target.value)} /></div>
              <div><Label>Coxa Esq (cm)</Label><Input className="mt-1" type="number" step="0.1" value={formLeftThigh} onChange={(e) => setFormLeftThigh(e.target.value)} /></div>
            </div>
            <div>
              <Label>Coxa Dir (cm)</Label>
              <Input className="mt-1" type="number" step="0.1" value={formRightThigh} onChange={(e) => setFormRightThigh(e.target.value)} />
            </div>
            <div>
              <Label>Observações</Label>
              <Input className="mt-1" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Notas opcionais..." />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={createMutation.isPending}>Registrar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
