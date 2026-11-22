import { useCopy } from '../messages';
import { ModuleFrame, Section } from '../shared';
export default function SitePlanPage() {
  const copy = useCopy();
  return (
    <ModuleFrame title={copy.sitePlan}>
      <Section title={copy.sites}>
        <p>{copy.sitesUnavailable}</p>
      </Section>
      <Section title={copy.plans}>
        <p>{copy.plansUnavailable}</p>
      </Section>
    </ModuleFrame>
  );
}
