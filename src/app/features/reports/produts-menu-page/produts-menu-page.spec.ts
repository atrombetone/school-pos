import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProdutsMenuPage } from './produts-menu-page';

describe('ProdutsMenuPage', () => {
  let component: ProdutsMenuPage;
  let fixture: ComponentFixture<ProdutsMenuPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProdutsMenuPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProdutsMenuPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
