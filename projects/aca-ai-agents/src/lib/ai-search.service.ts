/* cspell:disable */

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AlfrescoApiService, GroupService } from '@alfresco/adf-content-services';
import { AppConfigService } from '@alfresco/adf-core';
import { Observable, from, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AiSearchPayload, AiSearchRequestOptions, AiSearchResponse } from './ai-search.models';

interface AiSearchPrincipal {
  user: string;
  authorities: string[];
  isAdmin: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AiSearchService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(AppConfigService);
  private readonly alfrescoApiService = inject(AlfrescoApiService);
  private readonly groupService = inject(GroupService);

  search(query: string, options: AiSearchRequestOptions = {}): Observable<AiSearchResponse> {
    return from(this.createPayload(query, options)).pipe(
      switchMap((payload) => this.http.post<AiSearchResponse>(this.searchUrl(), payload)),
      catchError((error) => throwError(() => this.toError(error)))
    );
  }

  private async createPayload(query: string, options: AiSearchRequestOptions): Promise<AiSearchPayload> {
    const principal = await this.currentPrincipal();
    const maxItems = this.clampNumber(options.maxItems, this.configNumber('alfdockiaAiSearch.defaultMaxItems', 25), 1, this.configNumber('alfdockiaAiSearch.maxItemsLimit', 100));
    const payload: AiSearchPayload = {
      query: {
        language: 'alfdockia-ai',
        query
      },
      paging: {
        skipCount: this.clampNumber(options.skipCount, 0, 0, null),
        maxItems
      },
      user: principal.user,
      authorities: principal.authorities,
      isAdmin: principal.isAdmin,
      permissions: {
        user: principal.user,
        authorities: principal.authorities,
        isAdmin: principal.isAdmin
      },
      filters: options.filters || {}
    };

    const rerankCandidates = options.rerankCandidates || (options.fastSearch ? this.configNumber('alfdockiaAiSearch.fastRerankCandidates', 30) : 0);
    const candidateTextChars = options.candidateTextChars || (options.fastSearch ? this.configNumber('alfdockiaAiSearch.fastCandidateTextChars', 1200) : 0);

    if (rerankCandidates > 0) {
      payload.rerankCandidates = Math.max(maxItems + 5, rerankCandidates);
    }
    if (candidateTextChars > 0) {
      payload.candidateTextChars = candidateTextChars;
    }

    return payload;
  }

  private async currentPrincipal(): Promise<AiSearchPrincipal> {
    const [userResult, groupsResult] = await Promise.allSettled([this.currentUser(), this.currentGroups()]);
    const user = userResult.status === 'fulfilled' ? userResult.value : null;
    const groups = groupsResult.status === 'fulfilled' ? groupsResult.value : [];
    const userId = user?.id || 'admin';
    const isAdmin = userId === 'admin' || user?.capabilities?.isAdmin === true || this.hasAdminGroup(groups);
    const authorities = this.authorities(userId, groups, isAdmin);

    return { user: userId, authorities, isAdmin };
  }

  private currentUser(): Promise<any> {
    const alfrescoApi = this.alfrescoApiService.getInstance() as any;
    const peopleApi = alfrescoApi.peopleApi || (alfrescoApi.core && alfrescoApi.core.peopleApi);

    if (!peopleApi || typeof peopleApi.getPerson !== 'function') {
      return Promise.reject(new Error('Alfresco People API is not available.'));
    }

    return peopleApi.getPerson('-me-', { fields: ['id', 'capabilities'] }).then((response) => response && response.entry);
  }

  private currentGroups(): Promise<any[]> {
    return this.groupService.listAllGroupMembershipsForPerson('-me-', { maxItems: 250 });
  }

  private authorities(userId: string, groups: any[], isAdmin: boolean): string[] {
    const authorities = new Set<string>();
    this.addAuthority(authorities, userId);
    this.addAuthority(authorities, 'GROUP_EVERYONE');

    groups.forEach((group) => {
      const entry = group?.entry || group;
      this.addAuthority(authorities, entry?.id);
      this.addAuthority(authorities, entry?.fullName);
      this.addAuthority(authorities, entry?.authorityId);
      this.addPrefixedGroupAuthority(authorities, entry?.shortName || entry?.displayName || entry?.name);
    });

    if (isAdmin) {
      this.addAuthority(authorities, 'ROLE_ADMINISTRATOR');
      this.addAuthority(authorities, 'ALFRESCO_ADMINISTRATORS');
      this.addAuthority(authorities, 'GROUP_ALFRESCO_ADMINISTRATORS');
    }

    return Array.from(authorities);
  }

  private hasAdminGroup(groups: any[]): boolean {
    return groups.some((group) => {
      const entry = group?.entry || group;
      return entry?.id === 'GROUP_ALFRESCO_ADMINISTRATORS' || entry?.id === 'ALFRESCO_ADMINISTRATORS';
    });
  }

  private addAuthority(authorities: Set<string>, value: unknown): void {
    const text = value === null || value === undefined ? '' : String(value).trim();

    if (text) {
      authorities.add(text);
    }
  }

  private addPrefixedGroupAuthority(authorities: Set<string>, value: unknown): void {
    const text = value === null || value === undefined ? '' : String(value).trim();

    if (!text) {
      return;
    }

    this.addAuthority(authorities, text);
    if (!text.startsWith('GROUP_')) {
      this.addAuthority(authorities, `GROUP_${text}`);
    }
  }

  private searchUrl(): string {
    return `${this.trimRightSlash(this.configString('alfdockiaAiSearch.baseUrl', ''))}${this.ensureLeftSlash(
      this.configString('alfdockiaAiSearch.searchPath', '/search')
    )}`;
  }

  private configString(key: string, fallback: string): string {
    const value = this.appConfig.get(key, fallback);
    return value === null || value === undefined ? fallback : String(value);
  }

  private configNumber(key: string, fallback: number): number {
    const value = Number(this.appConfig.get(key, fallback));
    return Number.isFinite(value) ? value : fallback;
  }

  private clampNumber(value: unknown, fallback: number, min: number, max: number | null): number {
    const number = Number(value);
    const resolved = Number.isFinite(number) ? number : fallback;
    const lowerBound = Math.max(min, resolved);
    return max === null ? lowerBound : Math.min(max, lowerBound);
  }

  private ensureLeftSlash(value: string): string {
    return value.startsWith('/') ? value : `/${value}`;
  }

  private trimRightSlash(value: string): string {
    return value.replace(/\/+$/, '');
  }

  private toError(error: any): Error {
    const body = error?.error;
    const parsedBody = this.parseJson(body);
    const apiError = parsedBody?.error || body?.error;
    const message =
      apiError?.briefSummary ||
      apiError?.message ||
      parsedBody?.message ||
      this.getText(body) ||
      this.getText(error?.message) ||
      'No se ha podido ejecutar la búsqueda IA de AlfDockia.';

    if (error?.status === 0) {
      return new Error('No se puede conectar con el servicio AlfDockia Search. Revisa SEARCH_URL o que el servicio search este levantado.');
    }

    return new Error(this.stripHtml(message));
  }

  private parseJson(value: any): any {
    if (!value || typeof value !== 'string') {
      return value;
    }

    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private getText(value: any): string {
    return typeof value === 'string' ? value : '';
  }

  private stripHtml(value: string): string {
    return value
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
