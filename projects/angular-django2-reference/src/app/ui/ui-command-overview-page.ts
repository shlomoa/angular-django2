import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { MatRipple } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { UI_COMMAND_CATEGORIES } from './ui-command-catalog';

@Component({
  selector: 'app-ui-command-overview-page',
  imports: [MatIconModule, MatRipple, NgOptimizedImage, RouterLink],
  templateUrl: './ui-command-overview-page.html',
  styleUrl: './ui-command-overview-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiCommandOverviewPage {
  protected readonly categories = UI_COMMAND_CATEGORIES;
}
