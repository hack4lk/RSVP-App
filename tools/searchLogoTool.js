const { tool } = require("@langchain/core/tools");
const { z } = require("zod");

function searchLogoTool(logos) {
  return tool(
    async ({ make }) => {
      if (!make || !logos || logos.length === 0) {
        return {
          logo: null,
          confidence: 0.0,
          error: "Logo not found or invalid input",
        };
      }

      const sanitizeMake = make.trim().toLowerCase();
      const aliases = {
        mercedes: "mercedes-benz",
        mercedesbenz: "mercedes-benz",
        "mercedes benz": "mercedes-benz",
        chevy: "chevrolet",
        vw: "volkswagen",
      };
      const normalizedMake = aliases[sanitizeMake] || sanitizeMake;

      const match = logos.find(
        (logo) => logo.name.toLowerCase() === normalizedMake,
      );

      if (match) {
        return {
          found: true,
          name: match.name,
          logoUrl: match.url,
          matchType: "exact",
        };
      }

      return {
        found: false,
        name: null,
        logoUrl: null,
        matchType: "none",
      };
    },
    {
      name: "search_available_logos",
      description:
        "Search for and return the logo URL for a car MAKE that was extracted by extract_vehicle_make. Takes the car make (e.g., 'Toyota', 'Mercedes') and returns the matching logo URL from our database. Returns logoUrl in the response.",
      schema: z.object({
        make: z
          .string()
          .describe(
            "Car make/brand to search for (e.g., 'Toyota', 'Mercedes'). This comes from extract_vehicle_make output.",
          ),
      }),
    },
  );
}

module.exports = { searchLogoTool };
