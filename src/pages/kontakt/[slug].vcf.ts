import type { APIRoute } from 'astro';
import type { CollectionEntry } from 'astro:content';
import { getContacts } from '../../content/contacts/query';

export async function getStaticPaths() {
  return (await getContacts()).flatMap(({ data }) =>
    data.status === 'published'
      ? [{ params: { slug: data.slug }, props: { contact: data } }]
      : [],
  );
}

const escape = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
// vCard folding counts UTF-8 bytes, without splitting Czech characters.
function fold(value: string) {
  let result = '',
    line = '';
  for (const char of value) {
    if (Buffer.byteLength(line + char, 'utf8') > 75) {
      result += line + '\r\n';
      line = ' ';
    }
    line += char;
  }
  return result + line;
}

type Props = {
  contact: Extract<
    CollectionEntry<'contacts'>['data'],
    { status: 'published' }
  >;
};
export const GET: APIRoute<Props> = ({ props, site }) => {
  const contact = props.contact;
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escape(contact.familyName)};${escape(contact.givenName)};;;`,
    `FN:${escape(contact.name)}`,
    'ORG:Rádi bydlíme',
    `TEL;TYPE=CELL:${contact.phone}`,
    `EMAIL;TYPE=INTERNET:${escape(contact.email)}`,
    `URL:${new URL(`/kontakt/${contact.slug}/`, site).href}`,
    'END:VCARD',
  ];
  return new Response(lines.map(fold).join('\r\n') + '\r\n', {
    headers: { 'Content-Type': 'text/vcard; charset=utf-8' },
  });
};
