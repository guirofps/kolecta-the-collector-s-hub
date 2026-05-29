import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Conversation, Message } from '@/lib/api';
import { useAuth } from '@clerk/clerk-react';

function formatTime(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d`;
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function getInitials(name: string) {
  return name.substring(0, 2).toUpperCase();
}

/* ─── Conversation Item ─── */
function ConversationItem({
  conversation,
  active,
  onClick,
  currentUserId,
}: {
  conversation: Conversation;
  active: boolean;
  onClick: () => void;
  currentUserId: string;
}) {
  const isbuyer = conversation.buyerId === currentUserId;
  const otherName = isbuyer
    ? (conversation.seller?.name || 'Vendedor')
    : (conversation.buyer?.name || 'Comprador');
  const initials = getInitials(otherName);
  const lastMessageText = conversation.latestMessage?.content || 'Nova conversa...';
  const unreadCount = conversation.unreadCount || 0;

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
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-heading font-bold text-sm truncate">{otherName}</span>
          <span className="text-xs text-muted-foreground shrink-0 ml-2">
            {formatTime(conversation.updatedAt)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{lastMessageText}</p>
      </div>
      {unreadCount > 0 && (
        <Badge className="bg-kolecta-gold text-kolecta-gold-foreground h-5 w-5 p-0 flex items-center justify-center text-[10px] rounded-full shrink-0">
          {unreadCount}
        </Badge>
      )}
    </button>
  );
}

/* ─── Message Bubble ─── */
function MessageBubble({ message, currentUserId }: { message: Message; currentUserId: string }) {
  const isMe = message.senderId === currentUserId; 

  return (
    <div className={cn('flex mb-3', isMe ? 'justify-end' : 'justify-start')}>
      <div className="max-w-[75%]">
        <div
          className={cn(
            'px-3 py-2 text-sm',
            isMe
              ? 'bg-kolecta-gold/10 border border-kolecta-gold/20 rounded-2xl rounded-tr-sm'
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
  const { getToken, userId } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [activeId, setActiveId] = useState<string | null>(searchParams.get('conv'));
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: conversations = [], isLoading: loadingConvs } = useQuery({
    queryKey: ['buyer-conversations'],
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
    refetchInterval: activeId ? 5000 : false, // Polling a cada 5 segundos
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const token = await getToken();
      if (!token || !activeId) throw new Error('Unauthorized');
      return api.messages.sendMessage(token, activeId, content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', activeId] });
      queryClient.invalidateQueries({ queryKey: ['buyer-conversations'] });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      if (!token) return;
      return api.messages.markAsRead(token, id);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['buyer-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', id] });
    }
  });

  const filtered = conversations.filter((c) =>
    (c.seller?.name || 'Vendedor').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeId, activeConversationData?.messages?.length]);

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
            title="Selecione uma conversa para começar"
          />
        </div>
      );
    }

    if (loadingActive) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-kolecta-gold" />
        </div>
      );
    }

    const conv = activeConversationData?.conversation;
    const messages = activeConversationData?.messages || [];
    const sellerName = conv?.seller?.name || 'Vendedor';

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
              {getInitials(sellerName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <Link
              to={`/vendedor/${conv?.seller?.id || ''}`}
              className="font-heading font-bold text-sm hover:text-kolecta-gold transition-colors"
            >
              {sellerName}
            </Link>
          </div>
          {conv?.listingId && (
            <Link to={`/anuncio/${conv.listingId}`}>
              <Badge variant="outline" className="text-xs hover:bg-muted cursor-pointer">
                Ver anúncio
              </Badge>
            </Link>
          )}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-3">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} currentUserId={userId || ''} />
          ))}
          <div ref={messagesEndRef} />
        </ScrollArea>

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
              disabled={sendMutation.isPending}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!newMessage.trim() || sendMutation.isPending}
              className="bg-kolecta-gold text-kolecta-gold-foreground hover:bg-kolecta-gold/90 shrink-0 mb-0.5"
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

      <ScrollArea className="flex-1">
        {loadingConvs ? (
          <div className="p-6 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-kolecta-gold" />
          </div>
        ) : filtered.length === 0 ? (
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
                currentUserId={userId || ''}
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
