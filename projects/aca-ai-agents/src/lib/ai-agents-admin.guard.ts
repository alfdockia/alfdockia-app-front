/* cspell:disable */

import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AlfrescoApiService, GroupService } from '@alfresco/adf-content-services';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, from, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export const aiAgentsAdminGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const alfrescoApiService = inject(AlfrescoApiService);
  const groupService = inject(GroupService);
  const router = inject(Router);
  const snackBar = inject(MatSnackBar);

  return from(hasAdminAccess(alfrescoApiService, groupService)).pipe(
    map((canManageAgents) => (canManageAgents ? true : denyAccess(router, snackBar))),
    catchError(() => of(denyAccess(router, snackBar)))
  );
};

async function hasAdminAccess(alfrescoApiService: AlfrescoApiService, groupService: GroupService): Promise<boolean> {
  const [userResult, groupsResult] = await Promise.allSettled([getCurrentUser(alfrescoApiService), getCurrentGroups(groupService)]);
  const user = userResult.status === 'fulfilled' ? userResult.value : null;
  const groups = groupsResult.status === 'fulfilled' ? groupsResult.value : [];

  return isAdminUser(user) || hasAdminGroup(groups);
}

function getCurrentUser(alfrescoApiService: AlfrescoApiService): Promise<any> {
  const alfrescoApi = alfrescoApiService.getInstance() as any;
  const peopleApi = alfrescoApi.peopleApi || (alfrescoApi.core && alfrescoApi.core.peopleApi);

  if (!peopleApi || typeof peopleApi.getPerson !== 'function') {
    return Promise.reject(new Error('Alfresco People API is not available.'));
  }

  return peopleApi.getPerson('-me-', { fields: ['id', 'capabilities'] }).then((response) => response && response.entry);
}

function getCurrentGroups(groupService: GroupService): Promise<any[]> {
  return groupService.listAllGroupMembershipsForPerson('-me-', { maxItems: 250 });
}

function isAdminUser(user: any): boolean {
  return user?.capabilities?.isAdmin === true || user?.id === 'admin';
}

function hasAdminGroup(groups: any[]): boolean {
  return groups.some((group) => {
    const entry = group?.entry || group;
    return entry?.id === 'GROUP_ALFRESCO_ADMINISTRATORS' || entry?.id === 'ALFRESCO_ADMINISTRATORS';
  });
}

function denyAccess(router: Router, snackBar: MatSnackBar): UrlTree {
  snackBar.open('Solo los administradores pueden gestionar agentes de IA.', undefined, { duration: 4000 });
  return router.parseUrl('/personal-files');
}
