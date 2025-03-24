import { Router } from "express";
const apiRouter = Router();

// apiRouter.post("/chat", async (req, res) => {
//     try {
//       const userMessage = req.body.text;
  
//       const response = await openai.chat.completions.create({
//         model: "gpt-4",
//         messages: [{ role: "user", content: userMessage }],
//       });
  
//       res.json({ response: response.choices[0].message.content });
//     } catch (error) {
//       res.status(500).json({ error: error.message });
//     }
//   });

export default apiRouter;