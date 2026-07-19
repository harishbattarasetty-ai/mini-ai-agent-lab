import {
    GoogleGenAI,
    Type,
} from "@google/genai";
import "dotenv/config";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createProject } from "./tools";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
});

const rl = readline.createInterface({
    input,
    output,
});

const createProjectDeclaration = {
    name: "createProject",
    description: "Creates a new project.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            name: {
                type: Type.STRING,
                description: "The project name",
            },
        },
        required: ["name"],
    },
};

async function main() {
    const history: { role: 'user' | 'model'; text: string }[] = []
    while (true) {
        const prompt = await rl.question("You: ");
        history.push({
            role: "user",
            text: prompt,
        });

        if (prompt.toLowerCase() === "exit") {
            rl.close();
            break;
        }

        const contents = history.map((message) => ({
            role: message.role,
            parts: [{ text: message.text }],
        }));

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents,
            config: {
                systemInstruction: `
You are Excelry AI Assistant.

Rules:
- Always introduce yourself as Excelry AI Assistant.
- Keep answers short.
- Be friendly.
- Never say you are Gemini.
`,
                tools: [
                    {
                        functionDeclarations: [createProjectDeclaration],
                    },
                ],
            },
        });

        const functionCall = response.functionCalls?.[0];

        if (!functionCall) {
            console.log("\nGemini:", response.text);

            history.push({
                role: "model",
                text: response.text ?? "",
            });

            continue;
        }

        console.log("\n🤖 Gemini requested a tool:");
        console.log(functionCall);

        let toolResult: any;

        switch (functionCall.name) {
            case "createProject":
                toolResult = createProject(
                    functionCall.args.name as string
                );
                break;

            default:
                throw new Error(`Unknown tool: ${functionCall.name}`);
        }

        console.log("\n📦 Tool Result:");
        console.log(toolResult);
    }
}

main().catch(console.error);