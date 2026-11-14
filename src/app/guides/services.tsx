import React from 'react';
import { useTranslation } from 'react-i18next';
import { GroupedGuide } from '../../components/GuideScreens';
import { SERVICE_CATEGORIES, useContent } from '../../lib/guides';

export default function ServicesGuide() {
  const { t } = useTranslation();
  const data = useContent('services');
  return (
    <GroupedGuide title={t('services.title')} intro={t('services.intro')} data={data} groups={SERVICE_CATEGORIES}
      groupOf={(r) => r.category} groupLabel={(g) => t(`services.cat_${g}`)} emptyText={t('services.empty')} disclaimer />
  );
}
