import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { AdvancedCard } from './advanced-card';

describe('AdvancedCard', () => {
  let component: AdvancedCard;
  let fixture: ComponentFixture<AdvancedCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdvancedCard],
    }).compileComponents();

    fixture = TestBed.createComponent(AdvancedCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
