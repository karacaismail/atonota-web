/**
 * Sayfa kapısının bilgisi (G-94, G-169). Kabuk menü için sunucuya okuma yetkisini sorar.
 * Modül sayfası aynı bilgiyi bu bağlamdan okur. Böylece menü ve sayfa tek kuralı kullanır.
 * Bağlam yoksa kapı uygulanmaz. Örnek: kabuksuz birim testi.
 */
import { createContext, useContext } from 'react';

export interface ShellAccess {
  /** Sunucu yanıt verdi ya da yetki bilgisi hiç gelmeyecek. */
  ready: boolean;
  /** Kullanıcının okuyabildiği DocType adları. */
  readable: ReadonlySet<string>;
}

export const ShellAccessContext = createContext<ShellAccess | null>(null);

export function useShellAccess(): ShellAccess | null {
  return useContext(ShellAccessContext);
}
