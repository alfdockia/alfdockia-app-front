/* cspell:disable */

import { firstValueFrom } from 'rxjs';
import { ALFDOCKIA_AGENTS_WEBSCRIPT } from './ai-agents.models';
import { AiAgentsService } from './ai-agents.service';

describe('AiAgentsService', () => {
  let service: AiAgentsService;
  let executeWebScript: jasmine.Spy;

  beforeEach(() => {
    executeWebScript = jasmine.createSpy('executeWebScript');
    service = createService({
      webScript: {
        executeWebScript
      }
    });
  });

  function createService(api: any): AiAgentsService {
    return new AiAgentsService({
      getInstance: () => ({
        ...api
      })
    } as any);
  }

  it('lists agents through the AlfDockia webscript', (done: DoneFn) => {
    executeWebScript.and.returnValue(Promise.resolve({ data: { count: 0, items: [] } }));

    service.listAgents(10, 25).subscribe((response) => {
      expect(response.count).toBe(0);
      expect(executeWebScript).toHaveBeenCalledWith(
        'GET',
        ALFDOCKIA_AGENTS_WEBSCRIPT,
        {
          skipCount: 10,
          maxItems: 25
        },
        'alfresco',
        's',
        null
      );
      done();
    });
  });

  it('uses default pagination when listing agents', async () => {
    executeWebScript.and.returnValue(Promise.resolve({ data: { count: 0, items: [] } }));

    await firstValueFrom(service.listAgents());

    expect(executeWebScript).toHaveBeenCalledWith(
      'GET',
      ALFDOCKIA_AGENTS_WEBSCRIPT,
      {
        skipCount: 0,
        maxItems: 100
      },
      'alfresco',
      's',
      null
    );
  });

  it('deploys agents with a JSON payload', (done: DoneFn) => {
    const payload = {
      name: 'classifier',
      image: 'repo/classifier:latest'
    };

    executeWebScript.and.returnValue(Promise.resolve({ data: { agentId: 'agent-1', name: payload.name } }));

    service.deployAgent(payload).subscribe((response) => {
      expect(response.agentId).toBe('agent-1');
      expect(executeWebScript).toHaveBeenCalledWith(
        'POST',
        ALFDOCKIA_AGENTS_WEBSCRIPT,
        null,
        'alfresco',
        's',
        JSON.stringify(payload)
      );
      done();
    });
  });

  it('runs lifecycle actions for an agent', async () => {
    executeWebScript.and.returnValue(Promise.resolve({ data: { agentId: 'agent-1', name: 'classifier' } }));

    await firstValueFrom(service.startAgent('agent-1'));
    await firstValueFrom(service.stopAgent('agent-1'));
    await firstValueFrom(service.restartAgent('agent-1', { name: 'classifier', image: 'repo/classifier:2' }));

    expect(executeWebScript.calls.argsFor(0)[1]).toBe(`${ALFDOCKIA_AGENTS_WEBSCRIPT}/agent-1/start`);
    expect(executeWebScript.calls.argsFor(1)[1]).toBe(`${ALFDOCKIA_AGENTS_WEBSCRIPT}/agent-1/stop`);
    expect(executeWebScript.calls.argsFor(2)).toEqual([
      'POST',
      `${ALFDOCKIA_AGENTS_WEBSCRIPT}/agent-1/restart`,
      null,
      'alfresco',
      's',
      '{"name":"classifier","image":"repo/classifier:2"}'
    ]);
  });

  it('deletes agents and falls back to the requested id when response has no id', async () => {
    executeWebScript.and.returnValue(Promise.resolve({ data: null }));

    const result = await firstValueFrom(service.deleteAgent('agent 1'));

    expect(result).toBe('agent 1');
    expect(executeWebScript).toHaveBeenCalledWith('DELETE', `${ALFDOCKIA_AGENTS_WEBSCRIPT}/agent%201`, null, 'alfresco', 's', null);
  });

  it('supports alternate webscript locations from Alfresco JS API', async () => {
    const alternateExecuteWebScript = jasmine.createSpy('alternateExecuteWebScript').and.returnValue(Promise.resolve({ data: { count: 0, items: [] } }));
    const alternateService = createService({
      core: {
        webscriptApi: {
          executeWebScript: alternateExecuteWebScript
        }
      }
    });

    await firstValueFrom(alternateService.listAgents());

    expect(alternateExecuteWebScript).toHaveBeenCalled();
  });

  it('uses the ACA 8 content client when the legacy webscript shortcut is unavailable', async () => {
    const callApi = jasmine.createSpy('callApi').and.returnValue(Promise.resolve({ data: { count: 0, items: [] } }));
    const aca8Service = createService({
      contentClient: {
        callApi
      }
    });

    await firstValueFrom(aca8Service.listAgents());

    expect(callApi).toHaveBeenCalledWith(
      `/s/${ALFDOCKIA_AGENTS_WEBSCRIPT}`,
      'GET',
      {},
      {
        skipCount: 0,
        maxItems: 100
      },
      {},
      {},
      null,
      ['application/json'],
      ['application/json'],
      null,
      'alfresco'
    );
  });

  it('reads errors from string responses', (done: DoneFn) => {
    executeWebScript.and.returnValue(Promise.resolve('{"error":{"statusCode":400,"code":"BODY_REQUIRED","message":"Request body is required"}}'));

    service.getAgent('agent-1').subscribe(
      () => fail('Expected the service to emit an error.'),
      (error) => {
        expect(error.message).toBe('Request body is required');
        done();
      }
    );
  });

  it('maps rejected AlfDockia errors', async () => {
    executeWebScript.and.returnValue(Promise.reject({ response: { body: '{"error":{"code":"BODY_REQUIRED"}}' } }));

    await expectAsync(firstValueFrom(service.getAgent('agent-1'))).toBeRejectedWithError('BODY_REQUIRED');
  });

  it('maps raw rejected errors', async () => {
    executeWebScript.and.returnValue(Promise.reject('Network error'));

    await expectAsync(firstValueFrom(service.getAgent('agent-1'))).toBeRejectedWithError('Network error');
  });

  it('maps Alfresco HTML 404 WebScript responses to a readable error', async () => {
    executeWebScript.and.returnValue(
      Promise.reject({
        response: {
          text: '<html><head><title>Web Script Status 404 - Not Found</title></head><body>does not map to a Web Script</body></html>'
        }
      })
    );

    await expectAsync(firstValueFrom(service.getAgent('agent-1'))).toBeRejectedWithError(
      'AlfDockia no ha encontrado el WebScript de agentes en Alfresco. Comprueba que el modulo AlfDockia esta desplegado.'
    );
  });

  it('maps Alfresco HTML 404 WebScript errors wrapped in Error instances', async () => {
    executeWebScript.and.returnValue(
      Promise.reject(
        new Error(
          '<!DOCTYPE html><html><head><title>Web Script Status 404 - Not Found</title></head><body>does not map to a Web Script</body></html>'
        )
      )
    );

    await expectAsync(firstValueFrom(service.getAgent('agent-1'))).toBeRejectedWithError(
      'AlfDockia no ha encontrado el WebScript de agentes en Alfresco. Comprueba que el modulo AlfDockia esta desplegado.'
    );
  });

  it('returns a clear error when there is no Alfresco client for WebScripts', async () => {
    const brokenService = createService({});

    await expectAsync(firstValueFrom(brokenService.getAgent('agent-1'))).toBeRejectedWithError(
      'No se ha encontrado un cliente autenticado para invocar los WebScripts de AlfDockia.'
    );
  });
});
