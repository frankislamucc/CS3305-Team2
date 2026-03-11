"use server";
import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from "../_types";

const client = new GoogleGenAI({});
const systemPrompt = `Any given prompts are directed from a user of a canvas drawing web app. This web app uses Konva.js to draw Line and Circle objects to the Canvas. The GenerationConfig.responseSchema shows the outputed canvas lines and circles representing your response should look like. There are also text labels that can be used to lable nodes or lines and arrows for similar use. The user should only be allowed to ask programming related questions, such as visualisation of data structures. As well as outputing a LineData, circleData, textData and arrowData array, you should explain what will be drawn on the Canvas with the reponse lines.`;

const responseJsonSchema = {
  type: "object",
  properties: {
    text_explanation: {
      type: "string",
      description: "An explanation of what is being drawn on the canvas.",
    },
    lines: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          points: {
            type: "array",
            items: { type: "number" },
            description: "A flat array of [x1, y1, x2, y2, ...]",
          },
          stroke: { type: "string" },
          strokeWidth: { type: "number" },
          tension: { type: "number" },
          lineCap: { type: "string", enum: ["butt", "round", "square"] },
          lineJoin: { type: "string", enum: ["round", "bevel", "miter"] },
        },
        required: [
          "id",
          "points",
          "stroke",
          "strokeWidth",
          "tension",
          "lineCap",
          "lineJoin",
        ],
      },
    },
    circles: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          x: { type: "number" },
          y: { type: "number" },
          radius: { type: "number" },
          fill: { type: "string" },
          stroke: { type: "string" },
          strokeWidth: { type: "number" },
        },
        required: ["id", "x", "y", "radius", "fill", "stroke", "strokeWidth"],
      },
    },
    text: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          x: { type: "number" },
          y: { type: "number" },
          text: { type: "string" },
          fill: { type: "string" },
          fontSize: { type: "number" },
          fontFamily: { type: "string" },
        },
        required: ["id", "x", "y", "fill", "text", "fontSize", "fontFamily"],
      },
    },
    arrows: {
      type: "array",
      description:
        "An array of arrows, useful for directed graphs or pointers.",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          x: {
            type: "number",
            description: "The x-coordinate of the arrow origin.",
          },
          y: {
            type: "number",
            description: "The y-coordinate of the arrow origin.",
          },
          points: {
            type: "array",
            items: { type: "number" },
            description:
              "A flat array of [x1, y1, x2, y2, ...] defining the arrow path.",
          },
          pointerLength: {
            type: "number",
            description: "Length of the arrow head.",
          },
          pointerWidth: {
            type: "number",
            description: "Width of the arrow head.",
          },
          fill: {
            type: "string",
            description: "Color to fill the arrow head.",
          },
          stroke: { type: "string", description: "Color of the arrow line." },
          strokeWidth: { type: "number" },
        },
        required: [
          "id",
          "x",
          "y",
          "points",
          "pointerLength",
          "pointerWidth",
          "fill",
          "stroke",
          "strokeWidth",
        ],
      },
    },
  },
  required: ["text_explanation", "lines", "circles", "text", "arrows"],
};

interface ChatActionProps {
  history: ChatMessage[];
  prompt: string;
}
export async function chatAction({ history, prompt }: ChatActionProps) {
  if (!client) return;

  try {
    const result = await client.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseJsonSchema: responseJsonSchema,
      },
    });

    // 1. In version 1.43.0+, sometimes the response is directly on result
    // or requires a check on the candidates array.
    // console.log("response is " + result);
    const response = result;

    if (!response || !response.candidates || response.candidates.length === 0) {
      console.error("No candidates returned. Check Safety Ratings or Prompt.");
      return { error: "No response from AI" };
    }

    console.log(result);
    // 2. Use the helper method safely
    const rawJsonString = response.text;
    // console.log("raw json string is " + rawJsonString);

    console.log(rawJsonString);
    // 3. Parse and return
    if (!rawJsonString) {
      return { error: "No text content in AI response" };
    }
    const parsedData = JSON.parse(rawJsonString);
    console.log("Success:", parsedData.text_explanation);
    return parsedData;
  } catch (error) {
    console.error("Detailed Error in chatAction:", error);
    throw error;
  }
}
