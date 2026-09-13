/* cspell:disable */

import { canManageAiAgents } from './ai-agents.rules';

describe('canManageAiAgents', () => {
  it('allows the built-in admin user', () => {
    expect(canManageAiAgents({ profile: { id: 'admin', isAdmin: false } } as any)).toBe(true);
  });

  it('allows users marked as admins by Alfresco capabilities', () => {
    expect(canManageAiAgents({ profile: { id: 'alice', isAdmin: true } } as any)).toBe(true);
  });

  it('allows users in the Alfresco administrators group', () => {
    expect(
      canManageAiAgents({
        profile: {
          id: 'alice',
          isAdmin: false,
          groups: [{ id: 'GROUP_ALFRESCO_ADMINISTRATORS' }]
        }
      } as any)
    ).toBe(true);
  });

  it('denies non-admin users', () => {
    expect(
      canManageAiAgents({
        profile: {
          id: 'bob',
          isAdmin: false,
          groups: [{ id: 'GROUP_SITE_CONSUMERS' }]
        }
      } as any)
    ).toBe(false);
  });
});
