"use client";

import React from "react";
import { WobbleCard } from "@/components/ui/wobble-card";
import Image from "next/image";

export default function BentoCards() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-7xl mx-auto w-full mt-15">
      <WobbleCard
        containerClassName="col-span-1 lg:col-span-2 h-full bg-pink-800 min-h-[500px] lg:min-h-[300px]"
        className=""
      >
        <div className="max-w-xs">
          <h2 className="text-left text-balance text-base md:text-xl lg:text-3xl font-semibold tracking-[-0.015em] text-white">
            Your infinite canvas for ideas
          </h2>
          <p className="mt-4 text-left  text-base/6 text-neutral-200">
            Collaborate in real-time with your team. Brainstorm, plan and create
            from anywhere.
          </p>
        </div>
      </WobbleCard>
      <WobbleCard containerClassName="col-span-1 min-h-[300px]">
        <h2 className="max-w-80  text-left text-balance text-base md:text-xl lg:text-3xl font-semibold tracking-[-0.015em] text-white">
          Write in Thin Air
        </h2>
        <p className="mt-4 max-w-[26rem] text-left  text-base/6 text-neutral-200">
          Our Gesture ML engine translates hand movements into digital strokes.
          No stylus, no touch—just pure code visualization.
        </p>
      </WobbleCard>
      <WobbleCard containerClassName="col-span-1 lg:col-span-3 bg-blue-900 aspect-2/3 sm:aspect-1/1 md:aspect-3/2 lg:aspect-3/1">
        <div className="max-w-sm">
          <h2 className="max-w-sm md:max-w-lg  text-left text-balance text-base md:text-xl lg:text-3xl font-semibold tracking-[-0.015em] text-white">
            Your Work, Your Data
          </h2>
          <p className="mt-4 max-w-[26rem] text-left  text-base/6 text-neutral-200">
            Brainstorm without boundaries. Export your entire canvas and
            download high-resolution project files for free, instantly.
          </p>
        </div>
        {/* <img */}
        {/*   src="/linear.webp" */}
        {/*   alt="linear demo image" */}
        {/*   className="absolute -right-10 md:-right-[40%] lg:-right-[20%] -bottom-10 object-contain rounded-2xl" */}
        {/* /> */}
        <Image
          src="/whiteboard.png"
          alt="whiteboard"
          width={500}
          height={500}
          className="absolute right-[1%] sm:right-[3%] bottom-[3%] object-contain rounded-2xl"
        />
      </WobbleCard>
    </div>
  );
}
