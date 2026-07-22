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
  Search, Send, Paperclip, ArrowLeft, Check, CheckCheck, MessageCircle, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Conversation, Message } from '@/lib/api';
import { useAuth } from '@clerk/clerk-react';

const quickReplies = [
  'Obrigado pela compra!',
  'Produto enviado hoje!',
  'Em caso de dúvidas estou à disposição',
];

function formatTime(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d`;
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function getInitials(name: string) {
  return name.substring(0, 2).toUpperCase();
}

/* ─── Conversation Item ─── */
function ConversationItem({
  conversation: c,
  active,
  onClick,
}: {
  conversation: Conversation;
  active: boolean;
  onClick: () => void;
}) {
  const buyerName = c.buyer?.name || 'Comprador';
  const initials = getInitials(buyerName);
  const lastMessageText = c.latestMessage?.content || 'Nova conversa...';
  const unreadCount = c.unreadCount || 0;

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
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-heading font-bold text-sm truncate">{buyerName}</span>
          <span className="text-xs text-muted-foreground shrink-0 ml-2">{formatTime(c.updatedAt)}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-muted-foreground line-clamp-1 flex-1">{lastMessageText}</p>
        </div>
      </div>
      {unreadCount > 0 && (
        <Badge className="bg-[hsl(var(--kolecta-gold))] text-black h-5 w-5 p-0 flex items-center justify-center text-[10px] rounded-full shrink-0 mt-1">
          {unreadCount}
        </Badge>
      )}
    </button>
  );
}

/* ─── Message Bubble ─── */
function MessageBubble({ message, currentUserId }: { message: Message; currentUserId: string }) {
  const isMe = message.senderId === currentUserId; // seller

  return (
    <div className={cn('flex mb-3', isMe ? 'justify-end' : 'justify-start')}>
      <div className="max-w-[75%]">
        <div
          className={cn(
            'px-3 py-2 text-sm',
            isMe
              ? 'bg-[hsl(var(--kolecta-gold)/0.1)] border border-[hsl(var(--kolecta-gold)/0.2)] rounded-2xl rounded-tr-sm'
              : 'bg-muted rounded-2xl rounded-tl-sm'
          )}
        >
          {message.content}
        </div>
        <div className={cn('flex items-center gap-1 mt-1', isMe ? 'justify-end' : 'justify-start')}>
          <span className="text-[10px] text-muted-foreground">
            {new Date(message.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isMe && (
            message.readAt
              ? <CheckCheck className="h-3 w-3 text-[hsl(var(--kolecta-gold))]" />
              : <Check className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      </div>
    </div>
  );
}

export default function SellerMessagesPage() {
  const isMobile = useIsMobile();
  const { getToken, userId } = useAuth();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [filter, setFilter] = useState('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: conversations = [], isLoading: loadingConvs } = useQuery({
    queryKey: ['seller-conversations'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return [];
      return api.messages.getConversations(token);
    },
    enabled: !!userId,
  });

  const { data: activeConversationData, isLoading: loadingActive } = useQuery({
    queryKey: ['conversation', activeId],
    queryFn: async () => {
      const token = await getToken();
      if (!token || !activeId) return null;
      return api.messages.getConversation(token, activeId);
    },
    enabled: !!activeId && !!userId,
    refetchInterval: activeId ? 5000 : false,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const token = await getToken();
      if (!token || !activeId) throw new Error('Unauthorized');
      return api.messages.sendMessage(token, activeId, content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', activeId] });
      queryClient.invalidateQueries({ queryKey: ['seller-conversations'] });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      if (!token) return;
      return api.messages.markAsRead(token, id);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['seller-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', id] });
    }
  });

  const filtered = conversations.filter((c) => {
    const buyerName = (c.buyer?.name || 'Comprador').toLowerCase();
    const matchSearch = buyerName.includes(searchQuery.toLowerCase());
    // For now, no dispute support in backend yet
    const matchFilter = filter === 'all';
    return matchSearch && matchFilter;
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeId, activeConversationData?.messages?.length]);

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
    sendMutation.mutate(newMessage.trim());
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
    const conv = conversations.find(c => c.id === id);
    if (conv && conv.unreadCount && conv.unreadCount > 0) {
      markAsReadMutation.mutate(id);
    }
  };

  /* ─── Conversation Panel ─── */
  const renderConversation = () => {
    if (!activeId) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={MessageCircle}
            title="Selecione um comprador para iniciar o chat"
          />
        </div>
      );
    }

    if (loadingActive) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--kolecta-gold))]" />
        </div>
      );
    }

    const conv = activeConversationData?.conversation;
    const messages = activeConversationData?.messages || [];
    const buyerName = conv?.buyer?.name || 'Comprador';

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
              {getInitials(buyerName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <span className="font-heading font-bold text-sm block truncate">{buyerName}</span>
          </div>
          {conv?.listingId && (
            <Link to={`/produto/${conv.listingId}`}>
              <Badge variant="outline" className="text-xs hover:bg-muted cursor-pointer">
                Ver Anúncio
              </Badge>
            </Link>
          )}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-3 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed bg-opacity-10">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} currentUserId={userId || ''} />
          ))}
          <div ref={messagesEndRef} />
        </ScrollArea>

        {/* Input & Quick Replies */}
        <div className="border-t border-border bg-card shrink-0">
          <div className="px-3 py-2 flex items-center gap-2 overflow-x-auto hide-scrollbar">
            {quickReplies.map((reply, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="whitespace-nowrap cursor-pointer hover:bg-secondary/80 text-xs font-normal"
                onClick={() => {
                  setNewMessage(reply);
                  textareaRef.current?.focus();
                }}
              >
                {reply}
              </Badge>
            ))}
          </div>

          <div className="p-3 pt-0 flex items-end gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" disabled className="shrink-0 mb-0.5">
                  <Paperclip className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Enviar anexo (Em breve)</TooltipContent>
            </Tooltip>
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua resposta..."
              rows={1}
              className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              style={{ maxHeight: 120 }}
              disabled={sendMutation.isPending}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!newMessage.trim() || sendMutation.isPending}
              className="bg-[hsl(var(--kolecta-gold))] text-black hover:bg-[hsl(var(--kolecta-gold)/0.9)] shrink-0 mb-0.5"
            >
              {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  /* ─── List Panel ─── */
  const renderList = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-4 shrink-0">
        <h1 className="font-heading text-2xl font-bold uppercase tracking-wide">Mensagens</h1>

        {/* F23: o filtro "Com Disputa" sempre voltava vazio (o backend não marca
            disputa na conversa). Removido até existir suporte no servidor. */}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar comprador..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      <Separator />

      <ScrollArea className="flex-1">
        {loadingConvs ? (
          <div className="p-6 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--kolecta-gold))]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={MessageCircle}
              title={searchQuery || filter === 'dispute' ? 'Nenhuma conversa encontrada' : 'Você ainda não tem mensagens'}
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

  const showList = isMobile ? !activeId : true;
  const showConversation = isMobile ? !!activeId : true;

  return (
    <SellerLayout>
      <div className="container mx-auto px-4 py-6">
        <Card className="bg-gradient-card border-border overflow-hidden" style={{ height: 'calc(100vh - 120px)', minHeight: 500 }}>
          <div className="grid grid-cols-1 lg:grid-cols-12 h-full">
            {showList && (
              <div className={cn('border-r border-border', isMobile ? 'col-span-1' : 'lg:col-span-4')}>
                {renderList()}
              </div>
            )}
            {showConversation && (
              <div className={cn(isMobile ? 'col-span-1' : 'lg:col-span-8')}>
                {renderConversation()}
              </div>
            )}
          </div>
        </Card>
      </div>
    </SellerLayout>
  );
}
