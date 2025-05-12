import "@azure/openai/types";
import { AzureOpenAI } from "openai";
// import { DefaultAzureCredential, getBearerTokenProvider } from "@azure/identity";
import axios from "axios";

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

async function searchAzureCognitiveSearch(query: string): Promise<string> {
  const searchEndpoint = process.env.AZURE_AI_SEARCH_ENDPOINT;
  const searchKey = process.env.AZURE_AI_SEARCH_API_KEY;
  const searchIndex = process.env.AZURE_AI_SEARCH_INDEX;

  if (!searchEndpoint || !searchKey || !searchIndex) {
    console.error("Azure Cognitive Search environment variables are missing.");
    return "";
  }

  const url = `${searchEndpoint}/indexes/${searchIndex}/docs/search?api-version=2023-11-01`; //changed the ApiVersion

  // Request body for the search
 const requestBody = {
  search: query,
  top: 3 
};
  
try {
  const response = await axios.post(url, requestBody, {
    headers: {
      "Content-Type": "application/json",
      "api-key": searchKey,
    },
  });
  
//Debugging: vezi exact ce returnează Azure Search
 //console.log("Azure Cognitive Search raw response:", JSON.stringify(response.data, null, 2));
// console.log("Azure Cognitive Search raw response:",  response.data.value.map((doc: any) => doc.chunk).join("\n"));

  // Extract the relevant documents from the response
    return response.data.value.map((doc: any) => doc.chunk).join("\n"); // changed doc.content -> doc.chunk
  } catch (error:any) {
    //console.error(`Failed to search Azure Cognitive Search:\n`, JSON.stringify(error.data));
    console.error(`Failed to search Azure Cognitive Search:\n`, error.response ? error.response.data : error.message);
    return "";
  }
}

async function main(): Promise<void> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const apiVersion = "2023-07-01-preview"; // Versiunea API-ului OpenAI 2024-02-15-preview -good as well
  const searchEndpoint = process.env.AZURE_AI_SEARCH_ENDPOINT;
  const searchKey = process.env.AZURE_AI_SEARCH_API_KEY;
  const searchIndex = process.env.AZURE_AI_SEARCH_INDEX;

  if (!endpoint || !deployment) {
    console.error("Please set the required environment variables.");
    return;
  }

  const client = new AzureOpenAI({ endpoint, deployment, apiVersion });

  const userQuery = "Cum pot adauga un copil în grupa?";
  //const userQuery = "Ce e sql?";

  console.log(userQuery);

  // Perform search in Azure Cognitive Search
  const searchResults = await searchAzureCognitiveSearch(userQuery);

  if (!searchResults) {
    console.log("No relevant documents found.");
    return;
  }
  //console.log("Azure Search Results:", searchResults);//for debuging


  // Construim promptul astfel încât AI-ul să folosească DOAR documentele
  const messages: ChatMessage[] = [
    { role: "system", content: `You are a helpful assistant that answers questions ONLY using the provided documents. If the information is not available, say: 'I don’t have enough data to answer this question.'` },
    { role: "user", content: `Here is the question: ${userQuery}\n\nRelevant documents:\n${searchResults}\n\nProvide a clear and concise answer based only on these documents.` },
  ];

  console.log(`Querying OpenAI...`);


 //console.log(`Message: ${messages.map((m) => m.content).join("\n")}`);

  const response = await client.chat.completions.create({
    model: deployment,
    messages: messages,
    max_tokens: 800,
    temperature: 0.2, //higher value makes the output more random
    top_p: 0.95,
    frequency_penalty: 0,
    presence_penalty: 0,
  });

  console.log(response.choices.map(choice => choice.message.content).join("\n"));
}

main().catch((err) => {
  console.error("The sample encountered an error:", err);
});
