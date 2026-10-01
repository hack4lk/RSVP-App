const { tool } = require("@langchain/core/tools");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { HumanMessage, SystemMessage } = require("@langchain/core/messages");
const { z } = require("zod");

function extractMakeTool(llm) {
  return tool(
    async ({ carMakeModel }) => {
      const prompt = ChatPromptTemplate.fromMessages([
        [
          "system",
          " You are a helpful assistant that knows about vehicles that knows about car makes and models.",
        ],
        [
          "human",
          `Extract the vehicle name from the following text.

        Return ONLY THE MAKE and nothing else.

        Text: {input}

        Make:`,
        ],
      ]);

      const chain = prompt.pipe(llm);

      try {
        const result = await chain.invoke({ input: carMakeModel });
        const make = result.content.trim();

        return {
          make: make || null,
          confidence: make ? 0.0 : 0.0,
        };
      } catch (e) {
        console.error(e);
        return {
          make: null,
          confidence: 0.0,
          error: e.message || String(e),
        };
      }
    },
    {
      name: "extract_vehicle_name",
      description:
        "Extract the vehicle MAKE/BRAND from a car description. Returns the make only (e.g., 'Toyota', 'Mercedes', 'Ford'). This tool must be called FIRST to get the make, which is then used by the search_available_logos tool.",
      schema: z.object({
        carMakeModel: z
          .string()
          .describe("Full car description (make, model, year, etc.)"),
      }),
    },
  );
}

module.exports = { extractMakeTool };
