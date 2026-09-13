/* cspell:disable */

import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { AlfrescoApiService, GroupService } from '@alfresco/adf-content-services';
import { AppConfigService } from '@alfresco/adf-core';
import { AiSearchService } from './ai-search.service';

describe('AiSearchService', () => {
  let service: AiSearchService;
  let http: HttpTestingController;
  let getPerson: jasmine.Spy;
  let listAllGroupMembershipsForPerson: jasmine.Spy;

  beforeEach(() => {
    getPerson = jasmine.createSpy('getPerson').and.returnValue(Promise.resolve({ entry: { id: 'admin', capabilities: { isAdmin: true } } }));
    listAllGroupMembershipsForPerson = jasmine
      .createSpy('listAllGroupMembershipsForPerson')
      .and.returnValue(Promise.resolve([{ entry: { id: 'GROUP_FINANCE', shortName: 'FINANCE' } }]));

    TestBed.configureTestingModule({
      providers: [
        AiSearchService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        {
          provide: AppConfigService,
          useValue: {
            get: (key: string, fallback: unknown) =>
              ({
                'alfdockiaAiSearch.baseUrl': '',
                'alfdockiaAiSearch.searchPath': '/search',
                'alfdockiaAiSearch.defaultMaxItems': 25,
                'alfdockiaAiSearch.maxItemsLimit': 100,
                'alfdockiaAiSearch.fastRerankCandidates': 30,
                'alfdockiaAiSearch.fastCandidateTextChars': 1200
              }[key] ?? fallback)
          }
        },
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
        }
      ]
    });

    service = TestBed.inject(AiSearchService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('posts a Share-compatible payload to the configured AlfDockia Search service', fakeAsync(() => {
    let resolved = false;
    service.search('contratos firmados en 2026', { skipCount: 5, maxItems: 10, fastSearch: true }).subscribe(() => {
      resolved = true;
    });

    tick();

    const request = http.expectOne('/search');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(
      jasmine.objectContaining({
        query: {
          language: 'alfdockia-ai',
          query: 'contratos firmados en 2026'
        },
        paging: {
          skipCount: 5,
          maxItems: 10
        },
        user: 'admin',
        isAdmin: true,
        authorities: jasmine.arrayContaining(['admin', 'GROUP_EVERYONE', 'GROUP_FINANCE', 'FINANCE', 'ROLE_ADMINISTRATOR']),
        rerankCandidates: 30,
        candidateTextChars: 1200
      })
    );

    request.flush({
      list: {
        pagination: {
          count: 0,
          hasMoreItems: false,
          totalItems: 0,
          skipCount: 5,
          maxItems: 10
        },
        entries: []
      }
    });

    tick();
    expect(resolved).toBeTrue();
  }));

  it('limits page size using the configured maximum', fakeAsync(() => {
    let resolved = false;
    service.search('contratos', { maxItems: 500 }).subscribe(() => {
      resolved = true;
    });

    tick();

    const request = http.expectOne('/search');
    expect(request.request.body.paging.maxItems).toBe(100);
    request.flush({ list: { pagination: { count: 0, hasMoreItems: false, totalItems: 0, skipCount: 0, maxItems: 100 }, entries: [] } });

    tick();
    expect(resolved).toBeTrue();
  }));

  it('returns a clean error when the search service answers with HTML', fakeAsync(() => {
    let emittedError: Error | null = null;
    service.search('contratos').subscribe({
      error: (error) => {
        emittedError = error;
      }
    });

    tick();

    const request = http.expectOne('/search');
    request.flush('<html><body>Service unavailable</body></html>', { status: 502, statusText: 'Bad Gateway' });

    tick();
    expect(emittedError?.message).toBe('Service unavailable');
  }));
});
