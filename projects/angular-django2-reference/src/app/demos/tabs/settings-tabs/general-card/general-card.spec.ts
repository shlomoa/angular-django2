import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { GeneralCard } from './general-card';

describe('GeneralCard', () => {
  let component: GeneralCard;
  let fixture: ComponentFixture<GeneralCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeneralCard],
    }).compileComponents();

    fixture = TestBed.createComponent(GeneralCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
