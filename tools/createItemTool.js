const { tool } = require("@langchain/core/tools");
const { z } = require("zod");

function createItemTool(pool) {
  return tool(
    async ({ title, logoUrl, description }) => {
      try {
        const result = await pool.query(
          "INSERT INTO car_showcase_items (title, description, image_src) VALUES ($1, $2, $3) RETURNING id",
          [title, description, logoUrl],
        );

        const itemId = result.rows[0].id;

        if (!itemId) {
          return {
            success: false,
            error: "Failed to create item",
          };
        }

        return {
          success: true,
          itemId: itemId,
          message: "Item created successfully",
        };
      } catch (e) {
        console.error(e);
        return {
          success: false,
          error: e.message || String(e),
        };
      }
    },
    {
      name: "create_showcase_item",
      description:
        "FINAL STEP: Create a car showcase item in the database. This takes the extracted make as title, the logo URL from search_available_logos, and a description. Must be called LAST after other tools provide the data.",
      schema: z.object({
        title: z
          .string()
          .describe("Car make from extract_vehicle_make (e.g., 'Toyota')"),
        logoUrl: z.string().describe("Logo URL from search_available_logos"),
        description: z
          .string()
          .describe("The original car description (e.g., '2022 Toyota Camry')"),
      }),
    },
  );
}

module.exports = { createItemTool };
