import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StockPage } from './stock-page';

describe('StockPage', () => {
  let component: StockPage;
  let fixture: ComponentFixture<StockPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StockPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
