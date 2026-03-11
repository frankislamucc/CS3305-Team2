import { useEffect, useState } from "react";
import { chatAction } from "../actions/chat";
import ChatInput from "./ui/ChatInput";
import ChatList from "./ui/ChatList";
import {
  ChatMessage,
  CircleData,
  LineData,
  TextData,
  ArrowData,
} from "../_types";

interface ChatEngineProps {
  setLines: React.Dispatch<React.SetStateAction<LineData[]>>;
  setCircles: React.Dispatch<React.SetStateAction<CircleData[]>>;
  setText: React.Dispatch<React.SetStateAction<TextData[]>>;
  setArrows: React.Dispatch<React.SetStateAction<ArrowData[]>>;
  onDiagramGenerated?: (lines: LineData[], circles: CircleData[], text: TextData[], arrows: ArrowData[]) => void;
}

export default function ChatEngine({
  setLines,
  setCircles,
  setText,
  setArrows,
  onDiagramGenerated,
}: ChatEngineProps) {
  const [width, setWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 200 && newWidth < 800) {
        setWidth(newWidth);
      }
    };

    const stopResizing = () => setIsResizing(false);

    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing]);

  const onPrompt = async (message: string) => {
    try {
      setMessages((messages) => [
        ...messages,
        {
          id: crypto.randomUUID(),
          role: "user",
          content: message,
        },
      ]);
      console.log(
        "--------------------------calling chatAction--------------------------",
      );
      const response = await chatAction({ history: messages, prompt: message });
      console.log("response is ------------");
      console.log(response);
      const responseMessage = response.text_explanation as string;
      console.log("responseMessage is ------- " + responseMessage);
      setMessages((messages) => [
        ...messages,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: responseMessage,
        },
      ]);

      // Give every AI-generated shape a unique prefix so IDs never collide
      // with existing items or previous AI responses
      const uid = crypto.randomUUID().slice(0, 8);
      const prefixedLines = (response.lines ?? []).map((l: LineData) => ({ ...l, id: `${uid}-${l.id}` }));
      const prefixedCircles = (response.circles ?? []).map((c: CircleData) => ({ ...c, id: `${uid}-${c.id}` }));
      const prefixedText = (response.text ?? []).map((t: TextData) => ({ ...t, id: `${uid}-${t.id}` }));
      const prefixedArrows = (response.arrows ?? []).map((a: ArrowData) => ({ ...a, id: `${uid}-${a.id}` }));

      // Use functional updaters to read the latest state, then call
      // onDiagramGenerated outside the updaters to avoid setState-during-render
      let mergedLines: LineData[] = [];
      let mergedCircles: CircleData[] = [];
      let mergedText: TextData[] = [];
      let mergedArrows: ArrowData[] = [];

      setLines((prev) => { mergedLines = [...prev, ...prefixedLines]; return mergedLines; });
      setCircles((prev) => { mergedCircles = [...prev, ...prefixedCircles]; return mergedCircles; });
      setText((prev) => { mergedText = [...prev, ...prefixedText]; return mergedText; });
      setArrows((prev) => { mergedArrows = [...prev, ...prefixedArrows]; return mergedArrows; });

      // Trigger save after state updates are batched (React 18+ auto-batches)
      // Use queueMicrotask so the callback runs after React processes the batch
      queueMicrotask(() => {
        onDiagramGenerated?.(mergedLines, mergedCircles, mergedText, mergedArrows);
      });
    } catch (error) {
      console.log(error);
    }
  };

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "user",
      content: "Hello! Can you help me with a coding question?",
    },
    {
      id: "2",
      role: "assistant",
      content:
        "Of course! I'd be happy to help with your coding question. What would you like to know?",
    },
    {
      id: "3",
      role: "user",
      content: "How do I create a responsive layout with CSS Grid?",
    },
    {
      id: "4",
      role: "assistant",
      content:
        "Creating a responsive layout with CSS Grid is straightforward. Here's a basic example:\n\n```css\n.container {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));\n  gap: 1rem;\n}\n```\n\nThis creates a grid where:\n- Columns automatically fit as many as possible\n- Each column is at least 250px wide\n- Columns expand to fill available space\n- There's a 1rem gap between items\n\nWould you like me to explain more about how this works?",
    },
  ]);

  const startResizing = (e: React.MouseEvent) => {
    setIsResizing(true);
  };

  return (
    <div
      style={{ width: `${width}px` }}
      className="absolute top-0 right-0 bottom-0 z-30 bg-background/80 backdrop-blur-md border-l shadow-xl"
    >
      <div
        onMouseDown={startResizing}
        className="absolute -left-2 top-0 bottom-0 w-4 cursor-col-resize z-50 group"
      >
        <div className="mx-auto h-full w-1 group-hover:bg-primary/50 transition-colors" />
      </div>

      <div className="relative h-full p-4">
        <ChatInput submitHandler={onPrompt} />
        <ChatList messages={messages} />
      </div>
    </div>
  );
}
