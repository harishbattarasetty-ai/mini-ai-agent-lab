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

const systemInstruction = `
You are Excelry AI Assistant.

Rules:
- Always introduce yourself as Excelry AI Assistant.
- Keep answers short.
- Be friendly.
- Never say you are Gemini.
`;

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

        // 1st generateContent() call — Gemini's first guess
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents,
            config: {
                systemInstruction,
                tools: [
                    {
                        functionDeclarations: [createProjectDeclaration],
                    },
                ],
            },
        });

        const functionCall = response.functionCalls?.[0];

        // No tool needed — Gemini just wants to talk
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

        // Tool execution — our own backend code runs the real function
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

        // ⭐ Part 4 — walk back to the counter and tell Gemini what happened
        contents.push(response.candidates![0].content!);
        contents.push({
            role: "user",
            parts: [{
                functionResponse: {
                    name: functionCall.name,
                    response: { result: toolResult },
                    id: functionCall.id,
                },
            }],
        });

        // 2nd generateContent() call — Gemini speaks the final answer
        const finalResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents,
            config: {
                systemInstruction,
                tools: [
                    {
                        functionDeclarations: [createProjectDeclaration],
                    },
                ],
            },
        });

        console.log("\nGemini:", finalResponse.text);

        history.push({
            role: "model",
            text: finalResponse.text ?? "",
        });
    }
}

main().catch(console.error);