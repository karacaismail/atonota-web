/**
 * Kabuğun görünen metinleri. Metin kod içine gömülmez, buradan alınır.
 * Değer gerektiren metinler işlevdir. Cümle parçalardan birleştirilmez.
 */
const nf = new Intl.NumberFormat('tr-TR');

export const formatNumber = (n: number) => nf.format(n);

export const t = {
  nav: {
    label: 'Ana gezinme',
    sectionMain: 'Gezinme',
    sectionAgents: 'AI ajanları',
    drawer: 'Menü',
    openMenu: 'Menüyü aç',
    closeMenu: 'Menüyü kapat',
    back: 'Geri',
    toRail: 'Dar görünüme geç',
    toSolid: 'Geniş görünüme geç',
    submenuOf: (name: string) => `${name} alt menüsü`,
    aiAction: (name: string) => `${name} için AI'a sor`,
  },
  workspace: {
    label: (name: string) => `Çalışma alanı: ${name}`,
    prefix: 'Çalışma alanı:',
    menu: 'Çalışma alanları',
  },
  command: {
    label: 'Komut alanı',
    modes: { ask: 'Sor', do: 'Yap', search: 'Ara' },
    modeLabel: 'Komut modu',
    placeholder: 'Bir şey sorun ya da / yazın',
    suggestions: 'Hızlı öneriler',
  },
  agents: {
    status: { running: 'Çalışıyor', idle: 'Beklemede', error: 'Hata verdi' },
    open: 'Ayrıntıyı aç',
    lastEvent: (when: string) => `Son olay: ${when}`,
  },
  footer: {
    credit: 'AI kredisi',
    creditValue: (used: number, total: number) =>
      `${formatNumber(used)} / ${formatNumber(total)} kullanıldı`,
    creditRing: (percent: number) => `Kredinin yüzde ${percent} kısmı kullanıldı`,
    user: 'Kullanıcı',
  },
  header: {
    crumbs: 'Konum',
    viewType: 'Görünüm türü',
    savedViews: 'Kayıtlı görünüm',
    search: 'Kayıtlarda ara',
    searchPlaceholder: 'Ara',
    filter: 'Filtre',
    activeFilters: 'Etkin filtreler',
    clearFilters: 'Temizle',
    removeFilter: (name: string) => `${name} filtresini kaldır`,
    prev: 'Önceki kayıt',
    next: 'Sonraki kayıt',
    recordPos: (i: number, n: number) => `${formatNumber(i)} / ${formatNumber(n)}`,
    more: 'Diğer eylemler',
    state: {
      normal: (at: string) => `Güncel. Son senkron ${at}.`,
      normalShort: 'Güncel',
      live: (s: number) => `Canlı. Son olay ${s} sn önce.`,
      loading: 'Yükleniyor',
      empty: 'Kayıt yok',
      error: 'Veri güncel değil',
      retry: 'Yeniden dene',
      selection: (n: number) => `${formatNumber(n)} kayıt seçildi`,
      clearSelection: 'Seçimi kaldır',
      bulkDelete: 'Sil',
      bulkExport: 'Dışa aktar',
      dirty: (n: number) => `${formatNumber(n)} değişiklik kaydedilmedi`,
      discard: 'Vazgeç',
      save: 'Kaydet',
    },
  },
  pages: {
    home: 'Ana sayfa',
    notFound: 'Sayfa bulunamadı',
    notFoundText: 'Adres yanlış olabilir. Ana sayfaya dönün.',
    goHome: 'Ana sayfaya dön',
    assistant: 'Asistan',
    assistantText:
      'Sorunuz alındı. Asistan yanıtı bu sürümde yok. Yanıt yüzeyi sonraki işte gelecek.',
    sample: 'Bu sayfadaki veriler örnektir.',
    selectRow: (name: string) => `${name} kaydını seç`,
    emptyText: 'Bu listede henüz kayıt yok.',
    viewSoon: 'Bu görünümün tam hali sonraki işte gelecek. Aşağıda örnek özet var.',
    errorText: 'Veri alınamadı. Aşağıdaki kayıtlar eski olabilir.',
  },
} as const;
