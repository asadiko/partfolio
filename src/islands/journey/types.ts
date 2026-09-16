export const cities = ['tashkent', 'riga', 'munich', 'helsinki', 'st-gallen'] as const;
export type City = (typeof cities)[number];

export const milestoneKinds = [
  'school',
  'study',
  'work',
  'hackathon',
  'founder',
  'community',
  'move',
] as const;
export type MilestoneKind = (typeof milestoneKinds)[number];

export interface Milestone {
  id: string;
  title: string;
  date: string;
  city: City;
  kind: MilestoneKind;
  body: string;
}
