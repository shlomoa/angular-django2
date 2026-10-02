import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { AccountPanel } from './account-panel';

describe('AccountPanel', () => {
  let component: AccountPanel;
  let fixture: ComponentFixture<AccountPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
