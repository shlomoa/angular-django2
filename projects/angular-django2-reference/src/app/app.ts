import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterOutlet } from '@angular/router';
import { AngularDjango2Service } from 'angular-django2';

@Component({
  selector: 'app-root',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatToolbarModule,
    RouterOutlet,
  ],
  templateUrl: './app.reference.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly angularDjango2 = inject(AngularDjango2Service);

  protected readonly title = signal('angular-django2');
  protected readonly packageApi = this.angularDjango2.buildUrl('/api/');
  protected readonly csrfHeaderName = this.angularDjango2.resolvedConfig.csrfHeaderName;
}
