import { ArrowClockwise } from '@phosphor-icons/react';
import { Button, Result } from 'antd';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';

import { t } from '../messages';
import NotFoundPage from './NotFoundPage';
import { reloadPage } from './reloadPage';

/**
 * Rota hata ekranı.
 * 404 yanıtında "Sayfa bulunamadı" görünür.
 * Öteki hatalarda sayfa yüklenemedi demektir. Örneğin sayfa dosyası gelmedi.
 * Bu durumda "Yeniden dene" düğmesi sayfayı yeniden yükler.
 */
export function RouteErrorPage() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;
  return (
    <div className="shell-page">
      <Result
        status="warning"
        title={<h1 className="shell-h1">{t.pages.loadError}</h1>}
        subTitle={t.pages.loadErrorText}
        extra={
          <Button type="primary" icon={<ArrowClockwise aria-hidden="true" />} onClick={reloadPage}>
            {t.header.state.retry}
          </Button>
        }
      />
    </div>
  );
}
