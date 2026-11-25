"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { InfoIcon } from "@/components/BuildIcons";

const installSteps: {
  title: string;
  content: string;
  image: string;
}[] = [
  {
    title: "Open the side panel",
    content:
      "Make sure your pc is off and not plugged in. Then open the side panel.",
    image: "/pc_manuals/image-1.png",
  },
  {
    title: "Remove screws",
    content:
      "Remove the screws on the rear of the case that will be holding the graphics card in place. You may have to remove either the first, second, or third screw on the back, depending on your motherboard.",
    image: "/pc_manuals/image-2.png",
  },
  {
    title: "Prepare to slot the GPU",
    content:
      "Remove any existing graphics driver, then clear the PCI-E slot before seating the new card.",
    image: "/pc_manuals/image-3.png",
  },
  {
    title: "Insert the GPU in the PCI-E slot",
    content:
      "Align the gold connector on the graphics card with the PCI-E x16 slot and press firmly until seated.",
    image: "/pc_manuals/image-4.png",
  },
  {
    title: "Secure the Retention Bracket",
    content:
      "Secure the graphics card to the case retention bracket or mounting mechanism.",
    image: "/pc_manuals/image-5.png",
  },
  {
    title: "Connect cables to graphics card",
    content:
      "Connect the PCIe power cables from the power supply to the graphics card.",
    image: "/pc_manuals/image-6.png",
  },
  {
    title: "Reinstall side panels and continue pc setups",
    content:
      "Reinstall the side panels and resume the remaining PC setup steps.",
    image: "/pc_manuals/image-7.png",
  },
];

export default function InstallGuide() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get("product");

  return (
    <section className="rounded-2xl border border-[#dce3ee] bg-white p-5 shadow-card sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <InfoIcon className="mt-1 h-6 w-6 shrink-0 text-[#5865F2]" />
          <h2 className="text-xl font-bold text-[#2e3338]">
            How To Install Graphic Processor Unit (GPU/Graphics Card)
          </h2>
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex h-10 shrink-0 items-center rounded-xl border border-[#d2dbe8] bg-white px-4 text-sm font-semibold text-[#5c5e66] transition-colors hover:border-[#5865F2]/50"
        >
          Back
        </button>
      </div>

      {productId ? (
        <p className="mt-2 text-sm text-[#5c5e66]">
          Installation guide for product <span className="font-semibold">{productId}</span>.
        </p>
      ) : null}

      <p className="mt-2 text-sm font-semibold text-[#5865F2]">
        Tools Required: Philips Head Screw Driver
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {installSteps.map((step) => (
          <div
            key={step.image}
            className="rounded-2xl border border-[#dce3ee] bg-[#f8fafe] p-4 sm:p-5"
          >
            <h3 className="text-sm font-bold text-[#2e3338]">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#5c5e66]">
              {step.content}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={step.image}
              alt={`${step.title} — installation step`}
              className="mt-4 h-48 w-full rounded-xl border border-[#dce3ee] object-contain"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
