import type {
  TDistrict,
  TPracticeArea,
  TPublicLawyer,
} from "@vidhan/schema";
import { DISTRICTS } from "@vidhan/schema";

import { districtLabel, practiceAreaLabel } from "@/features/lawyers/labels";
import { MOCK_LAWYERS } from "@/lib/lawyers";

import type { TChatSessionView } from "./types";

// Seeds mirror the sidebar's hardcoded recent chats so /chat?id=<n> opens
// with history. Swap for the session list once the API is wired.
export const SEED_SESSIONS: TChatSessionView[] = [
  {
    id: "1",
    title: "Can I terminate my rental agreement?",
    messages: [
      {
        id: "1-u1",
        role: "user",
        content: "Can I terminate my rental agreement early?",
      },
      {
        id: "1-a1",
        role: "assistant",
        content:
          "It depends on what your agreement says and why you want to leave.\n\nIf the landlord has failed to provide the basics — water, electricity, or a habitable space — that is usually a breach on their side, and you can give notice to terminate. If you simply want to leave early, the agreement's notice period and any penalty clause apply.\n\nPut your request in writing, keep proof of delivery, and note the condition of the property when you hand it back.",
      },
    ],
  },
  {
    id: "2",
    title: "Consumer rights in Nepal",
    messages: [
      {
        id: "2-u1",
        role: "user",
        content: "What are my rights if a shop sells me a defective product?",
      },
      {
        id: "2-a1",
        role: "assistant",
        content:
          "Under the Consumer Protection Act, you can ask for a repair, a replacement, or a refund for a defective good.\n\nStart by raising it with the seller in writing and keeping the receipt. If they refuse, you can file a complaint with the local consumer committee or the Department of Commerce. Claims are usually strongest when filed soon after the purchase and supported by evidence of the defect.",
      },
    ],
  },
  {
    id: "3",
    title: "Land ownership dispute",
    messages: [
      {
        id: "3-u1",
        role: "user",
        content: "My neighbour is claiming part of my land. What can I do?",
      },
      {
        id: "3-a1",
        role: "assistant",
        content:
          "First confirm what the land revenue records and your title deed show — that registration is the strongest starting point.\n\nIf the boundary is unclear, you can request a survey from the land revenue office. Where the neighbour has built over the line, a civil suit for recovery of possession or an injunction may be needed. Avoid any physical confrontation, as that can weaken your position.",
        lawyerSearch: {
          query: 'find_lawyers({ practiceAreas: ["property"] })',
          lawyers: MOCK_LAWYERS.slice(2, 5),
        },
      },
    ],
  },
  {
    id: "4",
    title: "What happens after filing a case?",
    messages: [
      {
        id: "4-u1",
        role: "user",
        content: "What happens after a case is filed in court?",
      },
      {
        id: "4-a1",
        role: "assistant",
        content:
          "After a case is registered, the court issues a notice to the other side and assigns a bench.\n\nThe first hearings usually deal with the pleadings — the plaint, the written reply, and interim applications. If either side asks for a temporary order, that is decided early. The main trial then moves through evidence, cross-examination, and final arguments before judgment.",
      },
    ],
  },
];

// ───────────────────────── Reply heuristic ─────────────────────────

const LAWYER_TRIGGERS = [
  "lawyer",
  "advocate",
  "attorney",
  "find me",
  "recommend",
  "consult",
  "hire",
  "represent",
];

const PRACTICE_KEYWORDS: { pattern: RegExp; area: TPracticeArea }[] = [
  { pattern: /rent|land|propert|tenant|landlord/i, area: "property" },
  { pattern: /consumer|refund|defective|warrant|shop/i, area: "consumer" },
  { pattern: /family|divorce|marriage|custody|inherit/i, area: "family" },
  { pattern: /job|salary|employ|workplace|labor|labour/i, area: "labor" },
  { pattern: /criminal|police|arrest|theft|fraud/i, area: "criminal" },
  { pattern: /tax|corporate|company|business|contract/i, area: "corporate" },
];

const MAX_LAWYER_RESULTS = 3;

const LAWYER_REPLY = `This sounds like something a qualified lawyer should look at directly.

I've pulled a few whose practice areas match your situation. You can book a consultation or open their full profile.`;

const GENERIC_REPLY = `Here's the general position under Nepali law.

The exact answer depends on the facts and any documents involved, so treat this as orientation rather than advice. The key points are usually: what the law requires, what evidence you can show, and how quickly you act.

If you'd like, tell me the specific circumstances and I can narrow it down.`;

export type TMockReply = {
  text: string;
  search?: {
    query: string;
    lawyers: TPublicLawyer[];
  };
};

export function replyFor(input: string): TMockReply {
  if (!isLawyerSeeking(input)) return { text: GENERIC_REPLY };

  const area = detectPracticeArea(input);
  const district = detectDistrict(input);
  const lawyers = pickLawyers(area);

  const args = [`practiceAreas: ["${area}"]`];
  if (district) args.push(`district: "${district}"`);
  const query = `find_lawyers({ ${args.join(", ")} })`;

  return {
    text: `${LAWYER_REPLY}\n\nI searched for ${practiceAreaLabel(
      area
    ).toLowerCase()} lawyers${district ? ` in ${districtLabel(district)}` : ""}.`,
    search: { query, lawyers },
  };
}

export function isLawyerSeeking(input: string): boolean {
  const text = input.toLowerCase();
  return LAWYER_TRIGGERS.some((trigger) => text.includes(trigger));
}

function detectPracticeArea(input: string): TPracticeArea {
  for (const { pattern, area } of PRACTICE_KEYWORDS) {
    if (pattern.test(input)) return area;
  }
  return "civil";
}

function detectDistrict(input: string): TDistrict | null {
  const text = input.toLowerCase();
  return (
    DISTRICTS.find(
      (district) =>
        text.includes(district) ||
        text.includes(districtLabel(district).toLowerCase())
    ) ?? null
  );
}

function pickLawyers(area: TPracticeArea): TPublicLawyer[] {
  const matching = MOCK_LAWYERS.filter((lawyer) =>
    lawyer.practiceAreas.includes(area)
  );
  const pool = matching.length > 0 ? matching : MOCK_LAWYERS;
  return pool.slice(0, MAX_LAWYER_RESULTS);
}
