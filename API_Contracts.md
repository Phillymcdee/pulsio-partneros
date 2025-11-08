# Internal API Contracts (shapes & stubs)

## Types
```ts
type Objective = { type: "integrations"|"co_sell"|"co_market"|"marketplace"|"geography"|"vertical"; detail?: string; priority: 1|2|3; };
type Signal = { partnerId: number; type: string; title: string; sourceUrl: string; summary: string; facets?: Record<string, any>; publishedAt?: Date; };
type Insight = { signalId: number; score: number; why: string; recommendation: string; actions: {label:string;ownerHint:string;dueInDays:number;}[]; outreachDraft: string; };
```

## Functions (lib/)
- `fetchFeed(url: string): Promise<ParsedFeed|null>`
- `classifyType(title: string, content: string): "funding"|"marketplace"|"launch"|"hire"|"changelog"|"pr"|"blog"`
- `summarize(text: string): Promise<string>`
- `generateInsight(objectives: Objective[], signal: Partial<Signal>): Promise<{why:string;score:number;actions:any[];outreachDraft:string}|null>`
- `finalScore(signal: Pick<Signal,"type"|"publishedAt">, objectives: Objective[]): number`
- `sendDigest(to: string, subject: string, items: Array<{partner:string;signalTitle:string;why:string;action:string;outreachDraft:string;score:number;}>)`
- `postSlack(webhookUrl: string, items: Array<{partner:string;signalTitle:string;why:string;action:string;score:number;}>)`
