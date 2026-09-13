import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppService } from '@alfresco/aca-shared';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs/operators';
import { AiAgentConfirmDialogComponent } from './ai-agent-confirm-dialog.component';
import { AiAgentJsonDialogComponent } from './ai-agent-json-dialog.component';
import { AiAgentDeployRequest, AiAgentDetail, AiAgentSummary, DEFAULT_AGENT_JSON } from './ai-agents.models';
import { AiAgentsService } from './ai-agents.service';

@Component({
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatIconModule, MatProgressBarModule, MatSnackBarModule, MatTooltipModule],
  selector: 'aca-ai-agents-page',
  templateUrl: './ai-agents-page.component.html',
  styleUrls: ['./ai-agents-page.component.scss'],
  encapsulation: ViewEncapsulation.None,
  host: { class: 'aca-ai-agents-page' }
})
export class AiAgentsPageComponent implements OnInit {
  private readonly agentsService = inject(AiAgentsService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly appService = inject(AppService);
  private readonly destroyRef = inject(DestroyRef);

  readonly appNavBarMode$ = this.appService.appNavNarMode$;

  agents: AiAgentSummary[] = [];
  selectedAgent: AiAgentDetail = null;
  loading = false;
  detailLoading = false;
  workingAgentId: string = null;
  errorMessage = '';

  ngOnInit(): void {
    this.loadAgents();
  }

  loadAgents(selectAgentId?: string): void {
    this.loading = true;
    this.errorMessage = '';

    this.agentsService
      .listAgents()
      .pipe(
        finalize(() => (this.loading = false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(
        (response) => {
          this.agents = response.items || [];
          const selectedId = selectAgentId || (this.selectedAgent && this.selectedAgent.agentId);
          const selected = selectedId ? this.agents.find((agent) => agent.agentId === selectedId) : this.agents[0];

          if (selected) {
            this.selectAgent(selected, false);
          } else {
            this.selectedAgent = null;
          }
        },
        (error) => this.showError(error)
      );
  }

  selectAgent(agent: AiAgentSummary, notifyOnError = true): void {
    this.selectedAgent = { ...agent };
    this.detailLoading = true;

    this.agentsService
      .getAgent(agent.agentId)
      .pipe(
        finalize(() => (this.detailLoading = false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(
        (detail) => (this.selectedAgent = detail),
        (error) => {
          if (notifyOnError) {
            this.showError(error);
          }
        }
      );
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(AiAgentJsonDialogComponent, {
      width: '760px',
      maxWidth: 'calc(100vw - 32px)',
      data: {
        title: 'Nuevo agente de IA',
        actionLabel: 'Desplegar agente',
        json: DEFAULT_AGENT_JSON,
        helperText: 'Define nombre, imagen, puertos, listener y variables de entorno antes de desplegar.'
      }
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload: AiAgentDeployRequest) => {
        if (payload) {
          this.deployAgent(payload);
        }
      });
  }

  openRestartDialog(agent: AiAgentDetail | AiAgentSummary): void {
    const dialogRef = this.dialog.open(AiAgentJsonDialogComponent, {
      width: '760px',
      maxWidth: 'calc(100vw - 32px)',
      data: {
        title: `Reiniciar ${agent.name}`,
        actionLabel: 'Reiniciar agente',
        json: this.getAgentJson(agent),
        helperText: 'Puedes ajustar el JSON y AlfDockia recreará el agente con esa configuración.'
      }
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload: AiAgentDeployRequest) => {
        if (payload) {
          this.runRuntimeAction(agent.agentId, 'restart', payload);
        }
      });
  }

  startAgent(agent: AiAgentDetail | AiAgentSummary): void {
    this.runRuntimeAction(agent.agentId, 'start');
  }

  stopAgent(agent: AiAgentDetail | AiAgentSummary): void {
    this.runRuntimeAction(agent.agentId, 'stop');
  }

  deleteAgent(agent: AiAgentDetail | AiAgentSummary): void {
    const dialogRef = this.dialog.open(AiAgentConfirmDialogComponent, {
      width: '440px',
      data: {
        title: 'Eliminar agente',
        message: `Se eliminará "${agent.name}" y su runtime asociado.`,
        confirmLabel: 'Eliminar',
        icon: 'delete_forever'
      }
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.workingAgentId = agent.agentId;
          this.agentsService
            .deleteAgent(agent.agentId)
            .pipe(
              finalize(() => (this.workingAgentId = null)),
              takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(
              () => {
                this.snackBar.open(`Agente "${agent.name}" eliminado.`, undefined, { duration: 3000 });
                this.selectedAgent = null;
                this.loadAgents();
              },
              (error) => this.showError(error)
            );
        }
      });
  }

  isSelected(agent: AiAgentSummary): boolean {
    return !!this.selectedAgent && this.selectedAgent.agentId === agent.agentId;
  }

  isWorking(agent: AiAgentSummary): boolean {
    return this.workingAgentId === agent.agentId;
  }

  reopenNavigation(): void {
    this.appService.toggleAppNavBar$.next();
  }

  getStateClass(agent: AiAgentSummary): string {
    const state = (agent.currentState || agent.desiredState || '').toLowerCase();
    const health = (agent.health || '').toLowerCase();

    if (health === 'healthy' || state === 'running') {
      return 'is-running';
    }

    if (state === 'stopped' || state === 'exited') {
      return 'is-stopped';
    }

    if (state === 'error' || state === 'failed' || health === 'unhealthy') {
      return 'is-failed';
    }

    return 'is-unknown';
  }

  trackByAgentId(_index: number, agent: AiAgentSummary): string {
    return agent.agentId;
  }

  private deployAgent(payload: AiAgentDeployRequest): void {
    this.workingAgentId = '__create__';
    this.errorMessage = '';

    this.agentsService
      .deployAgent(payload)
      .pipe(
        finalize(() => (this.workingAgentId = null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(
        (response) => {
          this.snackBar.open(`Agente "${response.name}" desplegado.`, undefined, { duration: 3000 });
          this.loadAgents(response.agentId);
        },
        (error) => this.showError(error)
      );
  }

  private runRuntimeAction(agentId: string, action: 'start' | 'stop' | 'restart', payload?: AiAgentDeployRequest): void {
    this.workingAgentId = agentId;
    this.errorMessage = '';

    const request =
      action === 'start'
        ? this.agentsService.startAgent(agentId)
        : action === 'stop'
        ? this.agentsService.stopAgent(agentId)
        : this.agentsService.restartAgent(agentId, payload);

    request
      .pipe(
        finalize(() => (this.workingAgentId = null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(
        (detail) => {
          this.selectedAgent = detail;
          this.agents = this.agents.map((agent) => (agent.agentId === detail.agentId ? { ...agent, ...detail } : agent));
          this.snackBar.open(`Acción "${this.getActionLabel(action)}" ejecutada.`, undefined, { duration: 3000 });
        },
        (error) => this.showError(error)
      );
  }

  getAgentJson(agent: AiAgentDetail | AiAgentSummary): string {
    const configJson = (agent as AiAgentDetail).configJson;
    const config = (agent as AiAgentDetail).config;

    if (configJson) {
      try {
        return JSON.stringify(JSON.parse(configJson), null, 2);
      } catch {
        return configJson;
      }
    }

    if (config) {
      return JSON.stringify(config, null, 2);
    }

    return JSON.stringify(
      {
        name: agent.name,
        image: agent.image,
        ports: [],
        listener: {
          passwordEnvName: 'CONTENT_SERVICE_SECURITY_BASICAUTH_PASSWORD'
        },
        env: {}
      },
      null,
      2
    );
  }

  private getActionLabel(action: 'start' | 'stop' | 'restart'): string {
    const labels = {
      start: 'arrancar',
      stop: 'parar',
      restart: 'reiniciar'
    };

    return labels[action];
  }

  private showError(error: Error): void {
    const message = error && error.message ? error.message : 'No se ha podido completar la operación.';
    this.errorMessage = message;
    this.snackBar.open(message, undefined, { duration: 5000 });
  }
}
