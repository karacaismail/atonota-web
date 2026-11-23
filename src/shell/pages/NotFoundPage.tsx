import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

import { t } from '../messages';
import { routes } from '../paths';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="shell-page">
      <Result
        status="404"
        title={<h1 className="shell-h1">{t.pages.notFound}</h1>}
        subTitle={t.pages.notFoundText}
        extra={
          <Button type="primary" onClick={() => navigate(routes.home())}>
            {t.pages.goHome}
          </Button>
        }
      />
    </div>
  );
}
