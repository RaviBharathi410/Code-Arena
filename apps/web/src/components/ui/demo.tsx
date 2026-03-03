"use client";

import * as React from 'react';

import { ExperienceHero } from "./experience-hero";


export const DemoOne = () => {
    return (
        <div className="dark min-h-screen bg-[#020202] selection:bg-white selection:text-black">
            <main className="relative w-full overflow-x-hidden">
                <React.Suspense fallback={null}>
                    <ExperienceHero />
                </React.Suspense>
                <div className="fixed inset-0 pointer-events-none bento-mask opacity-10 z-[100]" />
            </main>
        </div>
    );
};
