// Testlerde kullanılan sahte sunucu. İşlenmeyen istek hata sayılır ve ağa gitmez.
import { setupServer } from 'msw/node';

import { handlers } from './handlers';

export const mockServer = setupServer(...handlers);
