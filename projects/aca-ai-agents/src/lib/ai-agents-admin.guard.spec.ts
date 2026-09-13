/* cspell:disable */

import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { AlfrescoApiService, GroupService } from '@alfresco/adf-content-services';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, firstValueFrom } from 'rxjs';
import { aiAgentsAdminGuard } from './ai-agents-admin.guard';

describe('aiAgentsAdminGuard', () => {
  let getPerson: jasmine.Spy;
  let listAllGroupMembershipsForPerson: jasmine.Spy;
  let parseUrl: jasmine.Spy;
  let snackBarOpen: jasmine.Spy;
  const deniedTree = {} as UrlTree;

  beforeEach(() => {
    getPerson = jasmine.createSpy('getPerson').and.returnValue(Promise.resolve({ entry: { id: 'admin' } }));
    listAllGroupMembershipsForPerson = jasmine.createSpy('listAllGroupMembershipsForPerson').and.returnValue(Promise.resolve([]));
    parseUrl = jasmine.createSpy('parseUrl').and.returnValue(deniedTree);
    snackBarOpen = jasmine.createSpy('open');

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AlfrescoApiService,
          useValue: {
            getInstance: () => ({
              peopleApi: {
                getPerson
              }
            })
          }
        },
        {
          provide: GroupService,
          useValue: {
            listAllGroupMembershipsForPerson
          }
        },
        {
          provide: Router,
          useValue: {
            parseUrl
          }
        },
        {
          provide: MatSnackBar,
          useValue: {
            open: snackBarOpen
          }
        }
      ]
    });
  });

  it('allows the built-in admin user even when capabilities are not returned', async () => {
    const result = await runGuard();

    expect(result).toBe(true);
    expect(getPerson).toHaveBeenCalledWith('-me-', { fields: ['id', 'capabilities'] });
  });

  it('allows users with admin capabilities', async () => {
    getPerson.and.returnValue(Promise.resolve({ entry: { id: 'alice', capabilities: { isAdmin: true } } }));

    await expectAsync(runGuard()).toBeResolvedTo(true);
  });

  it('allows users in the Alfresco administrators group', async () => {
    getPerson.and.returnValue(Promise.resolve({ entry: { id: 'alice', capabilities: { isAdmin: false } } }));
    listAllGroupMembershipsForPerson.and.returnValue(Promise.resolve([{ entry: { id: 'GROUP_ALFRESCO_ADMINISTRATORS' } }]));

    await expectAsync(runGuard()).toBeResolvedTo(true);
  });

  it('redirects non-admin users', async () => {
    getPerson.and.returnValue(Promise.resolve({ entry: { id: 'bob', capabilities: { isAdmin: false } } }));
    listAllGroupMembershipsForPerson.and.returnValue(Promise.resolve([{ entry: { id: 'GROUP_SITE_CONSUMERS' } }]));

    const result = await runGuard();

    expect(result).toBe(deniedTree);
    expect(snackBarOpen).toHaveBeenCalledWith('Solo los administradores pueden gestionar agentes de IA.', undefined, { duration: 4000 });
    expect(parseUrl).toHaveBeenCalledWith('/personal-files');
  });

  function runGuard(): Promise<boolean | UrlTree> {
    return firstValueFrom(TestBed.runInInjectionContext(() => aiAgentsAdminGuard({} as any, {} as any) as Observable<boolean | UrlTree>));
  }
});
