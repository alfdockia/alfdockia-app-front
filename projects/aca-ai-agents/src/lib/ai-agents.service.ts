/* cspell:disable */

import { Injectable } from '@angular/core';
import { AlfrescoApiService } from '@alfresco/adf-content-services';
import { Observable, from, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  ALFDOCKIA_AGENTS_WEBSCRIPT,
  AiAgentDeployRequest,
  AiAgentDeployResponse,
  AiAgentDeleteResponse,
  AiAgentDetail,
  AiAgentList,
  AlfDockiaApiEnvelope
} from './ai-agents.models';

@Injectable({
  providedIn: 'root'
})
export class AiAgentsService {
  private readonly missingWebScriptMessage =
    'AlfDockia no ha encontrado el WebScript de agentes en Alfresco. Comprueba que el modulo AlfDockia esta desplegado.';

  constructor(private alfrescoApiService: AlfrescoApiService) {}

  listAgents(skipCount = 0, maxItems = 100): Observable<AiAgentList> {
    return this.request<AiAgentList>('GET', ALFDOCKIA_AGENTS_WEBSCRIPT, {
      skipCount,
      maxItems
    });
  }

  getAgent(agentId: string): Observable<AiAgentDetail> {
    return this.request<AiAgentDetail>('GET', this.agentPath(agentId));
  }

  deployAgent(payload: AiAgentDeployRequest): Observable<AiAgentDeployResponse> {
    return this.request<AiAgentDeployResponse>('POST', ALFDOCKIA_AGENTS_WEBSCRIPT, {}, payload);
  }

  deleteAgent(agentId: string): Observable<string> {
    return from(this.execute('DELETE', this.agentPath(agentId))).pipe(
      map((response) => {
        const data = this.unwrap<AiAgentDeleteResponse>(response);
        return data && data.agentId ? data.agentId : agentId;
      }),
      catchError((error) => throwError(() => this.toError(error)))
    );
  }

  startAgent(agentId: string): Observable<AiAgentDetail> {
    return this.request<AiAgentDetail>('POST', `${this.agentPath(agentId)}/start`);
  }

  stopAgent(agentId: string): Observable<AiAgentDetail> {
    return this.request<AiAgentDetail>('POST', `${this.agentPath(agentId)}/stop`);
  }

  restartAgent(agentId: string, payload?: AiAgentDeployRequest): Observable<AiAgentDetail> {
    return this.request<AiAgentDetail>('POST', `${this.agentPath(agentId)}/restart`, {}, payload);
  }

  private request<T>(method: string, path: string, queryParams: { [key: string]: any } = {}, payload?: any): Observable<T> {
    return from(this.execute(method, path, queryParams, payload)).pipe(
      map((response: AlfDockiaApiEnvelope<T>) => this.unwrap<T>(response)),
      catchError((error) => throwError(() => this.toError(error)))
    );
  }

  private execute(method: string, path: string, queryParams: { [key: string]: any } = {}, payload?: any): Promise<any> {
    const scriptArgs = queryParams && Object.keys(queryParams).length ? queryParams : null;
    const body = payload ? JSON.stringify(payload) : null;
    const alfrescoApi = this.alfrescoApiService.getInstance() as any;
    const webScript = alfrescoApi.webScript || alfrescoApi.webscriptApi || (alfrescoApi.core && alfrescoApi.core.webscriptApi);

    if (webScript && typeof webScript.executeWebScript === 'function') {
      return webScript.executeWebScript(method, path, scriptArgs, 'alfresco', 's', body);
    }

    if (alfrescoApi.contentClient && typeof alfrescoApi.contentClient.callApi === 'function') {
      return alfrescoApi.contentClient.callApi(
        `/s/${path}`,
        method,
        {},
        scriptArgs,
        {},
        {},
        body,
        ['application/json'],
        ['application/json'],
        null,
        'alfresco'
      );
    }

    return Promise.reject(new Error('No se ha encontrado un cliente autenticado para invocar los WebScripts de AlfDockia.'));
  }

  private unwrap<T>(response: AlfDockiaApiEnvelope<T> | string): T {
    const envelope = this.parseJson(response) || response;

    if (typeof envelope === 'string') {
      throw this.toReadableResponseError(envelope);
    }

    if (envelope && envelope.error) {
      throw new Error(envelope.error.message || envelope.error.code);
    }

    return envelope ? envelope.data : null;
  }

  private agentPath(agentId: string): string {
    return `${ALFDOCKIA_AGENTS_WEBSCRIPT}/${encodeURIComponent(agentId)}`;
  }

  private toError(error: any): Error {
    if (error instanceof Error) {
      if (this.shouldNormalizeText(error.message)) {
        return this.toReadableResponseError(error.message);
      }

      return error;
    }

    const response = error && error.response;
    const body = response?.body || response?.text || response || error?.body;
    const envelope = this.parseJson(body || error?.message || error);
    const apiError = envelope && envelope.error;

    if (apiError && (apiError.message || apiError.code)) {
      return new Error(apiError.message || apiError.code);
    }

    const readableText = this.getErrorText(body) || this.getErrorText(response?.text) || this.getErrorText(error?.message) || this.getErrorText(error);

    if (readableText) {
      return this.toReadableResponseError(readableText);
    }

    return new Error('No se ha podido completar la operación con AlfDockia.');
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

  private toReadableResponseError(value: string): Error {
    const plainText = this.stripHtml(value);

    if (this.isMissingWebScriptResponse(value) || this.isMissingWebScriptResponse(plainText)) {
      return new Error(this.missingWebScriptMessage);
    }

    return new Error(plainText || 'No se ha podido completar la operación con AlfDockia.');
  }

  private shouldNormalizeText(value: string): boolean {
    return this.isMissingWebScriptResponse(value) || /<!doctype html|<html|<\/[a-z][\s\S]*>/i.test(value);
  }

  private isMissingWebScriptResponse(value: string): boolean {
    return /does not map to a Web Script|Web Script Status 404|404 - Not Found/i.test(value);
  }

  private getErrorText(value: any): string {
    if (!value) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value.message === 'string') {
      return value.message;
    }

    if (typeof value.text === 'string') {
      return value.text;
    }

    return '';
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
