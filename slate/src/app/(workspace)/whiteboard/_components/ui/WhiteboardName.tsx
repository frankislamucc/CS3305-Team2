"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface WhiteboardNameProps {
  name: string;
  onRename?: (newName: string) => Promise<void>;
}

export default function WhiteboardName({ name, onRename }: WhiteboardNameProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep local value in sync when the prop changes (e.g. after load)
  useEffect(() => {
    setValue(name);
  }, [name]);

  // Auto-focus + select-all when entering edit mode
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const commit = useCallback(async () => {
    setIsEditing(false);
    const trimmed = value.trim();
    if (!trimmed) {
      setValue(name); // revert to previous name
      return;
    }
    if (trimmed !== name && onRename) {
      await onRename(trimmed);
    }
  }, [value, name, onRename]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      setValue(name);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        maxLength={100}
        className="text-sm font-medium bg-background text-foreground border border-border rounded px-2 py-0.5 outline-none focus:border-brand-primary min-w-[120px]"
      />
    );
  }

  if (!onRename) {
    return (
      <span className="text-sm font-medium text-gray-400 px-2 py-0.5 truncate max-w-[240px]">
        {name}
      </span>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      title="Click to rename whiteboard"
      className="text-sm font-medium text-foreground hover:text-brand-accent-fg hover:bg-muted rounded px-2 py-0.5 transition-colors cursor-pointer truncate max-w-[240px]"
    >
      {name}
      <svg
        className="inline-block ml-1.5 w-3 h-3 text-muted-foreground"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.862 3.487a2.1 2.1 0 1 1 2.97 2.97L7.5 18.79l-4 1 1-4L16.862 3.487z"
        />
      </svg>
    </button>
  );
}
