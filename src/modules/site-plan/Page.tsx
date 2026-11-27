import { Alert } from 'antd';
import { isReadOnly, useRoles } from '../access';
import { useCopy } from '../messages';
import { ModuleFrame, Section } from '../shared';
export default function SitePlanPage() {
  const copy = useCopy();
  // Assistant roles only read this page (G-168, G-170). The server still rejects write requests.
  const readOnly = isReadOnly(useRoles());
  return (
    <ModuleFrame title={copy.sitePlan}>
      {readOnly && <Alert type="info" message={copy.readOnlySection} />}
      <Section title={copy.sites}>
        <p>{copy.sitesUnavailable}</p>
      </Section>
      <Section title={copy.plans}>
        <p>{copy.plansUnavailable}</p>
      </Section>
    </ModuleFrame>
  );
}
