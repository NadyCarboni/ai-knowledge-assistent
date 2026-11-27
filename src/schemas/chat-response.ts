import { z } from "zod";

const bookRecommendationSchema = z.object({
    title: z.string(),
    author: z.string(),
    genre: z.string(),
    reason: z.string(),
})

export const chatResponseSchema = z.discriminatedUnion("kind", [
    z.object({
        kind: z.enum(["recommendations"]),
        books: z.array(bookRecommendationSchema).length(3),
    }),
    z.object({
        kind: z.enum(["clarification"]),
        question: z.string(),
    }),
    z.object({
        kind: z.enum(["out_of_scope"]),
        message: z.string(),
    }),
])

export type ChatResponse = z.infer<typeof chatResponseSchema>;

export const chatResponseJsonSchema = z.toJSONSchema(chatResponseSchema);