import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { BillingCard } from './billing-card';

describe('BillingCard', () => {
  let component: BillingCard;
  let fixture: ComponentFixture<BillingCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BillingCard],
    }).compileComponents();

    fixture = TestBed.createComponent(BillingCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
