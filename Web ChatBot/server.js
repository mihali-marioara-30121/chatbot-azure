const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();
const path = require("path");

const app = express();
app.use(express.json());

console.log(process.env.AZURE_AI_SEARCH_ENDPOINT);
console.log(process.env.AZURE_AI_SEARCH_API_KEY);
console.log(process.env.AZURE_AI_SEARCH_INDEX);

// Function to search documents from Azure Cognitive Search
async function searchAzureCognitiveSearch(query) {
  const searchEndpoint = process.env.AZURE_AI_SEARCH_ENDPOINT;
  const searchKey = process.env.AZURE_AI_SEARCH_API_KEY;
  const searchIndex = process.env.AZURE_AI_SEARCH_INDEX;

  // Verify environment variables are set correctly
  if (!searchEndpoint || !searchKey || !searchIndex) {
    console.error("Azure Cognitive Search environment variables are missing.");
    return "";
  }

  const url = `${searchEndpoint}/indexes/${searchIndex}/docs/search?api-version=2023-11-01`;

  const requestBody = {
    search: query,
    top: 3
  };

  console.log("Request body:", requestBody);

  try {
    const response = await axios.post(url, requestBody, {
      headers: {
        "Content-Type": "application/json",
        "api-key": searchKey,
      },
    });

    if (response.data.value.length === 0) {
      console.log("No relevant documents found.");
      return ""; // No documents found
    }

    //debugg line
    console.log("Azure Cognitive Search raw response:",  response.data.value.map((doc) => doc.chunk).join("\n"));
    
    return response.data.value.map((doc) => doc.chunk).join("\n");
  } catch (error) {
    console.error("Failed to search Azure Cognitive Search:", error.response ? error.response.data : error.message);
    return "";
  }
}

// Function to query OpenAI with the results from Cognitive Search
async function queryOpenAI(query, searchResults) {
  const openAIEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const openAIDeployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const apiVersion = "2023-07-01-preview";

  // Verify OpenAI environment variables are set
  if (!openAIEndpoint || !openAIDeployment) {
    console.error("OpenAI environment variables are missing.");
    return;
    //return "Nu am suficiente informații pentru a răspunde la întrebare.";
  }

  const messages = [
    { role: "system", content: "You are a helpful assistant that answers questions ONLY using the provided documents. If the information is not available, say: 'I don’t have enough data to answer this question.'" },
    { role: "user", content: `Here is the question: ${query}\n\nRelevant documents:\n${searchResults}\n\nProvide a clear and concise answer based only on these documents but look at text first.` },
  ];

  try {
    const response = await axios.post(`${openAIEndpoint}/openai/deployments/${openAIDeployment}/chat/completions?api-version=${apiVersion}`, {
     // model: "gpt-4",
      model: openAIDeployment,  // Adjust based on the model you are using
      messages: messages,
      max_tokens: 800,
      temperature: 0.2,
      top_p: 0.95,
      frequency_penalty: 0,
      presence_penalty: 0,
    }, {
      headers: {
        "Content-Type": "application/json",
        //"Authorization": `Bearer ${process.env.AZURE_OPENAI_API_KEY}`,
         "api-key": process.env.AZURE_OPENAI_API_KEY,
      }
    });

    //console.log("OpenAI response:", JSON.stringify(response.data, null, 2));

    //console.log("OpenAI response:", response.data.choices[0].message.content)

    return response.data.choices[0].message.content;

   
  } catch (error) {
    console.error("Failed to query OpenAI:", error.response ? error.response.data : error.message);
    return;
    //return "Nu am suficiente informații pentru a răspunde la întrebare.";
  }
}

// Route to handle question and response
app.post("/ask-question", async (req, res) => {
  const userQuery = req.body.query;

  if (!userQuery || userQuery.trim() === "") {
    return res.json({ answer: "Te rog, scrie o întrebare!" });
  }

  console.log("User query received:", userQuery);

  const searchResults = await searchAzureCognitiveSearch(userQuery);


  if (!searchResults) {
    return res.json({ answer: "Nu am suficiente informații pentru a răspunde la întrebare." });
  }
  //console.log("Azure Cognitive Search raw response:", JSON.stringify(response.data, null, 2));
  //console.log("Search results from Azure:", searchResults);
  

  const openAIAnswer = await queryOpenAI(userQuery, searchResults);
  res.json({ answer: openAIAnswer });
});

// Serve HTML page for frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "app.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
