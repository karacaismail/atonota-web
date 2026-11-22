import { CollectionButton as Button } from './CollectionControls';
export function CollectionState({
  state,
  onRetry,
}: {
  state: 'loading' | 'empty' | 'error' | 'unauthorized';
  onRetry?: () => void;
}) {
  const messages = {
    loading: 'Kayıtlar yükleniyor.',
    empty: 'Kayıt bulunamadı.',
    error: 'Kayıtlar yüklenemedi.',
    unauthorized: 'Bu kayıtları görme yetkiniz yok.',
  };
  return (
    <div
      className="collection-state"
      role={state === 'error' || state === 'unauthorized' ? 'alert' : 'status'}
    >
      <p>{messages[state]}</p>
      {state === 'empty' && <p>Süzgeci değiştirin veya önceki sayfaya dönün.</p>}
      {state === 'error' && onRetry && <Button onClick={onRetry}>Yeniden dene</Button>}
    </div>
  );
}
