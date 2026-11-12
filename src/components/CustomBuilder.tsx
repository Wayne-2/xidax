"use client";

import Link from "next/link";
import { useState } from "react";
import BuildPreview from "@/components/BuildPreview";
import BuildSidebar from "@/components/BuildSidebar";
import BuildSummary from "@/components/BuildSummary";
import { ChevronDownIcon } from "@/components/BuildIcons";
import {
  buildPaths,
  partsByModel,
  type BuildModelId,
} from "@/data/customBuild";

const gridMask =
  "linear-gradient(to right, transparent 0%, black 55%, black 100%)";

export default function CustomBuilder() {
  const [modelId, setModelId] =
    useState<BuildModelId>("gaming-desktop");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [projectName, setProjectName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const parts = partsByModel[modelId];
  const selectedParts = parts.filter((part) =>
    selectedIds.includes(part.id)
  );
  const selectedCount = selectedParts.length;
  const remaining = parts.length - selectedCount;
  const progress =
    parts.length > 0 ? Math.round((selectedCount / parts.length) * 100) : 0;
  const total = selectedParts.reduce((sum, part) => sum + part.price, 0);

  const activePath =
    buildPaths.find((item) => item.id === "desktop") ?? buildPaths[0];
  const activeModel =
    activePath.models.find((model) => model.id === modelId) ??
    activePath.models[0];

  const handleModelChange = (nextModelId: BuildModelId) => {
    setModelId(nextModelId);
    setSelectedIds([]);
  };

  const togglePart = (partId: string) => {
    setSelectedIds((current) =>
      current.includes(partId)
        ? current.filter((id) => id !== partId)
        : [...current, partId]
    );
  };

  const resetBuild = () => {
    setSelectedIds([]);
  };

  return (
    <>
      <section className="relative overflow-hidden border-b border-[#dce3ee] bg-[#f0f4fa]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: gridMask,
            WebkitMaskImage: gridMask,
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#5865F2]/15 blur-3xl"
        />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-sm font-medium text-[#5c5e66]"
          >
            <Link href="/" className="transition-colors hover:text-[#5865F2]">
              Home
            </Link>
            <span aria-hidden="true" className="text-[#80848e]">
              /
            </span>
            <Link
              href="/custom-builds"
              aria-current="page"
              className="text-[#2e3338] transition-colors hover:text-[#5865F2]"
            >
              Custom Builds
            </Link>
          </nav>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
            <div data-reveal="up">
              <div className="flex items-center gap-3">
                <span className="h-px w-10 bg-gradient-to-r from-[#5865F2] to-transparent" />
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#5865F2]">
                  Built your way
                </p>
              </div>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-balance text-[#2e3338] sm:text-4xl">
                CUSTOM BUILD
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#5c5e66] sm:text-base">
                Choose every component. We handle compatibility, testing, and
                the build.
              </p>
            </div>

            <div
              data-reveal="up"
              style={{ animationDelay: "120ms" }}
              className="rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] p-5"
            >
              <label
                htmlFor="project-name"
                className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#80848e]"
              >
                Project name
              </label>
              <input
                id="project-name"
                type="text"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="e.g. My Dream Build"
                maxLength={48}
                autoComplete="off"
                className="mt-2 h-11 w-full rounded-xl border border-[#d2dbe8] bg-[#f8fafe] px-3.5 text-sm text-[#2e3338] placeholder:text-[#80848e] transition-colors hover:border-[#b8c4d6] focus:border-[#5865F2] focus:outline-none focus:ring-2 focus:ring-[#5865F2]/20"
              />

              <div className="mt-5 flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#80848e]">
                  Build progress
                </span>
                <span className="text-xs font-semibold text-[#2e3338]">
                  {selectedCount} of {parts.length} components
                </span>
              </div>
              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-[#dce3ee]"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={parts.length}
                aria-valuenow={selectedCount}
                aria-valuetext={`${selectedCount} of ${parts.length} components selected`}
                aria-label="Build progress"
              >
                <div
                  className="h-full rounded-full bg-[#5865F2] transition-[width] duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-[#5c5e66]">
                {remaining === 0
                  ? "Build complete · Ready to add to cart"
                  : `${progress}% complete · ${remaining} component${
                      remaining === 1 ? "" : "s"
                    } remaining`}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f0f4fa]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-expanded={sidebarOpen}
              aria-controls="build-components"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#d2dbe8] bg-[#f8fafe] px-4 text-sm font-semibold text-[#2e3338] transition-colors hover:border-[#5865F2]/50"
            >
              Add component
              <ChevronDownIcon
                className={`h-4 w-4 text-[#80848e] transition-transform duration-300 ${
                  sidebarOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            <span className="text-xs font-semibold text-[#5c5e66]">
              {selectedCount}/{parts.length} selected
            </span>
          </div>

          <div className="relative grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)_320px] xl:grid-cols-[280px_minmax(0,1fr)_360px] xl:gap-8">
            {sidebarOpen && (
              <button
                type="button"
                aria-label="Close component list"
                onClick={() => setSidebarOpen(false)}
                className="absolute inset-0 z-20 lg:hidden"
              />
            )}

            <BuildSidebar
              id="build-components"
              className={`${
                sidebarOpen
                  ? "absolute inset-x-0 top-0 z-30 max-h-[70vh] overflow-y-auto shadow-[0_24px_48px_-24px_rgba(46,51,56,0.55)]"
                  : "hidden"
              } lg:static lg:block lg:z-auto lg:max-h-none lg:overflow-visible lg:shadow-none`}
              modelId={modelId}
              parts={parts}
              selectedIds={selectedIds}
              onModelChange={handleModelChange}
              onTogglePart={togglePart}
            />
            <BuildPreview
              projectName={projectName}
              pathLabel={activePath.label}
              modelLabel={activeModel.label}
              selectedParts={selectedParts}
              selectedCount={selectedCount}
              partsCount={parts.length}
            />
            <BuildSummary
              projectName={projectName}
              pathLabel={activePath.label}
              modelLabel={activeModel.label}
              modelDescription={activeModel.description}
              modelTags={activeModel.tags}
              selectedParts={selectedParts}
              total={total}
              partsCount={parts.length}
              onRemovePart={togglePart}
              onReset={resetBuild}
            />
          </div>
        </div>
      </section>
    </>
  );
}
