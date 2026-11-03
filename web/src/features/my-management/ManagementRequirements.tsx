'use client';
import { useLocale, useTranslations } from 'next-intl';
import { contentText } from '@/lib/content/localized';

export type ManagementRequirementsData = {
  localizedContent?: unknown;
  responsibilities?: string[] | null;
  experienceLevel?: string | null;
  onSitePresence?: string | null;
  currentTeam?: unknown;
  resourcesAndFacilities?: unknown;
};

export function ManagementRequirements({ value }: { value: ManagementRequirementsData }) {
  const locale = useLocale();
  const t = useTranslations('workspace.phase7');
  const facilities = useTranslations('workspace.facilities');
  const label = t as (key: string) => string;
  const hasLabel = t.has as (key: string) => boolean;
  const facilityLabel = facilities as (key: string) => string;
  const hasFacility = facilities.has as (key: string) => boolean;
  const teams = Array.isArray(value.currentTeam) ? value.currentTeam : [];
  const resources = Array.isArray(value.resourcesAndFacilities) ? value.resourcesAndFacilities : [];
  return (
    <dl className="grid gap-16">
      <div>
        <dt>{t('managementSteps.s4')}</dt>
        <dd>
          {value.responsibilities
            ?.map((key) => (hasLabel(`responsibilityLabels.${key}`) ? label(`responsibilityLabels.${key}`) : key))
            .join(', ') || t('notProvided')}
        </dd>
      </div>
      <div>
        <dt>{t('experienceLevel')}</dt>
        <dd>
          {contentText(value.localizedContent, locale, 'experienceLevel', value.experienceLevel) || t('notProvided')}
        </dd>
      </div>
      <div>
        <dt>{t('onSitePresence')}</dt>
        <dd>
          {contentText(value.localizedContent, locale, 'onSitePresence', value.onSitePresence) || t('notProvided')}
        </dd>
      </div>
      <div>
        <dt>{t('teamRole')}</dt>
        <dd>
          {teams.map((member, i) => (
            <p key={i}>
              {contentText(member?.localizedContent, locale, 'role', member?.role)}: {String(member?.count ?? '')}
            </p>
          ))}
        </dd>
      </div>
      <div>
        <dt>{t('managementSteps.s5')}</dt>
        <dd>
          {resources.map((resource, i) => (
            <p key={i}>
              {hasFacility(`types.${resource?.facilityType}`)
                ? facilityLabel(`types.${resource.facilityType}`)
                : String(resource?.facilityType ?? '')}
              : {contentText(resource?.localizedContent, locale, 'details', resource?.details)}
            </p>
          ))}
        </dd>
      </div>
    </dl>
  );
}
