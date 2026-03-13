import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Author, Publication } from '../../services/scopus.service';

@Component({
  selector: 'app-publication-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pub-list-container">
      <div class="list-header" *ngIf="author">
        <h2 class="list-title">Publications de {{ author.fullName }}</h2>
      </div>
      
      <div class="pub-scroll">
        <div *ngIf="!author" class="empty-state">
          Sélectionnez un auteur dans la liste pour voir leurs publications 1ère/2ème auteurs.
        </div>

        <div *ngIf="author && loading" class="empty-state">
          Récupération des publications...
        </div>

        <div *ngIf="author && !loading" class="content-wrapper">
          <div class="filter-banner">
            Affichage uniquement des {{publications.length}} publications où {{ author.surname }} est 1er ou 2ème auteur.
          </div>

          <div *ngIf="publications.length === 0" class="empty-state">
            Aucune publication trouvée où cet auteur est 1er ou 2ème auteur.
          </div>

          <div *ngFor="let pub of publications" class="pub-card">
            <h3 class="pub-title">{{ pub.title }}</h3>
            
            <div class="pub-meta">
              <span class="pub-type" [ngClass]="getBadgeClass(pub.type)">{{ pub.type }}</span>
              <span class="pub-date">{{ pub.date || pub.year }}</span>
              <span class="pub-journal">{{ pub.journal }}</span>
            </div>
            
            <div class="pub-authors">
              <span class="authors-label">Authors:</span> 
              <span [innerHTML]="highlightTargetAuthor(pub.authors, author.surname, pub.authorRank)"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pub-list-container {
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
    .pub-scroll {
      flex: 1;
      overflow-y: auto;
      max-height: 600px;
    }
    .content-wrapper {
      padding: 24px;
    }
    .empty-state {
      padding: 40px;
      color: #666;
      text-align: center;
    }
    .filter-banner {
      background-color: #fcf6e8;
      color: #8c734b;
      padding: 12px 16px;
      border-left: 3px solid #f29e38;
      border-radius: 2px;
      margin-bottom: 24px;
      font-size: 14px;
    }
    
    .pub-card {
      margin-bottom: 24px;
      padding-bottom: 24px;
      border-bottom: 1px solid #eee;
    }
    .pub-card:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }
    
    .pub-title {
      font-size: 16px;
      color: #1b4986;
      margin: 0 0 10px 0;
      font-weight: 600;
      line-height: 1.4;
    }
    
    .pub-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
      font-size: 13px;
      color: #666;
      flex-wrap: wrap;
    }
    
    .pub-type {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }
    
    .type-article { background: #e6f0fa; color: #1b4986; }
    .type-conference { background: #f0f4f8; color: #2c5282; }
    .type-review { background: #fce8e8; color: #c53030; }
    .type-book { background: #eef8ec; color: #2f855a; }
    
    .pub-authors {
      font-size: 14px;
      color: #444;
      line-height: 1.5;
    }
    .authors-label {
      font-weight: 600;
      color: #333;
    }
    
    ::ng-deep .highlighted-author {
      color: #eb6c34;
      font-weight: 600;
    }
  `]
})
export class PublicationListComponent {
  @Input() author: Author | null = null;
  @Input() publications: Publication[] = [];
  @Input() loading = false;

  getBadgeClass(type: string): string {
    switch(type) {
      case 'Article': return 'type-article';
      case 'Conference': return 'type-conference';
      case 'Review': return 'type-review';
      case 'Book Chapter': return 'type-book';
      default: return 'type-article';
    }
  }

  highlightTargetAuthor(authorsList: string, targetSurname: string, rank: number | null): string {
    if (!targetSurname) return authorsList;
    
    // We try to find the surname and make it bold/orange
    // Scopus sometimes returns formats like "Bah S.", we can just bold the matching chunk and append the rank.
    // A simple regex to find the matching surname specifically.
    const regex = new RegExp(`(${targetSurname}[^,]*)`, 'gi');
    
    return authorsList.replace(regex, `<span class="highlighted-author">$1 (Pos: ${rank || '?'})</span>`);
  }
}
