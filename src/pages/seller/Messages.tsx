import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import SellerLayout from '@/components/layout/SellerLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import EmptyState from '@/components/EmptyState';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Search, Send, Paperclip, ArrowLeft, Check, CheckCheck, MessageCircle, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Types ─── */
interface Buyer {
  name: string;
  initials: string;
  online: boolean;
  totalOrders: number;
}

interface Message {
  id: string;
  content: string;
  sender: 'buyer' | 'seller' | 'system';
  createdAt: string;
  read: boolean;
}

interface SellerConversation {
  id: string;
  buyer: Buyer;
  lastMessage: string;
  unreadCount: number;
  updatedAt: string;
  orderId?: string;
  hasDispute?: boolean;
  messages: Message[];
}

/* ─── Mock Data ─── */
const mockSellerConversations: SellerConversation[] = [
  {
    id: 'sc-1',
    buyer: { name: 'Carlos Mendes', initials: 'CM', online: true, totalOrders: 3 },
    lastMessage: 'Recebi o produto, muito obrigado!',
    unreadCount: 1,
    updatedAt: '2025-03-17T14:00:00',
    orderId: 'KL-000123',
    messages: [
      { id: 'sm1', content: 'Olá, quando será enviado meu pedido?', sender: 'buyer', createdAt: '2025-03-16T10:00:00', read: true },
      { id: 'sm2', content: 'Olá Carlos! Será enviado hoje à tarde.', sender: 'seller', createdAt: '2025-03-16T10:15:00', read: true },
      { id: 'sm3', content: 'Pedido #KL-000123 atualizado: Enviado', sender: 'system', createdAt: '2025-03-16T15:00:00', read: true },
      { id: 'sm4', content: 'Produto enviado! Código: BR987654321JP', sender: 'seller', createdAt: '2025-03-16T15:05:00', read: true },
      { id: 'sm5', content: 'Recebi o produto, muito obrigado!', sender: 'buyer', createdAt: '2025-03-17T14:00:00', read: false },
    ],
  },
  {
    id: 'sc-2',
    buyer: { name: 'Ana Souza', initials: 'AS', online: false, totalOrders: 1 },
    lastMessage: 'Preciso abrir uma disputa sobre esse pedido.',
    unreadCount: 3,
    updatedAt: '2025-03-17T11:00:00',
    orderId: 'KL-000145',
    hasDispute: true,
    messages: [
      { id: 'sm6', content: 'O produto chegou com defeito.', sender: 'buyer', createdAt: '2025-03-17T09:00:00', read: true },
      { id: 'sm7', content: 'Sinto muito! Pode enviar fotos do defeito?', sender: 'seller', createdAt: '2025-03-17T09:30:00', read: true },
      { id: 'sm8', content: 'Disputa aberta no pedido #KL-000145', sender: 'system', createdAt: '2025-03-17T10:00:00', read: false },
      { id: 'sm9', content: 'Já enviei as fotos pela disputa.', sender: 'buyer', createdAt: '2025-03-17T10:30:00', read: false },
      { id: 'sm10', content: 'Preciso abrir uma disputa sobre esse pedido.', sender: 'buyer', createdAt: '2025-03-17T11:00:00', read: false },
    ],
  },
  {
    id: 'sc-3',
    buyer: { name: 'Lucas Ferreira', initials: 'LF', online: true, totalOrders: 5 },
    lastMessage: 'Obrigado pela informação!',
    unreadCount: 0,
    updatedAt: '2025-03-15T16:00:00',
    orderId: 'KL-000098',
    messages: [
      { id: 'sm11', content: 'Vocês têm mais unidades do capacete?', sender: 'buyer', createdAt: '2025-03-15T14:00:00', read: true },
      { id: 'sm12', content: 'Temos sim! Está disponível no anúncio.', sender: 'seller', createdAt: '2025-03-15T14:30:00', read: true },
      { id: 'sm13', content: 'Obrigado pela informação!', sender: 'buyer', createdAt: '2025-03-15T16:00:00', read: true },
    ],
  },
  {
    id: 'sc-4',
    buyer: { name: 'Renata Pires', initials: 'RP', online: false, totalOrders: 2 },
    lastMessage: 'Vou aguardar a entrega então.',
    unreadCount: 0,
    updatedAt: '2025-03-14T09:00:00',
    messages: [
      { id: 'sm14', content: 'Qual o prazo para São Paulo?', sender: 'buyer', createdAt: '2025-03-13T20:00:00', read: true },
      { id: 'sm15', content: '3 a 5 dias úteis via Correios SEDEX.', sender: 'seller', createdAt: '2025-03-14T08:00:00', read: true },
      { id: 'sm16', content: 'Vou aguardar a entrega então.', sender: 'buyer', createdAt: '2025-03-14T09:00:00', read: true },
    ],
  },
];

const quickReplies = [
  'Obrigado pela compra!',
  'Produto enviado hoje!',
  'Em caso de dúvidas estou à disposição',
];

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d`;
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/* ─── Conversation Item ─── */
function ConversationItem({
  conversation: c,
  active,
  onClick,
}: {
  conversation: SellerConversation;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 p-3 text-left transition-colors rounded-r-md',
        active
          ? 'bg-[hsl(var(--kolecta-gold)/0.1)] border-l-2 border-[hsl(var(--kolecta-gold))]'
          : 'hover:bg-muted border-l-2 border-transparent'
      )}
    >
      <Avatar className="h-10 w-10 shrink-0 mt-0.5">
        <AvatarFallback className="bg-muted text-muted-foreground font-heading text-sm">
          {c.buyer.initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-heading font-bold text-sm truncate">{c.buyer.name}</span>
          <span className="text-xs text-muted-foreground shrink-0 ml-2">{formatTime(c.updatedAt)}</span>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{c.lastMessage}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {c.orderId && (
            <span className="text-[10px] text-muted-foreground">#{c.orderId}</span>
          )}
          {c.hasDispute && (
            <Badge className="text-[9px] px-1.5 py-0 bg-[hsl(var(--kolecta-red)/0.15)] text-[hsl(var(--kolecta-red))] border-[hsl(var(--kolecta-red)/0.3)]">
              Disputa aberta
            </Badge>
          )}
        </div>
      </div>
      {c.unreadCount > 0 && (
        <Badge className="bg-[hsl(var(--kolecta-gold))] text-[hsl(var(--kolecta-carbon))] h-5 w-5 p-0 flex items-center justify-center text-[10px] rounded-full shrink-0">
          {c.unreadCount}
        </Badge>
      )}
    </button>
  );
}

/* ─── Message Bubble ─── */
function MessageBubble({ message }: { message: Message }) {
  if (message.sender === 'system') {
    return (
      <div className="flex justify-center my-3">
        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  const isSeller = message.sender === 'seller';

  return (
    <div className={cn('flex mb-3', isSeller ? 'justify-end' : 'justify-start')}>
      <div className="max-w-[75%]">
        <div
          className={cn(
            'px-3 py-2 text-sm',
            isSeller
              ? 'bg-[hsl(var(--kolecta-gold)/0.1)] border border-[hsl(var(--kolecta-gold)/0.2)] rounded-2xl rounded-tr-sm'
              : 'bg-muted rounded-2xl rounded-tl-sm'
          )}
        >
          {message.content}
        </div>
        <div className={cn('flex items-center gap-1 mt-1', isSeller ? 'justify-end' : 'justify-start')}>
          <span className="text-[10px] text-muted-foreground">
            {new Date(message.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isSeller && (
            message.read
              ? <CheckCheck className="h-3 w-3 text-[hsl(var(--kolecta-gold))]" />
              : <Check className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export default function SellerMessagesPage() {
  const isMobile = useIsMobile();
  const [conversations, setConversations] = useState(mockSellerConversations);
  const [activeId, setActiveId] = useState<string | null>(isMobile ? null : mockSellerConversations[0]?.id ?? null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [filterTab, setFilterTab] = useState('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;

  const filtered = conversations.filter((c) => {
    const matchesSearch = c.buyer.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (filterTab === 'unread') return matchesSearch && c.unreadCount > 0;
    if (filterTab === 'dispute') return matchesSearch && c.hasDispute;
    return matchesSearch;
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeId, activeConversation?.messages.length]);

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, []);

  useEffect(() => { resizeTextarea(); }, [newMessage, resizeTextarea]);

  const handleSend = () => {
    if (!newMessage.trim() || !activeId) return;
    const msg: Message = {
      id: `sm-${Date.now()}`,
      content: newMessage.trim(),
      sender: 'seller',
      createdAt: new Date().toISOString(),
      read: false,
    };
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? { ...c, messages: [...c.messages, msg], lastMessage: msg.content, updatedAt: msg.createdAt }
          : c
      )
    );
    setNewMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const selectConversation = (id: string) => {
    setActiveId(id);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, unreadCount: 0, messages: c.messages.map((m) => ({ ...m, read: true })) }
          : c
      )
    );
  };

  /* ─── Conversation Panel ─── */
  const renderConversation = () => {
    if (!activeConversation) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState icon={MessageCircle} title="Selecione uma conversa" />
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={() => setActiveId(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-muted text-muted-foreground font-heading text-xs">
              {activeConversation.buyer.initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <span className="font-heading font-bold text-sm">{activeConversation.buyer.name}</span>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className={cn('h-2 w-2 rounded-full', activeConversation.buyer.online ? 'bg-emerald-500' : 'bg-muted-foreground')} />
                <span className="text-xs text-muted-foreground">{activeConversation.buyer.online ? 'Online' : 'Offline'}</span>
              </div>
              <span className="text-xs text-muted-foreground">• {activeConversation.buyer.totalOrders} pedidos realizados</span>
            </div>
          </div>
          {activeConversation.orderId && (
            <Link to={`/painel-vendedor/pedidos/${activeConversation.orderId}`}>
              <Badge variant="outline" className="text-xs">Pedido #{activeConversation.orderId}</Badge>
            </Link>
          )}
          {activeConversation.hasDispute && (
            <Badge className="bg-[hsl(var(--kolecta-red)/0.15)] text-[hsl(var(--kolecta-red))] border-[hsl(var(--kolecta-red)/0.3)] text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" /> Disputa
            </Badge>
          )}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-3">
          {activeConversation.messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </ScrollArea>

        {/* Quick Replies + Input */}
        <div className="p-3 border-t border-border shrink-0 space-y-2">
          <div className="flex gap-1.5 flex-wrap">
            {quickReplies.map((qr) => (
              <button
                key={qr}
                onClick={() => setNewMessage(qr)}
                className="text-[11px] px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                {qr}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" disabled className="shrink-0 mb-0.5">
                  <Paperclip className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Em breve</TooltipContent>
            </Tooltip>
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem..."
              rows={1}
              className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              style={{ maxHeight: 120 }}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!newMessage.trim()}
              className="bg-[hsl(var(--kolecta-gold))] text-[hsl(var(--kolecta-carbon))] hover:bg-[hsl(var(--kolecta-gold)/0.9)] shrink-0 mb-0.5"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  /* ─── List Panel ─── */
  const renderList = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-3 shrink-0">
        <h1 className="font-heading text-2xl font-bold uppercase tracking-wide">Mensagens</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar conversa..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Tabs value={filterTab} onValueChange={setFilterTab}>
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1 text-xs">Todas</TabsTrigger>
            <TabsTrigger value="unread" className="flex-1 text-xs">Não lidas</TabsTrigger>
            <TabsTrigger value="dispute" className="flex-1 text-xs">Com disputa</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={MessageCircle} title={searchQuery ? 'Nenhuma conversa encontrada' : 'Nenhuma mensagem'} />
          </div>
        ) : (
          <div className="py-1">
            {filtered.map((conv) => (
              <ConversationItem key={conv.id} conversation={conv} active={conv.id === activeId} onClick={() => selectConversation(conv.id)} />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  const showList = isMobile ? !activeId : true;
  const showConversation = isMobile ? !!activeId : true;

  return (
    <SellerLayout>
      <Card className="bg-gradient-card border-border overflow-hidden" style={{ height: 'calc(100vh - 200px)', minHeight: 500 }}>
        <div className="grid grid-cols-1 md:grid-cols-12 h-full">
          {showList && (
            <div className={cn('border-r border-border', isMobile ? 'col-span-1' : 'col-span-4')}>
              {renderList()}
            </div>
          )}
          {showConversation && (
            <div className={cn(isMobile ? 'col-span-1' : 'col-span-8')}>
              {renderConversation()}
            </div>
          )}
        </div>
      </Card>
    </SellerLayout>
  );
}
