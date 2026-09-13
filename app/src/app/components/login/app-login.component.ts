/*!
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * Alfresco Example Content Application
 *
 * This file is part of the Alfresco Example Content Application.
 * If the software was purchased under a paid Alfresco license, the terms of
 * the paid license agreement will prevail. Otherwise, the software is
 * provided under the following open source license terms:
 *
 * The Alfresco Example Content Application is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * The Alfresco Example Content Application is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * from Hyland Software. If not, see <http://www.gnu.org/licenses/>.
 */

import { LoginComponent } from '@alfresco/adf-core';
import { Component, inject, ViewEncapsulation } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AppSettingsService } from '@alfresco/aca-shared';

@Component({
  imports: [LoginComponent, TranslatePipe],
  templateUrl: './app-login.component.html',
  styles: [
    `
      .adf-login {
        --alfdockia-blue: #075aa6;
        --alfdockia-cyan: #05a6d8;
        --alfdockia-green: #24b85a;
        --alfdockia-teal: #00998f;
        --alfdockia-ink: #102033;

        background-color: #f4f8fb;
      }

      .adf-login .adf-login-content {
        background:
          linear-gradient(145deg, rgba(5, 166, 216, 0.18), rgba(36, 184, 90, 0.12) 48%, rgba(7, 90, 166, 0.08)),
          #f4f8fb !important;
      }

      .adf-login .adf-login-card-wide {
        border: 1px solid #d9e8ef;
        border-radius: 8px;
        box-shadow: 0 18px 48px rgba(7, 90, 166, 0.16);
        padding: 30px 64px 42px;
        width: 520px;
      }

      .adf-login .adf-login-card-header-text {
        padding-bottom: 18px;
      }

      .adf-login .adf-alfresco-logo {
        padding: 0 12px 22px;
      }

      .adf-login .adf-login-content .adf-alfresco-logo img,
      .adf-login .adf-alfresco-logo img {
        height: auto !important;
        max-height: 220px !important;
        max-width: 360px !important;
        object-fit: contain;
        width: min(360px, 100%) !important;
      }

      .adf-login .adf-login-button {
        background: linear-gradient(90deg, var(--alfdockia-blue), var(--alfdockia-teal)) !important;
        border-radius: 6px;
        color: #ffffff !important;
        font-weight: 700;
        height: 42px;
        letter-spacing: 0;
      }

      .adf-login .adf-login-button:disabled {
        background: #a8b7c2 !important;
        color: #ffffff !important;
      }

      .adf-login .adf-copyright {
        color: var(--alfdockia-ink);
        font-weight: 600;
        opacity: 0.72;
      }

      @media (max-width: 600px) {
        .adf-login .adf-login-card-wide {
          padding: 24px;
          width: calc(100vw - 32px);
        }

        .adf-login .adf-login-content .adf-alfresco-logo img,
        .adf-login .adf-alfresco-logo img {
          max-height: 180px !important;
          max-width: 300px !important;
          width: min(300px, 100%) !important;
        }
      }
    `
  ],
  encapsulation: ViewEncapsulation.None
})
export class AppLoginComponent {
  settings = inject(AppSettingsService);
}
