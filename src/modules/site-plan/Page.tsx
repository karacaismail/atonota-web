import { Alert } from 'antd';
import { useModuleAccess } from '../context';
import { useCopy } from '../messages';
import { ModuleFrame, Section } from '../shared';
export default function SitePlanPage() {
  const copy = useCopy();
  // G-168: yardımcı bu sayfayı yalnız okur. Sayfada yazma denetimi gösterilmez.
  const readOnly = useModuleAccess('site-plan')?.kind === 'read';
  return (
    <ModuleFrame title={copy.sitePlan}>
      {readOnly && <Alert type="info" message={copy.readOnlyPlan} />}
      <Section title={copy.sites}>
        <p>{copy.sitesUnavailable}</p>
      </Section>
      <Section title={copy.plans}>
        <p>{copy.plansUnavailable}</p>
      </Section>
    </ModuleFrame>
  );
}
