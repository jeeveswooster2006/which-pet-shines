import { z } from "zod";
import { REACTION_EMOJIS } from "@/lib/constants";

export const petSubmissionSchema = z.object({
  petName: z.string().trim().min(1, "Pet name is required").max(60),
  species: z.string().trim().max(40).optional().or(z.literal("")),
  age: z.string().trim().max(30).optional().or(z.literal("")),
  description: z.string().trim().max(600).optional().or(z.literal("")),
  ownerName: z.string().trim().max(80).optional().or(z.literal("")),
  ownerEmail: z.string().trim().email("Enter a valid email address"),
  agreedToRules: z
    .literal("on")
    .or(z.literal("true"))
    .refine((v) => v === "on" || v === "true", {
      message: "You must confirm you own/care for this pet and agree to the rules",
    }),
});

export const adminLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const voteSchema = z.object({
  matchupId: z.string().min(1),
  petId: z.string().min(1),
});

export const reactionSchema = z.object({
  petId: z.string().min(1),
  matchupId: z.string().min(1).optional(),
  emoji: z.enum(REACTION_EMOJIS),
});

export const rejectSubmissionSchema = z.object({
  reason: z.string().trim().min(1).max(300),
});
