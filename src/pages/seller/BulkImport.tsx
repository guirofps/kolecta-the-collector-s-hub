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
import type { ImportJob } from '@/lib/api';
import {
  gerarTemplateCsv, lerCsv, validarPlanilha, COLUNAS,
  type ResultadoValidacao,
} from '@/lib/import-listing';

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
          <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-sm text-green-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {job.processedRows} anúncio(s) importado(s). Quem veio sem foto ficou como <strong>rascunho</strong>, esperando as imagens.
          </div>
        )}

        {job.status !== 'processing' && (
          <div className="flex flex-wrap gap-2 pt-1">
            {job.processedRows > 0 && (
              <Button variant="kolecta" asChild>
                <Link to="/painel/anuncios/fotos">Anexar as fotos agora</Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to="/painel/anuncios">Ver meus anúncios</Link>
            </Button>
            <Button variant="ghost" onClick={() => window.location.reload()}>
              Nova importação
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function BulkImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  // Arquivo conferido e aguardando o envio. Só sai daqui para o servidor
  // quando a planilha estiver sem erro.
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [conferencia, setConferencia] = useState<ResultadoValidacao | null>(null);

  const importMutation = useBulkImport();
  const { data: job } = useImportJobStatus(jobId);

  function limpar() {
    setFileError(null);
    setArquivo(null);
    setConferencia(null);
  }

  /**
   * Confere a planilha ANTES de enviar.
   *
   * O modelo antigo não pedia categoria, fotos nem dados de frete, e o vendedor
   * só descobria o estrago depois de centenas de anúncios publicados errados.
   * Agora o erro aparece na tela, com o número da linha, antes de qualquer
   * anúncio ser criado.
   */
  async function conferirArquivo(file: File) {
    limpar();

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext ?? '')) {
      setFileError('Formato inválido. Envie um arquivo .csv, .xlsx ou .xls');
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setFileError(`O arquivo excede o limite de ${MAX_MB}MB`);
      return;
    }

    // Só dá para conferir CSV aqui: ler XLSX no navegador exigiria uma
    // biblioteca pesada. Pedimos CSV para a conferência acontecer.
    if (ext !== 'csv') {
      setFileError(
        'Envie em CSV para conferirmos a planilha antes de subir. '
        + 'No Excel: Arquivo > Salvar como > CSV UTF-8.',
      );
      return;
    }

    try {
      const texto = await file.text();
      const linhas = lerCsv(texto);
      if (linhas.length === 0) {
        setFileError('A planilha está vazia ou o cabeçalho não foi reconhecido.');
        return;
      }
      setArquivo(file);
      setConferencia(validarPlanilha(linhas));
    } catch {
      setFileError('Não foi possível ler o arquivo. Confira se é um CSV válido.');
    }
  }

  function enviar() {
    if (!arquivo || !conferencia || conferencia.erros.length > 0) return;
    importMutation.mutate(arquivo, {
      onSuccess: (data) => setJobId(data.id),
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) conferirArquivo(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) conferirArquivo(file);
  }

  /**
   * Modelo gerado aqui, não baixado do backend: o do servidor está com o
   * vocabulário antigo de condição e sem as colunas obrigatórias.
   */
  function downloadTemplate() {
    const blob = new Blob([gerarTemplateCsv()], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kolecta-modelo-anuncios.csv';
    a.click();
    URL.revokeObjectURL(url);
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
            <p className="text-sm text-muted-foreground">
              Baixe o modelo, preencha e envie. Conferimos a planilha antes de criar qualquer anúncio.
            </p>
          </div>
        </div>

        {/* Como funciona: o passo a passo mora aqui, na tela onde a pessoa age.
            Página de tutorial separada quase ninguém abre. */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <p className="mb-3 text-sm font-medium">Como funciona, em 4 passos</p>
            <ol className="space-y-2.5">
              {[
                <>Baixe o modelo e preencha <strong>uma linha por produto</strong> (título, categoria, preço, peso e medidas). A foto é opcional aqui.</>,
                <>Opcional, mas recomendado: preencha o <strong>SKU</strong> de cada produto e nomeie as fotos com ele, tipo <code className="rounded bg-muted px-1 text-primary">SKU-1.jpg</code>, <code className="rounded bg-muted px-1 text-primary">SKU-2.jpg</code>. Assim elas encaixam sozinhas depois.</>,
                <>Envie a planilha. A gente <strong>confere tudo antes</strong> de criar. Quem vier sem foto fica como rascunho.</>,
                <>Na tela seguinte, <strong>solte todas as fotos de uma vez</strong>: nós hospedamos e casamos por SKU. O que não casar, você encaixa tocando. Depois é só enviar para análise.</>,
              ].map((texto, i) => (
                <li key={i} className="flex gap-3 text-xs text-muted-foreground">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{texto}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 rounded-md bg-background/60 p-2.5 text-[11px] text-muted-foreground">
              Você <strong>não precisa hospedar as fotos</strong> em lugar nenhum, nós cuidamos disso. E não precisa usar SKU: sem ele, você encaixa as fotos na mão, é rápido.
            </p>
          </CardContent>
        </Card>

        {/* Modelo */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm font-medium">Planilha modelo</p>
                  <p className="text-xs text-muted-foreground">
                    Já vem com as colunas certas e uma linha de exemplo
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Baixar modelo
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Colunas, direto da fonte única: o que muda em lib/import-listing
            aparece aqui e vai no modelo, sem chance de divergirem. */}
        <div className="rounded-lg border border-border p-4">
          <p className="mb-3 text-xs font-medium text-foreground">
            Colunas da planilha
            <span className="ml-2 font-normal text-muted-foreground">
              (<span className="text-destructive">*</span> obrigatória)
            </span>
          </p>
          <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {COLUNAS.map((c) => (
              <div key={c.chave} className="text-xs">
                <code className={c.obrigatoria ? 'text-primary' : 'text-muted-foreground'}>
                  {c.chave}
                </code>
                {c.obrigatoria && <span className="text-destructive"> *</span>}
                <span className="text-muted-foreground"> {c.ajuda}</span>
              </div>
            ))}
          </div>
        </div>

        {job ? (
          <ProgressCard job={job} />
        ) : conferencia ? (
          /* Conferência: o vendedor vê o que está errado ANTES de qualquer
             anúncio ser criado, com o número da linha do Excel. */
          <Card className={conferencia.erros.length > 0 ? 'border-destructive/40' : 'border-green-500/40'}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {conferencia.erros.length > 0 ? 'Corrija a planilha antes de subir' : 'Planilha conferida'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-secondary p-3">
                  <p className="text-2xl font-bold">{conferencia.totalLinhas}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Linhas</p>
                </div>
                <div className="rounded-lg bg-green-500/10 p-3">
                  <p className="text-2xl font-bold text-green-400">{conferencia.validas}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Prontas</p>
                </div>
                <div className="rounded-lg bg-red-500/10 p-3">
                  <p className="text-2xl font-bold text-red-400">
                    {conferencia.totalLinhas - conferencia.validas}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Com erro</p>
                </div>
              </div>

              {conferencia.erros.length > 0 && (
                <div className="max-h-64 space-y-1 overflow-y-auto">
                  {conferencia.erros.map((e, i) => (
                    <div key={i} className="flex items-start gap-2 rounded bg-red-500/5 p-2 text-xs">
                      <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-red-400" />
                      <span>
                        <span className="font-medium">Linha {e.linha}</span>
                        <code className="mx-1 text-muted-foreground">{e.campo}</code>
                        {e.mensagem}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                {conferencia.erros.length === 0 ? (
                  <Button variant="kolecta" onClick={enviar} disabled={importMutation.isPending}>
                    {importMutation.isPending
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando…</>
                      : <>Importar {conferencia.validas} anúncios</>}
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Corrija as linhas acima na sua planilha e envie de novo. Nenhum anúncio foi criado.
                  </p>
                )}
                <Button variant="outline" onClick={limpar} disabled={importMutation.isPending}>
                  Escolher outro arquivo
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div
            className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
              dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
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
            <div className="flex flex-col items-center gap-3">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium">Arraste ou clique para selecionar</p>
                <p className="mt-1 text-sm text-muted-foreground">CSV, até {MAX_MB}MB</p>
              </div>
            </div>
          </div>
        )}

        {fileError && (
          <div className="flex items-start gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {fileError}
          </div>
        )}
      </div>
    </SellerLayout>
  );
}
