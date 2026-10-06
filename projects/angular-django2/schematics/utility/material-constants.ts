/**
 * Shared Angular Material configuration constants.
 * @internal
 */

export const THEME_MAPPING: Record<string, string> = {
  'indigo-pink': '@angular/material/prebuilt-themes/indigo-pink.css',
  'deeppurple-amber': '@angular/material/prebuilt-themes/deeppurple-amber.css',
  'pink-bluegrey': '@angular/material/prebuilt-themes/pink-bluegrey.css',
  'purple-green': '@angular/material/prebuilt-themes/purple-green.css',
};

/**
 * Material layout template for app.component.html
 * Responsive sidenav layout with toolbar and content area
 */
export const MATERIAL_LAYOUT_TEMPLATE = `TOOLBAR_REGION

<mat-sidenav-container class="sidenav-container">
  <mat-sidenav #drawer mode="side" opened class="sidenav">
    <mat-nav-list>
      <a mat-list-item routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
        <mat-icon matListItemIcon>home</mat-icon>
        <span matListItemTitle>Home</span>
      </a>
      NAV_REGION
    </mat-nav-list>
  </mat-sidenav>

  <mat-sidenav-content>
    <router-outlet />
  </mat-sidenav-content>
</mat-sidenav-container>
`;

/**
 * The toolbar of the Material layout, the first generated region of the template.
 */
export const MATERIAL_LAYOUT_TOOLBAR = `<mat-toolbar color="primary"TOOLBAR_ATTRIBUTES>
TOOLBAR_TITLE_ROW_START  <button mat-icon-button (click)="drawer.toggle()" aria-label="Toggle sidenav">
    <mat-icon>menu</mat-icon>
  </button>
  <span>{{ title }}</span>
TOOLBAR_TITLE_ROW_ENDTOOLBAR_ROWS</mat-toolbar>
`;

/**
 * Material layout styles for app.component.scss
 */
export const MATERIAL_LAYOUT_STYLES = `.sidenav-container {
  position: absolute;
  top: TOOLBAR_HEIGHT;
  bottom: 0;
  left: 0;
  right: 0;
}

.sidenav {
  width: 250px;
}

mat-toolbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2;
}
`;

/**
 * Material layout component TypeScript
 */
export const MATERIAL_LAYOUT_COMPONENT_TS = `import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
  ],
  templateUrl: './TEMPLATE_FILE',
  styleUrl: './STYLE_FILE',
})
export class CLASS_NAME {
TITLE_REGION
  TOOLBAR_ACTION_HANDLERS
}
`;

/**
 * Unit spec for the Material layout component. The default spec the Angular
 * application schematic generates expects an `h1` and no router, so it fails
 * against the sidenav layout (NG0201 for `RouterLink`).
 */
export const MATERIAL_LAYOUT_SPEC_TS = `import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CLASS_NAME } from './COMPONENT_FILE';

describe('CLASS_NAME', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CLASS_NAME],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(CLASS_NAME);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the title in the toolbar', async () => {
    const fixture = TestBed.createComponent(CLASS_NAME);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
TITLE_ASSERTION_REGION
  });
});
`;

export const MATERIAL_ICONS_STYLESHEET_HREF =
  'https://fonts.googleapis.com/icon?family=Material+Icons';
export const MATERIAL_ICONS_STYLESHEET_LINK = `<link rel="stylesheet" href="${MATERIAL_ICONS_STYLESHEET_HREF}" />`;
