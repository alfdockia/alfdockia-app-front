import { EnvironmentProviders, NgModule, Provider, inject, provideEnvironmentInitializer } from '@angular/core';
import { AcaViewerComponent } from '@alfresco/aca-content/viewer';
import { provideTranslations } from '@alfresco/adf-core';
import { ExtensionService, provideExtensionConfig } from '@alfresco/adf-extensions';
import { aiAgentsAdminGuard } from './ai-agents-admin.guard';
import { AiAgentsPageComponent } from './ai-agents-page.component';
import { AiSearchPageComponent } from './ai-search-page.component';
import { canManageAiAgents } from './ai-agents.rules';

export function provideAcaAiAgentsExtension(): (Provider | EnvironmentProviders)[] {
  return [
    provideTranslations('aca-ai-agents', 'assets/aca-ai-agents'),
    provideExtensionConfig(['ai-agents.plugin.json']),
    provideEnvironmentInitializer(registerAcaAiAgentsExtension)
  ];
}

function registerAcaAiAgentsExtension(): void {
  const extensions = inject(ExtensionService);

  extensions.setComponents({
    'aca.ai-agents.page': AiAgentsPageComponent,
    'aca.ai-search.page': AiSearchPageComponent,
    'aca.ai-search.viewer': AcaViewerComponent
  });
  extensions.setAuthGuards({
    'aca.ai-agents.auth.admin': aiAgentsAdminGuard
  });
  extensions.setEvaluators({
    'alfdockia.ai-agents.canManage': canManageAiAgents
  });
}

/* @deprecated use `provideAcaAiAgentsExtension()` provider api instead */
@NgModule({
  providers: [...provideAcaAiAgentsExtension()]
})
export class AcaAiAgentsModule {}
