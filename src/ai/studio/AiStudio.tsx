import './studio.css';

import {
  Attachments,
  Bubble,
  Prompts,
  Sender,
  Suggestion,
  Welcome,
  XProvider,
} from '@ant-design/x';
import type { AttachmentsProps } from '@ant-design/x';
import {
  ArrowClockwise,
  ChatCircle,
  Copy,
  Paperclip,
  SidebarSimple,
  ThumbsDown,
  ThumbsUp,
  UploadSimple,
} from '@phosphor-icons/react';
import { App, Button, Drawer, Tag } from 'antd';
import type { GetProp } from 'antd';
import trTR from 'antd/locale/tr_TR';
import { useCallback, useMemo, useRef, useState } from 'react';

import type { GenUIAction } from '@/genui';
import { useGenuiVars } from '@/genui/useGenuiVars';
import { OwlMark } from '@/mascot';

import { createMockTransport, MOCK_SOURCE } from '../agent';
import type { AgentSource, AgentTransport, AssistantMessage, ChatMessage } from '../agent';
import { aiStudioLayout } from '../tokens';
import { useMediaQuery } from '../useMediaQuery';
import { AnswerActions } from './AnswerActions';
import { AssistantBody } from './AssistantBody';
import { ConversationsPanel, type StudioConversation } from './ConversationsPanel';
import { SLASH_COMMANDS, WELCOME_PROMPTS } from './content';
import { actionToMessage, useStudioChat } from './useStudioChat';
import { Workspace } from './Workspace';

/**
 * Taşıyıcı verilmezse sahte sunucu kullanılır.
 * Taşıyıcı verilirse kaynak bilgisi de verilmelidir (AX-7).
 */
export type AiStudioProps =
  | { transport?: undefined; source?: undefined }
  | { transport: AgentTransport; source: AgentSource };

/** Üç sütun ancak iki yan bölüm ve okunur bir orta alan sığınca açılır. */
const WIDE_QUERY = `(min-width: ${aiStudioLayout.left + aiStudioLayout.right + 600}px)`;

const FIRST_CONVERSATIONS: StudioConversation[] = [
  { key: 'c1', label: 'Yeni sohbet', group: 'Bugün' },
];

type Feedback = 'like' | 'dislike';

type BubbleItem = GetProp<typeof Bubble.List, 'items'>[number];

type StoredMessages = ReturnType<typeof useStudioChat>['messages'];

function StudioInner({ transport, source }: { transport: AgentTransport; source: AgentSource }) {
  const { message: toast } = App.useApp();
  const vars = useGenuiVars();
  const wide = useMediaQuery(WIDE_QUERY);
  const { messages, setMessages, send, cancel, regenerate, busy } = useStudioChat(transport);

  const [conversations, setConversations] = useState(FIRST_CONVERSATIONS);
  const [activeKey, setActiveKey] = useState('c1');
  const store = useRef<Record<string, StoredMessages>>({});
  const nextId = useRef(2);

  const [value, setValue] = useState('');
  const [attachOpen, setAttachOpen] = useState(false);
  const [files, setFiles] = useState<NonNullable<AttachmentsProps['items']>>([]);
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  const fileNames = files.map((f) => f.name);

  const latestSteps = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i]?.message;
      if (m?.role === 'assistant') return m.steps;
    }
    return [];
  }, [messages]);

  const submit = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      send({ role: 'user', text: trimmed, ...(fileNames.length ? { files: fileNames } : {}) });
      setValue('');
      setConversations((all) =>
        all.map((c) =>
          c.key === activeKey && c.label === 'Yeni sohbet'
            ? { ...c, label: trimmed.slice(0, 40) }
            : c,
        ),
      );
    },
    [activeKey, busy, fileNames, send],
  );

  const onAction = useCallback(
    (action: GenUIAction) => {
      if (action.kind === 'ask') submit(action.text);
      else send(actionToMessage(action));
    },
    [send, submit],
  );

  const switchTo = (key: string) => {
    if (key === activeKey) return;
    cancel();
    store.current[activeKey] = messages;
    setMessages(store.current[key] ?? []);
    setActiveKey(key);
    setLeftOpen(false);
  };

  const createConversation = () => {
    const key = `c${nextId.current++}`;
    setConversations((all) => [{ key, label: 'Yeni sohbet', group: 'Bugün' }, ...all]);
    switchTo(key);
  };

  const deleteConversation = (key: string) => {
    const rest = conversations.filter((c) => c.key !== key);
    if (rest.length === 0) return;
    store.current = Object.fromEntries(Object.entries(store.current).filter(([k]) => k !== key));
    setConversations(rest);
    if (key === activeKey && rest[0]) {
      cancel();
      setMessages(store.current[rest[0].key] ?? []);
      setActiveKey(rest[0].key);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      void toast.success('Yanıt kopyalandı.');
    } catch {
      void toast.error('Kopyalanamadı. Tarayıcı izin vermedi.');
    }
  };

  const actionItems = (id: string) => [
    { key: 'copy', label: 'Kopyala', icon: <Copy aria-hidden /> },
    { key: 'retry', label: 'Yeniden üret', icon: <ArrowClockwise aria-hidden /> },
    {
      key: 'like',
      label: 'Beğen',
      pressed: feedback[id] === 'like',
      icon: <ThumbsUp weight={feedback[id] === 'like' ? 'fill' : 'regular'} aria-hidden />,
    },
    {
      key: 'dislike',
      label: 'Beğenme',
      pressed: feedback[id] === 'dislike',
      icon: <ThumbsDown weight={feedback[id] === 'dislike' ? 'fill' : 'regular'} aria-hidden />,
    },
  ];

  const onActionClick = (id: string, message: AssistantMessage, key: string) => {
    if (key === 'copy') void copy(message.text);
    else if (key === 'retry') regenerate(id);
    else if (key === 'like' || key === 'dislike') {
      setFeedback((all) => ({ ...all, [id]: key }));
    }
  };

  const items: BubbleItem[] = messages.map(({ id, message }): BubbleItem => {
    const key = String(id);
    if (message.role === 'user') {
      return {
        key,
        role: 'user',
        placement: 'end',
        content: message,
        messageRender: (m: ChatMessage) => (
          <div className="ai-user">
            <span>{m.text}</span>
            {m.role === 'user' && m.files && m.files.length > 0 && (
              <span className="ai-user-files">
                {m.files.map((name) => (
                  <Tag key={name} bordered={false} icon={<Paperclip aria-hidden />}>
                    {name}
                  </Tag>
                ))}
              </span>
            )}
          </div>
        ),
      };
    }
    const finished = message.phase === 'done' || message.phase === 'cancelled';
    return {
      key,
      role: 'ai',
      placement: 'start',
      avatar: <OwlMark size={28} />,
      variant: 'borderless',
      loading: message.phase === 'waiting' && message.steps.length === 0,
      content: message,
      messageRender: (m: ChatMessage) =>
        m.role === 'assistant' ? (
          <AssistantBody message={m} onAction={onAction} onRetry={() => regenerate(key)} />
        ) : null,
      ...(finished
        ? {
            footer: (
              <AnswerActions
                items={actionItems(key)}
                onClick={(actionKey) => onActionClick(key, message, actionKey)}
              />
            ),
          }
        : {}),
    };
  });

  const sender = (
    <Suggestion items={SLASH_COMMANDS} onSelect={(command) => setValue(command)}>
      {({ onTrigger, onKeyDown }) => (
        <Sender
          value={value}
          onChange={(next) => {
            setValue(next);
            onTrigger(next === '/' ? undefined : false);
          }}
          onKeyDown={onKeyDown}
          onSubmit={submit}
          onCancel={cancel}
          loading={busy}
          allowSpeech
          placeholder="Bir şey sorun. Komutlar için / yazın."
          aria-label="Asistana mesaj yazın"
          prefix={
            <Button
              type="text"
              icon={<Paperclip aria-hidden />}
              aria-label="Bağlam dosyası ekle"
              aria-expanded={attachOpen}
              onClick={() => setAttachOpen((open) => !open)}
            />
          }
          actions={(_, { components }) => {
            const { SendButton, LoadingButton, SpeechButton } = components;
            return busy ? (
              <LoadingButton aria-label="Yanıtı durdur" />
            ) : (
              <span className="ai-sender-actions">
                <SpeechButton aria-label="Sesle yaz" />
                <SendButton aria-label="Mesajı gönder" />
              </span>
            );
          }}
          header={
            <Sender.Header title="Bağlam dosyaları" open={attachOpen} onOpenChange={setAttachOpen}>
              <Attachments
                items={files}
                beforeUpload={() => false}
                onChange={({ fileList }) => setFiles(fileList)}
                placeholder={{
                  icon: <UploadSimple aria-hidden />,
                  title: 'Dosyayı buraya bırakın',
                  description: 'Dosya yalnız bu sohbetin bağlamına eklenir.',
                }}
              />
            </Sender.Header>
          }
        />
      )}
    </Suggestion>
  );

  const left = (
    <ConversationsPanel
      items={conversations}
      activeKey={activeKey}
      onSelect={switchTo}
      onCreate={createConversation}
      onDelete={deleteConversation}
    />
  );
  const right = <Workspace steps={latestSteps} files={fileNames} source={source} />;

  return (
    <div className={`ai-studio ${wide ? 'is-wide' : 'is-narrow'}`} style={vars}>
      {wide && <div className="ai-col ai-col-left">{left}</div>}

      <main className="ai-main" aria-label="AI Studio">
        <header className="ai-head">
          {!wide && (
            <Button
              type="text"
              icon={<ChatCircle aria-hidden />}
              aria-label="Sohbetleri aç"
              onClick={() => setLeftOpen(true)}
            />
          )}
          <OwlMark size={28} />
          <h1 className="ai-title">AI Studio</h1>
          <Tag bordered={false} color={source.simulated ? 'warning' : 'processing'}>
            {source.label}
          </Tag>
          {!wide && (
            <Button
              type="text"
              className="ai-head-end"
              icon={<SidebarSimple aria-hidden />}
              aria-label="Çalışma alanını aç"
              onClick={() => setRightOpen(true)}
            />
          )}
        </header>

        <div className="ai-log" role="log" aria-live="polite" aria-relevant="additions text">
          {messages.length === 0 ? (
            <div className="ai-welcome">
              <Welcome
                variant="borderless"
                icon={<OwlMark size={48} />}
                title="Merhaba, ben Atonota asistanı"
                description="Raporları özetlerim, siparişleri tararım ve otomasyon kurmanıza yardım ederim. Onayınız olmadan hiçbir işlem yapmam."
              />
              <Prompts
                title="Nereden başlayalım?"
                items={WELCOME_PROMPTS}
                wrap
                onItemClick={({ data }) => {
                  if (typeof data.label === 'string' && !data.children) submit(data.label);
                }}
              />
            </div>
          ) : (
            <Bubble.List items={items} autoScroll />
          )}
        </div>
        <p className="ai-visually-hidden" role="status">
          {busy ? 'Asistan yanıt hazırlıyor.' : ''}
        </p>

        <div className="ai-sender">
          {sender}
          <p className="ai-hint">Asistan hata yapabilir. Önemli bilgileri kontrol edin.</p>
        </div>
      </main>

      {wide && <div className="ai-col ai-col-right">{right}</div>}

      {!wide && (
        <>
          <Drawer
            title="Sohbetler"
            placement="left"
            open={leftOpen}
            onClose={() => setLeftOpen(false)}
            width={`min(85vw, ${aiStudioLayout.left + 60}px)`}
            rootStyle={vars}
          >
            {left}
          </Drawer>
          <Drawer
            title="Çalışma alanı"
            placement="right"
            open={rightOpen}
            onClose={() => setRightOpen(false)}
            width={`min(85vw, ${aiStudioLayout.right + 60}px)`}
            rootStyle={vars}
          >
            {right}
          </Drawer>
        </>
      )}
    </div>
  );
}

/**
 * AI Studio sayfası. Solda sohbetler, ortada mesajlar, sağda çalışma alanı.
 * Dar ekranda tek sütun olur. Sol ve sağ bölüm çekmeceye taşınır.
 */
export function AiStudio({ transport, source }: AiStudioProps) {
  const resolvedTransport = useMemo(() => transport ?? createMockTransport(), [transport]);
  const resolvedSource = source ?? MOCK_SOURCE;
  return (
    <XProvider locale={trTR}>
      <App component={false}>
        <StudioInner transport={resolvedTransport} source={resolvedSource} />
      </App>
    </XProvider>
  );
}
