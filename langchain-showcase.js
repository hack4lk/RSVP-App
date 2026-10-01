const { ChatOpenAI } = require("@langchain/openai");
const { PromptTemplate } = require("@langchain/core/prompts");
const  dotenv = require("dotenv");

dotenv.config();

const llm = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  modelName: "gpt-3.5-turbo",
  temperature: 0.0,
});

// extract the vehicle name...
async function extractVehicleName(carMakeModel) {
  const promptTemplate = PromptTemplate.fromTemplate(`
        You are a helpful assistant that knows about vehicles.
        The vehicle name typically includes the make and model.
        Extract the vehicle name from the following text.

        Return ONLY THE MAKE and nothing else.

        Text: {input}

        Make:
    `);

  const chain = promptTemplate.pipe(llm);

  try {
    const result = await chain.invoke({ input: carMakeModel });
    return result.content.trim();
  } catch (error) {
    console.log(`Error extracting vehicle name: ${error}`);
    return null;
  }
}

// match the logo from the make name...
function selectLogoFromMake(make, logos) {
  if (!make || !logos || logos.length === 0) {
    return null;
  }

  const lowerMake = make.toLowerCase().trim();
  const aliases = {
    mercedes: "mercedes-benz",
    mercedesbenz: "mercedes-benz",
    "mercedes benz": "mercedes-benz",
    chevy: "chevrolet",
    vw: "volkswagen",
  };
  const normalizedMake = aliases[lowerMake] || lowerMake;
  const match = logos.find(
    (logo) => logo.name.toLowerCase().trim() === normalizedMake,
  );

  return match || null;
}

// generate showcase payload...
async function generateShowcasePayload(carMakeModel, logos) {
  const make = await extractVehicleName(carMakeModel);

  if (!make) {
    console.log(`Could not extract make from: ${carMakeModel}`);
    return null;
  }

  console.log(`Extracted make: "${make}" from "${carMakeModel}"`);

  const selectedLogo = selectLogoFromMake(make, logos);
  if (!selectedLogo) {
    console.log(`No logo found for make: ${make}`);
    return null;
  }

  console.log(`Selected logo: ${selectedLogo.name} (${selectedLogo.url})`);

  return {
    title: make,
    logoUrl: selectedLogo.url,
    description: carMakeModel,
  };
}

module.exports = {
  extractVehicleName,
  selectLogoFromMake,
  generateShowcasePayload,
};
