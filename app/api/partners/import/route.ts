import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { partners } from '@/lib/schema';
import { getCurrentUser } from '@/lib/auth';
import { detectRssUrl } from '@/lib/rss';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const nameIndex = headers.indexOf('name');
    const domainIndex = headers.indexOf('domain');
    const rssUrlIndex = headers.indexOf('rss_url');
    const githubOrgIndex = headers.indexOf('github_org');
    const notesIndex = headers.indexOf('notes');

    if (nameIndex === -1) {
      return NextResponse.json({ error: 'CSV must have a "name" column' }, { status: 400 });
    }

    const createdPartners = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const name = values[nameIndex];
      
      if (!name) continue;

      const domain = domainIndex >= 0 ? values[domainIndex] : null;
      const rssUrl = rssUrlIndex >= 0 ? values[rssUrlIndex] : null;
      const githubOrg = githubOrgIndex >= 0 ? values[githubOrgIndex] : null;
      const notes = notesIndex >= 0 ? values[notesIndex] : null;

      try {
        // Auto-detect RSS if domain provided but no RSS URL
        let detectedRssUrl = rssUrl;
        if (!detectedRssUrl && domain) {
          detectedRssUrl = await detectRssUrl(domain);
        }

        const [partner] = await db
          .insert(partners)
          .values({
            userId: user.id,
            name,
            domain: domain || null,
            rssUrl: detectedRssUrl || null,
            githubOrg: githubOrg || null,
            notes: notes || null,
          })
          .returning();

        createdPartners.push(partner);
      } catch (error) {
        errors.push({ row: i + 1, name, error: String(error) });
      }
    }

    return NextResponse.json({
      created: createdPartners.length,
      partners: createdPartners,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error importing partners:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

