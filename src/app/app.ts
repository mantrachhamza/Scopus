import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './components/header/header.component';
import { SearchComponent } from './components/search/search.component';
import { AuthorListComponent } from './components/author-list/author-list.component';
import { PublicationListComponent } from './components/publication-list/publication-list.component';
import { ScopusService, Author, Publication } from './services/scopus.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    SearchComponent,
    AuthorListComponent,
    PublicationListComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  authors: Author[] = [];
  selectedAuthor: Author | null = null;
  publications: Publication[] = [];

  loadingAuthors = false;
  loadingPublications = false;
  error = '';

  constructor(private scopusService: ScopusService, private cdr: ChangeDetectorRef) { }

  async onSearch(params: { firstName: string, lastName: string }) {
    this.authors = [];
    this.selectedAuthor = null;
    this.publications = [];
    this.error = '';

    if (!params.firstName && !params.lastName) {
      this.error = 'Please provide at least a first name or last name.';
      return;
    }

    this.loadingAuthors = true;
    this.cdr.detectChanges();

    try {
      const result = await this.scopusService.searchAuthors(params.firstName, params.lastName);
      this.authors = result.authors;
      if (this.authors.length === 0) {
        this.error = 'No authors found matching your criteria.';
      }
    } catch (err: any) {
      this.error = err.message || 'Failed to search authors.';
    } finally {
      this.loadingAuthors = false;
      this.cdr.detectChanges();
    }
  }

  async onAuthorSelect(author: Author) {
    this.selectedAuthor = author;
    this.publications = [];
    this.loadingPublications = true;
    this.error = '';
    this.cdr.detectChanges();

    try {
      const result = await this.scopusService.fetchPublications(author.authorId);
      this.publications = result.pubs;
    } catch (err: any) {
      this.error = err.message || 'Failed to load publications.';
    } finally {
      this.loadingPublications = false;
      this.cdr.detectChanges();
    }
  }
}
