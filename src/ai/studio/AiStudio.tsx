import './studio.css';

import { Attachments, Bubble, Prompts, Sender, Suggestion, Welcome } from '@ant-design/x';
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
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

import { useLanguage } from '@/app/locale';

import type { GenUIAction, GenUIActionResult } from '@/genui';
import { useGenuiVars } from '@/genui/useGenuiVars';

import { MOCK_SOURCE } from '../agent';
import type {
  AgentMode,
  AgentSource,
  AgentTransport,
  AssistantMessage,
  ChatMessage,
} from '../agent';
import { aiStudioLayout } from '../tokens';
import { useMediaQuery } from '../useMediaQuery';
import { AnswerActions } from './AnswerActions';
import { AssistantBody } from './AssistantBody';
import { ConversationsPanel, type StudioConversation } from './ConversationsPanel';
import { createFlowDemoTransport } from './flowDemo';
import { FlowSteps } from './FlowSteps';
import { ModePicker } from './ModePicker';
import { slashCommands, welcomePrompts } from './content';
import { useFlow } from './useFlow';
import { actionToMessage, decisionsOf, useStudioChat } from './useStudioChat';
import { useStudioStrings } from './strings';
import { Workspace } from './Workspace';

/**
 * If no transport is given, the mock server is used.
 * If a transport is given, source info must be given too (AX-7).
 */
export type AiStudioProps =
  | { transport?: undefined; source?: undefined }
  | { transport: AgentTransport; source: AgentSource };

/** Three columns open only when both side panels and a readable middle area fit. */
const WIDE_QUERY = `(min-width: ${aiStudioLayout.left + aiStudioLayout.right + 600}px)`;

/** An empty label means "new conversation". The visible name comes from the language table. */
const FIRST_CONVERSATIONS: StudioConversation[] = [{ key: 'c1', label: '', group: '' }];

/**
 * True while the IME (candidate selection) is active.
 * `isComposing` is the standard signal. Safari sends Enter with key code 229 right after
 * `compositionend`, so that code is checked too (AJA-1784).
 */
function isComposing(event: KeyboardEvent): boolean {
  return event.nativeEvent.isComposing || event.keyCode === 229;
}

type Announcement = keyof ReturnType<typeof useStudioStrings>['announce'];

type Feedback = 'like' | 'dislike';

type BubbleItem = GetProp<typeof Bubble.List, 'items'>[number];

type StoredMessages = ReturnType<typeof useStudioChat>['messages'];

type FileItems = NonNullable<AttachmentsProps['items']>;

function StudioInner({ transport, source }: { transport: AgentTransport; source: AgentSource }) {
  const { message: toast } = App.useApp();
  const t = useStudioStrings();
  const language = useLanguage();
  const vars = useGenuiVars();
  const titleId = useId();
  const wide = useMediaQuery(WIDE_QUERY);
  const [conversations, setConversations] = useState(FIRST_CONVERSATIONS);
  const [activeKey, setActiveKey] = useState('c1');
  // The chosen mode applies to the next new task. A started flow keeps its mode.
  const [mode, setMode] = useState<AgentMode>('ask');
  const { flow, flowTransport, start, approve, forget } = useFlow(transport, activeKey);
  const { messages, setMessages, send, cancel, regenerate, retryKind, busy } =
    useStudioChat(flowTransport);
  const store = useRef<Record<string, StoredMessages>>({});
  const nextId = useRef(2);
  // When the drawer closes, focus returns to the button that opened it.
  const leftTrigger = useRef<HTMLButtonElement>(null);
  const rightTrigger = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef({ left: false, right: false });

  const [value, setValue] = useState('');
  const [attachOpen, setAttachOpen] = useState(false);
  // Files belong to a conversation. They do not move when switching to another conversation.
  const [filesByConversation, setFilesByConversation] = useState<Record<string, FileItems>>({});
  const files = filesByConversation[activeKey] ?? [];
  const setFiles = (list: FileItems) =>
    setFilesByConversation((all) => ({ ...all, [activeKey]: list }));
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  // As soon as the drawer closes, give focus to the opening button. Otherwise focus falls to the page body.
  useEffect(() => {
    if (wasOpen.current.left && !leftOpen) leftTrigger.current?.focus();
    if (wasOpen.current.right && !rightOpen) rightTrigger.current?.focus();
    wasOpen.current = { left: leftOpen, right: rightOpen };
  }, [leftOpen, rightOpen]);

  // Screen reader announcement (AJA-1784). Stream chunks are not read out.
  // Each reply is announced when it starts and once more when it ends: ready, stopped or failed.
  // The reply's ID changes when the stream ends, so the last reply's state is followed instead.
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const inFlight = useRef(false);
  useEffect(() => {
    const last = messages[messages.length - 1]?.message;
    if (last?.role !== 'assistant') return;
    if (last.phase === 'waiting' || last.phase === 'streaming') {
      if (inFlight.current) return;
      inFlight.current = true;
      setAnnouncement('preparing');
    } else if (inFlight.current) {
      inFlight.current = false;
      setAnnouncement(last.phase);
    }
  }, [messages]);

  // While the IME is active, Enter picks a candidate. It must not send the message or pick a
  // "/" command. The capture handler stops the event before Sender and Suggestion see it.
  const blockImeEnter = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && isComposing(event)) event.stopPropagation();
  };

  const fileNames = files.map((f) => f.name);

  // Decisions come from the conversation history. Blocks stay locked after switching away and back.
  const decisions = useMemo(() => decisionsOf(messages.map((m) => m.message)), [messages]);

  const latestSteps = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i]?.message;
      if (m?.role === 'assistant') return m.steps;
    }
    return [];
  }, [messages]);

  const submit = useCallback(
    (text: string): GenUIActionResult => {
      const trimmed = text.trim();
      if (!trimmed || busy) return 'busy';
      start(mode);
      const result = send({
        role: 'user',
        text: trimmed,
        ...(fileNames.length ? { files: fileNames } : {}),
      });
      if (result !== 'accepted') return result;
      setValue('');
      setConversations((all) =>
        all.map((c) =>
          c.key === activeKey && c.label === '' ? { ...c, label: trimmed.slice(0, 40) } : c,
        ),
      );
      return 'accepted';
    },
    [activeKey, busy, fileNames, mode, send, start],
  );

  const onAction = useCallback(
    (action: GenUIAction): GenUIActionResult => {
      if (action.kind === 'ask') return submit(action.text);
      // At the approval step the user's approval is written to the flow. Only then does the apply step open.
      const result = send(actionToMessage(action));
      if (result === 'accepted' && action.decision === 'approved') approve();
      return result;
    },
    [approve, send, submit],
  );

  const switchTo = (key: string) => {
    if (key === activeKey) return;
    cancel();
    inFlight.current = false;
    store.current[activeKey] = messages;
    setMessages(store.current[key] ?? []);
    setActiveKey(key);
    setLeftOpen(false);
  };

  const createConversation = () => {
    const key = `c${nextId.current++}`;
    setConversations((all) => [{ key, label: '', group: '' }, ...all]);
    switchTo(key);
  };

  const deleteConversation = (key: string) => {
    const rest = conversations.filter((c) => c.key !== key);
    if (rest.length === 0) return;
    store.current = Object.fromEntries(Object.entries(store.current).filter(([k]) => k !== key));
    setFilesByConversation((all) =>
      Object.fromEntries(Object.entries(all).filter(([k]) => k !== key)),
    );
    setConversations(rest);
    forget(key);
    if (key === activeKey && rest[0]) {
      cancel();
      inFlight.current = false;
      setMessages(store.current[rest[0].key] ?? []);
      setActiveKey(rest[0].key);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      void toast.success(t.copied);
    } catch {
      void toast.error(t.copyFailed);
    }
  };

  const actionItems = (id: string) => [
    { key: 'copy', label: t.copy, icon: <Copy aria-hidden /> },
    { key: 'retry', label: t.regenerate, icon: <ArrowClockwise aria-hidden /> },
    {
      key: 'like',
      label: t.like,
      pressed: feedback[id] === 'like',
      icon: <ThumbsUp weight={feedback[id] === 'like' ? 'fill' : 'regular'} aria-hidden />,
    },
    {
      key: 'dislike',
      label: t.dislike,
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
      placement: 'start',
      variant: 'borderless',
      loading: message.phase === 'waiting' && message.steps.length === 0,
      content: message,
      messageRender: (m: ChatMessage) =>
        m.role === 'assistant' ? (
          <AssistantBody
            message={m}
            onAction={onAction}
            onRetry={() => regenerate(key)}
            retryKind={retryKind(id)}
            busy={busy}
            decisions={decisions}
            simulated={source.simulated}
          />
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
    <Suggestion items={slashCommands(t)} onSelect={(command) => setValue(command)}>
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
          placeholder={t.placeholder}
          aria-label={t.messageBox}
          prefix={
            <Button
              type="text"
              icon={<Paperclip aria-hidden />}
              aria-label={t.attachFile}
              aria-expanded={attachOpen}
              onClick={() => setAttachOpen((open) => !open)}
            />
          }
          actions={(_, { components }) => {
            const { SendButton, LoadingButton, SpeechButton } = components;
            return busy ? (
              <LoadingButton aria-label={t.stop} />
            ) : (
              <span className="ai-sender-actions">
                <SpeechButton aria-label={t.speech} />
                <SendButton aria-label={t.send} />
              </span>
            );
          }}
          header={
            <Sender.Header title={t.fileNames} open={attachOpen} onOpenChange={setAttachOpen}>
              <p className="ai-note">{t.fileNameOnly}</p>
              <Attachments
                items={files}
                beforeUpload={() => false}
                onChange={({ fileList }) => setFiles(fileList)}
                placeholder={{
                  icon: <UploadSimple aria-hidden />,
                  title: t.dropTitle,
                  description: t.dropDescription,
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
      items={conversations.map((c) => ({
        ...c,
        label: c.label || t.newConversation,
        group: t.today,
      }))}
      activeKey={activeKey}
      onSelect={switchTo}
      onCreate={createConversation}
      onDelete={deleteConversation}
    />
  );
  const right = <Workspace steps={latestSteps} files={fileNames} source={source} />;

  return (
    <div
      className={`ai-studio ai-scope ${wide ? 'is-wide' : 'is-narrow'}`}
      style={vars}
      lang={language}
    >
      {wide && <div className="ai-col ai-col-left">{left}</div>}

      <section className="ai-main" aria-labelledby={titleId}>
        <header className="ai-head">
          {!wide && (
            <Button
              type="text"
              icon={<ChatCircle aria-hidden />}
              ref={leftTrigger}
              aria-label={t.openConversations}
              onClick={() => setLeftOpen(true)}
            />
          )}
          <h1 className="ai-title" id={titleId}>
            AI Studio
          </h1>
          <Tag bordered={false} color={source.simulated ? 'warning' : 'processing'}>
            {source.label}
          </Tag>
          {!wide && (
            <Button
              type="text"
              className="ai-head-end"
              icon={<SidebarSimple aria-hidden />}
              ref={rightTrigger}
              aria-label={t.openWorkspace}
              onClick={() => setRightOpen(true)}
            />
          )}
        </header>

        <FlowSteps flow={flow} />

        {/* The log is not a live region. Each stream chunk would be read out (AJA-1784). */}
        {/* The state of the reply is announced once by the announcer below. */}
        <div className="ai-log" role="log" aria-live="off">
          {messages.length === 0 ? (
            <div className="ai-welcome">
              <Welcome
                variant="borderless"
                title={t.welcomeTitle}
                description={t.welcomeDescription}
              />
              <Prompts
                title={t.promptsTitle}
                items={welcomePrompts(t)}
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
        <p className="ai-visually-hidden" role="status" data-ai-announcer>
          {announcement ? t.announce[announcement] : ''}
        </p>

        <div className="ai-sender" onKeyDownCapture={blockImeEnter}>
          <ModePicker value={mode} onChange={setMode} disabled={busy} />
          {sender}
          <p className="ai-hint">{t.hint}</p>
        </div>
      </section>

      {wide && <div className="ai-col ai-col-right">{right}</div>}

      {!wide && (
        <>
          <Drawer
            title={t.conversations}
            placement="left"
            open={leftOpen}
            onClose={() => setLeftOpen(false)}
            rootClassName="ai-scope"
            width={`min(85vw, ${aiStudioLayout.left + 60}px)`}
            rootStyle={vars}
          >
            {left}
          </Drawer>
          <Drawer
            title={t.workspace}
            placement="right"
            open={rightOpen}
            onClose={() => setRightOpen(false)}
            rootClassName="ai-scope"
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
 * Theme, Turkish locale and focus mode come from the foundation task's `AppProviders` layer.
 * AI Studio page. Conversations on the left, messages in the middle, workspace on the right.
 * On a narrow screen it becomes one column. The left and right panels move into drawers.
 */
export function AiStudio({ transport, source }: AiStudioProps) {
  const resolvedTransport = useMemo(() => transport ?? createFlowDemoTransport(), [transport]);
  const resolvedSource = source ?? MOCK_SOURCE;
  return (
    <App component={false}>
      <StudioInner transport={resolvedTransport} source={resolvedSource} />
    </App>
  );
}
