import { trpc } from "@/lib/trpc";
import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageComparator } from "@/components/ImageComparator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Upload, ImageIcon, Trash2, X, ZoomIn, GitCompare, Users, Loader2, ArrowDown, Lock } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { compressImage, formatBytes } from "@/lib/imageCompressor";

const PHOTO_TYPES = [
  { value: "front", label: "Frente" },
  { value: "side", label: "Lado" },
  { value: "back", label: "Costas" },
  { value: "other", label: "Outro" },
];

const PHOTO_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  PHOTO_TYPES.map(t => [t.value, t.label])
);

// Multi-upload slot: one per photo type
interface UploadSlot {
  type: string;
  file: File | null;           // compressed file
  preview: string | null;      // data URL from compressor
  originalSize: number | null;
  compressedSize: number | null;
  savingsPercent: number | null;
  compressing: boolean;
}

function PhotoSkeleton() {
  return (
    <div className="aspect-[3/4] rounded-xl overflow-hidden">
      <Skeleton className="w-full h-full" />
    </div>
  );
}

const emptySlot = (type: string): UploadSlot => ({
  type,
  file: null,
  preview: null,
  originalSize: null,
  compressedSize: null,
  savingsPercent: null,
  compressing: false,
});

export default function Fotos() {
  const [filterClientId, setFilterClientId] = useState<string>("");
  const [mode, setMode] = useState<"gallery" | "compare">("gallery");
  const [showUpload, setShowUpload] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [lightbox, setLightbox] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeSlotIdx, setActiveSlotIdx] = useState(0);

  // Upload form
  const [uploadClientId, setUploadClientId] = useState<string>("");
  const [uploadDate, setUploadDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Single upload slot
  const [slots, setSlots] = useState<UploadSlot[]>([
    emptySlot("front"),
  ]);

  // Compare mode state
  const [compareDate1, setCompareDate1] = useState<string>("");
  const [compareDate2, setCompareDate2] = useState<string>("");
  const [compareType, setCompareType] = useState<string>("front");

  // Batch delete state
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<number>>(new Set());
  const [showDeleteByDate, setShowDeleteByDate] = useState(false);
  const [deleteBeforeDate, setDeleteBeforeDate] = useState<string>("");
  const [showConfirmDeleteByDate, setShowConfirmDeleteByDate] = useState(false);
  const [photosToDeleteCount, setPhotosToDeleteCount] = useState(0);

  const utils = trpc.useUtils();
  const { data: clients = [] } = trpc.clients.list.useQuery();

  // Only load photos when a client is selected
  const { data: photos = [], isLoading } = trpc.photos.listAll.useQuery(
    { clientId: filterClientId ? parseInt(filterClientId) : undefined },
    { enabled: !!filterClientId }
  );

  const uploadMutation = trpc.photos.upload.useMutation({
    onSuccess: () => {
      utils.photos.listAll.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.photos.delete.useMutation({
    onSuccess: () => {
      toast.success("Foto excluída!");
      utils.photos.listAll.invalidate();
      setDeleteTarget(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const resetUploadForm = () => {
    setUploadClientId("");
    setUploadDate(format(new Date(), "yyyy-MM-dd"));
    setUploadNotes("");
    setSlots([emptySlot("front")]);
  };

  const handleFileSelect = useCallback(async (file: File, slotIdx: number) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione apenas arquivos de imagem.");
      return;
    }
    if (file.size > 16 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 16MB.");
      return;
    }

    // Mark slot as compressing
    setSlots(prev => prev.map((s, i) =>
      i === slotIdx ? { ...s, compressing: true, file: null, preview: null } : s
    ));

    try {
      const result = await compressImage(file, {
        maxDimension: 1200,
        quality: 0.82,
        outputType: "image/jpeg",
      });

      setSlots(prev => prev.map((s, i) =>
        i === slotIdx
          ? {
              ...s,
              compressing: false,
              file: result.file,
              preview: result.dataUrl,
              originalSize: result.originalSize,
              compressedSize: result.compressedSize,
              savingsPercent: result.savingsPercent,
            }
          : s
      ));
    } catch (err) {
      toast.error("Erro ao processar a imagem. Tente novamente.");
      setSlots(prev => prev.map((s, i) =>
        i === slotIdx ? { ...emptySlot(s.type) } : s
      ));
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, slotIdx: number) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file, slotIdx);
  }, [handleFileSelect]);

  const handleUpload = async () => {
    const filledSlots = slots.filter(s => s.file !== null);
    if (!uploadClientId || filledSlots.length === 0) {
      toast.error("Selecione um aluno e pelo menos uma foto.");
      return;
    }
    setUploading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const slot of filledSlots) {
      if (!slot.file) continue;
      try {
        // Use the already-compressed preview dataUrl directly (no extra FileReader needed)
        const base64 = slot.preview!.split(",")[1];
        await uploadMutation.mutateAsync({
          clientId: parseInt(uploadClientId),
          photoType: slot.type as any,
          date: uploadDate,
          notes: uploadNotes || undefined,
          fileBase64: base64,
          fileName: slot.file.name,
          mimeType: slot.file.type,
        });
        successCount++;
      } catch {
        errorCount++;
      }
    }

    setUploading(false);
    if (successCount > 0) toast.success(`${successCount} foto${successCount > 1 ? "s" : ""} enviada${successCount > 1 ? "s" : ""} com sucesso!`);
    if (errorCount > 0) toast.error(`${errorCount} foto${errorCount > 1 ? "s" : ""} não puderam ser enviadas.`);
    if (successCount > 0) {
      setShowUpload(false);
      resetUploadForm();
      setFilterClientId(uploadClientId);
    }
  };

  const getClientName = (clientId: number) => {
    const c = clients.find((cl: any) => cl.id === clientId);
    return c?.name || "Aluno";
  };

  const formatDate = (dateStr: string) => {
    try { return format(parseISO(dateStr), "d MMM yyyy", { locale: ptBR }); }
    catch { return dateStr; }
  };

  // Get unique dates for compare mode
  const uniqueDates = Array.from(new Set(photos.map((p: any) => p.date as string))).sort().reverse();

  // Photos for compare mode
  const comparePhotos1 = photos.filter((p: any) => p.date === compareDate1 && p.photoType === compareType);
  const comparePhotos2 = photos.filter((p: any) => p.date === compareDate2 && p.photoType === compareType);

  const selectedClient = clients.find((c: any) => String(c.id) === filterClientId);

  // Total compression savings for current upload
  const totalOriginal = slots.reduce((sum, s) => sum + (s.originalSize ?? 0), 0);
  const totalCompressed = slots.reduce((sum, s) => sum + (s.compressedSize ?? 0), 0);
  const hasCompressedSlots = slots.some(s => s.compressedSize !== null);

  return (
    <div className="space-y-4 p-4 md:p-0">
          {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Fotos de Progresso</h2>
          <p className="text-xs text-muted-foreground">
            {filterClientId
              ? `${photos.length} foto${photos.length !== 1 ? "s" : ""} de ${selectedClient?.name || "aluno"}`
              : "Selecione um aluno"}</p>
        </div>
        <Button onClick={() => setShowUpload(true)} size="sm">
          <Upload className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>

      {/* Client selector */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={filterClientId} onValueChange={(v) => { setFilterClientId(v); setMode("gallery"); }}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Selecione um aluno" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c: any) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filterClientId && (
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { setFilterClientId(""); setMode("gallery"); }}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {filterClientId && photos.length > 0 && (
          <div className="flex flex-col gap-2">
            <Button
              variant={mode === "compare" ? "default" : "outline"}
              size="sm"
              className="w-full"
              onClick={() => setMode(mode === "compare" ? "gallery" : "compare")}
            >
              <GitCompare className="h-4 w-4 mr-2" />
              {mode === "compare" ? "Voltar para Galeria" : "Comparar Fotos"}
            </Button>
            {selectedPhotoIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => {
                  if (confirm(`Tem certeza que deseja apagar ${selectedPhotoIds.size} foto(s)?`)) {
                    selectedPhotoIds.forEach(id => deleteMutation.mutate({ id }));
                    setSelectedPhotoIds(new Set());
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Apagar Selecionadas ({selectedPhotoIds.size})
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowDeleteByDate(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Apagar por Data
            </Button>
          </div>
        )}
      </div>

      {/* No client selected */}
      {!filterClientId && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="h-16 w-16 text-muted-foreground/20 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">Selecione um aluno</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Escolha um aluno acima para visualizar as fotos de progresso.
          </p>
        </div>
      )}

      {/* Gallery mode */}
      {filterClientId && mode === "gallery" && (
        <>
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[...Array(6)].map((_, i) => <PhotoSkeleton key={i} />)}
            </div>
          ) : photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ImageIcon className="h-16 w-16 text-muted-foreground/20 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">Nenhuma foto registrada</h3>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Este aluno ainda não tem fotos de progresso.
              </p>
              <Button className="mt-4" onClick={() => setShowUpload(true)}>
                <Upload className="h-4 w-4 mr-2" /> Adicionar Fotos
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(
                photos.reduce((acc: Record<string, any[]>, photo: any) => {
                  const date = photo.date;
                  if (!acc[date]) acc[date] = [];
                  acc[date].push(photo);
                  return acc;
                }, {})
              )
                .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
                .map(([date, datPhotos]) => (
                  <div key={date} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-semibold text-foreground">{formatDate(date)}</h3>
                      <div className="flex-1 h-px bg-border"></div>
                      <span className="text-xs text-muted-foreground">{datPhotos.length} foto{datPhotos.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {datPhotos.map((photo: any) => (
                        <div
                          key={photo.id}
                          className="relative aspect-[3/4] rounded-xl overflow-hidden group border border-border"
                        >
                          <div className="absolute top-2 left-2 z-10">
                            <Checkbox
                              checked={selectedPhotoIds.has(photo.id)}
                              onCheckedChange={(checked) => {
                                const newSet = new Set(selectedPhotoIds);
                                if (checked) {
                                  newSet.add(photo.id);
                                } else {
                                  newSet.delete(photo.id);
                                }
                                setSelectedPhotoIds(newSet);
                              }}
                              className="bg-white/80"
                            />
                          </div>
                          <img
                            src={photo.photoUrl}
                            alt={`Foto de ${getClientName(photo.clientId)}`}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer"
                            loading="lazy"
                            onClick={() => setLightbox(photo)}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <div className="absolute bottom-0 left-0 right-0 p-3">
                              <p className="text-white text-xs font-semibold">{PHOTO_TYPE_LABELS[photo.photoType] || photo.photoType}</p>
                              <p className="text-white/60 text-[10px]">{formatDate(photo.date)}</p>
                            </div>
                            <div className="absolute top-2 right-2 flex gap-1">
                              <button
                                className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                                onClick={(e) => { e.stopPropagation(); setLightbox(photo); }}
                              >
                                <ZoomIn className="h-3.5 w-3.5 text-white" />
                              </button>
                              <button
                                className="p-1.5 rounded-lg bg-red-500/70 hover:bg-red-500 transition-colors"
                                onClick={(e) => { e.stopPropagation(); setDeleteTarget(photo); }}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-white" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </>
      )}

      {/* Compare mode */}
      {filterClientId && mode === "compare" && (
        <div className="space-y-4">
          <div className="space-y-3 p-4 rounded-xl border border-border bg-card/50">
            {/* Photo type buttons */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Tipo de foto</Label>
              <div className="flex gap-2 flex-wrap">
                {PHOTO_TYPES.map(t => (
                  <Button
                    key={t.value}
                    variant={compareType === t.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCompareType(t.value)}
                    className="text-xs"
                  >
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Date selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Data 1 (antes)</Label>
                <Select value={compareDate1} onValueChange={setCompareDate1}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {uniqueDates.map(d => (
                      <SelectItem key={d} value={d}>{formatDate(d)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Data 2 (depois)</Label>
                <Select value={compareDate2} onValueChange={setCompareDate2}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {uniqueDates.map(d => (
                      <SelectItem key={d} value={d}>{formatDate(d)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {compareDate1 && compareDate2 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="font-medium">{formatDate(compareDate1)}</span>
                <span className="text-muted-foreground/50">→</span>
                <span className="font-medium">{formatDate(compareDate2)}</span>
              </div>
              {comparePhotos1.length > 0 && comparePhotos2.length > 0 ? (
                <ImageComparator
                  beforeImage={comparePhotos1[0].photoUrl}
                  afterImage={comparePhotos2[0].photoUrl}
                  beforeLabel="Antes"
                  afterLabel="Depois"
                />
              ) : (
                <div className="aspect-[3/4] rounded-xl border border-dashed border-border flex items-center justify-center">
                  <p className="text-xs text-muted-foreground text-center px-4">
                    {comparePhotos1.length === 0 && comparePhotos2.length === 0
                      ? `Sem fotos de ${PHOTO_TYPE_LABELS[compareType]} nas datas selecionadas`
                      : comparePhotos1.length === 0
                      ? `Sem foto de ${PHOTO_TYPE_LABELS[compareType]} em ${formatDate(compareDate1)}`
                      : `Sem foto de ${PHOTO_TYPE_LABELS[compareType]} em ${formatDate(compareDate2)}`}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <GitCompare className="h-12 w-12 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">Selecione duas datas para comparar as fotos</p>
            </div>
          )}
        </div>
      )}

      {/* Upload Modal — Multi-upload with compression */}
      <Dialog open={showUpload} onOpenChange={(v) => { setShowUpload(v); if (!v) resetUploadForm(); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Fotos de Progresso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Aluno *</Label>
              <Select value={uploadClientId} onValueChange={setUploadClientId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione o aluno" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Data das fotos</Label>
              <Input
                type="date"
                className="mt-1"
                value={uploadDate}
                onChange={(e) => setUploadDate(e.target.value)}
              />
            </div>

            {/* Multi-slot upload with compression info */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Foto</Label>
                {hasCompressedSlots && totalOriginal > 0 && (
                  <span className="text-xs text-emerald-500 flex items-center gap-1">
                    <ArrowDown className="h-3 w-3" />
                    {formatBytes(totalOriginal)} → {formatBytes(totalCompressed)}
                    {totalOriginal > totalCompressed && (
                      <span className="font-semibold">
                        ({Math.round(((totalOriginal - totalCompressed) / totalOriginal) * 100)}% menor)
                      </span>
                    )}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {slots.map((slot, idx) => (
                  <div key={idx} className="space-y-1">
                    <Select
                      value={slot.type}
                      onValueChange={(v) => setSlots(prev => prev.map((s, i) => i === idx ? { ...s, type: v } : s))}
                    >
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PHOTO_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div
                      className={`relative aspect-[3/4] rounded-lg border-2 border-dashed cursor-pointer transition-colors overflow-hidden ${
                        isDragging && activeSlotIdx === idx
                          ? "border-primary bg-primary/10"
                          : slot.preview
                          ? "border-border"
                          : "border-border/50 hover:border-primary/50 hover:bg-accent/20"
                      }`}
                      onClick={() => { setActiveSlotIdx(idx); fileInputRef.current?.click(); }}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); setActiveSlotIdx(idx); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => handleDrop(e, idx)}
                    >
                      {slot.compressing ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-background/80">
                          <Loader2 className="h-5 w-5 text-primary animate-spin" />
                          <span className="text-[10px] text-muted-foreground">Comprimindo...</span>
                        </div>
                      ) : slot.preview ? (
                        <>
                          <img src={slot.preview} alt="" className="w-full h-full object-cover" />
                          {/* Compression badge */}
                          {slot.savingsPercent !== null && slot.savingsPercent > 0 && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 text-center">
                              <span className="text-[9px] text-emerald-400 font-medium">
                                -{slot.savingsPercent}% · {formatBytes(slot.compressedSize!)}
                              </span>
                            </div>
                          )}
                          <button
                            className="absolute top-1 right-1 p-1 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSlots(prev => prev.map((s, i) => i === idx ? emptySlot(s.type) : s));
                            }}
                          >
                            <X className="h-3 w-3 text-white" />
                          </button>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                          <Upload className="h-5 w-5 text-muted-foreground/50" />
                          <span className="text-[10px] text-muted-foreground/50 text-center px-1">Clique ou arraste</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file, activeSlotIdx);
                  e.target.value = "";
                }}
              />
              <p className="text-[11px] text-muted-foreground mt-2">
                As fotos são comprimidas automaticamente para até 1200px · JPEG 82% — sem perda visual perceptível.
              </p>
            </div>

            <div>
              <Label>Observações (opcional)</Label>
              <Input
                className="mt-1"
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
                placeholder="Notas sobre as fotos..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShowUpload(false); resetUploadForm(); }}>
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleUpload}
                disabled={uploading || !uploadClientId || slots.every(s => !s.file) || slots.some(s => s.compressing)}
              >
                {uploading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
                ) : (
                  `Enviar ${slots.filter(s => s.file).length} foto${slots.filter(s => s.file).length !== 1 ? "s" : ""}`
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {/* Delete by date modal */}
      <Dialog open={showDeleteByDate} onOpenChange={setShowDeleteByDate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apagar Fotos por Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="deleteBeforeDate" className="text-sm">Selecione a data:</Label>
              <Select value={deleteBeforeDate} onValueChange={setDeleteBeforeDate}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Escolha uma data..." />
                </SelectTrigger>
                <SelectContent>
                  {uniqueDates.map((date) => (
                    <SelectItem key={date} value={date}>
                      {formatDate(date)} ({photos.filter((p: any) => p.date === date).length} foto(s))
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              {deleteBeforeDate && (
                <>
                  {photos.filter((p: any) => p.date === deleteBeforeDate).length} foto(s) desta data serão apagadas
                </>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDeleteByDate(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={!deleteBeforeDate || photos.filter((p: any) => p.date === deleteBeforeDate).length === 0}
                onClick={() => {
                  const count = photos.filter((p: any) => p.date === deleteBeforeDate).length;
                  setPhotosToDeleteCount(count);
                  setShowConfirmDeleteByDate(true);
                }}
              >
                Apagar {photos.filter((p: any) => p.date === deleteBeforeDate).length}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm delete by date */}
      <AlertDialog open={showConfirmDeleteByDate} onOpenChange={setShowConfirmDeleteByDate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão de fotos</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a apagar <strong>{photosToDeleteCount} foto(s)</strong> de {deleteBeforeDate}. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                const photosToDelete = photos.filter((p: any) => p.date < deleteBeforeDate);
                photosToDelete.forEach((p: any) => deleteMutation.mutate({ id: p.id }));
                setShowConfirmDeleteByDate(false);
                setShowDeleteByDate(false);
                setDeleteBeforeDate("");
                toast.success(`${photosToDeleteCount} foto(s) apagada(s)`);
              }}
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              className="absolute -top-10 right-0 text-white/70 hover:text-white transition-colors"
              onClick={() => setLightbox(null)}
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={lightbox.photoUrl}
              alt="Foto em tamanho completo"
              className="w-full rounded-xl object-contain max-h-[80vh]"
            />
            <div className="mt-3 text-center">
              <p className="text-white font-medium">{getClientName(lightbox.clientId)}</p>
              <p className="text-white/60 text-sm">
                {PHOTO_TYPE_LABELS[lightbox.photoType]} · {formatDate(lightbox.date)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir foto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate({ id: deleteTarget.id })}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
