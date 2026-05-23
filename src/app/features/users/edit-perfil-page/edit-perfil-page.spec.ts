import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditPerfilPage } from './edit-perfil-page';

describe('EditPerfilPage', () => {
  let component: EditPerfilPage;
  let fixture: ComponentFixture<EditPerfilPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditPerfilPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditPerfilPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
