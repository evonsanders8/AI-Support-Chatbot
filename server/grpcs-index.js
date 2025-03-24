const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { OpenAI } = require("openai");

const packageDefinition = protoLoader.loadSync("helpdesk.proto");
const helpdeskProto = grpc.loadPackageDefinition(packageDefinition).helpdesk;

const aiClient = new OpenAI({ apiKey: "YOUR_OPENAI_API_KEY" });

async function getResponse(call, callback) {
    const userMessage = call.request.message;
    const aiResponse = await aiClient.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: userMessage }],
    });

    callback(null, { response: aiResponse.choices[0].message.content });
}

function logTicket(call, callback) {
    const { user_id, issue_description } = call.request;
    console.log(`Logging ticket for user ${user_id}: ${issue_description}`);

    // Store in DB (Mock response)
    callback(null, { ticket_id: "TICKET12345", status: "Logged" });
}

const server = new grpc.Server();
server.addService(helpdeskProto.HelpDeskBot.service, { getResponse, logTicket });

server.bindAsync("0.0.0.0:50051", grpc.ServerCredentials.createInsecure(), () => {
    console.log("gRPC server running on port 50051");
    server.start();
});
