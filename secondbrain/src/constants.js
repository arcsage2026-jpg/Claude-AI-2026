export const STAGES = [
  { id: "idea", label: "Idea" },
  { id: "scripting", label: "Scripting" },
  { id: "filming", label: "Filming" },
  { id: "editing", label: "Editing" },
  { id: "published", label: "Published" },
];

export const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.id, s.label]));
