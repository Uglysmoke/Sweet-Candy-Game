
import { GoogleGenAI, Type } from "@google/genai";
import { BoardType, MoveHint } from "../types";
import { serializeBoard } from "./gameLogic";

const AI_MODEL = "gemini-3-flash-preview";

export const getGameHint = async (board: BoardType): Promise<MoveHint | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const boardStr = serializeBoard(board);

  const prompt = `
    You are a professional Candy Crush coach.
    Below is an 8x8 grid representation of a candy board. 
    Each character represents a color: R(ed), B(lue), G(reen), Y(ellow), P(urple), O(range).
    
    Board Layout:
    ${boardStr}

    Tasks:
    1. Identify a valid swap that results in a match-3 or more.
    2. Provide the 'from' and 'to' coordinates (0-indexed).
    3. Explain the strategy behind this move.

    Return the result in JSON format.
  `;

  try {
    const response = await ai.models.generateContent({
      model: AI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            from: {
              type: Type.OBJECT,
              properties: {
                row: { type: Type.INTEGER },
                col: { type: Type.INTEGER }
              },
              required: ["row", "col"]
            },
            to: {
              type: Type.OBJECT,
              properties: {
                row: { type: Type.INTEGER },
                col: { type: Type.INTEGER }
              },
              required: ["row", "col"]
            },
            explanation: { type: Type.STRING }
          },
          required: ["from", "to", "explanation"]
        }
      }
    });

    const result = JSON.parse(response.text.trim());
    return result as MoveHint;
  } catch (error) {
    console.error("Gemini Hint Error:", error);
    return null;
  }
};
