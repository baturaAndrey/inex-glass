"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Chip } from "@/components/ig/chip";
import { Placeholder } from "@/components/ig/placeholder";
import {
  HUB_OBJECTS_ALL_KEY,
  type HubObjectCard,
  type HubObjectsGroup,
} from "@/lib/objects/hub-feed";

/**
 * Chips + object cards of the hub «Объекты» (Paper mockup `2560_steklyannye-konstrukcii`).
 * The groups are computed on the server (`hubObjectGroups`); the chips only switch which one is
 * shown, so every card of every group is plain server data — no fetching here.
 */

export interface HubObjectsProps {
  groups: readonly HubObjectsGroup[];
  /** Accessible name of the chip row. */
  filterLabel?: string | undefined;
}

/** 4 in a row at 1920 (427 px), 2 ≤1100, 1 ≤599. */
const IMAGE_SIZES = "(max-width: 599px) 100vw, (max-width: 1100px) 50vw, 25vw";

function ObjectCard({ card }: { card: HubObjectCard }) {
  return (
    <Link
      href={card.href}
      className="group/obj ease-ig bg-surface text-text shadow-card hover:shadow-card-hover focus-visible:outline-brand flex w-full flex-col overflow-hidden rounded-lg no-underline transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      data-testid="hub-object-card"
    >
      <span className="bg-well relative block h-[300px] shrink-0 max-lg:h-[240px]">
        {card.photo ? (
          <Image
            src={card.photo.src}
            alt={card.photo.alt}
            fill
            sizes={IMAGE_SIZES}
            className="object-cover"
          />
        ) : (
          <Placeholder className="absolute inset-0 aspect-auto rounded-none" />
        )}
      </span>
      <span className="flex flex-col gap-2 p-6 max-sm:p-5">
        {card.type ? (
          <span className="text-micro text-text-2 font-medium tracking-[0.06em] uppercase">
            {card.type}
          </span>
        ) : null}
        <span className="text-[20px] leading-[1.3] font-semibold text-balance">{card.name}</span>
      </span>
    </Link>
  );
}

export function HubObjects({ groups, filterLabel = "Тип конструкции" }: HubObjectsProps) {
  const [selected, setSelected] = useState<string>(HUB_OBJECTS_ALL_KEY);
  const current = groups.find((group) => group.key === selected) ?? groups[0];
  if (!current) return null;
  // «Все» alone filters nothing: the chips appear once at least one type has objects.
  const showChips = groups.length > 1;

  return (
    <div className="flex flex-col gap-8 max-sm:gap-6">
      {showChips ? (
        <div role="group" aria-label={filterLabel} className="flex flex-wrap gap-2">
          {groups.map((group) => (
            <Chip
              key={group.key}
              active={group.key === current.key}
              onClick={() => setSelected(group.key)}
            >
              {group.label}
            </Chip>
          ))}
        </div>
      ) : null}
      <ul
        className="m-0 grid list-none grid-cols-4 gap-6 p-0 max-md:grid-cols-2 max-sm:grid-cols-1 max-sm:gap-4"
        aria-live="polite"
        data-testid="hub-objects-list"
      >
        {current.objects.map((card) => (
          <li key={card.id} className="flex">
            <ObjectCard card={card} />
          </li>
        ))}
      </ul>
    </div>
  );
}
