import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Author } from '../../services/scopus.service';

@Component({
  selector: 'app-author-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="author-list-container">
      <div class="list-header">
        <h2 class="list-title">Auteurs trouvés ({{ authors.length }})</h2>
      </div>
      
      <div class="authors-scroll">
        <div *ngIf="authors.length === 0 && !loading" class="empty-state">
          Aucun auteur trouvé. Essayez une recherche différente.
        </div>
        
        <div *ngIf="loading" class="empty-state">
          Recherche dans Scopus...
        </div>

        <div *ngFor="let author of authors" 
             (click)="selectAuthor(author)"
             [class.active]="selectedAuthor?.authorId === author.authorId"
             class="author-item">
          
          <div class="author-name">{{ author.fullName }}</div>
          <div class="author-affil">{{ author.affiliation || 'Mohammed V University in Rabat' }}</div>
          
        </div>
      </div>
    </div>
  `,
  styles: [`
    .author-list-container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .list-header {
      padding: 20px 24px;
      border-bottom: 1px solid #eee;
    }
    .list-title {
      font-size: 18px;
      color: #1b4986;
      margin: 0;
      font-weight: 600;
    }
    .authors-scroll {
      flex: 1;
      overflow-y: auto;
      max-height: 500px;
    }
    .empty-state {
      padding: 24px;
      color: #666;
      text-align: center;
    }
    .author-item {
      padding: 16px 24px;
      border-bottom: 1px solid #f5f5f5;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .author-item:hover {
      background-color: #f9f9f9;
    }
    .author-item.active {
      background-color: #f0f4f8;
      border-left: 4px solid #eb6c34;
      padding-left: 20px;
    }
    .author-name {
      font-weight: 600;
      color: #333;
      margin-bottom: 4px;
    }
    .author-affil {
      font-size: 13px;
      color: #777;
      line-height: 1.4;
    }
  `]
})
export class AuthorListComponent {
  @Input() authors: Author[] = [];
  @Input() loading = false;
  @Input() selectedAuthor: Author | null = null;
  
  @Output() authorSelect = new EventEmitter<Author>();

  selectAuthor(author: Author) {
    this.authorSelect.emit(author);
  }
}
