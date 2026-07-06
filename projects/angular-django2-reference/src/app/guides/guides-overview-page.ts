import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatRipple } from '@angular/material/core';
import { RouterLink } from '@angular/router';

import { GUIDES } from './guides-catalog';

@Component({
  selector: 'app-guides-overview-page',
  imports: [MatIconModule, MatRipple, RouterLink],
  templateUrl: './guides-overview-page.html',
  styleUrl: './guides-overview-page.scss',
})
export class GuidesOverviewPage {
  protected readonly guides = GUIDES;
}
