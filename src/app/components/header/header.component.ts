import { Component } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone: true,
  template: `
    <header class="app-header">
      <h1>Recherche de publications d'auteurs</h1>
      <p>Rechercher des auteurs de l'Université Mohammed V</p>
    </header>
  `,
  styles: [`
    .app-header {
      text-align: center;
      padding: 40px 20px 20px;
    }
    h1 {
      color: #1b4986;
      font-size: 32px;
      font-weight: 700;
      margin: 0 0 10px 0;
    }
    p {
      color: #737373;
      font-size: 16px;
      margin: 0;
    }
  `]
})
export class HeaderComponent {}
