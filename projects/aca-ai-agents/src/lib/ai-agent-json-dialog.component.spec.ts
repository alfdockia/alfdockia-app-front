/* cspell:disable */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AiAgentJsonDialogComponent } from './ai-agent-json-dialog.component';

describe('AiAgentJsonDialogComponent', () => {
  let component: AiAgentJsonDialogComponent;
  let fixture: ComponentFixture<AiAgentJsonDialogComponent>;
  let dialogRef: { close: jasmine.Spy };

  beforeEach(async () => {
    dialogRef = {
      close: jasmine.createSpy('close')
    };

    await TestBed.configureTestingModule({
      imports: [AiAgentJsonDialogComponent, NoopAnimationsModule],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            title: 'Nuevo agente',
            actionLabel: 'Desplegar',
            json: '{"name":"classifier","image":"repo/classifier:latest"}'
          }
        },
        { provide: MatDialogRef, useValue: dialogRef }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AiAgentJsonDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('validates malformed JSON', () => {
    component.jsonControl.setValue('{');

    expect(component.jsonControl.hasError('json')).toBe(true);
  });

  it('closes with the parsed payload', () => {
    component.submit();

    expect(dialogRef.close).toHaveBeenCalledWith({
      name: 'classifier',
      image: 'repo/classifier:latest'
    });
  });
});
