import type { ImageMetadata } from 'astro';
import authorLeafSprig from '../../assets/decor/author-leaf-sprig.png';
import constructionHouse from '../../assets/decor/construction-house.png';
import sampleJanPortrait from '../../assets/editorial/sample-author-jan.png';
import sampleAuthorPortrait from '../../assets/editorial/sample-author.webp';

export interface AuthorProfile {
  id: string;
  heading: string;
  name: string;
  bio: string;
  portrait: ImageMetadata;
  portraitAlt: string;
  decoration?: ImageMetadata;
  aboutHref?: string;
}

const profiles = new Map<string, AuthorProfile>([
  [
    'author-sample',
    {
      id: 'author-sample',
      heading: 'O autorce',
      name: 'Anna Novotná',
      bio: 'Píšu o našem životě na venkově, o zahradě, zvířatech a o tom, jak se dá žít blíž k přírodě. Jméno i portrét jsou zatím ukázkové.',
      portrait: sampleAuthorPortrait,
      portraitAlt: 'Ukázkový portrét autorky rodinného deníku.',
      decoration: authorLeafSprig,
    },
  ],
  [
    'author-jan',
    {
      id: 'author-jan',
      heading: 'O autorovi',
      name: 'Jan Novotný',
      bio: 'Zapisuji obnovu našeho statku, práci se dřevem a všechno, co se učím vlastníma rukama. Nejraději hledám řešení, která respektují starý dům a vydrží další roky.',
      portrait: sampleJanPortrait,
      portraitAlt: 'Ukázkový portrét Jana u venkovského domu.',
      decoration: constructionHouse,
    },
  ],
]);

export function resolveAuthor(authorId: string, owner: string): AuthorProfile {
  const profile = profiles.get(authorId);
  if (!profile) {
    throw new Error(`Unknown author ID ${authorId} referenced by ${owner}.`);
  }
  return profile;
}
