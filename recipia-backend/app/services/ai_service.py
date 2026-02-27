from groq import Groq
from app.config import settings
from typing import List, Dict, Optional
import json

class AIService:
    def __init__(self):
        self.client = Groq(api_key=settings.groq_api_key)
        self.model = "mixtral-8x7b-32768"  # or "llama2-70b-4096"
    
    async def chat(self, message: str, context: Optional[Dict] = None) -> Dict:
        """General cooking/recipe chat assistant"""
        
        system_prompt = """You are a helpful cooking and recipe assistant. You help users with:
- Recipe suggestions and recommendations
- Cooking techniques and tips
- Ingredient substitutions
- Meal planning ideas
- Dietary advice and modifications
- Kitchen tools and equipment
- Food safety and storage

Be friendly, concise, and practical. If the question is not related to cooking or food, 
politely redirect the conversation to culinary topics."""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message}
        ]
        
        # Add context if provided (e.g., user's previous recipes, preferences)
        if context:
            context_str = f"Context: {json.dumps(context)}\n\n"
            messages[1]["content"] = context_str + messages[1]["content"]
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=1024
            )
            
            ai_response = response.choices[0].message.content
            
            # Generate follow-up suggestions
            suggestions = self._generate_suggestions(message, ai_response)
            
            return {
                "response": ai_response,
                "suggestions": suggestions
            }
        except Exception as e:
            raise Exception(f"AI service error: {str(e)}")
    
    async def generate_recipe(
        self,
        prompt: str,
        cuisine_type: Optional[str] = None,
        prep_time_max: Optional[int] = None
    ) -> Dict:
        """Generate a complete recipe from a text prompt"""
        
        constraints = []
        if cuisine_type:
            constraints.append(f"Cuisine: {cuisine_type}")
        if prep_time_max:
            constraints.append(f"Maximum prep time: {prep_time_max} minutes")
        
        constraints_str = "\n".join(constraints) if constraints else "No specific constraints"
        
        system_prompt = f"""You are a recipe generator. Generate a complete, well-structured recipe.

Recipe Requirements:
{constraints_str}

Return the recipe in this JSON format:
{{
  "name": "Recipe Name",
  "cuisine_type": "cuisine type",
  "prep_time_minutes": 30,
  "ingredients": [
    "2 cups flour",
    "1 tsp salt",
    ...
  ],
  "instructions": [
    "Step 1: Preheat oven to 350°F",
    "Step 2: Mix dry ingredients",
    ...
  ]
}}

Make it practical, delicious, and easy to follow."""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Generate a recipe for: {prompt}"}
        ]
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.8,
                max_tokens=2048
            )
            
            content = response.choices[0].message.content
            
            # Extract JSON from response
            recipe_data = self._extract_json(content)
            
            return recipe_data
        except Exception as e:
            raise Exception(f"Recipe generation error: {str(e)}")
    
    async def improve_recipe(
        self,
        recipe: Dict,
        improvement_type: str
    ) -> Dict:
        """Improve an existing recipe"""
        
        improvement_prompts = {
            "detailed": "Make the instructions more detailed and beginner-friendly with exact measurements and timing",
            "simpler": "Simplify the recipe with fewer ingredients and easier steps while maintaining flavor",
            "healthier": "Make the recipe healthier by reducing calories, fat, or adding nutritious ingredients"
        }
        
        prompt = improvement_prompts.get(improvement_type, "Improve this recipe")
        
        system_prompt = f"""You are a recipe improver. {prompt}.

Return the improved recipe in this JSON format:
{{
  "name": "Improved Recipe Name",
  "cuisine_type": "cuisine type",
  "prep_time_minutes": 30,
  "ingredients": [...],
  "instructions": [...],
  "improvements_made": "Brief description of what was improved"
}}"""

        recipe_str = json.dumps({
            "name": recipe.get("name"),
            "ingredients": recipe.get("ingredients"),
            "instructions": recipe.get("instructions")
        }, indent=2)
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Improve this recipe:\n\n{recipe_str}"}
        ]
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=2048
            )
            
            content = response.choices[0].message.content
            improved_recipe = self._extract_json(content)
            
            return improved_recipe
        except Exception as e:
            raise Exception(f"Recipe improvement error: {str(e)}")
    
    async def suggest_recipes_based_on_ingredients(self, ingredients: List[str]) -> List[str]:
        """Suggest recipe ideas based on available ingredients"""
        
        ingredients_str = ", ".join(ingredients)
        
        system_prompt = """You are a creative chef. Suggest 5 recipe ideas that can be made 
with the given ingredients. Be creative but practical. Return ONLY a JSON array of recipe names."""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Suggest recipes using these ingredients: {ingredients_str}"}
        ]
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.9,
                max_tokens=512
            )
            
            content = response.choices[0].message.content
            suggestions = self._extract_json(content)
            
            return suggestions if isinstance(suggestions, list) else []
        except Exception as e:
            return []
    
    def _extract_json(self, content: str) -> Dict:
        """Extract JSON from AI response"""
        try:
            # Try to find JSON in the response
            start_idx = content.find('{')
            end_idx = content.rfind('}') + 1
            
            if start_idx != -1 and end_idx > start_idx:
                json_str = content[start_idx:end_idx]
                return json.loads(json_str)
            
            # If no JSON found, return raw content
            return {"error": "Could not parse response", "raw": content}
        except json.JSONDecodeError:
            return {"error": "Invalid JSON", "raw": content}
    
    def _generate_suggestions(self, message: str, response: str) -> List[str]:
        """Generate follow-up suggestions based on conversation"""
        suggestions = []
        
        # Simple keyword-based suggestions
        keywords = {
            "recipe": ["Can you suggest variations?", "What are good side dishes?", "How can I make it healthier?"],
            "ingredient": ["What can I substitute?", "Where can I find this?", "How do I prepare it?"],
            "cook": ["What temperature should I use?", "How long should I cook it?", "What tools do I need?"],
            "healthy": ["What's the nutritional value?", "Can you make it vegan?", "How can I reduce calories?"]
        }
        
        message_lower = message.lower()
        for keyword, sug_list in keywords.items():
            if keyword in message_lower:
                suggestions.extend(sug_list[:2])
                break
        
        if not suggestions:
            suggestions = [
                "Tell me more about this",
                "Can you suggest a recipe?",
                "What else should I know?"
            ]
        
        return suggestions[:3]

# Singleton instance
ai_service = AIService()