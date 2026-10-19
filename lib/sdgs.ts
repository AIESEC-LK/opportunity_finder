/**
 * Official metadata for the 17 UN Sustainable Development Goals: number,
 * short name, colour (UN SDG communications guidelines) and the official goal
 * statement. Icons in /public/sdgs are the official UN icons from sdgs.un.org.
 *
 * This is the only content in the app that does not come from the sheet.
 */
export interface Sdg {
  number: number;
  slug: string;
  name: string;
  statement: string;
  color: string;
  icon: string;
}

const GOALS: [string, string, string][] = [
  ["No Poverty", "End poverty in all its forms everywhere.", "#E5243B"],
  ["Zero Hunger", "End hunger, achieve food security and improved nutrition and promote sustainable agriculture.", "#DDA63A"],
  ["Good Health and Well-being", "Ensure healthy lives and promote well-being for all at all ages.", "#4C9F38"],
  ["Quality Education", "Ensure inclusive and equitable quality education and promote lifelong learning opportunities for all.", "#C5192D"],
  ["Gender Equality", "Achieve gender equality and empower all women and girls.", "#FF3A21"],
  ["Clean Water and Sanitation", "Ensure availability and sustainable management of water and sanitation for all.", "#26BDE2"],
  ["Affordable and Clean Energy", "Ensure access to affordable, reliable, sustainable and modern energy for all.", "#FCC30B"],
  ["Decent Work and Economic Growth", "Promote sustained, inclusive and sustainable economic growth, full and productive employment and decent work for all.", "#A21942"],
  ["Industry, Innovation and Infrastructure", "Build resilient infrastructure, promote inclusive and sustainable industrialization and foster innovation.", "#FD6925"],
  ["Reduced Inequalities", "Reduce inequality within and among countries.", "#DD1367"],
  ["Sustainable Cities and Communities", "Make cities and human settlements inclusive, safe, resilient and sustainable.", "#FD9D24"],
  ["Responsible Consumption and Production", "Ensure sustainable consumption and production patterns.", "#BF8B2E"],
  ["Climate Action", "Take urgent action to combat climate change and its impacts.", "#3F7E44"],
  ["Life Below Water", "Conserve and sustainably use the oceans, seas and marine resources for sustainable development.", "#0A97D9"],
  ["Life on Land", "Protect, restore and promote sustainable use of terrestrial ecosystems, sustainably manage forests, combat desertification, and halt and reverse land degradation and halt biodiversity loss.", "#56C02B"],
  ["Peace, Justice and Strong Institutions", "Promote peaceful and inclusive societies for sustainable development, provide access to justice for all and build effective, accountable and inclusive institutions at all levels.", "#00689D"],
  ["Partnerships for the Goals", "Strengthen the means of implementation and revitalize the Global Partnership for Sustainable Development.", "#19486A"],
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const SDGS: Sdg[] = GOALS.map(([name, statement, color], index) => {
  const number = index + 1;
  return {
    number,
    slug: `${number}-${slugify(name)}`,
    name,
    statement,
    color,
    icon: `/sdgs/goal-${String(number).padStart(2, "0")}.jpg`,
  };
});

export function getSdg(number: number): Sdg | undefined {
  return SDGS[number - 1];
}

export function getSdgBySlug(slug: string): Sdg | undefined {
  const bySlug = SDGS.find((goal) => goal.slug === slug);
  if (bySlug) return bySlug;
  // Accept bare numbers ("/sdgs/4") so hand-typed links still resolve.
  const number = Number(slug);
  return Number.isInteger(number) ? getSdg(number) : undefined;
}

/** Reads a goal number from an SDG cell such as "3.4", "14" or "17.17". */
export function goalFromTarget(value: string | null | undefined): number | null {
  const match = String(value ?? "").trim().match(/^(\d{1,2})(?:\.\d{1,2})?$/);
  if (!match) return null;
  const goal = Number(match[1]);
  return goal >= 1 && goal <= 17 ? goal : null;
}
