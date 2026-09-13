import { RuleContext } from '@alfresco/adf-extensions';

export const canManageAiAgents = (context: RuleContext): boolean => {
  const profile = context?.profile as any;
  const groups = profile?.groups || [];

  return profile?.id === 'admin' || profile?.isAdmin === true || hasAdminGroup(groups);
};

function hasAdminGroup(groups: any[]): boolean {
  return groups.some((group) => {
    const entry = group?.entry || group;
    return entry?.id === 'GROUP_ALFRESCO_ADMINISTRATORS' || entry?.id === 'ALFRESCO_ADMINISTRATORS';
  });
}
