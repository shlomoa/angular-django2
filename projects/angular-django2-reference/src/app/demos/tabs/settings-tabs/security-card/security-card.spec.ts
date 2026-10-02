import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { SecurityCard } from './security-card';

describe('SecurityCard', () => {
  let component: SecurityCard;
  let fixture: ComponentFixture<SecurityCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SecurityCard],
    }).compileComponents();

    fixture = TestBed.createComponent(SecurityCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
