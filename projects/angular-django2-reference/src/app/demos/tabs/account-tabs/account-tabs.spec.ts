import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { AccountTabs } from './account-tabs';

describe('AccountTabs', () => {
  let component: AccountTabs;
  let fixture: ComponentFixture<AccountTabs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountTabs],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountTabs);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
