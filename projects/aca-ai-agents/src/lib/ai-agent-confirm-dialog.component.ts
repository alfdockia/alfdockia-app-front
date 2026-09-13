import { Component, ViewEncapsulation, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface AiAgentConfirmDialogData {
  title: string;
  message: string;
  confirmLabel: string;
  icon?: string;
}

@Component({
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  selector: 'aca-ai-agent-confirm-dialog',
  templateUrl: './ai-agent-confirm-dialog.component.html',
  styleUrls: ['./ai-agent-confirm-dialog.component.scss'],
  encapsulation: ViewEncapsulation.None,
  host: { class: 'aca-ai-agent-confirm-dialog' }
})
export class AiAgentConfirmDialogComponent {
  public readonly data = inject<AiAgentConfirmDialogData>(MAT_DIALOG_DATA);
}
