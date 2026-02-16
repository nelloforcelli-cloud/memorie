
import { GoogleGenAI, Type } from "@google/genai";
import { TaskExtractionResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const extractTaskData = async (input: string): Promise<TaskExtractionResult | null> => {
  // Usiamo il formato locale per non confondere l'AI con l'ora UTC
  const now = new Date();
  const localContext = now.toLocaleString('it-IT', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analizza questa richiesta per creare un impegno: "${input}". 
               Il momento attuale dell'utente è: ${localContext}. 
               
               Estrai: 
               1. titolo
               2. data di scadenza (formato ISO 8601 locale, es: YYYY-MM-DDTHH:mm:ss)
               3. categoria (scegli tra 'personale' o 'familiare')
               4. priorità (scegli tra 'alta', 'media', 'bassa').
               
               Regole CRITICHE:
               - L'utente si trova in Italia. Se dice "alle 18:30", la scadenza deve essere esattamente alle 18:30.
               - NON aggiungere o sottrarre ore per il fuso orario.
               - Restituisci la data nel formato ISO 8601 senza il suffisso 'Z' (usa il tempo locale).
               - Se non specificato, la categoria predefinita è 'personale'. 
               - Se la priorità non è chiara, usa 'media'.
               - Se la data non è chiara, usa null.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          deadline: { type: Type.STRING, nullable: true },
          category: { 
            type: Type.STRING,
            enum: ['personale', 'familiare']
          },
          priority: {
            type: Type.STRING,
            enum: ['alta', 'media', 'bassa']
          }
        },
        required: ["title", "category", "priority"]
      }
    }
  });

  try {
    const data = JSON.parse(response.text || '{}');
    return data as TaskExtractionResult;
  } catch (error) {
    console.error("Errore nel parsing della risposta Gemini:", error);
    return null;
  }
};

export const extractShoppingItems = async (input: string): Promise<string[]> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analizza questa lista della spesa dettata a voce: "${input}".
               Estrai i singoli prodotti.
               Regole:
               - Rimuovi parole come "compra", "prendi", "aggiungi", "per favore".
               - Separa i prodotti (es: "pane e latte" -> ["Pane", "Latte"]).
               - Mantieni quantità se specificate (es: "due uova" -> ["2 Uova"]).
               - Restituisci solo un array di stringhe pulite.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  try {
    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Errore parsing spesa:", error);
    return [];
  }
};

export const getAiAssistantResponse = async (input: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: input,
    config: {
      systemInstruction: "Sei un assistente domestico intelligente chiamato Forcelli. Rispondi in modo gentile, utile e molto conciso (massimo 2-3 frasi). Se ti chiedono di fare qualcosa che riguarda la spesa o gli impegni, ricorda loro che possono usare le sezioni dedicate dell'app.",
    }
  });
  return response.text || "Mi dispiace, non ho capito la richiesta.";
};
