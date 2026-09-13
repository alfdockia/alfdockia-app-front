import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation, inject } from '@angular/core';
import { AbstractControl, FormControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AiAgentDeployRequest, DEFAULT_AGENT_JSON } from './ai-agents.models';

export interface AiAgentJsonDialogData {
  title: string;
  actionLabel: string;
  json?: string;
  helperText?: string;
}

@Component({
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatInputModule],
  selector: 'aca-ai-agent-json-dialog',
  templateUrl: './ai-agent-json-dialog.component.html',
  styleUrls: ['./ai-agent-json-dialog.component.scss'],
  encapsulation: ViewEncapsulation.None,
  host: { class: 'aca-ai-agent-json-dialog' }
})
export class AiAgentJsonDialogComponent {
  public readonly data = inject<AiAgentJsonDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<AiAgentJsonDialogComponent, AiAgentDeployRequest>>(MatDialogRef);

  jsonControl = new FormControl<string>(this.data.json || DEFAULT_AGENT_JSON, {
    nonNullable: true,
    validators: [Validators.required, this.jsonValidator()]
  });

  useExample(): void {
    this.jsonControl.setValue(DEFAULT_AGENT_JSON);
    this.jsonControl.markAsDirty();
  }

  formatJson(): void {
    const value = this.parseValue();

    if (value) {
      this.jsonControl.setValue(JSON.stringify(value, null, 2));
    }
  }

  submit(): void {
    if (this.jsonControl.invalid) {
      this.jsonControl.markAsTouched();
      return;
    }

    this.dialogRef.close(this.parseValue() as AiAgentDeployRequest);
  }

  private jsonValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      try {
        JSON.parse(control.value);
        return null;
      } catch {
        return { json: true };
      }
    };
  }

  private parseValue(): any {
    try {
      return JSON.parse(this.jsonControl.value);
    } catch {
      return null;
    }
  }
}
