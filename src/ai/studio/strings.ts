import { useLanguage, type AppLanguage } from '@/app/locale';

import type { AgentMode, FlowStep } from '../agent';

/**
 * AI Studio texts in every UI language (AJA-1784).
 * Visible labels, screen reader names and announcements come from the same table.
 * So the studio speaks one language, the same one as `antd` and `XProvider`.
 * When a language is added to `language.ts`, TypeScript asks for its texts here.
 */
export interface StudioStrings {
  newConversation: string;
  today: string;
  conversations: string;
  deleteConversation: string;
  openConversations: string;
  openWorkspace: string;
  workspace: string;
  copied: string;
  copyFailed: string;
  copy: string;
  regenerate: string;
  like: string;
  dislike: string;
  placeholder: string;
  messageBox: string;
  attachFile: string;
  stop: string;
  speech: string;
  send: string;
  fileNames: string;
  fileNameOnly: string;
  dropTitle: string;
  dropDescription: string;
  welcomeTitle: string;
  welcomeDescription: string;
  promptsTitle: string;
  hint: string;
  /** Live region texts. Each state is announced once. */
  announce: { preparing: string; done: string; cancelled: string; error: string };
  mode: string;
  modes: Record<AgentMode, string>;
  steps: Record<FlowStep, string>;
  stepStates: { done: string; current: string; waiting: string; absent: string };
  stepSummary: (at: number, total: number, step: string) => string;
  flowSteps: string;
  answerStopped: string;
  answerFailed: string;
  statusRetryNote: string;
  askStatus: string;
  retry: string;
  toolEvents: string;
  noToolEvents: string;
  conversationFiles: string;
  noFiles: string;
  security: string;
  source: string;
  modeFact: string;
  trial: string;
  live: string;
  actions: string;
  noActionWithoutApproval: string;
  prompts: {
    report: string;
    reportWeek: string;
    reportMonth: string;
    orders: string;
    ordersLate: string;
    ordersRule: string;
  };
  slash: { report: string; orders: string; automation: string };
}

const STRINGS: Record<AppLanguage, StudioStrings> = {
  tr: {
    newConversation: 'Yeni sohbet',
    today: 'Bugün',
    conversations: 'Sohbetler',
    deleteConversation: 'Sohbeti sil',
    openConversations: 'Sohbetleri aç',
    openWorkspace: 'Çalışma alanını aç',
    workspace: 'Çalışma alanı',
    copied: 'Yanıt kopyalandı.',
    copyFailed: 'Kopyalanamadı. Tarayıcı izin vermedi.',
    copy: 'Kopyala',
    regenerate: 'Yeniden üret',
    like: 'Beğen',
    dislike: 'Beğenme',
    placeholder: 'Sorunuzu yazın. Komut için / yazın.',
    messageBox: 'Asistana mesaj yazın',
    attachFile: 'Bağlam dosyası ekle',
    stop: 'Yanıtı durdur',
    speech: 'Sesle yaz',
    send: 'Mesajı gönder',
    fileNames: 'Dosya adları',
    fileNameOnly: 'Yalnız dosya adı gönderilir. Dosya içeriği okunmaz.',
    dropTitle: 'Dosyayı buraya bırakın',
    dropDescription: 'Dosyanın adı yalnız bu sohbete eklenir.',
    welcomeTitle: 'Merhaba, ben Atonota asistanı',
    welcomeDescription:
      'Raporları özetlerim, siparişleri tararım ve otomasyon kurmanıza yardım ederim. Onayınız olmadan hiçbir işlem yapmam.',
    promptsTitle: 'Nereden başlayalım?',
    hint: 'Asistan hata yapabilir. Önemli bilgileri kontrol edin.',
    announce: {
      preparing: 'Asistan yanıt hazırlıyor.',
      done: 'Yanıt hazır.',
      cancelled: 'Yanıt durduruldu.',
      error: 'Yanıt hata verdi. Yeniden deneyebilirsiniz.',
    },
    mode: 'Kip',
    modes: { ask: 'Sor', search: 'Ara', draft: 'Taslak hazırla', act: 'İşlem yap' },
    steps: {
      intent: 'Niyet',
      plan: 'Plan',
      preview: 'Önizleme',
      approval: 'Onay',
      apply: 'Uygulama',
      undo: 'Geri alma önerisi',
    },
    stepStates: {
      done: 'Tamamlandı',
      current: 'Şimdi bu adımda',
      waiting: 'Bekliyor',
      absent: 'Bu kipte yok',
    },
    stepSummary: (at, total, step) => `Adım ${at} / ${total}: ${step}`,
    flowSteps: 'Akış adımları',
    answerStopped: 'Yanıt durduruldu.',
    answerFailed: 'Yanıt alınamadı.',
    statusRetryNote:
      'Onayınız sunucuya ulaşmış olabilir. Onay yeniden gönderilmez. Önce işlemin durumunu sorun.',
    askStatus: 'İşlemin durumunu sor',
    retry: 'Yeniden dene',
    toolEvents: 'Son yanıtın araç olayları',
    noToolEvents: 'Henüz araç işlemi yok. Listeyi yalnız sunucu gönderir.',
    conversationFiles: 'Bu sohbetin dosya adları',
    noFiles: 'Dosya eklenmedi.',
    security: 'Güvenlik',
    source: 'Kaynak',
    modeFact: 'Mod',
    trial: 'Deneme. Gerçek işlem yapılmaz.',
    live: 'Canlı',
    actions: 'Eylemler',
    noActionWithoutApproval: 'Onayınız olmadan hiçbir işlem yapılmaz.',
    prompts: {
      report: 'Rapor ve özet',
      reportWeek: 'Bu haftanın satış özetini çıkar',
      reportMonth: 'Geçen ayla satışları karşılaştır',
      orders: 'Sipariş ve otomasyon',
      ordersLate: 'Geciken siparişleri bul',
      ordersRule: 'Stok uyarısı için otomasyon kur',
    },
    slash: {
      report: '/rapor: Satış özeti',
      orders: '/siparis: Geciken siparişler',
      automation: '/otomasyon: Stok kuralı',
    },
  },
  en: {
    newConversation: 'New conversation',
    today: 'Today',
    conversations: 'Conversations',
    deleteConversation: 'Delete conversation',
    openConversations: 'Open conversations',
    openWorkspace: 'Open workspace',
    workspace: 'Workspace',
    copied: 'Reply copied.',
    copyFailed: 'Could not copy. The browser did not allow it.',
    copy: 'Copy',
    regenerate: 'Regenerate',
    like: 'Like',
    dislike: 'Dislike',
    placeholder: 'Type your question. Type / for commands.',
    messageBox: 'Message the assistant',
    attachFile: 'Add a context file',
    stop: 'Stop the reply',
    speech: 'Dictate',
    send: 'Send message',
    fileNames: 'File names',
    fileNameOnly: 'Only the file name is sent. The file content is not read.',
    dropTitle: 'Drop the file here',
    dropDescription: 'The file name is added to this conversation only.',
    welcomeTitle: 'Hello, I am the Atonota assistant',
    welcomeDescription:
      'I summarise reports, scan orders and help you set up automations. I take no action without your approval.',
    promptsTitle: 'Where shall we start?',
    hint: 'The assistant can make mistakes. Check important information.',
    announce: {
      preparing: 'The assistant is preparing a reply.',
      done: 'Reply ready.',
      cancelled: 'Reply stopped.',
      error: 'The reply failed. You can try again.',
    },
    mode: 'Mode',
    modes: { ask: 'Ask', search: 'Search', draft: 'Draft', act: 'Take action' },
    steps: {
      intent: 'Intent',
      plan: 'Plan',
      preview: 'Preview',
      approval: 'Approval',
      apply: 'Apply',
      undo: 'Undo proposal',
    },
    stepStates: {
      done: 'Done',
      current: 'Current step',
      waiting: 'Waiting',
      absent: 'Not in this mode',
    },
    stepSummary: (at, total, step) => `Step ${at} of ${total}: ${step}`,
    flowSteps: 'Flow steps',
    answerStopped: 'Reply stopped.',
    answerFailed: 'No reply was received.',
    statusRetryNote:
      'Your approval may have reached the server. It is not sent again. First ask for the status of the operation.',
    askStatus: 'Ask for the status',
    retry: 'Try again',
    toolEvents: 'Tool events of the last reply',
    noToolEvents: 'No tool operations yet. Only the server sends this list.',
    conversationFiles: 'File names in this conversation',
    noFiles: 'No files added.',
    security: 'Security',
    source: 'Source',
    modeFact: 'Mode',
    trial: 'Trial. No real operation is carried out.',
    live: 'Live',
    actions: 'Actions',
    noActionWithoutApproval: 'No action is taken without your approval.',
    prompts: {
      report: 'Reports and summaries',
      reportWeek: "Summarise this week's sales",
      reportMonth: 'Compare sales with last month',
      orders: 'Orders and automation',
      ordersLate: 'Find late orders',
      ordersRule: 'Set up an automation for stock alerts',
    },
    slash: {
      report: '/report: Sales summary',
      orders: '/orders: Late orders',
      automation: '/automation: Stock rule',
    },
  },
};

/** Texts for a language. */
export function studioStrings(language: AppLanguage): StudioStrings {
  return STRINGS[language];
}

/** Texts for the current UI language. */
export function useStudioStrings(): StudioStrings {
  return studioStrings(useLanguage());
}
