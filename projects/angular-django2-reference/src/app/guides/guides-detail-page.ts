import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { BreadcrumbsComponent } from '../shared';
import { GUIDES } from './guides-catalog';

@Component({
  selector: 'app-guides-detail-page',
  imports: [BreadcrumbsComponent, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './guides-detail-page.html',
  styleUrl: './guides-detail-page.scss',
})
export class GuidesDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly guideId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('guideId'))),
    { initialValue: this.route.snapshot.paramMap.get('guideId') },
  );

  protected readonly guide = computed(() =>
    GUIDES.find((candidate) => candidate.id === this.guideId()),
  );
}
