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

import { Component, inject, OnInit, ViewEncapsulation } from '@angular/core';
import { NavBarLinkRef } from '@alfresco/adf-extensions';
import { ExpandMenuComponent } from '../../../sidenav/components/expand-menu.component';
import { SavedSearchesContextService } from '../../../../services/saved-searches-context.service';

@Component({
  selector: 'aca-save-search-sidenav',
  imports: [ExpandMenuComponent],
  templateUrl: './save-search-sidenav.component.html',
  encapsulation: ViewEncapsulation.None
})
export class SaveSearchSidenavComponent implements OnInit {
  savedSearchesService = inject(SavedSearchesContextService);
  item: NavBarLinkRef;

  ngOnInit() {
    this.savedSearchesService.init();
    this.item = this.createNavBarLinkRef();
  }

  onActionClicked(_selectedLinkRef: NavBarLinkRef): void {
    this.savedSearchesService.currentContextSavedSearch = undefined;
  }

  private createNavBarLinkRef(): NavBarLinkRef {
    return {
      icon: 'manage_search',
      title: 'Administrador de búsquedas',
      description: 'Administrador de búsquedas',
      children: [
        {
          id: 'manage-saved-searches',
          icon: 'saved_search',
          title: 'Búsquedas guardadas',
          description: 'Búsquedas guardadas',
          route: 'saved-searches',
          url: 'saved-searches'
        },
        {
          id: 'alfdockia-ai-searches',
          icon: 'psychology',
          title: 'Búsquedas IA',
          description: 'Búsquedas IA',
          route: 'ai-search',
          url: 'ai-search'
        }
      ],
      route: '/',
      id: 'search-navbar'
    };
  }
}
