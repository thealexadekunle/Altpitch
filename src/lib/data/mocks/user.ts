import type { User } from "@/lib/types";

export const mockUser: User = {
  id: "user-1",
  name: "Alex Rivera",
  email: "alex@studio.example",
  title: "Senior Product Designer & Web Strategist",
  timezone: "America/New_York",
  currency: "USD",
  avatarInitials: "AR",
  writingStyle: {
    tone: "conversational",
    formality: 55,
    maxProposalWords: 350,
    avoidPhrases: [
      "I am writing to express my interest",
      "Dear Hiring Manager",
      "As a highly skilled professional",
      "I hope this finds you well",
    ],
    preferredOpening: "Lead with a specific observation about their business problem",
    answerLength: "standard",
  },
};
