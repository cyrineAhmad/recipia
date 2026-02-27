import { Recipe } from "@/types/recipe";

export async function sendMessageToAI(message: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 1000));
  const responses: Record<string, string> = {
    default:
      "I'd be happy to help with that! Could you give me a bit more detail about what you're looking for?",
  };

  if (message.toLowerCase().includes("substitute"))
    return "Great question! You can substitute butter with coconut oil for a dairy-free option, or use Greek yogurt for a lighter version.";
  if (message.toLowerCase().includes("quick") || message.toLowerCase().includes("fast"))
    return "For a quick meal, try a stir-fry! Use pre-cut veggies and your choice of protein. It's ready in under 15 minutes.";
  if (message.toLowerCase().includes("salmon"))
    return "Perfect! You could make a **Creamy Salmon & Spinach Pasta** or a **Salmon Buddha Bowl**. Both take about 15–20 minutes. Would you like the recipe for either of these?";
  return responses.default;
}

export async function generateRecipeWithAI(): Promise<Partial<Recipe>> {
  await new Promise((r) => setTimeout(r, 1200));
  return {
    name: "Mediterranean Grilled Chicken",
    ingredients: [
      "Chicken Breast",
      "Olive Oil",
      "Lemon",
      "Garlic",
      "Oregano",
      "Cherry Tomatoes",
      "Feta Cheese",
      "Kalamata Olives",
    ],
    instructions:
      "Marinate chicken in olive oil, lemon juice, garlic, and oregano for 30 minutes. Grill until cooked through. Serve over mixed greens with cherry tomatoes, feta, and olives. Drizzle with extra virgin olive oil.",
    cuisineType: "Mediterranean",
    prepTimeMinutes: 30,
  };
}

export async function improveRecipeWithAI(instructions: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 800));
  return `${instructions}\n\nPro Tips:\n• Let meat rest for 5 minutes before serving for juicier results.\n• Season at every step, not just at the end.\n• Use fresh herbs as a garnish for added flavor and visual appeal.`;
}
