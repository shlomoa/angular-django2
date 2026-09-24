import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRipple } from '@angular/material/core';
import { RouterLink } from '@angular/router';

import { BreadcrumbsComponent } from '../shared';
import { GUIDES } from './guides-catalog';

@Component({
  selector: 'app-guides-overview-page',
  imports: [BreadcrumbsComponent, MatButtonModule, MatIconModule, MatRipple, RouterLink],
  templateUrl: './guides-overview-page.html',
  styleUrl: './guides-overview-page.scss',
})
export class GuidesOverviewPage {
  protected readonly guides = GUIDES;
}
