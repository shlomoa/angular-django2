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
 * Material App Shell Template for app.component.html
 * Responsive sidenav layout with toolbar and content area
 */
export const APP_SHELL_TEMPLATE = `<mat-toolbar color="primary">
  <button mat-icon-button (click)="drawer.toggle()" aria-label="Toggle sidenav">
    <mat-icon>menu</mat-icon>
  </button>
  <span>{{ title }}</span>
</mat-toolbar>

<mat-sidenav-container class="sidenav-container">
  <mat-sidenav #drawer mode="side" opened class="sidenav">
    <mat-nav-list>
      <a mat-list-item routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
        <mat-icon matListItemIcon>home</mat-icon>
        <span matListItemTitle>Home</span>
      </a>
    </mat-nav-list>
  </mat-sidenav>

  <mat-sidenav-content>
    <div class="content">
      <router-outlet />
    </div>
  </mat-sidenav-content>
</mat-sidenav-container>
`;

/**
 * Material App Shell Styles for app.component.scss
 */
export const APP_SHELL_STYLES = `.sidenav-container {
  position: absolute;
  top: 64px;
  bottom: 0;
  left: 0;
  right: 0;
}

.sidenav {
  width: 250px;
}

.content {
  padding: 20px;
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
 * Material App Shell Component TypeScript
 */
export const APP_SHELL_COMPONENT_TS = `import { Component } from '@angular/core';
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
  title = 'REPLACE_APP_NAME';
}
`;

export const MATERIAL_ICONS_STYLESHEET_HREF =
  'https://fonts.googleapis.com/icon?family=Material+Icons';
export const MATERIAL_ICONS_STYLESHEET_LINK = `<link rel="stylesheet" href="${MATERIAL_ICONS_STYLESHEET_HREF}" />`;
