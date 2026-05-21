import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LostPassPage } from './lost-pass-page';

describe('LostPassPage', () => {
  let component: LostPassPage;
  let fixture: ComponentFixture<LostPassPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LostPassPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LostPassPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
