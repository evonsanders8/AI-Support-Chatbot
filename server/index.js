import express from "express";
import { OpenAI } from "openai";
import cors from "cors";
import bodyParser from "body-parser";
import 'dotenv/config';
import fs from "fs";
import csvParser from "csv-parser";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let embeddedHelpDeskData = [];

// **Load help desk dataset from CSV**
const helpDeskData = [];
async function loadDataset() {
  return new Promise((resolve, reject) => {
    fs.createReadStream("enter file path here")
      .pipe(csvParser())
      .on("data", (row) => {
        helpDeskData.push({
          issue: row.issue_type,
          solution: row.resolution_description,
        });
      })
      .on("end", () => {
        console.log("Help desk data loaded.");
        resolve();
      })
      .on("error", (error) => reject(error));
  });
}

// **Generate embeddings for issues**
async function generateEmbeddings() {
  try {
    embeddedHelpDeskData = await Promise.all(
      helpDeskData.map(async (item) => {
        const response = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: item.issue,
          encoding_format: "float",
        });
        return { ...item, embedding: response.data[0].embedding };
      })
    );
    console.log("Embeddings generated.");
  } catch (error) {
    console.error("Error generating embeddings:", error);
  }
}

// **Cosine Similarity Function**
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// **Chat Endpoint**
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    // Generate embedding for the user's query
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: message,
      encoding_format: "float",
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // **Find most similar issues**
    const similarities = embeddedHelpDeskData.map((item) => ({
      ...item,
      similarity: cosineSimilarity(queryEmbedding, item.embedding),
    }));

    // **Sort by similarity score & get top matches**
    similarities.sort((a, b) => b.similarity - a.similarity);
    const topMatches = similarities.slice(0, 3);
    const contextStr = topMatches
      .map((match) => `Issue: ${match.issue}\nSolution: ${match.solution}`)
      .join("\n\n");

    // **Generate chatbot response**
    const chatResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are an IT help desk assistant. Use the following past resolved issues as reference:
          ${contextStr}
          If no relevant solution exists, suggest troubleshooting steps.`,
        },
        { role: "user", content: message },
      ],
    });

    const botResponse = chatResponse.choices[0].message.content;

    // **If no similar issue, save as a new issue**
    if (topMatches[0].similarity < 0.7) {
      saveNewIssue(message, botResponse);
    }

    res.json({
      response: botResponse,
      similarIssues: topMatches.map((match) => ({
        issue: match.issue,
        solution: match.solution,
        similarity: Math.round(match.similarity * 100),
      })),
    });
  } catch (error) {
    console.error("Error processing chat:", error);
    res.status(500).json({ error: "Error processing your request" });
  }
});

// **Function to Save New Issues & Solutions**
function saveNewIssue(issue, solution) {
  const newEntry = `${issue},${solution}\n`;
  fs.appendFile("helpdesk_data.csv", newEntry, (err) => {
    if (err) {
      console.error("Error saving new issue:", err);
    } else {
      console.log("New issue added to dataset.");
    }
  });
}

// **Start Server After Loading Data**
loadDataset().then(() => {
  generateEmbeddings().then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  });
});
