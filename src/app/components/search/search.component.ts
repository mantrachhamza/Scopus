import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="search-container">
      <form (ngSubmit)="onSearch()" class="search-form">
        <input 
          type="text" 
          [(ngModel)]="firstName" 
          name="firstName" 
          placeholder="Prénom" 
          class="search-input"
        />
        <input 
          type="text" 
          [(ngModel)]="lastName" 
          name="lastName" 
          placeholder="Nom" 
          class="search-input"
        />
        <button type="submit" class="search-btn">Rechercher</button>
      </form>
    </div>
  `,
  styles: [`
    .search-container {
      background: white;
      padding: 24px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
      margin: 20px auto 40px;
      max-width: 900px;
    }
    .search-form {
      display: flex;
      gap: 16px;
      align-items: center;
      justify-content: center;
    }
    .search-input {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      font-size: 15px;
      outline: none;
      transition: border-color 0.2s;
    }
    .search-input:focus {
      border-color: #1b4986;
    }
    .search-btn {
      background-color: #eb6c34;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 12px 32px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .search-btn:hover {
      background-color: #d15d2a;
    }
  `]
})
export class SearchComponent {
  firstName = '';
  lastName = '';

  @Output() search = new EventEmitter<{ firstName: string, lastName: string }>();

  onSearch() {
    this.search.emit({ firstName: this.firstName, lastName: this.lastName });
  }
}
