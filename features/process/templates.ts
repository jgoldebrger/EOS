import type { SopDocument } from "@/features/process/schema";

export interface SopTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  department: string;
  priority: string;
  steps: Array<{ title: string; time: string; note: string }>;
}

export const SOP_DEPARTMENTS = [
  "General",
  "Operations",
  "Sales",
  "HR",
  "Customer Success",
  "Safety",
  "Finance",
  "IT",
] as const;

export const SOP_PRIORITIES = [
  "Low",
  "Medium",
  "High",
  "Critical",
] as const;

export const SOP_APPROVAL_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const;

export type SopApprovalStatus = (typeof SOP_APPROVAL_STATUSES)[number];

export const SOP_TEMPLATES: SopTemplate[] = [
  {
    id: "restaurant-opening",
    name: "Restaurant Opening Procedure",
    description: "Complete morning setup",
    icon: "🍽️",
    department: "Operations",
    priority: "High",
    steps: [
      { title: "Unlock and secure entry", time: "5", note: "Disarm alarm, check for overnight issues" },
      { title: "Turn on all equipment", time: "10", note: "Ovens, grills, fryers, refrigeration" },
      { title: "Verify temperature logs", time: "5", note: "Check all cooler/freezer temps" },
      { title: "Prep vegetables and proteins", time: "45", note: "Follow daily prep sheet" },
      { title: "Set up dining area", time: "20", note: "Tables, chairs, condiments, menus" },
      { title: "Fill ice bins and beverage stations", time: "15", note: "Check all drink supplies" },
      { title: "Count register and prepare POS", time: "10", note: "Verify opening cash amount" },
      { title: "Final walkthrough and unlock doors", time: "5", note: "Check restrooms, lighting, music" },
    ],
  },
  {
    id: "restaurant-closing",
    name: "Restaurant Closing Procedure",
    description: "End of day procedures",
    icon: "🔒",
    department: "Operations",
    priority: "High",
    steps: [
      { title: "Stop seating new customers", time: "5", note: "30 minutes before close" },
      { title: "Begin cleaning stations", time: "30", note: "Wipe down surfaces, organize" },
      { title: "Shut down cooking equipment", time: "15", note: "Turn off in proper sequence" },
      { title: "Deep clean kitchen", time: "45", note: "Floors, equipment, walls" },
      { title: "Take out all trash", time: "10", note: "Replace liners, clean bins" },
      { title: "Count register and prepare deposit", time: "20", note: "Complete cash reports" },
      { title: "Restock for tomorrow", time: "25", note: "Check par levels, make prep list" },
      { title: "Check and record temps", time: "10", note: "All coolers and freezers" },
      { title: "Secure building", time: "10", note: "Lock doors, set alarm, verify all off" },
      { title: "Complete closing checklist", time: "5", note: "Sign off and submit" },
    ],
  },
  {
    id: "retail-opening",
    name: "Retail Store Opening",
    description: "Store preparation",
    icon: "🏪",
    department: "Operations",
    priority: "High",
    steps: [
      { title: "Unlock store and disarm alarm", time: "5", note: "Visual check for issues" },
      { title: "Turn on lights and systems", time: "5", note: "POS, music, displays" },
      { title: "Count register", time: "10", note: "Verify starting cash" },
      { title: "Check inventory alerts", time: "10", note: "Low stock notifications" },
      { title: "Straighten displays", time: "20", note: "Face products, clean mirrors" },
      { title: "Check fitting rooms", time: "5", note: "Clean and organize" },
      { title: "Unlock entrance", time: "2", note: "Put out welcome sign" },
    ],
  },
  {
    id: "retail-sale",
    name: "Point of Sale Transaction",
    description: "Customer transactions",
    icon: "💳",
    department: "Sales",
    priority: "Medium",
    steps: [
      { title: "Greet customer warmly", time: "1", note: "Make eye contact, smile" },
      { title: "Scan or enter items", time: "5", note: "Check for sale prices" },
      { title: "Offer loyalty program", time: "2", note: "If not already member" },
      { title: "Process payment", time: "3", note: "Cash, card, or mobile" },
      { title: "Bag items carefully", time: "2", note: "Heavy items on bottom" },
      { title: "Thank customer and invite return", time: "1", note: "Hand them receipt" },
    ],
  },
  {
    id: "office-onboarding",
    name: "Employee Onboarding",
    description: "New hire process",
    icon: "👤",
    department: "HR",
    priority: "High",
    steps: [
      { title: "Welcome and orientation", time: "30", note: "Company history, mission, values" },
      { title: "Tour of facilities", time: "20", note: "Restrooms, kitchen, emergency exits" },
      { title: "IT setup", time: "45", note: "Email, computer, phone, badges" },
      { title: "HR paperwork", time: "60", note: "Tax forms, benefits, policies" },
      { title: "Review job description", time: "30", note: "Expectations and goals" },
      { title: "Introduce to team", time: "30", note: "Team members and managers" },
      { title: "Assign mentor/buddy", time: "15", note: "Point person for questions" },
      { title: "Review first week schedule", time: "20", note: "Training sessions planned" },
      { title: "Set up workspace", time: "30", note: "Supplies, equipment" },
      { title: "System training", time: "90", note: "Core tools and software" },
      { title: "Review communication channels", time: "15", note: "Email, chat, meetings" },
      { title: "Schedule 30-day check-in", time: "10", note: "Calendar first review" },
    ],
  },
  {
    id: "customer-complaint",
    name: "Customer Complaint Resolution",
    description: "Customer service",
    icon: "📞",
    department: "Customer Success",
    priority: "High",
    steps: [
      { title: "Listen actively", time: "5", note: "Do not interrupt, take notes" },
      { title: "Express empathy", time: "2", note: "Acknowledge their frustration" },
      { title: "Apologize sincerely", time: "2", note: "Even if not at fault" },
      { title: "Ask clarifying questions", time: "5", note: "Get full understanding" },
      { title: "Propose solution", time: "10", note: "Within authority limits" },
      { title: "Escalate if needed", time: "5", note: "Get manager approval" },
      { title: "Implement resolution", time: "15", note: "Execute agreed solution" },
      { title: "Document interaction", time: "10", note: "Log in CRM system" },
    ],
  },
  {
    id: "inventory-count",
    name: "Inventory Count Process",
    description: "Stock management",
    icon: "📦",
    department: "Operations",
    priority: "Medium",
    steps: [
      { title: "Print count sheets", time: "10", note: "Organize by category" },
      { title: "Assign zones to counters", time: "5", note: "Balance workload" },
      { title: "Count physical inventory", time: "120", note: "Be thorough and accurate" },
      { title: "Enter counts into system", time: "45", note: "Double-check entries" },
      { title: "Identify discrepancies", time: "30", note: "Compare to system" },
      { title: "Recount problem areas", time: "30", note: "Verify large differences" },
      { title: "Adjust inventory records", time: "20", note: "Get manager approval" },
      { title: "Analyze variances", time: "25", note: "Look for patterns" },
      { title: "Generate count report", time: "15", note: "Submit to management" },
    ],
  },
  {
    id: "safety-incident",
    name: "Safety Incident Response",
    description: "Emergency response",
    icon: "⚠️",
    department: "Safety",
    priority: "Critical",
    steps: [
      { title: "Ensure scene is safe", time: "2", note: "Remove immediate dangers" },
      { title: "Assess injuries", time: "5", note: "Determine severity" },
      { title: "Call emergency services if needed", time: "3", note: "911 for serious injuries" },
      { title: "Provide first aid", time: "15", note: "Only if trained" },
      { title: "Notify supervisor immediately", time: "5", note: "Use emergency contact" },
      { title: "Secure the area", time: "10", note: "Prevent further incidents" },
      { title: "Document incident details", time: "20", note: "Photos, witness statements" },
      { title: "Complete incident report", time: "30", note: "Be thorough and factual" },
      { title: "Preserve evidence", time: "10", note: "Do not clean or move items" },
      { title: "Follow up with involved parties", time: "15", note: "Check on wellbeing" },
      { title: "Submit report to HR/Safety", time: "10", note: "Within required timeframe" },
    ],
  },
];

export function applyTemplate(
  template: SopTemplate,
  pageId: string,
): SopDocument {
  return {
    id: pageId,
    title: template.name,
    department: template.department,
    priority: template.priority,
    steps: template.steps.map((step) => ({
      title: step.title,
      time: step.time,
      note: step.note,
      dependencies: [],
      imageUrl: "",
      approver: "",
      approvalStatus: "pending",
    })),
    lastModified: new Date().toISOString(),
  };
}

export function applyTemplateToDocument(
  template: SopTemplate,
  pageId: string,
  currentTitle?: string,
): SopDocument {
  const doc = applyTemplate(template, pageId);
  if (currentTitle?.trim()) {
    doc.title = currentTitle.trim();
  }
  return doc;
}
