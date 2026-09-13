/* cspell:disable */

import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { SavedSearch } from '@alfresco/adf-content-services';
import { NotificationService } from '@alfresco/adf-core';
import { AppService, ContentApiService, PageComponent } from '@alfresco/aca-shared';
import { NavigateToFolder } from '@alfresco/aca-shared/store';
import { NodeEntry } from '@alfresco/js-api';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize, take } from 'rxjs/operators';
import { SavedSearchesContextService } from '@alfresco/aca-content';
import { decodeAiSearchState, encodeAiSearchState } from './ai-search-codec';
import { AiSearchNodeEntry, AiSearchPagination, AiSearchSaveDialogResult } from './ai-search.models';
import { AiSearchSaveDialogComponent } from './ai-search-save-dialog.component';
import { AiSearchService } from './ai-search.service';

interface AiSearchMetadataItem {
  label: string;
  value: string;
}

@Component({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTooltipModule
  ],
  selector: 'aca-ai-search-page',
  templateUrl: './ai-search-page.component.html',
  styleUrls: ['./ai-search-page.component.scss'],
  encapsulation: ViewEncapsulation.None,
  host: { class: 'aca-ai-search-page' }
})
export class AiSearchPageComponent extends PageComponent implements OnInit, OnDestroy {
  private readonly aiSearchService = inject(AiSearchService);
  private readonly appService = inject(AppService);
  private readonly contentApi = inject(ContentApiService);
  private readonly dialog = inject(MatDialog);
  private readonly notificationService = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly savedSearchesService = inject(SavedSearchesContextService);

  readonly appNavBarMode$ = this.appService.appNavNarMode$;
  readonly pageSizeOptions = [10, 25, 50, 100];

  queryControl = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  maxItemsControl = new FormControl(25, { nonNullable: true });

  results: AiSearchNodeEntry[] = [];
  selectedResult: AiSearchNodeEntry = null;
  savedSearches: SavedSearch[] = [];
  pagination: AiSearchPagination = {
    count: 0,
    hasMoreItems: false,
    totalItems: 0,
    skipCount: 0,
    maxItems: 25
  };
  loading = false;
  errorMessage = '';
  lastExecutedQuery = '';
  metadataEntries: AiSearchMetadataItem[] = [];
  metadataLoading = false;
  metadataLoadError = '';
  private routeEncodedQuery = '';
  private metadataRequestId = 0;

  override ngOnInit(): void {
    super.ngOnInit();
    this.savedSearchesService.init();

    this.savedSearchesService.savedSearches$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((savedSearches) => {
      this.savedSearches = savedSearches || [];
    });

    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const encodedQuery = params.q;

      if (!encodedQuery || encodedQuery === this.routeEncodedQuery) {
        return;
      }

      const savedState = decodeAiSearchState(encodedQuery);

      if (!savedState?.userQuery) {
        return;
      }

      this.routeEncodedQuery = encodedQuery;
      this.queryControl.setValue(savedState.userQuery, { emitEvent: false });
      this.maxItemsControl.setValue(savedState.maxItems || 25, { emitEvent: false });
      this.executeSearch(0);
    });
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
  }

  submitSearch(): void {
    if (this.queryControl.invalid) {
      this.queryControl.markAsTouched();
      return;
    }

    const encodedQuery = this.currentEncodedQuery();

    if (encodedQuery !== this.routeEncodedQuery) {
      this.routeEncodedQuery = encodedQuery;
      this.router.navigate(['/ai-search'], { queryParams: { q: encodedQuery } });
    }

    this.executeSearch(0);
  }

  executeSearch(skipCount: number): void {
    const query = this.currentQuery();

    if (!query) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.lastExecutedQuery = query;

    this.aiSearchService
      .search(query, {
        skipCount,
        maxItems: this.maxItemsControl.value,
        fastSearch: true
      })
      .pipe(
        finalize(() => (this.loading = false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          this.pagination = response.list.pagination;
          this.results = response.list.entries || [];
          this.selectResult(this.results[0] || null);
        },
        error: (error) => this.showError(error)
      });
  }

  previousPage(): void {
    const previousSkipCount = Math.max(0, this.pagination.skipCount - this.pagination.maxItems);
    this.executeSearch(previousSkipCount);
  }

  nextPage(): void {
    this.executeSearch(this.pagination.skipCount + this.pagination.maxItems);
  }

  selectResult(result: AiSearchNodeEntry): void {
    this.selectedResult = result;
    this.loadSelectedMetadata(result);
  }

  openResult(result: AiSearchNodeEntry): void {
    if (!result?.entry) {
      return;
    }

    const node = this.toNodeEntry(result);

    if (!node.entry.id) {
      this.notificationService.showError('No se ha encontrado el identificador del documento.');
      return;
    }

    if (node.entry.isFolder) {
      this.store.dispatch(new NavigateToFolder(node));
      return;
    }

    this.showPreview(node, { location: this.router.url });
  }

  openSaveDialog(): void {
    if (!this.currentQuery()) {
      this.queryControl.markAsTouched();
      return;
    }

    const dialogRef = this.dialog.open(AiSearchSaveDialogComponent, {
      width: '520px',
      maxWidth: 'calc(100vw - 32px)',
      data: {
        defaultName: this.defaultSavedSearchName(),
        existingNames: this.savedSearches.map((search) => search.name)
      }
    });

    dialogRef
      .afterClosed()
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((result: AiSearchSaveDialogResult) => {
        if (result) {
          this.saveSearch(result);
        }
      });
  }

  reopenNavigation(): void {
    this.appService.toggleAppNavBar$.next();
  }

  isCurrentSearchSaved(): boolean {
    const encodedUrl = encodeURIComponent(this.currentEncodedQuery());
    return this.savedSearches.some((search) => search.encodedUrl === encodedUrl);
  }

  canGoPrevious(): boolean {
    return this.pagination.skipCount > 0 && !this.loading;
  }

  canGoNext(): boolean {
    return this.pagination.hasMoreItems && !this.loading;
  }

  resultRange(): string {
    if (!this.pagination.totalItems) {
      return '0';
    }

    const start = this.pagination.skipCount + 1;
    const end = this.pagination.skipCount + this.pagination.count;
    return `${start}-${end} de ${this.pagination.totalItems}`;
  }

  trackByResultId(_index: number, result: AiSearchNodeEntry): string {
    return result.entry.id;
  }

  trackByMetadataLabel(_index: number, item: AiSearchMetadataItem): string {
    return item.label;
  }

  private toNodeEntry(result: AiSearchNodeEntry): NodeEntry {
    const entry = result.entry as any;
    const isFolder = entry.isFolder === true || entry.nodeType === 'cm:folder';
    const id = entry.nodeId || entry.guid || entry.id;

    return {
      entry: {
        ...entry,
        id,
        nodeId: entry.nodeId || id,
        isFolder,
        isFile: entry.isFile === true || (!isFolder && (entry.nodeType === 'cm:content' || !!entry.content))
      }
    } as NodeEntry;
  }

  private saveSearch(result: AiSearchSaveDialogResult): void {
    this.savedSearchesService
      .saveSearch({
        name: result.name,
        description: result.description,
        encodedUrl: encodeURIComponent(this.currentEncodedQuery())
      })
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.notificationService.showInfo('APP.BROWSE.SEARCH.SAVE_SEARCH.SAVE_SUCCESS'),
        error: () => this.notificationService.showError('APP.BROWSE.SEARCH.SAVE_SEARCH.SAVE_ERROR')
      });
  }

  private loadSelectedMetadata(result: AiSearchNodeEntry): void {
    const requestId = ++this.metadataRequestId;
    this.metadataLoadError = '';

    if (!result?.entry) {
      this.metadataEntries = [];
      this.metadataLoading = false;
      return;
    }

    const fallbackNode = this.toNodeEntry(result);
    this.metadataEntries = this.buildMetadataEntries(fallbackNode.entry);

    if (!fallbackNode.entry.id) {
      return;
    }

    this.metadataLoading = true;
    this.contentApi
      .getNode(fallbackNode.entry.id)
      .pipe(
        take(1),
        finalize(() => {
          if (requestId === this.metadataRequestId) {
            this.metadataLoading = false;
          }
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (nodeEntry) => {
          if (requestId !== this.metadataRequestId) {
            return;
          }

          this.metadataEntries = this.buildMetadataEntries({
            ...fallbackNode.entry,
            ...nodeEntry.entry,
            properties: {
              ...(fallbackNode.entry.properties || {}),
              ...(nodeEntry.entry.properties || {})
            }
          });
        },
        error: () => {
          if (requestId === this.metadataRequestId) {
            this.metadataLoadError = 'No se han podido cargar los metadatos completos. Mostrando metadatos indexados.';
          }
        }
      });
  }

  private buildMetadataEntries(entry: any): AiSearchMetadataItem[] {
    const metadata = [
      this.metadataItem('Nombre', entry.name),
      this.metadataItem('ID', entry.id),
      this.metadataItem('Tipo', entry.nodeType),
      this.metadataItem('Ruta', entry.path?.name),
      this.metadataItem('Creado', entry.createdAt),
      this.metadataItem('Modificado', entry.modifiedAt),
      this.metadataItem('Creador', entry.createdByUser?.displayName || entry.createdByUser?.id),
      this.metadataItem('Modificador', entry.modifiedByUser?.displayName || entry.modifiedByUser?.id),
      this.metadataItem('Contenido', entry.content?.mimeTypeName || entry.content?.mimeType),
      this.metadataItem('Tamaño', this.formatFileSize(entry.content?.sizeInBytes)),
      this.metadataItem('Aspectos', entry.aspectNames),
      this.metadataItem('Operaciones permitidas', entry.allowableOperations)
    ];

    Object.entries(entry.properties || {})
      .sort(([left], [right]) => left.localeCompare(right))
      .forEach(([key, value]) => metadata.push(this.metadataItem(key, value)));

    return metadata.filter((item) => item.value);
  }

  private metadataItem(label: string, value: unknown): AiSearchMetadataItem {
    return {
      label,
      value: this.formatMetadataValue(value)
    };
  }

  private formatMetadataValue(value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.formatMetadataValue(item)).filter(Boolean).join(', ');
    }

    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }

    return String(value);
  }

  private formatFileSize(value: unknown): string {
    const size = Number(value);

    if (!Number.isFinite(size) || size <= 0) {
      return '';
    }

    if (size < 1024) {
      return `${size} B`;
    }

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  private currentQuery(): string {
    return this.queryControl.value.trim();
  }

  private currentEncodedQuery(): string {
    return encodeAiSearchState(this.currentQuery(), this.maxItemsControl.value);
  }

  private defaultSavedSearchName(): string {
    const query = this.currentQuery();
    return query.length > 48 ? `${query.slice(0, 45)}...` : query;
  }

  private showError(error: Error): void {
    const message = error?.message || 'No se ha podido ejecutar la búsqueda IA de AlfDockia.';
    this.errorMessage = message;
    this.results = [];
    this.selectedResult = null;
    this.metadataEntries = [];
    this.metadataLoading = false;
    this.metadataLoadError = '';
    this.pagination = {
      count: 0,
      hasMoreItems: false,
      totalItems: 0,
      skipCount: 0,
      maxItems: this.maxItemsControl.value
    };
    this.notificationService.showError(message);
  }
}
