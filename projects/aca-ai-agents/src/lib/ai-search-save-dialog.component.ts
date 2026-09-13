/* cspell:disable */

import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation, inject } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { forbidOnlySpaces } from '@alfresco/adf-content-services';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AiSearchSaveDialogData, AiSearchSaveDialogResult } from './ai-search.models';

interface AiSearchSaveForm {
  name: FormControl<string>;
  description: FormControl<string>;
}

@Component({
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatInputModule],
  selector: 'aca-ai-search-save-dialog',
  templateUrl: './ai-search-save-dialog.component.html',
  styleUrls: ['./ai-search-save-dialog.component.scss'],
  encapsulation: ViewEncapsulation.None,
  host: { class: 'aca-ai-search-save-dialog' }
})
export class AiSearchSaveDialogComponent {
  private readonly data = inject<AiSearchSaveDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<AiSearchSaveDialogComponent, AiSearchSaveDialogResult>>(MatDialogRef);
  private readonly existingNames = new Set((this.data.existingNames || []).map((name) => name.trim().toLowerCase()));

  form = new FormGroup<AiSearchSaveForm>({
    name: new FormControl(this.data.defaultName, {
      nonNullable: true,
      validators: [Validators.required, forbidOnlySpaces, this.uniqueNameValidator()]
    }),
    description: new FormControl('', { nonNullable: true })
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close({
      name: this.form.controls.name.value.trim(),
      description: this.form.controls.description.value.trim()
    });
  }

  private uniqueNameValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = String(control.value || '').trim().toLowerCase();
      return value && this.existingNames.has(value) ? { duplicated: true } : null;
    };
  }
}
