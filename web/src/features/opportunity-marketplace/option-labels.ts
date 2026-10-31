export const labels: Record<string, [string, string]> = {
  fullOperationManagement: ['Full farm operation management', 'إدارة تشغيل المزرعة بالكامل'],
  productionSupervision: ['Production supervision', 'الإشراف على الإنتاج'],
  agriculturalConsulting: ['Agricultural consulting', 'استشارات زراعية'],
  seasonalManagement: ['Seasonal management', 'إدارة موسمية'],
  irrigationAndMaintenance: ['Irrigation and maintenance', 'الري والصيانة'],
  harvestAndPostHarvest: ['Harvest and post-harvest', 'الحصاد وما بعد الحصاد'],
  individual: ['Individuals', 'أفراد'],
  company: ['Companies', 'شركات'],
  individuals: ['Individuals', 'أفراد'],
  companies: ['Companies', 'شركات'],
  expandCultivation: ['Expand cultivation', 'توسيع الزراعة'],
  developInfrastructure: ['Develop infrastructure', 'تطوير البنية التحتية'],
  equipmentAndMachinery: ['Equipment and machinery', 'معدات وآلات'],
  operateTogether: ['Operate the farm together', 'تشغيل المزرعة معًا'],
};
export function optionLabel(value: string, locale: string) {
  return labels[value]?.[locale === 'ar' ? 1 : 0] ?? value;
}
