import { useContext } from 'react';

import { ViewDataContext } from './context';

export const useViewData = () => useContext(ViewDataContext);
