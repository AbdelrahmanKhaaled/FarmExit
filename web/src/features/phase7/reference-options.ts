// Options visible in the approved Management Request PDF, pages 6–7.
export const managementGoals = [
  'Raise yield per feddan',
  'Reduce water use per season',
  'Prepare the farm for export certification',
] as const;
export const managementChallenges = [
  'Results have dropped or stayed flat',
  'Irrigation needs attention',
  'Not enough time to oversee the farm',
  'Need technical advice',
] as const;

export function formatManagementChoices(values: readonly string[] | null | undefined, choices: readonly string[], labels: readonly string[]) {
  return (values ?? []).map((value) => {
    const index = choices.indexOf(value);
    return index < 0 ? value : labels[index] ?? value;
  }).join('\n');
}
