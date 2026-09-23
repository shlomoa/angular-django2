import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';

import type { UiCommand } from '../ui-command-catalog';

@Component({
  selector: 'app-command-visualizer',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatIconModule,
    MatTabsModule,
  ],
  template: `
    @if (applied()) {
      <div class="command-visualizer" aria-label="Command application visualization">
        <header class="command-visualizer__header">
          <div class="command-visualizer__badge">
            <mat-icon class="badge-icon">auto_awesome</mat-icon>
            <span>Live Interactive Visualization</span>
          </div>
          <span class="command-visualizer__subtitle">
            Result of running <code>{{ command().command }}</code>
          </span>
        </header>

        <!-- Visual Sandbox for Visual Commands -->
        @if (isVisualCommand()) {
          <div class="command-visualizer__sandbox">
            @switch (command().id) {
              @case ('material-app') {
                <div class="mini-app-frame">
                  <div class="mini-app-toolbar">
                    <button
                      mat-icon-button
                      class="mini-icon-btn"
                      (click)="toggleMiniDrawer()"
                      aria-label="Toggle demo menu"
                    >
                      <mat-icon>menu</mat-icon>
                    </button>
                    <span class="mini-app-title">my-app</span>
                    <span class="toolbar-spacer"></span>
                    <mat-chip-set>
                      <mat-chip highlighted>M3 Light</mat-chip>
                    </mat-chip-set>
                  </div>

                  <div class="mini-app-body">
                    @if (miniDrawerOpen()) {
                      <div class="mini-app-drawer">
                        <div class="mini-drawer-item active">
                          <mat-icon>dashboard</mat-icon>
                          <span>Dashboard</span>
                        </div>
                        <div class="mini-drawer-item">
                          <mat-icon>inventory_2</mat-icon>
                          <span>Orders</span>
                        </div>
                        <div class="mini-drawer-item">
                          <mat-icon>people</mat-icon>
                          <span>Customers</span>
                        </div>
                      </div>
                    }

                    <div class="mini-app-content">
                      <div class="mini-content-header">
                        <h4>Material Dashboard</h4>
                        <p>Django API connected via standalone HTTP client.</p>
                      </div>
                      <div class="mini-card-grid">
                        <mat-card appearance="outlined" class="mini-card">
                          <mat-card-header>
                            <mat-icon mat-card-avatar>trending_up</mat-icon>
                            <mat-card-title>Orders API</mat-card-title>
                            <mat-card-subtitle>Active</mat-card-subtitle>
                          </mat-card-header>
                          <mat-card-content>
                            <p>32 synchronized records</p>
                          </mat-card-content>
                          <mat-card-actions>
                            <button mat-button color="primary">Manage</button>
                          </mat-card-actions>
                        </mat-card>

                        <mat-card appearance="outlined" class="mini-card">
                          <mat-card-header>
                            <mat-icon mat-card-avatar>verified_user</mat-icon>
                            <mat-card-title>CSRF Boundary</mat-card-title>
                            <mat-card-subtitle>Configured</mat-card-subtitle>
                          </mat-card-header>
                          <mat-card-content>
                            <p>X-CSRFToken headers protected</p>
                          </mat-card-content>
                          <mat-card-actions>
                            <button mat-button color="primary">Verify</button>
                          </mat-card-actions>
                        </mat-card>
                      </div>
                    </div>
                  </div>
                </div>
              }

              @case ('app-shell') {
                <div class="mini-shell-frame">
                  <div class="mini-shell-bar">
                    <mat-icon>grid_view</mat-icon>
                    <span>Responsive Material Sidenav Shell</span>
                  </div>
                  <div class="mini-shell-layout">
                    <div class="mini-shell-rail">
                      <mat-icon>home</mat-icon>
                      <mat-icon>folder</mat-icon>
                      <mat-icon>settings</mat-icon>
                    </div>
                    <div class="mini-shell-main">
                      <div class="mini-shell-placeholder">
                        <mat-icon>view_quilt</mat-icon>
                        <p>&lt;router-outlet /&gt; ready for feature components</p>
                      </div>
                    </div>
                  </div>
                </div>
              }

              @case ('component') {
                <div class="interactive-component-demo">
                  <mat-card appearance="outlined" class="demo-card">
                    <mat-card-header>
                      <mat-icon mat-card-avatar>extension</mat-icon>
                      <mat-card-title>Generated Standalone Component</mat-card-title>
                      <mat-card-subtitle>ChangeDetectionStrategy.OnPush</mat-card-subtitle>
                    </mat-card-header>
                    <mat-card-content>
                      <p>
                        This standalone component was generated with package defaults. Test its
                        reactive signal state:
                      </p>
                      <div class="demo-counter">
                        <span class="counter-label">Counter Signal:</span>
                        <span class="counter-value">{{ counter() }}</span>
                      </div>
                    </mat-card-content>
                    <mat-card-actions class="demo-actions">
                      <button mat-stroked-button (click)="decrement()" [disabled]="counter() === 0">
                        <mat-icon>remove</mat-icon> Decrement
                      </button>
                      <button mat-flat-button color="primary" (click)="increment()">
                        <mat-icon>add</mat-icon> Increment
                      </button>
                    </mat-card-actions>
                  </mat-card>
                </div>
              }

              @case ('material-setup') {
                <div class="interactive-theme-demo">
                  <h4>Interactive Material 3 Theme Palettes</h4>
                  <p>Preview how Angular Material 3 color system adapts:</p>
                  <div class="palette-swatches">
                    @for (palette of palettes; track palette.name) {
                      <button
                        type="button"
                        class="palette-btn"
                        [class.palette-btn--active]="activePalette() === palette.name"
                        (click)="activePalette.set(palette.name)"
                      >
                        <span class="swatch" [style.background-color]="palette.primary"></span>
                        <span class="swatch-label">{{ palette.label }}</span>
                      </button>
                    }
                  </div>
                  <div
                    class="palette-preview-card"
                    [style.border-color]="selectedPalette().primary"
                    [style.background-color]="selectedPalette().container"
                  >
                    <div class="palette-preview-header">
                      <span [style.color]="selectedPalette().primary" class="preview-title">
                        Active Theme: {{ selectedPalette().label }}
                      </span>
                      <mat-chip highlighted>Density: 0</mat-chip>
                    </div>
                    <p class="preview-text">
                      System tokens dynamically injected via
                      <code>&#64;include mat.theme()</code>.
                    </p>
                  </div>
                </div>
              }

              @case ('application') {
                <div class="interactive-app-demo">
                  <div class="app-bootstrap-grid">
                    <div class="bootstrap-item">
                      <mat-icon class="item-icon">speed</mat-icon>
                      <strong>Zoneless Mode</strong>
                      <span>Experimental zoneless change detection enabled</span>
                    </div>
                    <div class="bootstrap-item">
                      <mat-icon class="item-icon">alt_route</mat-icon>
                      <strong>Standalone Routing</strong>
                      <span>Router tree configured without NgModule wrapper</span>
                    </div>
                    <div class="bootstrap-item">
                      <mat-icon class="item-icon">palette</mat-icon>
                      <strong>SCSS Styling</strong>
                      <span>Pre-configured with Sass inline style support</span>
                    </div>
                  </div>
                </div>
              }
            }
          </div>
        }

        <!-- Interactive Terminal & Architecture Log -->
        <div class="command-visualizer__terminal">
          <div class="terminal-bar">
            <span class="terminal-dot red"></span>
            <span class="terminal-dot yellow"></span>
            <span class="terminal-dot green"></span>
            <span class="terminal-title">CLI Execution Simulation</span>
          </div>
          <pre class="terminal-body"><code>{{ cliOutput() }}</code></pre>
        </div>

        <!-- Generated Files Tree View -->
        <div class="command-visualizer__filetree">
          <div class="filetree-header">
            <mat-icon>folder_open</mat-icon>
            <span>Workspace File Tree Updates</span>
          </div>
          <ul class="filetree-list">
            @for (file of fileTreeUpdates(); track file.path) {
              <li class="filetree-item">
                <span class="file-action" [class.create]="file.action === 'CREATE'">
                  {{ file.action }}
                </span>
                <span class="file-path">{{ file.path }}</span>
              </li>
            }
          </ul>
        </div>
      </div>
    }
  `,
  styleUrl: './command-visualizer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandVisualizerComponent {
  readonly command = input.required<UiCommand>();
  readonly applied = input.required<boolean>();

  protected readonly counter = signal(0);
  protected readonly miniDrawerOpen = signal(true);
  protected readonly activePalette = signal<'azure' | 'rose' | 'magenta' | 'cyan'>('azure');

  protected readonly palettes = [
    { name: 'azure', label: 'Azure & Blue', primary: '#0061a4', container: '#d1e4ff' },
    { name: 'rose', label: 'Rose & Red', primary: '#b91d47', container: '#ffd9dc' },
    { name: 'magenta', label: 'Magenta & Violet', primary: '#9c27b0', container: '#f3e5f5' },
    { name: 'cyan', label: 'Cyan & Orange', primary: '#00838f', container: '#e0f7fa' },
  ] as const;

  protected readonly selectedPalette = computed(() => {
    const current = this.activePalette();
    return this.palettes.find((p) => p.name === current) ?? this.palettes[0];
  });

  protected readonly isVisualCommand = computed(() => {
    const id = this.command().id;
    return ['material-app', 'app-shell', 'component', 'material-setup', 'application'].includes(id);
  });

  protected readonly cliOutput = computed(() => {
    const cmd = this.command();
    return (
      `$ ${cmd.command}\n\n[SUCCESS] Applied schematic '${cmd.id}'\n` +
      `✔ Validated schematic options and workspace prerequisites\n` +
      `✔ Generated target files with Angular 22 & Material standards\n` +
      `✔ Updated workspace tree configuration`
    );
  });

  protected readonly fileTreeUpdates = computed(() => {
    const id = this.command().id;
    switch (id) {
      case 'material-app':
        return [
          { action: 'CREATE', path: 'src/app/app.ts' },
          { action: 'CREATE', path: 'src/app/app.html' },
          { action: 'CREATE', path: 'src/app/app.scss' },
          { action: 'CREATE', path: 'src/app/core/index.ts' },
          { action: 'CREATE', path: 'src/app/shared/components/index.ts' },
          { action: 'UPDATE', path: 'angular.json' },
        ];
      case 'app-shell':
        return [
          { action: 'CREATE', path: 'src/app/app-shell/app-shell.ts' },
          { action: 'CREATE', path: 'src/app/app-shell/app-shell.html' },
          { action: 'CREATE', path: 'src/app/app-shell/app-shell.scss' },
        ];
      case 'component':
        return [
          { action: 'CREATE', path: 'src/app/features/feature-card/feature-card.ts' },
          { action: 'CREATE', path: 'src/app/features/feature-card/feature-card.html' },
          { action: 'CREATE', path: 'src/app/features/feature-card/feature-card.scss' },
          { action: 'CREATE', path: 'src/app/features/feature-card/feature-card.spec.ts' },
        ];
      case 'material-setup':
        return [
          { action: 'UPDATE', path: 'src/styles.scss' },
          { action: 'UPDATE', path: 'src/index.html' },
          { action: 'UPDATE', path: 'src/app/app.config.ts' },
          { action: 'UPDATE', path: 'angular.json' },
        ];
      case 'project-structure':
        return [
          { action: 'CREATE', path: 'src/app/core/index.ts' },
          { action: 'CREATE', path: 'src/app/shared/components/index.ts' },
          { action: 'CREATE', path: 'src/app/shared/pipes/index.ts' },
          { action: 'CREATE', path: 'src/app/features/index.ts' },
        ];
      case 'service':
        return [
          { action: 'CREATE', path: 'src/app/core/services/api-status.service.ts' },
          { action: 'CREATE', path: 'src/app/core/services/api-status.service.spec.ts' },
        ];
      case 'openapi-setup':
        return [
          { action: 'CREATE', path: 'ng-openapi-gen.json' },
          { action: 'UPDATE', path: 'package.json' },
        ];
      case 'data-service':
        return [
          { action: 'CREATE', path: 'src/app/core/data/users.service.ts' },
          { action: 'CREATE', path: 'src/app/core/data/users.service.spec.ts' },
        ];
      default:
        return [
          { action: 'UPDATE', path: 'angular.json' },
          { action: 'UPDATE', path: 'package.json' },
        ];
    }
  });

  protected increment(): void {
    this.counter.update((c) => c + 1);
  }

  protected decrement(): void {
    this.counter.update((c) => Math.max(0, c - 1));
  }

  protected toggleMiniDrawer(): void {
    this.miniDrawerOpen.update((v) => !v);
  }
}
