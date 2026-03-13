import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface Author {
  authorId: string;
  fullName: string;
  surname: string;
  givenName: string;
  affiliation: string;
  docCount: string;
  citedByCount: string;
  coauthorCount: string;
  hIndex: string;
  subjects: string;
}

export interface Publication {
  title: string;
  journal: string;
  date: string;
  year: string;
  doi: string;
  cited: number;
  type: string;
  eid: string;
  volume: string;
  issue: string;
  pages: string;
  authors: string;
  moreAuthors: string;
  authorRank: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class ScopusService {
  private readonly API_KEY = 'd451936c59628276f68eb43266872213';
  private readonly BASE_URL = 'https://api.elsevier.com';
  private readonly AUTHORS_PER_PAGE = 12;

  // Affiliation variants from app.js
  private readonly AFFIL_VARIANTS = [
    '"Mohamed V"',
    '"Mohammed V"',
    '"Mohamed 5"'
  ];
  private readonly AFFIL_QUERY = `AFFIL(${this.AFFIL_VARIANTS.join(' OR ')}) AND AFFILCOUNTRY(morocco)`;

  constructor(private http: HttpClient) {}

  async searchAuthors(firstName: string, lastName: string, page: number = 1): Promise<{ total: number, authors: Author[] }> {
    const start = (page - 1) * this.AUTHORS_PER_PAGE;
    const nameParts = [];
    if (lastName.trim()) nameParts.push(`AUTHLASTNAME(${lastName.trim()})`);
    if (firstName.trim()) nameParts.push(`AUTHFIRST(${firstName.trim()})`);

    if (!nameParts.length) {
      throw new Error('Please enter at least a first or last name.');
    }

    const nameQuery = nameParts.join(' AND ');
    const fullQuery = `${nameQuery} AND (${this.AFFIL_QUERY})`;

    const params = new HttpParams()
      .set('apiKey', this.API_KEY)
      .set('httpAccept', 'application/json')
      .set('query', fullQuery)
      .set('count', this.AUTHORS_PER_PAGE)
      .set('start', start)
      .set('view', 'STANDARD');

    const data: any = await firstValueFrom(this.http.get(`${this.BASE_URL}/content/search/author`, { params, headers: { 'X-ELS-APIKey': this.API_KEY } }));
    
    const results = data['search-results'];
    const total = parseInt(results?.['opensearch:totalResults'] || '0', 10);
    const entries = results?.entry || [];

    if (entries.length === 1 && entries[0]['@_fa'] === 'true' && !entries[0]['dc:identifier']) {
      return { total: 0, authors: [] };
    }

    const authors = entries.map((e: any) => this.parseAuthorEntry(e));
    return { total, authors };
  }

  private parseAuthorEntry(e: any): Author {
    const nameVariants = e['preferred-name'] || {};
    const surname = nameVariants['surname'] || e['dc:creator'] || '';
    const givenName = nameVariants['given-name'] || '';
    const fullName = [givenName, surname].filter(Boolean).join(' ') || e['dc:creator'] || 'Unknown';
    const authorId = (e['dc:identifier'] || '').replace('AUTHOR_ID:', '');
    const docCount = e['document-count'] || '—';
    const citedByCount = e['cited-by-count'] || '—';
    const coauthorCount = e['coauthor-count'] || '—';
    const hIndex = e['h-index'] || '—';
  
    const affils = e['affiliation-current'];
    let affiliation = '';
    if (Array.isArray(affils)) {
      affiliation = affils.map(a => [a['affiliation-name'], a['affiliation-city'], a['affiliation-country']]
        .filter(Boolean).join(', ')).join('; ');
    } else if (affils) {
      affiliation = [affils['affiliation-name'], affils['affiliation-city'], affils['affiliation-country']]
        .filter(Boolean).join(', ');
    }
  
    const areas = e['subject-area'];
    const subjects = Array.isArray(areas)
      ? areas.slice(0, 3).map((a: any) => a['$']).join(', ')
      : (areas?.['$'] || '');
  
    return { authorId, fullName, surname, givenName, affiliation, docCount, citedByCount, coauthorCount, hIndex, subjects };
  }

  async fetchPublications(authorId: string): Promise<{ total: number, pubs: Publication[] }> {
    const allPubs: Publication[] = [];
    let start = 0;
    const perPage = 25;
    let total = 0;

    let maxRetries = 2000;
    
    do {
      const params = new HttpParams()
        .set('apiKey', this.API_KEY)
        .set('httpAccept', 'application/json')
        .set('query', `AU-ID(${authorId})`)
        .set('count', perPage)
        .set('start', start)
        .set('view', 'COMPLETE')
        .set('sort', 'coverDate,desc')
        .set('field', 'dc:title,prism:publicationName,prism:coverDate,prism:doi,citedby-count,subtypeDescription,eid,prism:volume,prism:issueIdentifier,prism:pageRange,author');

      const data: any = await firstValueFrom(this.http.get(`${this.BASE_URL}/content/search/scopus`, { params, headers: { 'X-ELS-APIKey': this.API_KEY } }));
      
      const results = data['search-results'];
      total = parseInt(results?.['opensearch:totalResults'] || '0', 10);
      const entries = results?.entry || [];

      if (entries.length === 0) break;

      entries.forEach((e: any) => {
        if (e['dc:title']) {
          const pub = this.parsePubEntry(e, authorId);
          // Only return 1st or 2nd author publications
          if (pub.authorRank === 1 || pub.authorRank === 2) {
            allPubs.push(pub);
          }
        }
      });

      start += perPage;
    } while (start < total && start < maxRetries);

    return { total: allPubs.length, pubs: allPubs };
  }

  private parsePubEntry(e: any, authorId: string): Publication {
    const title = e['dc:title'] || 'Untitled';
    const journal = e['prism:publicationName'] || '';
    const date = e['prism:coverDate'] || '';
    const year = date ? date.split('-')[0] : '';
    const doi = e['prism:doi'] || '';
    const cited = e['citedby-count'] || '0';
    let type = e['subtypeDescription'] || 'Article';
    const eid = e['eid'] || '';
    const volume = e['prism:volume'] || '';
    const issue = e['prism:issueIdentifier'] || '';
    const pages = e['prism:pageRange'] || '';
  
    const authorArr = e['author'] || [];
    const authorsArray = Array.isArray(authorArr) ? authorArr : (authorArr ? [authorArr] : []);
  
    let authorRank: number | null = null;
    if (authorId) {
      const targetId = String(authorId);
      const matchedAuthor = authorsArray.find((a: any) => String(a['authid']) === targetId);
      if (matchedAuthor && matchedAuthor['@seq']) {
        authorRank = parseInt(matchedAuthor['@seq'], 10);
      } else {
        const idx = authorsArray.findIndex((a: any) => String(a['authid']) === targetId);
        if (idx !== -1) authorRank = idx + 1;
      }
    }
  
    const authors = authorsArray.slice(0, 5).map((a: any) => a['authname'] || '').filter(Boolean).join(', ');
    const moreAuthors = authorsArray.length > 5 ? ` +${authorsArray.length - 5} more` : '';

    // Standardize types according to user request: "Article, Review, Conference, or Book Chapter"
    const lowerType = type.toLowerCase();
    if (lowerType.includes('article')) type = 'Article';
    else if (lowerType.includes('review')) type = 'Review';
    else if (lowerType.includes('conference') || lowerType.includes('proceeding')) type = 'Conference';
    else if (lowerType.includes('book')) type = 'Book Chapter';
    else type = 'Article'; // default fallback or keep original
  
    return { title, journal, date, year, doi, cited: parseInt(cited, 10), type, eid, volume, issue, pages, authors, moreAuthors, authorRank };
  }
}
