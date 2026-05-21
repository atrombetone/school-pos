import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserAproovePage } from './user-aproove-page';

describe('UserAproovePage', () => {
  let component: UserAproovePage;
  let fixture: ComponentFixture<UserAproovePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserAproovePage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserAproovePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
