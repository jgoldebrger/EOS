import { createClient } from "@/lib/supabase/server";
import { getOrgPeopleWithManagers, getPeopleReviewsForOrg } from "@/features/people/queries";
import { getRocksForOrg } from "@/features/rocks/queries";
import { getCurrentQuarter, formatQuarterLabel } from "@/features/rocks/utils";
import { getVtoSectionCount, getSnapshots } from "@/features/vto/queries";

export interface QuarterlyPulseStep {
  key: string;
  title: string;
  description: string;
  status: "complete" | "in_progress" | "not_started";
  href: string;
  detail: string;
}

export interface QuarterlyPulseData {
  quarter: string;
  quarterLabel: string;
  steps: QuarterlyPulseStep[];
  summary: {
    companyRocksTotal: number;
    companyRocksOnTrack: number;
    peopleReviewed: number;
    peopleTotal: number;
    vtoSections: number;
    hasQuarterSnapshot: boolean;
  };
}

const VTO_TRACTION_KEYS = [
  "core_values",
  "core_focus",
  "ten_year_target",
  "marketing_strategy",
  "three_year_picture",
  "one_year_plan",
] as const;

export async function getQuarterlyPulseData(
  organizationId: string,
  orgSlug: string,
  quarter: string = getCurrentQuarter(),
): Promise<QuarterlyPulseData> {
  const supabase = await createClient();

  const [rocks, people, reviews, vtoSectionCount, snapshots, vtoSections] =
    await Promise.all([
      getRocksForOrg(organizationId, { quarter, rockType: "company" }),
      getOrgPeopleWithManagers(organizationId),
      getPeopleReviewsForOrg(organizationId, quarter),
      getVtoSectionCount(organizationId),
      getSnapshots(organizationId),
      supabase
        .from("vto_sections")
        .select("section_key, content, updated_at")
        .eq("organization_id", organizationId)
        .in("section_key", [...VTO_TRACTION_KEYS]),
    ]);

  const companyRocksOnTrack = rocks.filter((rock) => rock.status === "on_track").length;
  const reviewedSubjectIds = new Set(reviews.map((review) => review.subjectUserId));
  const peopleReviewed = people.filter((person) =>
    reviewedSubjectIds.has(person.userId),
  ).length;

  const quarterSnapshots = snapshots.filter((snapshot) => {
    const year = quarter.slice(0, 4);
    return snapshot.created_at.startsWith(year);
  });
  const hasQuarterSnapshot = quarterSnapshots.length > 0;

  const tractionSections = vtoSections.data ?? [];
  const filledTractionSections = tractionSections.filter(
    (section) => section.content?.trim().length,
  ).length;
  const vtoComplete = filledTractionSections >= 4;

  const rocksComplete =
    rocks.length > 0 && rocks.every((rock) => rock.status !== "off_track");
  const peopleComplete =
    people.length > 0 && peopleReviewed >= Math.ceil(people.length * 0.8);

  const base = `/org/${orgSlug}`;

  const steps: QuarterlyPulseStep[] = [
    {
      key: "vto",
      title: "Review V/TO",
      description: "Confirm vision and 1-year plan before quarterly planning.",
      status: vtoComplete ? "complete" : filledTractionSections > 0 ? "in_progress" : "not_started",
      href: `${base}/vto`,
      detail: `${filledTractionSections} of ${VTO_TRACTION_KEYS.length} traction sections filled`,
    },
    {
      key: "company_rocks",
      title: "Company rocks",
      description: "Set and track company-level quarterly priorities.",
      status:
        rocks.length === 0
          ? "not_started"
          : rocksComplete
            ? "complete"
            : "in_progress",
      href: `${base}/company/rocks`,
      detail: `${companyRocksOnTrack}/${rocks.length} on track`,
    },
    {
      key: "people_analyzer",
      title: "People Analyzer",
      description: "Complete Right Person / Right Seat reviews for leadership.",
      status:
        people.length === 0
          ? "not_started"
          : peopleComplete
            ? "complete"
            : peopleReviewed > 0
              ? "in_progress"
              : "not_started",
      href: `${base}/people/analyzer?quarter=${encodeURIComponent(quarter)}`,
      detail: `${peopleReviewed}/${people.length} people reviewed`,
    },
    {
      key: "snapshot",
      title: "V/TO snapshot",
      description: "Capture a quarterly snapshot for history and alignment.",
      status: hasQuarterSnapshot ? "complete" : vtoComplete ? "in_progress" : "not_started",
      href: `${base}/vto`,
      detail: hasQuarterSnapshot
        ? `${quarterSnapshots.length} snapshot(s) this year`
        : "No snapshot captured yet",
    },
  ];

  return {
    quarter,
    quarterLabel: formatQuarterLabel(quarter),
    steps,
    summary: {
      companyRocksTotal: rocks.length,
      companyRocksOnTrack,
      peopleReviewed,
      peopleTotal: people.length,
      vtoSections: vtoSectionCount,
      hasQuarterSnapshot,
    },
  };
}
