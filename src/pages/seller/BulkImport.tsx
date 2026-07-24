import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  AlertCircle,
  Download,
  ArrowLeft,
} from 'lucide-react';
import SellerLayout from '@/components/layout/SellerLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useBulkImport, useImportJobStatus } from '@/hooks/use-api';
import { api } from '@/lib/api';
import type { ImportJob } from '@/lib/api';

const ACCEPTED = '.csv,.xlsx,.xls';
const MAX_MB = 5;

function StatusBadge({ status }: { status: ImportJob['status'] }) {
  const map = {
    processing: { label: 'Processando…', cls: 'bg-primary/10 text-primary' },
    completed: { label: 'Concluído', cls: 'bg-green-500/10 text-green-400' },
    completed_with_errors: { label: 'Parcial', cls: 'bg-yellow-500/10 text-yellow-400' },
    failed: { label: 'Falhou', cls: 'bg-red-500/10 text-red-400' },
  };
  const { label, cls } = map[status] ?? map.processing;
  return <Badge className={cls}>{label}</Badge>;
}

function ProgressCard({ job }: { job: ImportJob }) {
  const pct = job.totalRows > 0 ? Math.round(((job.processedRows + job.failedRows) / job.totalRows) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Resultado da importação</CardTitle>
          <StatusBadge status={job.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {job.status === 'processing' && (
          <div className="space-y-2">
            <Progress value={pct} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">{pct}%</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-secondary p-3">
            <p className="text-2xl font-bold">{job.totalRows}</p>
            <p className="text-xs text-muted-foreground mt-1">Total</p>
          </div>
          <div className="rounded-lg bg-green-500/10 p-3">
            <p className="text-2xl font-bold text-green-400">{job.processedRows}</p>
            <p className="text-xs text-muted-foreground mt-1">Importados</p>
          </div>
          <div className="rounded-lg bg-red-500/10 p-3">
            <p className="text-2xl font-bold text-red-400">{job.failedRows}</p>
            <p className="text-xs text-muted-foreground mt-1">Falhas</p>
          </div>
        </div>

        {job.errors && job.errors.length > 0 && (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            <p className="text-xs font-medium text-muted-foreground mb-2">Erros por linha:</p>
            {job.errors.map((e, i) => (
              <div key={i} className="flex items-start gap-2 text-xs bg-red-500/5 rounded p-2">
                <XCircle className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />
                <span>
                  <span className="font-medium">Linha {e.row}:</span> {e.error}
                </span>
              </div>
            ))}
          </div>
        )}

        {job.status !== 'processing' && job.processedRows > 0 && (
          <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 rounded-lg p-3">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {job.processedRows} anúncio(s) criado(s) com status <strong>Em Análise</strong>.
          </div>
        )}

        {job.status !== 'processing' && (
          <div className="flex gap-2 pt-1">
            <Button variant="kolecta" asChild>
              <Link to="/painel/anuncios">Ver meus anúncios</Link>
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Nova importação
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Importação suspensa: o modelo de planilha gera anúncio incompleto, sem passar
// pelas mesmas validações do formulário (fotos, campos obrigatórios da
// categoria). O que já entrou por aqui vai precisar de correção, e deixar a
// porta aberta só aumenta o retrabalho do vendedor.
//
// A estrutura inteira fica de pé: rota, tela, hooks e endpoint. Para reativar,
// basta voltar esta constante para `false` e devolver o botão em seller/Listings.
const IMPORTACAO_SUSPENSA = true;

export default function BulkImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const importMutation = useBulkImport();
  const { data: job } = useImportJobStatus(jobId);

  function validateAndUpload(file: File) {
    // Trava de verdade, não só visual: cobre arrastar arquivo na tela e
    // qualquer input que sobre depois de esconder a área de envio.
    if (IMPORTACAO_SUSPENSA) return;
    setFileError(null);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext ?? '')) {
      setFileError('Formato inválido. Envie um arquivo .csv, .xlsx ou .xls');
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setFileError(`O arquivo excede o limite de ${MAX_MB}MB`);
      return;
    }

    importMutation.mutate(file, {
      onSuccess: (data) => setJobId(data.id),
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) validateAndUpload(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndUpload(file);
  }

  async function downloadTemplate() {
    const res = await api.listings.getImportTemplate();
    const a = document.createElement('a');
    a.href = res.templateUrl;
    a.download = 'kolecta_template.csv';
    a.click();
  }

  return (
    <SellerLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/painel/anuncios">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Importar Anúncios</h1>
            <p className="text-sm text-muted-foreground">Envie uma planilha CSV ou XLSX para criar vários anúncios de uma vez</p>
          </div>
        </div>

        {/* Quem tiver a URL salva cai aqui direto, sem passar pelo botão. */}
        {IMPORTACAO_SUSPENSA && (
          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="flex items-start gap-3 p-5">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <div>
                <p className="font-heading font-bold">Importação temporariamente indisponível</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Estamos refazendo o modelo de planilha. Os anúncios criados por
                  importação estavam saindo incompletos, e preferimos pausar a
                  reimportar tudo depois.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Enquanto isso, publique pelo formulário: ele valida cada campo e
                  o anúncio já sai pronto para a moderação.
                </p>
                <Button variant="kolecta" size="sm" className="mt-4" asChild>
                  <Link to="/painel/anuncios/novo">Criar anúncio</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Template download */}
        {!IMPORTACAO_SUSPENSA && (
        <>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm font-medium">Planilha modelo</p>
                  <p className="text-xs text-muted-foreground">Baixe e preencha com seus produtos</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Baixar template
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Colunas aceitas */}
        <div className="text-xs text-muted-foreground space-y-1 px-1">
          <p className="font-medium text-foreground">Colunas da planilha:</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            <span><code className="text-primary">title</code>: obrigatório</span>
            <span><code className="text-primary">price</code>: obrigatório (ex: 150.00)</span>
            <span><code className="text-primary">condition</code>: obrigatório</span>
            <span><code className="text-muted-foreground">description</code>: opcional</span>
            <span><code className="text-muted-foreground">images</code>: URLs separadas por vírgula</span>
            <span><code className="text-muted-foreground">brand / line / scale / year / edition</code></span>
          </div>
          {/* ATENÇÃO ao reativar: este vocabulário está DESATUALIZADO. O sistema
              hoje grava novo-lacrado, novo-sem-caixa, usado-conservado e
              usado-com-marcas (ver lib/conditions). Era por isso que todo
              anúncio importado nascia com condição inválida. */}
          <p className="mt-1">Condições válidas: <code>lacrado, novo, mint, usado</code></p>
        </div>
        </>
        )}

        {/* Upload zone ou resultado */}
        {!IMPORTACAO_SUSPENSA && (job ? (
          <ProgressCard job={job} />
        ) : (
          <div
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            } ${importMutation.isPending ? 'pointer-events-none opacity-60' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={handleFileChange}
            />
            {importMutation.isPending ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Enviando arquivo…</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload className="h-10 w-10 text-muted-foreground" />
                <div>
                  <p className="font-medium">Arraste ou clique para selecionar</p>
                  <p className="text-sm text-muted-foreground mt-1">CSV, XLSX ou XLS — máx. {MAX_MB}MB</p>
                </div>
              </div>
            )}
          </div>
        ))}

        {fileError && (
          <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 rounded-lg p-3">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {fileError}
          </div>
        )}
      </div>
    </SellerLayout>
  );
}
