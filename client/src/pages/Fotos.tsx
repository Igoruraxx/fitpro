import { trpc } from "@/lib/trpc";
import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, ImageIcon, Trash2, Filter, X, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PHOTO_TYPE_LABELS: Record<string, string> = {
  front: "Frente",
  back: "Costas",
  side_left: "Lateral Esq.",
  side_right: "Lateral Dir.",
  other: "Outro",
};

function PhotoSkeleton() {
  return (
    <div className="aspect-[3/4] rounded-xl overflow-hidden">
      <Skeleton className="w-full h-full" />
    </div>
  );
}

export default function Fotos() {
  const [filterClientId, setFilterClientId] = useState<string>("all");
  const [showUpload, setShowUpload] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [lightbox, setLightbox] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Upload form
  const [uploadClientId, setUploadClientId] = useState<string>("");
  const [uploadType, setUploadType] = useState("front");
  const [uploadDate, setUploadDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [uploadNotes, setUploadNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: clients = [] } = trpc.clients.list.useQuery();
  const { data: photos = [], isLoading, refetch } = trpc.photos.listAll.useQuery({
    clientId: filterClientId !== "all" ? parseInt(filterClientId) : undefined,
  });

  const uploadMutation = trpc.photos.upload.useMutation({
    onSuccess: () => {
      toast.success("Foto enviada com sucesso!");
      refetch();
      setShowUpload(false);
      resetUploadForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.photos.delete.useMutation({
    onSuccess: () => {
      toast.success("Foto excluída!");
      refetch();
      setDeleteTarget(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const resetUploadForm = () => {
    setUploadClientId("");
    setUploadType("front");
    setUploadDate(format(new Date(), "yyyy-MM-dd"));
    setUploadNotes("");
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione apenas arquivos de imagem.");
      return;
    }
    if (file.size > 16 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 16MB.");
      return;
    }
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, []);

  const handleUpload = async () => {
    if (!selectedFile || !uploadClientId) {
      toast.error("Selecione um aluno e uma foto.");
      return;
    }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = (e.target?.result as string).split(",")[1];
        uploadMutation.mutate({
          clientId: parseInt(uploadClientId),
          photoType: uploadType as any,
          date: uploadDate,
          notes: uploadNotes || undefined,
          fileBase64: base64,
          fileName: selectedFile.name,
          mimeType: selectedFile.type,
        });
        setUploading(false);
      };
      reader.readAsDataURL(selectedFile);
    } catch {
      setUploading(false);
      toast.error("Erro ao processar imagem.");
    }
  };

  const getClientName = (clientId: number) => {
    const c = clients.find((cl: any) => cl.id === clientId);
    return c?.name || "Aluno";
  };

  return (
    <div className="space-y-4 p-4 md:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Fotos de Progresso</h2>
          <p className="text-sm text-muted-foreground">{photos.length} foto{photos.length !== 1 ? "s" : ""} registrada{photos.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setShowUpload(true)}>
          <Upload className="h-4 w-4 mr-2" /> Adicionar Foto
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        <Select value={filterClientId} onValueChange={setFilterClientId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por aluno" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os alunos</SelectItem>
            {clients.map((c: any) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filterClientId !== "all" && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFilterClientId("all")}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Gallery grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => <PhotoSkeleton key={i} />)}
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ImageIcon className="h-16 w-16 text-muted-foreground/20 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">Nenhuma foto registrada</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            {filterClientId !== "all" ? "Este aluno não tem fotos ainda." : "Adicione fotos de progresso dos seus alunos."}
          </p>
          <Button className="mt-4" onClick={() => setShowUpload(true)}>
            <Upload className="h-4 w-4 mr-2" /> Adicionar Foto
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((photo: any) => (
            <div
              key={photo.id}
              className="relative aspect-[3/4] rounded-xl overflow-hidden group cursor-pointer border border-border"
              onClick={() => setLightbox(photo)}
            >
              <img
                src={photo.photoUrl}
                alt={`Foto de ${getClientName(photo.clientId)}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white text-xs font-semibold truncate">{getClientName(photo.clientId)}</p>
                  <p className="text-white/70 text-[10px]">{PHOTO_TYPE_LABELS[photo.photoType] || photo.photoType}</p>
                  <p className="text-white/60 text-[10px]">
                    {format(new Date(photo.date), "d MMM yyyy", { locale: ptBR })}
                  </p>
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
      )}

      {/* Upload Modal */}
      <Dialog open={showUpload} onOpenChange={(v) => { setShowUpload(v); if (!v) resetUploadForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Foto de Progresso</DialogTitle>
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de foto</Label>
                <Select value={uploadType} onValueChange={setUploadType}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="front">Frente</SelectItem>
                    <SelectItem value="back">Costas</SelectItem>
                    <SelectItem value="side_left">Lateral Esq.</SelectItem>
                    <SelectItem value="side_right">Lateral Dir.</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data</Label>
                <Input
                  type="date"
                  className="mt-1"
                  value={uploadDate}
                  onChange={(e) => setUploadDate(e.target.value)}
                />
              </div>
            </div>

            {/* Drop zone */}
            <div
              className={`relative border-2 border-dashed rounded-xl transition-colors ${
                isDragging
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
              />
              {previewUrl ? (
                <div className="relative">
                  <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
                  <button
                    className="absolute top-2 right-2 p-1 rounded-full bg-black/50 hover:bg-black/70"
                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setPreviewUrl(null); }}
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 cursor-pointer">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Clique ou arraste uma foto</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP · Máx. 16MB</p>
                </div>
              )}
            </div>

            <div>
              <Label>Observações</Label>
              <Input
                className="mt-1"
                placeholder="Notas opcionais..."
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowUpload(false)}>Cancelar</Button>
              <Button
                className="flex-1"
                onClick={handleUpload}
                disabled={!selectedFile || !uploadClientId || uploading || uploadMutation.isPending}
              >
                {uploading || uploadMutation.isPending ? "Enviando..." : "Salvar Foto"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X className="h-5 w-5 text-white" />
          </button>
          <div className="max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightbox.photoUrl}
              alt="Foto de progresso"
              className="w-full rounded-xl object-contain max-h-[70vh]"
            />
            <div className="mt-3 text-center">
              <p className="text-white font-semibold">{getClientName(lightbox.clientId)}</p>
              <p className="text-white/60 text-sm">
                {PHOTO_TYPE_LABELS[lightbox.photoType]} · {format(new Date(lightbox.date), "d 'de' MMMM yyyy", { locale: ptBR })}
              </p>
              {lightbox.notes && <p className="text-white/50 text-xs mt-1">{lightbox.notes}</p>}
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
