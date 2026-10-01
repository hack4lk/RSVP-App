const { ChatOpenAI } = require("@langchain/openai");
const { createAgent } = require("langchain");
const dotenv = require("dotenv");
const {
  extractMakeTool,
  searchLogoTool,
  createItemTool,
} = require("./tools");

dotenv.config();

const llm = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-3.5-turbo",
  temperature: 0.0,
});

async function generateShowcasePayloadWithAgent(carMakeModel, logos, pool) {
  try {
    const extractMakeToolInstance = extractMakeTool(llm);
    const searchLogoToolInstance = searchLogoTool(logos);
    const createItemToolInstance = createItemTool(pool);

    // The agent owns the complete workflow, including the database write. The
    // prompt gives it an explicit success and failure stop condition.
    const agent = createAgent({
      model: llm,
      tools: [
        extractMakeToolInstance,
        searchLogoToolInstance,
        createItemToolInstance,
      ],
      systemPrompt: `You create one car showcase item for each request.
Use the tools in this exact order: (1) extract_vehicle_name exactly once,
(2) search_available_logos exactly once using that make, and, only when a
logo is found, (3) create_showcase_item exactly once using the returned name
and logoUrl plus the original car description. After a successful create,
reply with exactly SHOWCASE_CREATED and do not call any more tools. If
extraction or lookup fails, reply with exactly SHOWCASE_SKIPPED and do not
retry any tool or create an item.`,
    });

    const result = await agent.invoke(
      {
        messages: [
          {
            role: "user",
            content: `Create a showcase item for this car: ${carMakeModel}`,
          },
        ],
      },
      { recursionLimit: 8 },
    );

    // Trust the side-effecting tool result, not an LLM's wording in its final
    // message. This also proves the agent—not the route handler—created it.
    return result.messages.some(
      (message) =>
        message.name === "create_showcase_item" &&
        String(message.content).includes('"success":true'),
    );
  } catch (e) {
    console.error("Error generating showcase payload:", e);
    return false;
  }
}

module.exports = {
  generateShowcasePayloadWithAgent,
};
