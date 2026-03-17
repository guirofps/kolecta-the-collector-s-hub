import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import EmptyState from '@/components/EmptyState';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Search,
  Send,
  Paperclip,
  ArrowLeft,
  Check,
  CheckCheck,
  MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Types ─── */
interface Seller {
  name: string;
  slug: string;
  initials: string;
  online: boolean;
}

interface Message {
  id: string;
  content: string;
  sender: 'buyer' | 'seller' | 'system';
  createdAt: string;
  read: boolean;
}

interface Conversation {
  id: string;
  seller: Seller;
  lastMessage: string;
  unreadCount: number;
  updatedAt: string;
  orderId?: string;
  messages: Message[];
}

/* ─── Mock Data ─── */
const mockConversations: Conversation[] = [
  {
    id: 'conv-1',
    seller: { name: 'JDM Imports', slug: 'jdm-imports', initials: 'JI', online: true },
    lastMessage: 'O item já foi despachado, segue o código de rastreio.',
    unreadCount: 2,
    updatedAt: '2025-03-17T10:30:00',
    orderId: 'KL-000123',
    messages: [
      { id: 'm1', content: 'Olá, gostaria de saber o prazo de envio.', sender: 'buyer', createdAt: '2025-03-16T14:00:00', read: true },
      { id: 'm2', content: 'Olá! O prazo é de 3 a 5 dias úteis após confirmação do pagamento.', sender: 'seller', createdAt: '2025-03-16T14:05:00', read: true },
      { id: 'm3', content: 'Pedido #KL-000123 criado', sender: 'system', createdAt: '2025-03-16T15:00:00', read: true },
      { id: 'm4', content: 'Perfeito, acabei de finalizar o pedido!', sender: 'buyer', createdAt: '2025-03-16T15:01:00', read: true },
      { id: 'm5', content: 'Recebemos seu pedido, vamos preparar o envio.', sender: 'seller', createdAt: '2025-03-16T16:00:00', read: true },
      { id: 'm6', content: 'O item já foi despachado, segue o código de rastreio.', sender: 'seller', createdAt: '2025-03-17T10:00:00', read: false },
      { id: 'm7', content: 'Código: BR123456789JP', sender: 'seller', createdAt: '2025-03-17T10:30:00', read: false },
    ],
  },
  {
    id: 'conv-2',
    seller: { name: 'Drift Garage', slug: 'drift-garage', initials: 'DG', online: false },
    lastMessage: 'Obrigado pela compra! Qualquer dúvida estou à disposição.',
    unreadCount: 0,
    updatedAt: '2025-03-15T09:00:00',
    messages: [
      { id: 'm8', content: 'Boa tarde, o volante é compatível com S13?', sender: 'buyer', createdAt: '2025-03-14T18:00:00', read: true },
      { id: 'm9', content: 'Sim, é compatível! Acompanha o hub adapter.', sender: 'seller', createdAt: '2025-03-14T18:30:00', read: true },
      { id: 'm10', content: 'Obrigado pela compra! Qualquer dúvida estou à disposição.', sender: 'seller', createdAt: '2025-03-15T09:00:00', read: true },
    ],
  },
  {
    id: 'conv-3',
    seller: { name: 'Touge Parts', slug: 'touge-parts', initials: 'TP', online: true },
    lastMessage: 'Vou verificar a disponibilidade e te aviso.',
    unreadCount: 0,
    updatedAt: '2025-03-13T20:00:00',
    messages: [
      { id: 'm11', content: 'Vocês têm coilovers para AE86?', sender: 'buyer', createdAt: '2025-03-13T19:00:00', read: true },
      { id: 'm12', content: 'Vou verificar a disponibilidade e te aviso.', sender: 'seller', createdAt: '2025-03-13T20:00:00', read: true },
    ],
  },
];

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d`;
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/* ─── Conversation Item ─── */
function ConversationItem({
  conversation,
  active,
  onClick,
}: {
  conversation: Conversation;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 text-left transition-colors rounded-r-md',
        active
          ? 'bg-kolecta-gold/10 border-l-2 border-kolecta-gold'
          : 'hover:bg-muted border-l-2 border-transparent'
      )}
    >
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarFallback className="bg-muted text-muted-foreground font-heading text-sm">
          {conversation.seller.initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-heading font-bold text-sm truncate">{conversation.seller.name}</span>
          <span className="text-xs text-muted-foreground shrink-0 ml-2">
            {formatTime(conversation.updatedAt)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{conversation.lastMessage}</p>
      </div>
      {conversation.unreadCount > 0 && (
        <Badge className="bg-kolecta-gold text-kolecta-gold-foreground h-5 w-5 p-0 flex items-center justify-center text-[10px] rounded-full shrink-0">
          {conversation.unreadCount}
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

  const isBuyer = message.sender === 'buyer';

  return (
    <div className={cn('flex mb-3', isBuyer ? 'justify-end' : 'justify-start')}>
      <div className="max-w-[75%]">
        <div
          className={cn(
            'px-3 py-2 text-sm',
            isBuyer
              ? 'bg-kolecta-gold/10 border border-kolecta-gold/20 rounded-2xl rounded-tr-sm'
              : 'bg-muted rounded-2xl rounded-tl-sm'
          )}
        >
          {message.content}
        </div>
        <div className={cn('flex items-center gap-1 mt-1', isBuyer ? 'justify-end' : 'justify-start')}>
          <span className="text-[10px] text-muted-foreground">
            {new Date(message.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isBuyer && (
            message.read
              ? <CheckCheck className="h-3 w-3 text-kolecta-gold" />
              : <Check className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export default function MessagesPage() {
  const isMobile = useIsMobile();
  const [conversations, setConversations] = useState(mockConversations);
  const [activeId, setActiveId] = useState<string | null>(isMobile ? null : mockConversations[0]?.id ?? null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;

  const filtered = conversations.filter((c) =>
    c.seller.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeId, activeConversation?.messages.length]);

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [newMessage, resizeTextarea]);

  const handleSend = () => {
    if (!newMessage.trim() || !activeId) return;
    const msg: Message = {
      id: `m-${Date.now()}`,
      content: newMessage.trim(),
      sender: 'buyer',
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectConversation = (id: string) => {
    setActiveId(id);
    // Mark as read
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
          <EmptyState
            icon={MessageCircle}
            title="Selecione uma conversa para começar"
          />
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
              {activeConversation.seller.initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <Link
              to={`/vendedor/${activeConversation.seller.slug}`}
              className="font-heading font-bold text-sm hover:text-kolecta-gold transition-colors"
            >
              {activeConversation.seller.name}
            </Link>
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  activeConversation.seller.online ? 'bg-green-500' : 'bg-muted-foreground'
                )}
              />
              <span className="text-xs text-muted-foreground">
                {activeConversation.seller.online ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
          {activeConversation.orderId && (
            <Link to={`/conta/pedidos/${activeConversation.orderId}`}>
              <Badge variant="outline" className="text-xs">
                Pedido #{activeConversation.orderId}
              </Badge>
            </Link>
          )}
        </div>

        {/* API: GET /api/messages/conversations/:id
            Retorna: { messages: Message[] }
            Cada Message: { id, content, sender, createdAt, read } */}

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-3">
          {activeConversation.messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </ScrollArea>

        {/* API: POST /api/messages/conversations/:id
            Body: { content: string }
            Retorna: { message: Message } */}

        {/* Input */}
        <div className="p-3 border-t border-border shrink-0">
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
              className="bg-kolecta-gold text-kolecta-gold-foreground hover:bg-kolecta-gold/90 shrink-0 mb-0.5"
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
          <Input
            placeholder="Buscar conversa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      <Separator />

      {/* API: GET /api/messages/conversations
          Retorna: { conversations: Conversation[] }
          Cada Conversation: { id, seller, lastMessage, unreadCount, updatedAt } */}

      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={MessageCircle}
              title={searchQuery ? 'Nenhuma conversa encontrada' : 'Você ainda não tem mensagens'}
              action={
                !searchQuery ? (
                  <Button variant="kolecta" asChild>
                    <Link to="/">Explorar produtos</Link>
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="py-1">
            {filtered.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                active={conv.id === activeId}
                onClick={() => selectConversation(conv.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  /* ─── Layout ─── */
  const showList = isMobile ? !activeId : true;
  const showConversation = isMobile ? !!activeId : true;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
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
      </div>
    </Layout>
  );
}
